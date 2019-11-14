import {
  Circle, Fill, Stroke, Style,
} from 'ol/style';
import { default_tree_colors } from '../model';

export const isa_default_style = new Style({
  stroke: new Stroke({
    color: 'orange',
  }),
  fill: new Fill({
    color: 'rgba(234, 237, 255, 0.8)',
  }),
});

export const tree_feature_default_style = new Style({
  stroke: new Stroke({
    color: 'rgba(12, 12, 200, 0.05)',
    width: 0.75,
  }),
  fill: new Fill({
    color: 'rgba(12, 12, 200, 0.05)',
  }),
});

export const tree_feature_default_style_pt = new Style({
  image: new Circle({
    radius: 5,
    stroke: new Stroke({
      color: 'rgba(12, 12, 200, 0.01)',
      width: 0,
    }),
    fill: new Fill({
      color: 'rgba(12, 12, 200, 0.01)',
    }),
  }),
});

export const zlp_default_style = new Style({
  stroke: new Stroke({
    color: 'red',
    width: 4,
  }),
  fill: new Fill({
    color: 'rgba(250, 12, 12, 0.4)',
  }),
});

const cache_hover_style = {
  circle: (cat) => new Style({
    image: new Circle({
      radius: 5,
      stroke: new Stroke({
        color: default_tree_colors.get(cat) || 'red',
        width: 4,
      }),
    }),
  }),
  default: (cat) => new Style({
    stroke: new Stroke({
      color: default_tree_colors.get(cat) || 'red',
      width: 4,
    }),
  }),
};

export const getHoverStyle = (ft) => {
  const cat = ft.getProperties()['CHOUCAS_CLASS'];
  return ['Point', 'MultiPoint'].indexOf(ft.getGeometry().getType()) > -1
    ? cache_hover_style.circle(cat)
    : cache_hover_style.default(cat);
};

export const getAdditionalLayerStyle = (ft, color) => (
  ['Point', 'MultiPoint'].indexOf(ft.getGeometry().getType()) === 0
    ? new Style({
      image: new Circle({
        radius: 5,
        stroke: new Stroke({
          color,
          width: 4,
        }),
      }),
    })
    : new Style({
      stroke: new Stroke({ color, width: 4 }),
    })
);

export const getStyleClueLayer = (fillColor, strokeColor, strokeWidth = 1.5) => new Style({
  stroke: new Stroke({
    color: strokeColor,
    width: strokeWidth,
  }),
  fill: new Fill({
    color: fillColor,
  }),
});
