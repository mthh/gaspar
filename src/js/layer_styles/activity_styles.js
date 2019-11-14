import {
  Circle, Fill, Stroke, Style, Text,
} from 'ol/style';


/* Styles for layers used by "Ski" activity */
export const default_style_domaine_skiable = new Style({
  stroke: new Stroke({
    color: 'rgba(51, 153, 204, 0.9)',
    width: 0.75,
  }),
  fill: new Fill({
    color: 'rgba(51, 153, 204, 0.4)',
  }),
});

export const default_style_remontee = new Style({
  stroke: new Stroke({
    color: 'rgba(4, 4, 4, 0.9)',
    width: 2,
  }),
});

const styleCacheSki = {};

export const getStyleClusterSki = (feature, reso) => {
  if (reso > 40) {
    const size = feature.get('features').length;
    let style = styleCacheSki[size];
    if (!style) {
      style = new Style({
        image: new Circle({
          radius: 15,
          stroke: new Stroke({
            color: '#fff',
          }),
          fill: new Fill({
            color: '#3399CC',
          }),
        }),
        text: new Text({
          text: size.toString(),
          fill: new Fill({
            color: '#fff',
          }),
        }),
      });
      styleCacheSki[size] = style;
    }
    return style;
  }
  return null;
};


/* Styles for layers used by "Escalade" activity */
export const default_style_pt_escalade = new Style({
  image: new Circle({
    radius: 8,
    stroke: new Stroke({
      color: 'rgba(58, 202, 91, 1)',
    }),
    fill: new Fill({
      color: 'rgba(58, 202, 91, 0.9)',
    }),
  }),
});

const styleCacheEscalade = {};

export const getStyleClusterEscalade = (feature, reso) => {
  if (reso > 40) {
    const size = feature.get('features').length;
    let style = styleCacheEscalade[size];
    if (!style) {
      style = new Style({
        image: new Circle({
          radius: 15,
          stroke: new Stroke({
            color: '#fff',
          }),
          fill: new Fill({
            color: '#056b1f',
          }),
        }),
        text: new Text({
          text: size.toString(),
          fill: new Fill({
            color: '#fff',
          }),
        }),
      });
      styleCacheEscalade[size] = style;
    }
    return style;
  }
  return null;
};


/* Styles for layers used by "Speleologie" activity */
export const default_style_pt_speleologie = new Style({
  image: new Circle({
    radius: 8,
    stroke: new Stroke({
      color: 'rgba(163, 82, 41, 1)',
    }),
    fill: new Fill({
      color: 'rgba(163, 82, 41, 0.9)',
    }),
  }),
});

const styleCacheSpeleologie = {};

export const getStyleClusterSpeleologie = (feature, reso) => {
  if (reso > 40) {
    const size = feature.get('features').length;
    let style = styleCacheSpeleologie[size];
    if (!style) {
      style = new Style({
        image: new Circle({
          radius: 15,
          stroke: new Stroke({
            color: '#fff',
          }),
          fill: new Fill({
            color: '#a35229',
          }),
        }),
        text: new Text({
          text: size.toString(),
          fill: new Fill({
            color: '#fff',
          }),
        }),
      });
      styleCacheSpeleologie[size] = style;
    }
    return style;
  }
  return null;
};


/* Styles for layers used by "VTT" activity */
export const default_style_vtt_hi_reso = new Style({
  stroke: new Stroke({
    color: 'rgba(255, 20, 147, 1)',
    width: 2.75,
  }),
});
export const default_style_vtt_lo_reso = new Style({
  stroke: new Stroke({
    color: 'rgba(255, 20, 147, 1)',
    width: 2.25,
  }),
});
