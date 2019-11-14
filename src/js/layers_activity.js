import { GeoJSON } from 'ol/format';
import { Vector as Vector_layer } from 'ol/layer';
import { Cluster, Vector } from 'ol/source';
import { Point } from 'ol/geom';
import { Feature } from 'ol';
import { centroid as turf_centroid } from '@turf/turf';
import Zet from 'zet';
import {
  default_style_domaine_skiable,
  default_style_remontee,
  default_style_pt_escalade,
  default_style_pt_speleologie,
  default_style_vtt_lo_reso,
  default_style_vtt_hi_reso,
  getStyleClusterSki,
  getStyleClusterEscalade,
  getStyleClusterSpeleologie,
} from './layer_styles/activity_styles';
import DB from './DB';
import { displayNotification } from './helpers';
import updateActivityLegend from './legend';


export const deleteFeaturesActivity = (names) => {
  names.forEach((activity_name) => {
    if (State.map_widget.layers[`activity_${activity_name}`]) {
      const k = `activity_${activity_name}`;
      State.map_widget._map.removeLayer(State.map_widget.layers[k]);
      delete State.map_widget.layers[k];
      delete DB[k];
    }
    if (State.map_widget.layers[`clusters_activity_${activity_name}`]) {
      const k = `clusters_activity_${activity_name}`;
      State.map_widget._map.removeLayer(State.map_widget.layers[k]);
      delete State.map_widget.layers[k];
    }
  });
};

const type_rendering = {
  ski: 'clusters+points',
  speleologie: 'clusters+points',
  escalade: 'clusters+points',
  // randonnee: 'lines',
  vtt: 'lines',
};


export const updateFeaturesActivity = (categories, extent_isa) => {
  // Compute the difference between the current activity layers and the
  // requested activity layers in order to delete/fetch the appropriate ones
  const already_rendered = new Zet(
    Object.keys(State.map_widget.layers)
      .filter((n) => n.indexOf('activity_') === 0)
      .map((n) => n.replace('activity_', '')),
  );
  const requested = new Zet(categories || []);
  const to_delete = already_rendered.difference(requested);
  const to_fetch = requested.difference(already_rendered);

  // First removes the activity layers to be deleted
  deleteFeaturesActivity(to_delete);
  // Then prepare a promise for each activity layer to be fetched
  const ps = to_fetch
    .map((category) => {
      if (!type_rendering[category]) {
        displayNotification(
          `Pas de données supplémentaires pour l'activité "${category}"`,
          'error',
        );
      }
      return fetch(`/activity-features/${category}`)
        .then((res) => res.json())
        .then((res) => {
          const { map_widget } = State;
          const fts = [];
          res.features.forEach((ft) => {
            if (type_rendering[category] === 'clusters+points') {
              if (category === 'ski' && ['LineString', 'MultiLineString'].indexOf(ft.geometry.type) > -1) return;
              const pt = turf_centroid(ft);
              fts.push(
                new Feature(
                  new Point(pt.geometry.coordinates).transform('EPSG:4326', 'EPSG:3857'),
                ),
              );
            }
            ft.properties['CHOUCAS_CLASS'] = category; // eslint-disable-line no-param-reassign, dot-notation
            if (!ft.properties.osm_id) {
              ft.properties.osm_id = ft.properties.id; // eslint-disable-line no-param-reassign
            }
          });
          DB[`activity_${category}`] = res.features;

          if (type_rendering[category] === 'clusters+points') {
            const clusterSource = new Cluster({
              distance: 50,
              source: new Vector({
                features: fts,
              }),
            });

            if (category === 'ski') {
              map_widget.layers[`clusters_activity_${category}`] = new Vector_layer({
                source: clusterSource,
                style: getStyleClusterSki,
              });

              map_widget.layers[`activity_${category}`] = new Vector_layer({
                source: new Vector(),
                style: (ft, reso) => {
                  if (reso < 40) {
                    return ft.getGeometry().getType().indexOf('LineString') > -1
                      ? default_style_remontee
                      : default_style_domaine_skiable;
                  }
                  return null;
                },
              });
            } else if (category === 'speleologie') {
              map_widget.layers[`clusters_activity_${category}`] = new Vector_layer({
                source: clusterSource,
                style: getStyleClusterSpeleologie,
              });

              map_widget.layers[`activity_${category}`] = new Vector_layer({
                source: new Vector(),
                style: (ft, reso) => {
                  if (reso < 40) {
                    return default_style_pt_speleologie;
                  }
                  return null;
                },
              });
            } else if (category === 'escalade') {
              map_widget.layers[`clusters_activity_${category}`] = new Vector_layer({
                source: clusterSource,
                style: getStyleClusterEscalade,
              });

              map_widget.layers[`activity_${category}`] = new Vector_layer({
                source: new Vector(),
                style: (ft, reso) => {
                  if (reso < 40) {
                    return default_style_pt_escalade;
                  }
                  return null;
                },
              });
            }

            map_widget.layers[`activity_${category}`].getSource().addFeatures(
              new GeoJSON().readFeatures(res, { featureProjection: 'EPSG:3857' }),
            );

            if (extent_isa) {
              map_widget.layers[`clusters_activity_${category}`].setExtent(extent_isa);
              map_widget.layers[`activity_${category}`].setExtent(extent_isa);
            }

            map_widget._map.addLayer(map_widget.layers[`clusters_activity_${category}`]);
            map_widget._map.addLayer(map_widget.layers[`activity_${category}`]);
          } else if (type_rendering[category] === 'lines') {
            if (category === 'vtt') {
              map_widget.layers[`activity_${category}`] = new Vector_layer({
                source: new Vector(),
                style: (ft, reso) => {
                  if (reso < 60) {
                    return default_style_vtt_lo_reso;
                  }
                  return default_style_vtt_hi_reso;
                },
              });
            } else if (category === 'randonnee') {
              // TODO !
            }
            map_widget.layers[`activity_${category}`].getSource().addFeatures(
              new GeoJSON().readFeatures(res, { featureProjection: 'EPSG:3857' }),
            );
            if (extent_isa) {
              map_widget.layers[`activity_${category}`].setExtent(extent_isa);
            }
            map_widget._map.addLayer(map_widget.layers[`activity_${category}`]);
          }
        });
    });
  // Resolve all promises and
  // then updates the legend once all the activity layers have been aded
  Promise.all(ps)
    .then(() => {
      updateActivityLegend();
    });
};
