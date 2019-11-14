import { transform } from 'ol/proj';
import {
  centroid as turf_centroid,
} from '@turf/turf';
import DB from './DB';
import loading_overlay from './components/loading_overlay';


export function callServiceGeocoding({
  place_name,
  osm_key,
  osm_value,
  geo_bias,
}) {
  const url = [
    'http://photon.komoot.de/api/?q=',
    place_name,
    '&lang=fr',
  ];
  if (osm_key && !osm_value) {
    url.push(`&osm_tag=${osm_key}`);
  } else if (osm_key && osm_value) {
    url.push(`&osm_tag=${osm_key}:${osm_value}`);
  } else if (osm_value && !osm_key) {
    url.push(`&osm_tag=:${osm_value}`);
  }
  if (geo_bias) {
    url.push(`&lon=${geo_bias.lon}&lat=${geo_bias.lat}`);
  }
  return fetch(url.join(''))
    .then((res) => res.json());
}


export function callServiceInterviz({
  clue_id,
  geoms,
  instant_duration, // eslint-disable-line no-unused-vars
}) {
  loading_overlay.show('Création de la zone de visibilité...');
  // Use the bbox of the ISA for the computation region
  let [xmin, ymin, xmax, ymax] = State.initial_search_area.bbox;
  [xmin, ymin] = transform([xmin, ymin], 'EPSG:3857', 'EPSG:4326');
  [xmax, ymax] = transform([xmax, ymax], 'EPSG:3857', 'EPSG:4326');
  // const clipping_poly = turf_bboxPolygon([xmin, ymin, xmax, ymax]);
  xmin -= 0.1;
  ymin -= 0.1;
  xmax += 0.1;
  ymax += 0.1;

  // Use the actual ISA to clip the result
  const ring = State.initial_search_area.geometry.coordinates[0]
    .map((c) => transform(c, 'EPSG:3857', 'EPSG:4326'));
  const clipping_poly = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
    properties: {},
  };

  let request;
  if (geoms.length > 1) {
    const query_coords = geoms.map((g) => {
      const c = turf_centroid(g).geometry.coordinates;
      return `(${c[1]},${c[0]})`;
    }).join(',');
    request = `/viewshed?coordinates=${query_coords}&height1=1.0&height2=1.0&region=${xmin},${xmax},${ymin},${ymax}`;
  } else {
    const c = turf_centroid(geoms[0]).geometry.coordinates;
    request = `/viewshed?coordinates=${c[1]},${c[0]}&height1=1.0&height2=1.0&region=${xmin},${xmax},${ymin},${ymax}`;
  }
  return fetch(request)
    .then((r) => r.json())
    .then((_result) => {
      const _geoms = [];
      _result.features.forEach((ft) => {
        if (
          ft.geometry !== undefined
          && ft.geometry.coordinates !== undefined
        ) {
          _geoms.push(ft.geometry);
        }
      });

      const form = new FormData();
      form.append('distance', 0);
      form.append('uncertainty', 2.5);
      form.append('geoms', JSON.stringify(_geoms));

      return fetch('/buffer', {
        method: 'POST',
        body: form,
      }).then((_res) => _res.json())
        .then((_res) => {
          const form2 = new FormData();
          form2.append('geoms', JSON.stringify([_res, clipping_poly.geometry]));
          return fetch('/intersection', {
            method: 'POST',
            body: form2,
          }).then((_intersection_res) => _intersection_res.json())
            .then((_intersection_res) => {
              loading_overlay.hide();
              return [{
                type: 'Feature',
                geometry: _intersection_res,
                properties: { clue_id },
              }];
            });
        });
    });
}

export function callServiceBuffer({
  clue_id,
  geoms,
  instant_duration, // eslint-disable-line no-unused-vars
  distance_to_object,
  uncertainty,
}) {
  loading_overlay.show('Création de la zone tampon...');
  // let [xmin, ymin, xmax, ymax] = State.initial_search_area.bbox;
  // [xmin, ymin] = transform([xmin, ymin], 'EPSG:3857', 'EPSG:4326');
  // [xmax, ymax] = transform([xmax, ymax], 'EPSG:3857', 'EPSG:4326');
  // const clipping_poly = turf_bboxPolygon([xmin, ymin, xmax, ymax]);
  const ring = State.initial_search_area.geometry.coordinates[0]
    .map((c) => transform(c, 'EPSG:3857', 'EPSG:4326'));
  const clipping_poly = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
    properties: {},
  };
  const form = new FormData();
  form.append('geoms', JSON.stringify(geoms));
  form.append('distance', distance_to_object);
  form.append('uncertainty', uncertainty);
  return fetch('/buffer', {
    method: 'POST',
    body: form,
  }).then((_res) => _res.json())
    .then((_res) => {
      const form2 = new FormData();
      form2.append('geoms', JSON.stringify([_res, clipping_poly.geometry]));
      return fetch('/intersection', {
        method: 'POST',
        body: form2,
      }).then((_intersection_res) => _intersection_res.json())
        .then((_intersection_res) => {
          loading_overlay.hide();
          return [{
            type: 'Feature',
            geometry: _intersection_res,
            properties: { clue_id },
          }];
        });
    });
}

export function callServiceSunmask({
  clue_id,
  instant_duration,
  type,
}) {
  const msg = type === 'ombre'
    ? 'Création de la zone d\'ombre projetée à l\'heure saisie...'
    : 'Création de la zone exposée au soleil à l\'heure saisie...';
  loading_overlay.show(msg);
  // Use the bbox of the ISA for the computation region
  let [xmin, ymin, xmax, ymax] = State.initial_search_area.bbox;
  [xmin, ymin] = transform([xmin, ymin], 'EPSG:3857', 'EPSG:4326');
  [xmax, ymax] = transform([xmax, ymax], 'EPSG:3857', 'EPSG:4326');
  // const clipping_poly = turf_bboxPolygon([xmin, ymin, xmax, ymax]);
  xmin -= 0.1;
  ymin -= 0.1;
  xmax += 0.1;
  ymax += 0.1;

  // Use the actual ISA to clip the result
  const ring = State.initial_search_area.geometry.coordinates[0]
    .map((c) => transform(c, 'EPSG:3857', 'EPSG:4326'));
  const clipping_poly = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
    properties: {},
  };

  const reqs = instant_duration.value.map((i) => {
    const d = new Date(i);
    return fetch(`/sun
?year=${d.getYear() + 1900}
&month=${d.getMonth() + 1}
&day=${d.getDate()}
&hour=${d.getHours()}
&minute=${d.getMinutes()}
&region=${xmin},${xmax},${ymin},${ymax}\
${type === 'ombre' ? '' : '&sun=true'}`)
      .then((_r) => _r.json());
  });

  return Promise.all(reqs)
    .then((_results) => {
      const _geoms = [];
      _results.forEach((r) => {
        r.features.forEach((ft) => {
          if (
            ft.geometry !== undefined
            && ft.geometry.coordinates !== undefined
          ) {
            _geoms.push(ft.geometry);
          }
        });
      });

      const form = new FormData();
      form.append('distance', 0);
      form.append('uncertainty', 2.5);
      form.append('geoms', JSON.stringify(_geoms));

      return fetch('/buffer', {
        method: 'POST',
        body: form,
      }).then((_res) => _res.json())
        .then((_res) => {
          const form2 = new FormData();
          form2.append('geoms', JSON.stringify([_res, clipping_poly.geometry]));
          return fetch('/intersection', {
            method: 'POST',
            body: form2,
          }).then((_intersection_res) => _intersection_res.json())
            .then((_intersection_res) => {
              loading_overlay.hide();
              return [{
                type: 'Feature',
                geometry: _intersection_res,
                properties: { clue_id },
              }];
            });
        });
    });
}

export function callServiceParseClue(clue_nl) {
  const form_data = new FormData();
  form_data.append('clue_nl', clue_nl);
  return fetch('/parse-clue', {
    method: 'POST',
    body: form_data,
  }).then((res) => res.json());
}

export function recalculateZLP(clues) {
  // Only take into account clues with a belief value > 0
  // and occuring 'now':
  const clue_ids = clues
    .filter((d) => d.belief > 0)
    .filter((d) => d.instant_or_duration.type.indexOf('now') > -1)
    .map((d) => d.clue_id);

  // There is a ZLP to compute only if there is more than 1 clue
  if (clue_ids.length > 1) {
    loading_overlay.show('Calcul de la Zone de Localisation Probable ...');

    // The ZLP is currently the intersection between every clues
    const form = new FormData();
    form.append(
      'geoms',
      JSON.stringify(clue_ids.map((n) => DB[n][0].geometry)),
    );
    return fetch('/intersection', {
      method: 'POST',
      body: form,
    }).then((_res) => _res.json())
      .then((geometry) => {
        loading_overlay.hide();
        if (
          geometry.type === 'GeometryCollection'
          && geometry.geometries.length === 0
        ) {
          return null;
        }
        return {
          geometry,
          clue_ids,
        };
      });
  }
  return Promise.resolve(null);
}
