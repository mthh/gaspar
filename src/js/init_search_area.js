import { GeoJSON } from 'ol/format';
import { Vector as Vector_layer } from 'ol/layer';
import { Vector } from 'ol/source';
import swal from 'sweetalert';
import Toastify from 'toastify-js';
import uuidv4 from 'uuid/v4';
import DB from './DB';
import {
  tree_feature_default_style as default_style,
  tree_feature_default_style_pt as default_style_pt,
} from './layer_styles/default_ol_styles';
import { displayNotification, getRingExtent } from './helpers';
import { ref_categories } from './model';
import DrawingToolbox from './components/drawing_toolbox_widget';

export const click_use_current_bbox = () => {
  const [
    xmin, ymin, xmax, ymax,
  ] = State.map_widget.getMapView().calculateExtent();

  State.initial_search_area = {
    isa_id: `isa_${uuidv4()}`,
    bbox: [xmin, ymin, xmax, ymax],
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [xmin, ymin],
          [xmax, ymin],
          [xmax, ymax],
          [xmin, ymax],
          [xmin, ymin],
        ],
      ],
    },
  };
};

export const set_isa_from_polygon = (feature) => {
  const coords = feature.geometry.coordinates[0]; // Only use the exterior ring
  State.initial_search_area = {
    isa_id: `isa_${uuidv4()}`,
    bbox: getRingExtent(coords),
    geometry: {
      type: 'Polygon',
      coordinates: [coords.reverse()],
    },
  };
};

export const click_delete_current_zone = (ev) => { // eslint-disable-line no-unused-vars
  const el = document.createElement('div');
  el.innerHTML = '<p><b>Suppression de la Zone Initiale de Recherche</b></p>Attention, tous les indices vont également être supprimé. Voulez-vous continuer ?';
  swal({
    // title: 'Suppression de la Zone Initiale de Recherche',
    buttons: {
      cancel: {
        text: 'Annulation',
        value: false,
        visible: true,
        closeModal: true,
      },
      confirm: {
        text: 'OK',
        value: true,
        closeModal: true,
      },
    },
    content: el,
    dangerMode: true,
    icon: 'info',
  }).then((value) => {
    if (value) {
      State.initial_search_area = null;
    }
  });
};


const checkOldISAcontainsNewIsa = (old_isa, new_isa) => {
  const form_data = new FormData();
  form_data.append('geoms1', JSON.stringify([old_isa]));
  form_data.append('geoms2', JSON.stringify([new_isa]));

  return fetch('/contains', { method: 'POST', body: form_data })
    .then((table_res) => table_res.json())
    .then((table_res) => table_res[0][0]);
};

export const click_reduce_current_zone = () => {
  const el = document.createElement('div');
  el.innerHTML = '<p><b>Redimmensionnement de la Zone Initiale de Recherche</b></p>La nouvelle ZIR doit être inclue dans les limites de la zone définie précédemment.';
  swal({
    // title: 'Suppression de la Zone Initiale de Recherche',
    buttons: {
      cancel: {
        text: 'Annulation',
        value: false,
        visible: true,
        closeModal: true,
      },
      confirm: {
        text: 'OK',
        value: true,
        closeModal: true,
      },
    },
    content: el,
    dangerMode: true,
    icon: 'info',
  }).then((value) => {
    if (value) {
      const map_widget = mainPanel.getWidget('map1');
      let t = Toastify({
        text: 'Cliquez sur l\'outil souhaité (menu de droite) puis dessinez la zone sur la carte',
        duration: 60000,
        close: false,
        gravity: 'top',
        position: 'center',
        backgroundColor: '#5bc0de',
      });
      t.showToast();
      // What to do if the user wants to cancel this operation
      const oncancel = () => {
        t.hideToast();
        map_widget.removeDrawInteraction();
        mainPanel.getWidget('drawingToolbox').close();
      };
      // What to do with the drawn feature from user
      const ondrawend = (res) => {
        const _ft_webmercator = res[1];
        const ft_webmercator = JSON.parse(_ft_webmercator);
        checkOldISAcontainsNewIsa(
          State.initial_search_area.geometry,
          ft_webmercator.geometry,
        ).then((contains) => {
          if (contains) {
            t.hideToast();
            swal({
              text: 'Utiliser la zone dessinée comme Zone Initiale de Recherche?',
              buttons: true,
            }).then((valid) => {
              map_widget.removeDrawInteraction();
              if (valid) {
                mainPanel.getWidget('drawingToolbox').close();
                set_isa_from_polygon(ft_webmercator);
                // Clip the existing clue layers with the new Initial Search Area
                const ps = State.clues.map((c) => {
                  const form = new FormData();
                  form.append('geoms', JSON.stringify([
                    ...c.corresponding_zone.features.map((ft) => ft.geometry),
                    JSON.parse(res[0]).geometry,
                  ]));
                  return fetch('/intersection', {
                    method: 'POST',
                    body: form,
                  }).then((_intersection_res) => _intersection_res.json());
                });
                // Fetch all the results
                Promise.all(ps)
                  .then((results) => {
                    // Replace the clues zones and id
                    // (updating them on the map is automatic when the state is modified)
                    State.clues = State.clues.map((c, i) => {
                      c.clue_id = `clue_${uuidv4()}`; // eslint-disable-line no-param-reassign
                      c.corresponding_zone.features = [{ // eslint-disable-line no-param-reassign
                        type: 'Feature',
                        geometry: results[i],
                        properties: {
                          clue_id: c.clue_id,
                        },
                      }];
                      return c;
                    });
                  });
              } else {
                t = Toastify({ // eslint-disable-line no-param-reassign
                  text: 'Cliquez sur l\'outil souhaité (menu de droite) puis dessinez la zone sur la carte',
                  duration: 60000,
                  close: false,
                  gravity: 'top',
                  position: 'center',
                  backgroundColor: '#5bc0de',
                });
                t.showToast();
              }
            });
          } else {
            t.hideToast();
            map_widget.removeDrawInteraction();
            t = Toastify({
              text: 'La zone doit être contenue dans l\'ancienne zone. Cliquez sur l\'outil souhaité (menu de droite) puis dessinez la zone sur la carte',
              duration: 60000,
              close: false,
              gravity: 'top',
              position: 'center',
              backgroundColor: 'linear-gradient(to right, #d22373, #d22323)',
            });
            t.showToast();
          }
        });
      };
      // Add the drawing toolbox on the right menu :
      mainPanel.getWidget('menuRight').addWidget(
        new DrawingToolbox({
          id: 'drawingToolbox',
          map_widget,
          oncancel,
          ondrawend,
        }),
        {
          mode: 'split-top',
        },
      );
    }
  });
};

export const click_use_drawing_toolbox = () => {
  if (mainPanel.getWidget('drawingToolbox')) return;
  const map_widget = mainPanel.getWidget('map1');
  let t = Toastify({
    text: 'Cliquez sur l\'outil souhaité (menu de droite) puis dessinez la zone sur la carte',
    duration: 60000,
    close: false,
    gravity: 'top',
    position: 'center',
    backgroundColor: '#5bc0de',
  });
  t.showToast();
  const ondrawend = (res) => {
    const ft_webmercator = res[1];
    t.hideToast();
    swal({
      text: 'Utiliser la zone dessinée comme Zone Initiale de Recherche?',
      buttons: true,
    }).then((valid) => {
      map_widget.removeDrawInteraction();
      if (valid) {
        mainPanel.getWidget('menuRight').widgets().next().close();
        set_isa_from_polygon(JSON.parse(ft_webmercator));
      } else {
        t = Toastify({
          text: 'Cliquez sur l\'outil souhaité (menu de droite) puis dessinez la zone sur la carte',
          duration: 60000,
          close: false,
          gravity: 'top',
          position: 'center',
          backgroundColor: '#5bc0de',
        });
        t.showToast();
      }
    });
  };
  // What to do if the user wants to cancel this operation
  const oncancel = () => {
    t.hideToast();
    map_widget.removeDrawInteraction();
    mainPanel.getWidget('drawingToolbox').close();
  };
  // Add the drawing toolbox on the right menu :
  mainPanel.getWidget('menuRight').addWidget(
    new DrawingToolbox({
      id: 'drawingToolbox',
      oncancel,
      ondrawend,
      map_widget,
    }),
    {
      mode: 'split-top',
    },
  );
};


export const deleteFeaturesISA = (categories) => {
  (categories || ref_categories).forEach((category) => {
    const name_layer = `ref_${category}`;
    DB[name_layer] = null;
    delete DB[name_layer];
    State.map_widget._map.removeLayer(State.map_widget.layers[name_layer]);
    delete State.map_widget.layers[name_layer];
  });
  mainPanel.getWidget('features-tree').updateEntries();
};

export const fetchFeaturesISA = (geom, categories) => {
  const treeWidget = mainPanel.getWidget('features-tree');
  const p = (categories || ref_categories)
    .map((category) => {
      const body = new FormData();
      body.append('geometry', JSON.stringify(geom));
      return fetch(`/features/${category}`, { method: 'POST', body })
        .then((res) => res.json())
        .then((res) => {
          res.features.forEach((ft) => {
            ft.properties['CHOUCAS_CLASS'] = category; // eslint-disable-line no-param-reassign, dot-notation
            if (!ft.properties.osm_id) {
              ft.properties.osm_id = ft.properties.id; // eslint-disable-line no-param-reassign
            }
          });
          DB[`ref_${category}`] = res.features;
          State.map_widget.layers[`ref_${category}`] = new Vector_layer({
            renderBuffer: 200,
            zIndex: ref_categories.indexOf(category),
            source: new Vector({
              features: (new GeoJSON()).readFeatures(
                res, { featureProjection: 'EPSG:3857' },
              ),
            }),
            style: (ft) => {
              const geom_type = ft.getGeometry().getType();
              if (['Point', 'MultiPoint'].indexOf(geom_type) > -1) {
                return default_style_pt;
              }
              return default_style;
            },
          });
          State.map_widget._map.addLayer(State.map_widget.layers[`ref_${category}`]);
          return [category, res.features];
        });
    });
  // Temporarily disabled the button(s) allowing to unset the initial search area
  // until the features from this one are fetched
  document.querySelectorAll('.isa_set')
    .forEach((el) => {
      el.classList.add('disabled');
    });
  treeWidget.toogleLoader(true);

  return Promise.all(p)
    .then((results) => {
      // Load the entries in the tree once they have been added to the map,
      // remove the loader located on the tree to indicate
      // we are done wite loading these objects
      treeWidget.updateEntries(results);
      treeWidget.toogleLoader(false);
      // Reactivate the button(s) allowing to unset the initial search area
      document.querySelectorAll('.isa_set')
        .forEach((el) => {
          el.classList.remove('disabled');
        });
    })
    .catch((e) => {
      displayNotification(
        `Une erreur s'est produite pendant la récupération des objets de la zone initiale : ${e}`,
        'error',
      );
      console.log(e);
    });
};
