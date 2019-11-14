#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import asyncio
import binascii
import json
import logging
import math
import os
import numpy as np
import geopandas as gpd
import rasterio as rio
import rtree
import shlex
import spacy
import subprocess
import sys
import tempfile
import uuid
import uvloop
import gc
from aiohttp import web
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime
from functools import partial
from pyproj import Proj, transform
from rasterio.features import shapes as rio_shapes
from rasterio import merge as rio_merge
from shapely.geometry import Polygon, shape, mapping
from shapely.ops import unary_union
from glob import glob


def idx_generator_func(bounds):
    for i, bound in enumerate(bounds):
        yield (i, bound, i)


def make_index(bounds):
    return rtree.index.Index(
        [z for z in idx_generator_func(bounds)],
        Interleaved=True,
    )

async def handler_activity_features(request):
    """
    Returns a GeoJSON FeatureCollection
    containing specific features for the requested activity
    (such a 'ski areas', 'ski lift' and 'pistes' for the activity "ski").
    """
    app = request.app
    category = request.match_info['category']

    if category not in app['allowed_activity']:
        return web.Response(text='Error')

    app['logger'].info(
        'Requested features for activity "{}" : found {} features'
        .format(category, len(app['layer_activity_{}'.format(category)]))
    )
    result = app['layer_activity_{}'.format(category)].to_json()
    return web.Response(text=result)


async def handler_features_post(request):
    """
    Returns a GeoJSON FeatureCollection
    containing features for the requested `category`
    and intersecting with the requested posted feature geometry.
    """

    app = request.app
    category = request.match_info['category']

    posted_data = await request.post()
    _geom = posted_data.get('geometry')
    geom = shape(json.loads(_geom))
    xmin, ymin, xmax, ymax = geom.bounds

    app['logger'].info(
        'Requested {} within {}...'
        .format(category, (xmin, ymin, xmax, ymax)))

    async with app['lock']:
        if category not in app['allowed_category']:
            return web.Response(text='Error')

        ix_within = list(
            app['index_{}'.format(category)]
            .intersection((xmin, ymin, xmax, ymax)))
        temp = app['layer_{}'.format(category)].iloc[ix_within]

        result = temp[temp.geometry.intersects(geom)].to_json()

    app['logger'].info(
        '...found {} {} features'
        .format(category, len(ix_within)))

    return web.Response(text=result)


async def handler_features(request):
    """
    Returns a GeoJSON FeatureCollection
    containing features for the requested `category`
    within the requested `bbox`.
    """

    app = request.app
    category = request.match_info['category']
    bbox = request.match_info['bbox']
    app['logger'].info(
        'Requested {} within {}...'
        .format(category, bbox))

    async with app['lock']:
        if category not in app['allowed_category']:
            return web.Response(text='Error')

        xmin, ymin, xmax, ymax = list(map(float, bbox.split(',')))

        ix_within = list(
            app['index_{}'.format(category)]
            .intersection((xmin, ymin, xmax, ymax)))
        result = app['layer_{}'.format(category)].iloc[ix_within].to_json()

    app['logger'].info(
        '...found {} {} features'
        .format(category, len(ix_within)))

    return web.Response(text=result)


async def index(request):
    """Handler for the index page."""
    return web.FileResponse('./dist/index.html')


def compute_binary_predicate(_op, _geoms1, _geoms2):
    geoms1 = [shape(i) for i in json.loads(_geoms1)]
    geoms2 = [shape(i) for i in json.loads(_geoms2)]
    result = {}
    for ix1, g1 in enumerate(geoms1):
        result[ix1] = {}
        for ix2, g2 in enumerate(geoms2):
            result[ix1][ix2] = getattr(g1, _op)(g2)
    return json.dumps(result)

def compute_op_geom(_op, _geoms, options):
    geoms = [shape(i) for i in json.loads(_geoms)]

    if _op == 'unary_union':
        res = unary_union(geoms)

    elif _op == 'intersection':
        res = geoms[0]
        for _geom in geoms[1:]:
            res = _geom.intersection(res)

    elif _op == 'symmetric_difference':
        res = geoms[0].symmetric_difference(geoms[1])

    elif _op == 'buffer':

        geo_serie = gpd.GeoSeries(
            geoms,
            crs='+proj=longlat +datum=WGS84 +no_defs ',
        ).to_crs(epsg=2154)

        if options['dist'] and int(options['dist']) != 0:
            res = unary_union(
                geo_serie.buffer(float(options['dist']))
                .boundary.buffer(float(options['uncertainty']))
                .to_crs('+proj=longlat +datum=WGS84 +no_defs ')
                .values
            )
        else:
            res = unary_union(
                geo_serie
                .buffer(float(options['uncertainty']))
                .to_crs('+proj=longlat +datum=WGS84 +no_defs ')
                .values
            )
    return json.dumps(mapping(res))


async def handler_geom_op(request):
    """
    Handles some geo-operations (buffer, unary-union and intersection)
    to be performed on an array of GeoJSON geometries.
    """
    _op = request.match_info['op']

    if _op in request.app['allowed_binary_predicate']:
        posted_data = await request.post()
        _geoms1 = posted_data.get('geoms1')
        _geoms2 = posted_data.get('geoms2')

        result = await request.app.loop.run_in_executor(
            request.app["ProcessPool"],
            compute_binary_predicate,
            _op,
            _geoms1,
            _geoms2,
        )

        return web.Response(text=result)

    elif _op in request.app['allowed_geom_operation']:
        posted_data = await request.post()
        _geoms = posted_data.get('geoms')

        options = {
            'dist': posted_data.get('distance'),
            'uncertainty': posted_data.get('uncertainty'),
        } if _op == 'buffer' else None

        result = await request.app.loop.run_in_executor(
            request.app["ProcessPool"],
            compute_op_geom,
            _op,
            _geoms,
            options,
        )
        return web.Response(text=result)

    else:
        return web.Response(
            text=json.dumps({
                'message': (
                    'Error : binary predicate or geometric operation '
                    f'\'{_op}\' not found.'
                ),
            })
        )


async def handler_clue(request):
    """
    Handles clues in natural language to extract part of speech and named
    entities if any.
    """
    posted_data = await request.post()
    clue_nl = posted_data.get('clue_nl')
    doc = request.app['nlp'](clue_nl)
    part_of_speech = [
        (x.orth_, x.pos_, x.lemma_)
        for x in [
            y for y in doc if not y.is_stop and y.pos_ != 'PUNCT']
    ]

    named_entities = [(X.text, X.label_) for X in doc.ents]
    return web.Response(
        text=json.dumps({
            "part_of_speech": part_of_speech,
            "named_entities": named_entities,
        })
    )


async def handle_404(request, response):
    return web.Response(text="ERROR 404 !")


async def error_middleware(app, handler):
    async def middleware_handler(request):
        try:
            response = await handler(request)
            if response.status == 404:
                return await handle_404(request, response)
            return response
        except web.HTTPException as ex:
            if ex.status == 404:
                return await handle_404(request, ex)
            raise

    return middleware_handler


def get_extent_proj(path):
    with rio.open(path) as f:
        crs = f.read_crs()
        bounds = f.bounds
        return {
            'path': path,
            'crs_epsg': crs.to_epsg(),
            'crs_string': Proj(crs.to_string()).srs,
            'w': math.ceil(bounds[0]),
            's': math.ceil(bounds[1]),
            'e': math.floor(bounds[2]),
            'n': math.floor(bounds[3]),
            'ewres': f.res[0],
            'nsres': f.res[1],
        }


def init_grass(info_dem):
    grass_bin = 'grass'
    startcmd = grass_bin + ' --config path'
    p = subprocess.Popen(
        startcmd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    out, err = p.communicate()
    if p.returncode != 0:
        raise ValueError(
            'Failed to load GRASS\nStdout: {}\nStderr: {}\n'
            .format(out.decode(), err.decode()))

    gisbase = out.strip(b'\n').decode()
    os.environ['GISBASE'] = gisbase
    sys.path.append(os.path.join(gisbase, 'etc', 'python'))
    gisdb = os.path.join(tempfile.gettempdir(), 'grassdata')

    try:
        os.stat(gisdb)
    except FileNotFoundError:
        os.mkdir(gisdb)

    location = binascii.hexlify(os.urandom(12)).decode()
    location_path = os.path.join(gisdb, location)
    mapset = 'PERMANENT'

    startcmd = ' '.join([
        grass_bin,
        '-c epsg:{}'.format(info_dem['crs_epsg']),
        '-e',
        location_path,
        ])

    print('Starting grass with command: `' + startcmd + '`')
    p = subprocess.Popen(
        startcmd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    out, err = p.communicate()
    if p.returncode != 0:
        raise ValueError(
            'Failed to load GRASS\nStdout: {}\nStderr: {}\n'
            .format(out.decode(), err.decode()))

    print('Created location ', location_path)

    import grass.script as grass
    import grass.script.setup as gsetup

    gsetup.init(gisbase, gisdb, location, mapset)
    grass.message('--- GRASS GIS 7: Current GRASS GIS 7 environment:')
    print(grass.gisenv())

    grass.message('--- GRASS GIS 7: Setting projection info:')
    _out_proj = grass.read_command(
        'g.proj',
        flags='c',
        epsg=info_dem['crs_epsg'],
    )
    print(_out_proj)

    grass.message('--- GRASS GIS 7: Loading DEM file:')
    res = grass.read_command(
        'r.external',
        flags='o',
        input=info_dem['path'],
        band=1,
        output="rast_5cb08c8150bbc7",
    )
    print(res)

    grass.message('--- GRASS GIS 7: Defining the region...')
    grass.read_command(
        'g.region',
        n=info_dem['n'],
        s=info_dem['s'],
        e=info_dem['e'],
        w=info_dem['w'],
        nsres=info_dem['nsres'],
        ewres=info_dem['ewres'],
    )

    return {
        "gisbase": gisbase,
        "gisdb": gisdb,
        "location": location,
        "mapset": mapset,
    }


def _validate_number(h):
    # Will raise a ValueError if 'h' isn't / can't be converted
    # to 'float' :
    float(h)
    return h


def _validate_datetime(year, month, day, hour, minute):
    # In order to raise a ValueError if one of them
    # isn't (or cannot be converted to) an 'int' :
    int(year) + int(month) + int(day) + int(hour) + int(minute)
    return (year, month, day, hour, minute)


def _validate_region(region_coords, info_dem):
    in_proj = Proj(info_dem['crs_string'])
    out_proj = Proj(init='epsg:4326')
    _to_projected = partial(transform, out_proj, in_proj)
    if region_coords is None:
        return None
    _coords = list(map(lambda x: float(x), region_coords.split(',')))
    _coords[0], _coords[2] = _to_projected(_coords[0], _coords[2])
    _coords[1], _coords[3] = _to_projected(_coords[1], _coords[3])
    if _coords[0] <= info_dem['w'] or _coords[0] >= info_dem['e'] \
            or _coords[2] >= info_dem['n'] or _coords[2] <= info_dem['s']:
        raise ValueError(
            'Requested region {} is outside the allowed region '
            '(xmin={}, xmax={}, ymin={}, ymax={})'
            .format(
                _coords,
                info_dem['w'],
                info_dem['e'],
                info_dem['s'],
                info_dem['n'],
            ))
    return {
        'w': str(_coords[0]),
        'e': str(_coords[1]),
        's': str(_coords[2]),
        'n': str(_coords[3]),
    }


def _validate_one_position(_coords, info_dem):
    in_proj = Proj(info_dem['crs_string'])
    out_proj = Proj(init='epsg:4326')
    _to_projected = partial(transform, out_proj, in_proj)
    _coords = _to_projected(_coords[1], _coords[0])
    if _coords[1] >= info_dem['n'] or _coords[1] <= info_dem['s'] \
            or _coords[0] >= info_dem['e'] or _coords[0] <= info_dem['w']:
        raise ValueError(
            'Requested point {} is outside the allowed region '
            '(xmin={}, xmax={}, ymin={}, ymax={})'
            .format(
                _coords,
                info_dem['w'],
                info_dem['e'],
                info_dem['s'],
                info_dem['n'],
            ))
    return '{},{}'.format(*_coords)


def _validate_coordinates(coords, info_dem):
    if coords.startswith('(') and coords.endswith(')'):
        _coords_list = [
            list(map(lambda x: float(x), c.split(',')))
            for c in coords[1:-1].split('),(')
        ]
        return [
            _validate_one_position(_coords, info_dem)
            for _coords in _coords_list
        ]

    else:
        _coords = list(map(lambda x: float(x), coords.split(',')))
        return _validate_one_position(_coords, info_dem)


async def interviz_wrapper(request):
    try:
        c = _validate_coordinates(
            request.rel_url.query['coordinates'],
            request.app['info_dem'],
        )
        h1 = _validate_number(request.rel_url.query['height1'])
        h2 = _validate_number(request.rel_url.query['height2'])
        region = _validate_region(
            request.rel_url.query.get('region', None),
            request.app['info_dem'],
        )

    except Exception as e:
        return web.Response(
            text=json.dumps({"message": "Error : {}".format(e)}))

    if isinstance(c, list):
        res = await request.app.loop.run_in_executor(
            request.app["ProcessPool"],
            interviz_multiple,
            request.app['path_info'],
            request.app['info_dem'],
            c,
            h1,
            h2,
            region,
        )
    else:
        res = await request.app.loop.run_in_executor(
            request.app["ProcessPool"],
            interviz,
            request.app['path_info'],
            request.app['info_dem'],
            c,
            h1,
            h2,
            region,
        )

    return web.Response(text=res)


def interviz_multiple(path_info, info_dem, coords_list, height1, height2, region):
    import grass.script as GRASS
    try:
        if region:
            GRASS.read_command(
                'g.region',
                n=region['n'],
                s=region['s'],
                e=region['e'],
                w=region['w'],
                nsres=info_dem['nsres'],
                ewres=info_dem['ewres'],
            )

        results_layers = []
        for i, coordinates in enumerate(coords_list):
            uid = str(uuid.uuid4()).replace('-', '')
            grass_name = "output_{}".format(uid)
            output_name = os.path.join(path_info['gisdb'], '.'.join([uid, 'tif']))
            results_layers.append(output_name)

            GRASS.message(
                '--- GRASS GIS 7: Computing viewshed {}/{}'
                .format(i + 1, len(coords_list))
            )
            res = GRASS.read_command(
                'r.viewshed',
                input='rast_5cb08c8150bbc7',
                coordinates=coordinates,
                observer_elevation=height1,
                target_elevation=height2,
                # max_distance=max_distance,
                refraction_coeff="0.14286",
                memory="1000",
                flags='b',
                output=grass_name,
            )
            print(res)

            GRASS.message(
                '--- GRASS GIS 7: Saving resulting raster layer')
            res = GRASS.read_command(
                'r.out.gdal',
                input=grass_name,
                output=output_name,
                format="GTiff",
                createopt="TFW=YES,COMPRESS=LZW",
            )
            print(res)

            GRASS.message(
                '--- GRASS GIS 7: Remove temporary result raster from GRASS')
            res = GRASS.read_command(
                'g.remove',
                flags='f',
                type='raster',
                name=grass_name,
            )
            print(res)

        if region:
            GRASS.read_command(
                'g.region',
                n=info_dem['n'],
                s=info_dem['s'],
                e=info_dem['e'],
                w=info_dem['w'],
                nsres=info_dem['nsres'],
                ewres=info_dem['ewres'],
            )

    except Exception as e:
        return json.dumps({"message": "Error : {}".format(e)})

    datasets = [rio.open(path_layer, 'r') for path_layer in results_layers]
    res, out_trans = rio_merge.merge(datasets, indexes=1)
    epsg_value = datasets[0].crs.to_epsg()
    results = [{
        'properties': {'visibility': v},
        'geometry': s,
        'type': 'Feature',
        } for i, (s, v) in enumerate(rio_shapes(
            res, mask=None, transform=datasets[0].transform)) if v == 1.0]

    with open('/tmp/{}.geojson'.format(uid), 'w') as f:
        f.write(json.dumps({"type": "FeatureCollection", "features": results}))

    for ds, path_layer in zip(datasets, results_layers):
        ds.close()
        os.remove(path_layer)

    p = subprocess.Popen(
        shlex.split(
            'ogr2ogr -s_srs "EPSG:{}" -t_srs "EPSG:4326" '
            '-f GeoJSON /dev/stdout /tmp/{}.geojson'.format(epsg_value, uid)),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    out, err = p.communicate()
    os.remove('/tmp/{}.geojson'.format(uid))
    if p.returncode != 0:
        print('Error: ', err)
        return json.dumps({"message": "Error : {}".format(err)})

    return out.decode()


def interviz(path_info, info_dem, coordinates, height1, height2, region):
    import grass.script as GRASS
    try:
        uid = str(uuid.uuid4()).replace('-', '')
        grass_name = "output_{}".format(uid)
        output_name = os.path.join(path_info['gisdb'], '.'.join([uid, 'tif']))

        if region:
            GRASS.read_command(
                'g.region',
                n=region['n'],
                s=region['s'],
                e=region['e'],
                w=region['w'],
                nsres=info_dem['nsres'],
                ewres=info_dem['ewres'],
            )

        GRASS.message(
            '--- GRASS GIS 7: Computing viewshed')
        res = GRASS.read_command(
            'r.viewshed',
            input='rast_5cb08c8150bbc7',
            coordinates=coordinates,
            observer_elevation=height1,
            target_elevation=height2,
            # max_distance=max_distance,
            refraction_coeff="0.14286",
            memory="1000",
            flags='b',
            output=grass_name,
        )
        print(res)

        if region:
            GRASS.read_command(
                'g.region',
                n=info_dem['n'],
                s=info_dem['s'],
                e=info_dem['e'],
                w=info_dem['w'],
                nsres=info_dem['nsres'],
                ewres=info_dem['ewres'],
            )

        GRASS.message(
            '--- GRASS GIS 7: Saving resulting raster layer')
        res = GRASS.read_command(
            'r.out.gdal',
            input=grass_name,
            output=output_name,
            format="GTiff",
            createopt="TFW=YES,COMPRESS=LZW",
        )
        print(res)

        GRASS.message(
            '--- GRASS GIS 7: Remove temporary result raster from GRASS')
        res = GRASS.read_command(
            'g.remove',
            flags='f',
            type='raster',
            name=grass_name,
        )
        print(res)

    except Exception as e:
        return json.dumps({"message": "Error : {}".format(e)})

    with rio.open(output_name) as src:
        epsg_value = src.crs.to_epsg()
        image = src.read(1)
        results = [{
            'properties': {'visibility': v},
            'geometry': s,
            'type': 'Feature',
            } for i, (s, v) in enumerate(rio_shapes(
                image, mask=None, transform=src.transform)) if v == 1.0]

    with open('/tmp/{}.geojson'.format(uid), 'w') as f:
        f.write(json.dumps({"type": "FeatureCollection", "features": results}))

    p = subprocess.Popen(
        shlex.split(
            'ogr2ogr -s_srs "EPSG:{}" -t_srs "EPSG:4326" '
            '-f GeoJSON /dev/stdout /tmp/{}.geojson'.format(epsg_value, uid)),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    out, err = p.communicate()
    os.remove('/tmp/{}.geojson'.format(uid))
    os.remove(output_name)
    if p.returncode != 0:
        print('Error: ', err)
        return json.dumps({"message": "Error : {}".format(err)})

    return out.decode()


async def sunmask_wrapper(request):
    try:
        datetime = _validate_datetime(
            request.rel_url.query['year'],
            request.rel_url.query['month'],
            request.rel_url.query['day'],
            request.rel_url.query['hour'],
            request.rel_url.query['minute'],
        )
        region = _validate_region(
            request.rel_url.query.get('region', None),
            request.app['info_dem'],
        )
        timezone = _validate_number(request.rel_url.query.get('timezone', '1'))
        if not 0 <= int(timezone) <= 25:
            raise ValueError('Invalid timezone')
        sun = request.rel_url.query.get('sun', False)
        if isinstance(sun, str):
            if sun.lower() == 'false':
                sun = False
            else:
                sun = True

    except Exception as e:
        return web.Response(
            text=json.dumps({"message": "Error : {}".format(e)}))

    res = await request.app.loop.run_in_executor(
        request.app["ProcessPool"],
        sunmask,
        request.app['path_info'],
        request.app['info_dem'],
        datetime,
        region,
        timezone,
        sun,
    )

    return web.Response(text=res)


def sunmask(path_info, info_dem, d, region, tz, sun):
    import grass.script as GRASS
    try:
        uid = str(uuid.uuid4()).replace('-', '')
        grass_name = "output_{}".format(uid)
        output_name = os.path.join(path_info['gisdb'], '.'.join([uid, 'tif']))

        if region:
            GRASS.message(
                '--- GRASS GIS 7: Reducing the region')
            GRASS.read_command(
                'g.region',
                n=region['n'],
                s=region['s'],
                e=region['e'],
                w=region['w'],
                nsres=info_dem['nsres'],
                ewres=info_dem['ewres'],
            )

        GRASS.message(
            '--- GRASS GIS 7: Computing sunmask')
        res = GRASS.read_command(
            'r.sunmask',
            elevation='rast_5cb08c8150bbc7',
            year=d[0],
            month=d[1],
            day=d[2],
            hour=d[3],
            minute=d[4],
            timezone=tz,
            output=grass_name,
        )
        print(res)

        GRASS.message(
            '--- GRASS GIS 7: Saving resulting raster layer')
        res = GRASS.read_command(
            'r.out.gdal',
            input=grass_name,
            output=output_name,
            format="GTiff",
            createopt="TFW=YES,COMPRESS=LZW",
        )
        print(res)

        GRASS.message(
            '--- GRASS GIS 7: Remove temporary result raster from GRASS')
        res = GRASS.read_command(
            'g.remove',
            flags='f',
            type='raster',
            name=grass_name,
        )
        print(res)

        if region:
            GRASS.message(
                '--- GRASS GIS 7: Restoring the region')
            GRASS.read_command(
                'g.region',
                n=info_dem['n'],
                s=info_dem['s'],
                e=info_dem['e'],
                w=info_dem['w'],
                nsres=info_dem['nsres'],
                ewres=info_dem['ewres'],
            )

    except Exception as e:
        return json.dumps({"message": "Error : {}".format(e)})

    with rio.open(output_name) as src:
        epsg_value = src.crs.to_epsg()
        image = src.read(1)
        results = [{
            'properties': {'shadow': v},
            'geometry': s,
            'type': 'Feature',
            } for i, (s, v) in enumerate(rio_shapes(
                image, mask=None, transform=src.transform)) if v == 1.0]

    # In this case we want the difference between the region and the
    # computed areas of cast shadow
    if sun:
        region = Polygon([
            (float(region['w']), float(region['s'])),
            (float(region['e']), float(region['s'])),
            (float(region['e']), float(region['n'])),
            (float(region['w']), float(region['n'])),
            (float(region['w']), float(region['s']))
        ])
        shadow_union = unary_union([shape(ft['geometry']) for ft in results])
        results = [{
            'type': 'Feature',
            'geometry': mapping(region.difference(shadow_union)),
            'properties': {'sun': 1.0}
        }]

    with open('/tmp/{}.geojson'.format(uid), 'w') as f:
        f.write(json.dumps({"type": "FeatureCollection", "features": results}))

    p = subprocess.Popen(
        shlex.split(
            'ogr2ogr -s_srs "EPSG:{}" -t_srs "EPSG:4326" '
            '-f GeoJSON /dev/stdout /tmp/{}.geojson'.format(epsg_value, uid)),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    out, err = p.communicate()
    os.remove('/tmp/{}.geojson'.format(uid))
    os.remove(output_name)
    if p.returncode != 0:
        print('Error: ', err)
        return json.dumps({"message": "Error : {}".format(err)})

    return out.decode()


async def sun_wrapper(request):
    try:
        dt = _validate_datetime(
            request.rel_url.query['year'],
            request.rel_url.query['month'],
            request.rel_url.query['day'],
            request.rel_url.query['hour'],
            request.rel_url.query['minute'],
        )
        day = datetime(
            int(dt[0]),
            int(dt[1]),
            int(dt[2]),
        ).timetuple().tm_yday
        time = float(dt[3]) + (float(dt[4]) / 60)
        region = _validate_region(
            request.rel_url.query.get('region', None),
            request.app['info_dem'],
        )
        timezone = _validate_number(request.rel_url.query.get('timezone', '1'))
        if not 0 <= int(timezone) <= 25:
            raise ValueError('Invalid timezone')
        is_sun = request.rel_url.query.get('sun', False)
        if isinstance(sun, str):
            if is_sun.lower() == 'false':
                is_sun = False
            else:
                is_sun = True

    except Exception as e:
        return web.Response(
            text=json.dumps({"message": "Error : {}".format(e)}))

    res = await request.app.loop.run_in_executor(
        request.app["ProcessPool"],
        sun,
        request.app['path_info'],
        request.app['info_dem'],
        day,
        time,
        region,
        timezone,
        is_sun,
    )

    return web.Response(text=res)


def sun(path_info, info_dem, day, time, region, tz, is_sun):
    import grass.script as GRASS
    try:
        uid = str(uuid.uuid4()).replace('-', '')
        grass_name = "output_{}".format(uid)
        output_name = os.path.join(path_info['gisdb'], '.'.join([uid, 'tif']))

        if region:
            GRASS.message(
                '--- GRASS GIS 7: Reducing the region')
            GRASS.read_command(
                'g.region',
                n=region['n'],
                s=region['s'],
                e=region['e'],
                w=region['w'],
                nsres=info_dem['nsres'],
                ewres=info_dem['ewres'],
            )

        GRASS.message(
            '--- GRASS GIS 7: Computing longitude map')

        GRASS.read_command(
            'r.latlong',
            flags='l',
            input='rast_5cb08c8150bbc7',
            output='rast_long_5cb08c8150bbc7',
        )

        GRASS.message(
            '--- GRASS GIS 7: Computing sun incidence')
        res = GRASS.read_command(
            'r.sun',
            elevation='rast_5cb08c8150bbc7',
            long='rast_long_5cb08c8150bbc7',
            day=day,
            time=time,
            civil_time=tz,
            incidout=grass_name,
            nprocs=2,
        )
        print(res)

        GRASS.message(
            '--- GRASS GIS 7: Saving resulting raster layer')
        res = GRASS.read_command(
            'r.out.gdal',
            input=grass_name,
            output=output_name,
            format="GTiff",
            createopt="TFW=YES,COMPRESS=LZW",
        )
        print(res)

        GRASS.message(
            '--- GRASS GIS 7: Remove temporary result raster from GRASS')
        res = GRASS.read_command(
            'g.remove',
            flags='f',
            type='raster',
            name=grass_name,
        )
        print(res)
        res = GRASS.read_command(
            'g.remove',
            flags='f',
            type='raster',
            name='rast_long_5cb08c8150bbc7',
        )
        print(res)
        if region:
            GRASS.message(
                '--- GRASS GIS 7: Restoring the region')
            GRASS.read_command(
                'g.region',
                n=info_dem['n'],
                s=info_dem['s'],
                e=info_dem['e'],
                w=info_dem['w'],
                nsres=info_dem['nsres'],
                ewres=info_dem['ewres'],
            )

    except Exception as e:
        return json.dumps({"message": "Error : {}".format(e)})

    with rio.open(output_name) as src:
        epsg_value = src.crs.to_epsg()
        image = src.read(1)
        image = np.nan_to_num(image)
        image[image >= 1.0] = 1.0
        if is_sun:
            results = [{
                'properties': {'sun': v},
                'geometry': s,
                'type': 'Feature',
                } for i, (s, v) in enumerate(rio_shapes(
                    image, mask=None, transform=src.transform)) if v == 1.0]
        else:
            results = [{
                'properties': {'sun': v},
                'geometry': s,
                'type': 'Feature',
                } for i, (s, v) in enumerate(rio_shapes(
                    image, mask=None, transform=src.transform)) if v != 1.0]

    with open('/tmp/{}.geojson'.format(uid), 'w') as f:
        f.write(json.dumps({"type": "FeatureCollection", "features": results}))

    p = subprocess.Popen(
        shlex.split(
            'ogr2ogr -s_srs "EPSG:{}" -t_srs "EPSG:4326" '
            '-f GeoJSON /dev/stdout /tmp/{}.geojson'.format(epsg_value, uid)),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    out, err = p.communicate()
    os.remove('/tmp/{}.geojson'.format(uid))
    if p.returncode != 0:
        print('Error: ', err)
        return json.dumps({"message": "Error : {}".format(err)})

    return out.decode()


async def make_app(loop, info_dem, addr='0.0.0.0', port='8008'):
    logging.basicConfig(level=logging.INFO)
    app = web.Application(
        loop=loop,
        client_max_size=17408**2,
        middlewares=[error_middleware],
    )
    app['logger'] = logging.getLogger("features.main")
    app['path_info'] = init_grass(info_dem)
    app['info_dem'] = info_dem
    app.add_routes([
        web.get('/sun', sun_wrapper),
        web.get('/sunmask', sunmask_wrapper),
        web.get('/viewshed', interviz_wrapper),
        web.get('/activity-features/{category}', handler_activity_features),
        web.get('/features/{category}/{bbox}', handler_features),
        web.post('/features/{category}', handler_features_post),
        web.post('/parse-clue', handler_clue),
        web.post('/{op}', handler_geom_op),
        web.get('/', index),
        web.static('/', 'dist/'),
    ])
    handler = app.make_handler()
    srv = await loop.create_server(handler, addr, port)
    return srv, app, handler


def main(prefix_data='data/osm/'):
    filename = glob('data/elevation/*.tif')
    info_dem = get_extent_proj(filename[0])

    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
    loop = asyncio.get_event_loop()
    asyncio.set_event_loop(loop)
    srv, app, handler = loop.run_until_complete(make_app(loop, info_dem))

    app['allowed_binary_predicate'] = {
        'intersects',
        'equals',
        'contains',
        'crosses',
        'overlaps',
        'touches',
        'within',
    }

    app['allowed_geom_operation'] = {
        'buffer',
        'intersection',
        'difference',
        'symmetric_difference',
        'unary_union',
    }

    app['allowed_category'] = {
        'RIVER',
        'LAKE',
        'RESERVOIR',
        'ROAD',
        'PATHWAY',
        'POWERLINE',
        'PISTE',
        'PEAK',
        'COL',
        'SKILIFT',
        'CITY',
        'TOWN',
        'VILLAGE',
    }

    app['allowed_activity'] = {
        'ski',
        'randonnee',
        'speleologie',
        'escalade',
        'vtt',
    }
    app['lock'] = asyncio.Lock()
    app['logger'].info('Opening OSM layers in memory...')
    app['layer_RIVER'] = gpd.read_file(
        os.path.join(prefix_data, 'eaux_courantes_choucas.geojson'))
    app['layer_LAKE'] = gpd.read_file(
        os.path.join(prefix_data, 'water_lake_choucas.geojson'))
    app['layer_RESERVOIR'] = gpd.read_file(
        os.path.join(prefix_data, 'water_reservoir_choucas.geojson'))
    app['layer_ROAD'] = gpd.read_file(
        os.path.join(prefix_data, 'routes_choucas.geojson'))
    app['layer_PATHWAY'] = gpd.read_file(
        os.path.join(prefix_data, 'sentiers_choucas.geojson'))
    app['layer_POWERLINE'] = gpd.read_file(
        os.path.join(prefix_data, 'powerline_choucas.geojson'))
    app['layer_PISTE'] = gpd.read_file(
        os.path.join(prefix_data, 'pistes_choucas.geojson'))
    app['layer_PEAK'] = gpd.read_file(
        os.path.join(prefix_data, 'peak_choucas.geojson'))
    app['layer_COL'] = gpd.read_file(
        os.path.join(prefix_data, 'col_choucas.geojson'))
    app['layer_SKILIFT'] = gpd.read_file(
        os.path.join(prefix_data, 'cable_skilift_choucas.geojson'))
    app['layer_CITY'] = gpd.read_file(
        os.path.join(prefix_data, 'city_choucas.geojson'))
    app['layer_TOWN'] = gpd.read_file(
        os.path.join(prefix_data, 'town_choucas.geojson'))
    app['layer_VILLAGE'] = gpd.read_file(
        os.path.join(prefix_data, 'village_choucas.geojson'))

    # Specific layers related to the activity of the victim
    app['layer_activity_ski'] = gpd.read_file(
        os.path.join(
            prefix_data,
            'domaine_station_remontee_ski_choucas_large.geojson'))
    app['layer_activity_speleologie'] = gpd.read_file(
        os.path.join(
            prefix_data,
            'cave_entrance_speleologie_choucas_large.geojson'))
    app['layer_activity_escalade'] = gpd.read_file(
        os.path.join(
            prefix_data,
            'sport_climbing_escalade_choucas_large.geojson'))
    app['layer_activity_vtt'] = gpd.read_file(
        os.path.join(
            prefix_data,
            'mtb_scale_vtt_choucas_large.geojson'))

    app['logger'].info('Creating spatial index for OSM layers...')

    for lyr_name in app['allowed_category']:
        app['index_{}'.format(lyr_name)] = make_index(
            [g.bounds for g in app['layer_{}'.format(lyr_name)].geometry])

    app['logger'].info('Loading spaCy model for French...')
    app['nlp'] = spacy.load('fr_core_news_sm')
    app['ProcessPool'] = ProcessPoolExecutor(1)
    app['logger'].info('Serving on' + str(srv.sockets[0].getsockname()))

    try:
        loop.run_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.close()
        loop.run_until_complete(srv.wait_closed())
        loop.run_until_complete(app.shutdown())
        loop.run_until_complete(handler.shutdown(60.0))
        loop.run_until_complete(app.cleanup())
    loop.close()


if __name__ == '__main__':
    gc.disable()
    main()
