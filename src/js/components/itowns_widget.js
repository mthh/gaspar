import * as THREE from 'three';
import * as itowns from 'itowns';
import { transform } from 'ol/proj';
import { Widget } from '@phosphor/widgets';
import DB from '../DB';
import {
  defaultZlpStyle,
  defaultISAStyle,
} from '../layer_styles/default_itowns_styles';
import ContextMenu from './context_menu';


const A = 40487.57;
const B = 0.00007096758;
const C = 91610.74;
const D = -40465.7;
const math_min = Math.min;
const altitudeFromZoomLevel = (zl) => C * (((A - D) / (zl - D) - 1) ** (1 / B));

const makeItownsLayer = (parsedData, name, style) => new itowns.ColorLayer(
  name, {
    name,
    // transparent: true,
    style: style || defaultZlpStyle,
    source: new itowns.FileSource({
      parsedData,
    }),
  },
);

const globe_context_menu = new ContextMenu();

export default class ItownsWidget extends Widget {
  constructor(options) { // eslint-disable-line no-unused-vars
    super();
    this.id = options.id;
    this.addClass('container-map');
    this.timeoutHandle = null;
    this.title.label = 'Vue 3d';
    this.title.closable = true;
  }

  onAfterShow(msg) { // eslint-disable-line no-unused-vars
    console.log('onAfterShow');
    this._create_terrain();
    this.update();
    // Avoid the first resize by binding
    // the onResize event slightly later.. :
    setTimeout(() => {
      this.onResize = this._onResize;
    }, 1000);
  }

  onAfterAttach(msg) { // eslint-disable-line no-unused-vars
    if (this.isVisible) {
      console.log('onAfterAttach and visible');
      this._create_terrain();
      this.update();
      // Avoid the first resize by binding
      // the onResize event slightly later.. :
      setTimeout(() => {
        this.onResize = this._onResize;
      }, 1000);
    }
  }

  onAfterHide() {
    console.log('onAfterHide');
    this.node.classList.remove('active');
    this.node.querySelectorAll('*')
      .forEach((el) => { el.remove(); });
    delete this.view;
    this.view = null;
    // Reset onResize to no-op :
    this.onResize = () => {};
  }

  _onResize(msg) {
    // TODO: Fix it, controls are buggy after resizing the container div
    if (this.isVisible && this.view) {
      this.view.mainLoop.gfxEngine.width = msg.width;
      this.view.mainLoop.gfxEngine.height = msg.height;
      this.view.mainLoop.gfxEngine.fullSizeRenderTarget.setSize(msg.width, msg.height);
      this.view.mainLoop.gfxEngine.renderer.setSize(msg.width, msg.height);
      this.view.camera.update(msg.width, msg.height);
      this.view.notifyChange();
      console.log('Resized itwons view');
    }
  }

  _add_building_layer() {
    let meshes = [];
    const scaler = function update() {
      let i;
      let mesh;
      if (meshes.length) {
        this.view.notifyChange(this.view.camera.camera3D, true);
      }
      for (i = 0; i < meshes.length; i++) {
        mesh = meshes[i];
        if (mesh) {
          mesh.scale.z = math_min(1.0, mesh.scale.z + 0.1);
          mesh.updateMatrixWorld(true);
        }
      }
      meshes = meshes.filter((m) => m.scale.z < 1);
    };
    this.view.addFrameRequester(itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER, scaler);
    return this.view.addLayer(new itowns.GeometryLayer('WFS Building', new THREE.Group(), {
      update: itowns.FeatureProcessing.update,
      convert: itowns.Feature2Mesh.convert({
        batchId: (property, featureId) => featureId,
        altitude: (p) => p.z_min - p.hauteur,
        extrude: (p) => p.hauteur,
        color: new THREE.Color(0xb3aa93),
      }),
      onMeshCreated: function scaleZ(mesh) {
        mesh.scale.z = 0.01; // eslint-disable-line no-param-reassign
        meshes.push(mesh);
      },
      filter: (p) => !!p.hauteur,
      overrideAltitudeInToZero: true,
      source: new itowns.WFSSource({
        url: 'https://wxs.ign.fr/3ht7xcw6f7nciopo16etuqp2/geoportail/wfs?',
        version: '2.0.0',
        typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie,BDTOPO_BDD_WLD_WGS84G:bati_industriel',
        projection: 'EPSG:4326',
        ipr: 'IGN',
        format: 'application/json',
        zoom: { min: 13, max: 16 },
      }),
    }));
  }

  addGeojsonLayer(layer, layer_id, style_info, visible, crs_in = 'EPSG:4326') {
    return itowns.GeoJsonParser.parse(JSON.stringify(layer), {
      buildExtent: true,
      crsIn: crs_in,
      crsOut: this.view.tileLayer.extent.crs,
      mergeFeatures: true,
      withNormal: false,
      withAltitude: false,
    }).then((parsedData) => {
      const data_layer = makeItownsLayer(parsedData, layer_id, style_info);
      data_layer.visible = visible;
      return this.view.addLayer(data_layer);
    });
  }

  removeLayer(layer_name) {
    if (!this.view) return;
    const lyr = this.view.getLayers().find((l) => l.name === layer_name);
    if (!lyr) return;
    this.view.removeLayer(lyr.id);
  }

  setVisibleLayer(layer_name, visible) {
    if (!this.view) return;
    const lyr = this.view.getLayers().find((l) => l.name === layer_name);
    if (!lyr) return;
    lyr.visible = visible;
    this.view.notifyChange(lyr);
  }

  // updateDisplayedCluesLayers() {
  //   const current_clues_layers = this.view
  //     .filter(d => d.name.indexOf('clue_') > -1 || d.name.indexOf('zlp_') > -1);
  // }

  _create_terrain() {
    setTimeout(() => {
      const [longitude, latitude] = transform(State.map.center, 'EPSG:3857', 'EPSG:4326');
      const altitude = altitudeFromZoomLevel(State.map.zoom);
      const viewerDiv = document.createElement('div');
      viewerDiv.id = 'terrain';
      viewerDiv.className = 'map active';
      this.node.appendChild(viewerDiv);
      const view = new itowns.GlobeView(viewerDiv, {
        longitude,
        latitude,
        altitude,
      });
      view.controls.setTilt(45, true);
      // view.notifyChange();
      view.addLayer(new itowns.ColorLayer('ORTHO', {
        source: new itowns.WMTSSource({
          protocol: 'wmts',
          url: 'http://wxs.ign.fr/3ht7xcw6f7nciopo16etuqp2/geoportail/wmts',
          name: 'ORTHOIMAGERY.ORTHOPHOTOS',
          tileMatrixSet: 'PM',
          format: 'image/jpeg',
          projection: 'EPSG:3857',
          zoom: { min: 0, max: 17 },
        }),
      }));

      view.addLayer(new itowns.ElevationLayer('MNT_WORLD', {
        source: new itowns.WMTSSource({
          protocol: 'wmts',
          url: 'http://wxs.ign.fr/3ht7xcw6f7nciopo16etuqp2/geoportail/wmts',
          name: 'ELEVATION.ELEVATIONGRIDCOVERAGE',
          tileMatrixSet: 'WGS84G',
          format: 'image/x-bil;bits=32',
          projection: 'EPSG:4326',
          zoom: { min: 0, max: 11 },
        }),
      }));

      view.addLayer(new itowns.ElevationLayer('MNT_HIGHRES', {
        source: new itowns.WMTSSource({
          protocol: 'wmts',
          url: 'http://wxs.ign.fr/3ht7xcw6f7nciopo16etuqp2/geoportail/wmts',
          name: 'ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES',
          tileMatrixSet: 'WGS84G',
          format: 'image/x-bil;bits=32',
          projection: 'EPSG:4326',
          zoom: { min: 11, max: 14 },
        }),
      })).then(() => {
        // First, add a layer to show the Initial Search Area
        this.addGeojsonLayer({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: State.initial_search_area.geometry,
            },
          ],
        }, 'isa_layer', defaultISAStyle, true, 'EPSG:3857');
        // TODO : also add the additional layers (activity layers +
        // layers added by the user ?)
        const layer_ids = Object.keys(DB)
          .filter((n) => n.indexOf('zlp_') === 0 || n.indexOf('clue_') === 0);
        layer_ids.forEach((layer_id) => {
          let style_info;
          let visible;
          if (layer_id.indexOf('clue_') === 0) {
            const clue_data = State.clues.find((d) => d.clue_id === layer_id);
            // Don't display the clue layer if belief < 1 or if user explicitely asked
            // to not display it
            visible = clue_data.belief > 0 && !!clue_data.visible;
            const _style_info = clue_data.colors;
            style_info = {
              fill: {
                color: _style_info.fill,
                opacity: 0.2,
              },
              stroke: {
                color: _style_info.stroke,
              },
            };
          } else {
            style_info = defaultZlpStyle;
            visible = true;
          }
          this.addGeojsonLayer({
            type: 'FeatureCollection',
            features: DB[layer_id],
          }, layer_id, style_info, visible);
        });
      });
      this.view = view;
      document.querySelector('div#terrain.map')
        .addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          globe_context_menu.showMenu(e, document.body, [
            { name: 'Quitter la vue 3D', action: () => { this.close(); } },
          ]);
        });
    }, 125);
  }
}
