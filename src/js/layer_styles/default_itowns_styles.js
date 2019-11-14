export const defaultZlpStyle = {
  fill: {
    color: 'rgb(250, 12, 12)',
    opacity: 0.3,
  },
  stroke: {
    color: 'rgb(250, 12, 12)',
    width: 2,
  },
};

export const defaultISAStyle = {
  fill: {
    color: 'rgb(255, 255, 255)',
    opacity: 0.0,
  },
  stroke: {
    color: 'rgb(255, 255, 255)',
    width: 3,
  },
};

export const getItownsStyleClueLayer = (fill, stroke) => ({
  fill: {
    color: fill,
    opacity: 0.6,
  },
  stroke: {
    color: stroke,
    width: 2,
  },
});
