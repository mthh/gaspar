import { GeoJSON } from 'ol/format';
import { toLonLat } from 'ol/proj';
import { area as turf_area } from '@turf/turf';
import uuidv4 from 'uuid/v4';
import DB from './DB';
import { getStyleClueLayer, zlp_default_style } from './layer_styles/default_ol_styles';
import { getItownsStyleClueLayer, defaultZlpStyle } from './layer_styles/default_itowns_styles';
import {
  displayNotification,
  // makeCoveringFeatureFromBBox,
  makeCoveringFeatureFromPolygon,
  toLowerCaseNoAccent,
} from './helpers';
import { all_activities } from './model';
import { fetchFeaturesISA, deleteFeaturesISA } from './init_search_area';
import { deleteFeaturesActivity, updateFeaturesActivity } from './layers_activity';
import updateActivityLegend from './legend';
import { recalculateZLP } from './services_call';
import ZLPInfoWidget from './components/zlp_info_widget';


const addToDB = (features, id) => {
  DB[id] = features;
};

const validateNewValueAgainstSchema = (value, schema_type) => {
  const valid = global.validators[schema_type](value);
  if (!valid) {
    console.log(
      `(${new Date().toLocaleString()}) ERROR : Invalid ${schema_type} element !`,
      global.validators[schema_type].errors,
    );
  }
};

export function handleZlpChange(new_value) {
  // Get the widget on which we are drawing:
  const map_widget = mainPanel.getWidget('map1');
  const itowns_widget = mainPanel.getWidget('itowns-terrain');
  // Get the ZLP widget
  const existing_zlp_widget = mainPanel.getWidget('zlp-info-w');

  // Is there an existing ZLP to delete ?
  const to_delete = Object.keys(DB).find((n) => n.indexOf('zlp_') === 0);

  if (to_delete) {
    map_widget._map.removeLayer(map_widget.layers[to_delete]);
    delete map_widget.layers[to_delete];
    delete DB[to_delete];
    if (itowns_widget) itowns_widget.removeLayer(to_delete);
  }

  if (new_value) {
    const { zlp_id, geometry: zlp_geometry } = new_value;
    addToDB([{
      type: 'Feature',
      geometry: zlp_geometry,
      properties: { zlp_id },
    }], zlp_id);

    // Add the ZLP to the map and to itowns view if any
    // (but we don't want to add an empty ZLP to the terrain view)
    map_widget.addGeojsonLayer(zlp_id, DB[zlp_id], zlp_default_style);
    if (
      itowns_widget
      && !(
        zlp_geometry.type === 'GeometryCollection'
        && zlp_geometry.geometries.length === 0
      )
    ) {
      itowns_widget.addGeojsonLayer({
        type: 'FeatureCollection',
        features: DB[zlp_id],
      }, zlp_id, defaultZlpStyle, true);
    }

    validateNewValueAgainstSchema(new_value, 'zlp');
  }
  // informations on the ZLP
  if (!existing_zlp_widget && new_value) {
    const zlp_widget = new ZLPInfoWidget({ id: 'zlp-info-w' });
    const dock_panel = mainPanel.getWidget('menuRight');
    dock_panel.addWidget(zlp_widget, {
      mode: 'split-bottom',
      ref: dock_panel.widgets[dock_panel.widgets.length - 1], // last dockpanel widget
    });
    zlp_widget.updateContent(new_value);
  } else if (existing_zlp_widget) {
    existing_zlp_widget.updateContent(new_value);
  }
}

export function handleClueChange(new_clues_value) {
  const map_widget = mainPanel.getWidget('map1');
  const { added, hidden, removed } = mainPanel
    .getWidget('menuLeft')
    .updateClues(new_clues_value);
  removed.forEach((clue_id) => {
    map_widget._map.removeLayer(map_widget.layers[clue_id]);
    delete map_widget.layers[clue_id];
    delete DB[clue_id];
  });
  added.forEach((clue_id) => {
    const clue = new_clues_value.find((d) => d.clue_id === clue_id);
    addToDB(clue.corresponding_zone.features, clue_id);
    map_widget.addGeojsonLayer(
      clue_id,
      DB[clue_id],
      getStyleClueLayer(clue.colors.fill, clue.colors.stroke),
    );
  });
  Object.keys(map_widget.layers)
    .forEach((lyr_id) => {
      if (lyr_id.indexOf('clue_') === 0) {
        if (hidden.has(lyr_id)) {
          map_widget.layers[lyr_id].setVisible(false);
        } else {
          map_widget.layers[lyr_id].setVisible(true);
        }
      }
    });
  const itowns_widget = mainPanel.getWidget('itowns-terrain');
  if (itowns_widget) {
    removed.forEach((clue_id) => {
      itowns_widget.removeLayer(clue_id);
    });
    added.forEach((clue_id) => {
      const clue = new_clues_value.find((d) => d.clue_id === clue_id);
      itowns_widget.addGeojsonLayer(
        { type: 'FeatureCollection', features: DB[clue_id] },
        clue_id,
        getItownsStyleClueLayer(clue.colors.fill, clue.colors.stroke),
        !hidden.has(clue_id),
      );
    });
    new_clues_value.forEach((c) => {
      if (hidden.has(c.clue_id)) {
        itowns_widget.setVisibleLayer(c.clue_id, false);
      } else {
        itowns_widget.setVisibleLayer(c.clue_id, true);
      }
    });
  }
  recalculateZLP(new_clues_value)
    .then((result) => {
      if (result !== null) {
        const { geometry, clue_ids } = result;
        // Unique identifier for this new ZLP
        const zlp_id = `zlp_${uuidv4()}`;
        State.ZLP = { // eslint-disable-line no-use-before-define
          zlp_id,
          geometry,
          clue_ids,
        };
      } else {
        State.ZLP = null; // eslint-disable-line no-use-before-define
      }
    })
    .catch((e) => {
      State.ZLP = null; // eslint-disable-line no-use-before-define
      displayNotification(
        `Une erreur s'est produite pendant le calcul de la zone : ${e}`,
        'error',
      );
      console.log(e);
    });

  // Validate the new clue value(s)
  added.forEach((clue_id) => {
    const c = new_clues_value.find((a) => a.clue_id === clue_id);
    validateNewValueAgainstSchema(c, 'clue');
  });
}

export function handleIsaChange(new_isa, old_isa) {
  if (JSON.stringify(new_isa) === JSON.stringify(old_isa)) { return; }
  // Get the widgets on which we are drawing
  const map_widget = mainPanel.getWidget('map1');
  const itowns_widget = mainPanel.getWidget('itowns-terrain');

  const vectorSource = map_widget.layers['isa_layer'].getSource();

  if (old_isa) {
    // Removes the old ISA
    vectorSource
      .getFeatures()
      .forEach((ft) => vectorSource.removeFeature(ft));

    if (itowns_widget) {
      if (itowns_widget) itowns_widget.removeLayer('isa_layer');
    }
    // Remove the reference features corresponding to this search area:
    deleteFeaturesISA();
  }

  if (new_isa === null) {
    // Removes the clues corresponding to this search area:
    State.clues = [];

    // Update the Initial Search Area component with these values:
    mainPanel.getWidget('menuLeft')
      .updateISA(null);

    // Reset the extent of the activity layers
    Object.keys(map_widget.layers)
      .forEach((k) => {
        if (
          k.indexOf('clusters_activity_') === 0
          || k.indexOf('activity_') === 0
          || k.indexOf('additional_') === 0
        ) {
          map_widget.layers[k].setExtent(undefined);
        }
      });
    map_widget._deactivate_pointermove_information();
  } else {
    // Create the corresponding ol Feature to be displayed on the map:
    const feature_bbox = new GeoJSON().readFeature(
      makeCoveringFeatureFromPolygon(new_isa.geometry.coordinates[0]),
      // makeCoveringFeatureFromBBox(new_isa.bbox),
    );
    vectorSource.addFeature(feature_bbox);

    // Restrain the extent of activity layers and possible
    // additional layers
    Object.keys(map_widget.layers)
      .forEach((k) => {
        if (
          k.indexOf('clusters_activity_') === 0
          || k.indexOf('activity_') === 0
          || k.indexOf('additional_') === 0
        ) {
          map_widget.layers[k].setExtent(new_isa.bbox);
        }
      });

    // Fetch the references features within the Initial Search Area :
    let [xmin, ymin, xmax, ymax] = new_isa.bbox;
    [xmin, ymin] = toLonLat([xmin, ymin]).map((v) => v.toFixed(3));
    [xmax, ymax] = toLonLat([xmax, ymax]).map((v) => v.toFixed(3));

    const poly_wgs84 = {
      type: 'Polygon',
      coordinates: [
        new_isa.geometry.coordinates[0].map((c) => toLonLat(c)),
      ],
    };

    fetchFeaturesISA(poly_wgs84)
      .then(() => {
        map_widget._activate_pointermove_information();
      });

    const area = turf_area(poly_wgs84);
    // Update the Initial Search Area component with these values:
    mainPanel.getWidget('menuLeft')
      .updateISA({
        xmin, ymin, xmax, ymax, area,
      });

    // Just for fun, validate the new value against our json schema:
    validateNewValueAgainstSchema(new_isa, 'isa');
  }
}

export function handleVictimChange(new_value, old_value) {
  if (new_value === old_value) { return; }
  if (new_value === null) {
    // Reset the state of the "victim_zone" element
    document.querySelector('i.fa-address-card').style.color = null;
    deleteFeaturesActivity(all_activities.map((a) => toLowerCaseNoAccent(a)));
    updateActivityLegend();
  } else {
    // Just for fun, validate the new value against our json schema:
    validateNewValueAgainstSchema(new_value, 'victim');
    // Change the state of the "victim_zone" element
    document.querySelector('i.fa-address-card').style.color = '#0bc81b';

    const { initial_search_area: isa } = State; // eslint-disable-line no-use-before-define

    const selected_activities = new_value.activity.map((a) => toLowerCaseNoAccent(a));

    const existing_note_widget = mainPanel.getWidget('legendActivityLayer');
    if (selected_activities.length && !existing_note_widget) {
      mainPanel.getWidget('menuRight').addLegendActivityLayer();
    }
    updateFeaturesActivity(
      selected_activities,
      isa ? isa.bbox : null,
    );
    setTimeout(() => { updateActivityLegend(); }, 500);
  }
}
