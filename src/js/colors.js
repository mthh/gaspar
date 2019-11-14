import { is_num } from './helpers';

function hue2rgb(p, q, t) {
  let _t = t;
  if (_t < 0) _t += 1;
  if (_t > 1) _t -= 1;
  if (_t < 1 / 6) return p + (q - p) * 6 * _t;
  if (_t < 1 / 2) return q;
  if (_t < 2 / 3) return p + (q - p) * (2 / 3 - _t) * 6;
  return p;
}

// Copy-paste from https://gist.github.com/jdarling/06019d16cb5fd6795edf
//   itself adapted from http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
export const randomColor = (() => {
  const golden_ratio_conjugate = 0.618033988749895;
  let _h = Math.random();

  const hslToRgb = (h, s, l) => {
    let r;
    let g;
    let b;

    if (s === 0) {
      r = g = b = l; // eslint-disable-line no-multi-assign
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return `#${Math.round(r * 255).toString(16)}${Math.round(g * 255).toString(16)}${Math.round(b * 255).toString(16)}`;
  };

  return function getRandomColor() {
    _h += golden_ratio_conjugate;
    _h %= 1;
    return hslToRgb(_h, 0.5, 0.60);
  };
})();


/**
* Convert rgb color to hexcode.
*
* @param {string} rgb - The RGB color.
* @return {string} - The color as an hexcode.
*
*/
export function rgb2hex(rgb) {
// Originally from  http://jsfiddle.net/mushigh/myoskaos/
  if (typeof rgb === 'string') {
    if (rgb.indexOf('#') > -1 || rgb.indexOf('rgb') < 0) {
      return rgb;
    }
    const _rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
    return (_rgb && _rgb.length === 4) ? `#${
      (`0${parseInt(_rgb[1], 10).toString(16)}`).slice(-2)
    }${(`0${parseInt(_rgb[2], 10).toString(16)}`).slice(-2)
    }${(`0${parseInt(_rgb[3], 10).toString(16)}`).slice(-2)}` : '';
  }
  return (rgb && rgb.length === 3) ? `#${
    (`0${parseInt(rgb[0], 10).toString(16)}`).slice(-2)
  }${(`0${parseInt(rgb[1], 10).toString(16)}`).slice(-2)
  }${(`0${parseInt(rgb[2], 10).toString(16)}`).slice(-2)}` : '';
}

/**
* Convert color hexcode to RGB code.
*
* @param {string} hex - The input hexcode.
* @param {string} out - The output format between "string" and "array"
* @return {string|array} - the rgb color as a string or as an array.
*
*/
export function hex2rgb(hex, out, transp) {
  // Originally from http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
  const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!res) {
    return null;
  }
  if (out === 'string') {
    return (transp !== undefined && is_num(transp))
      ? `rgba(${parseInt(res[1], 16)},${parseInt(res[2], 16)},${parseInt(res[3], 16)},${transp})`
      : `rgb(${parseInt(res[1], 16)},${parseInt(res[2], 16)},${parseInt(res[3], 16)})`;
  }
  return (transp !== undefined && is_num(transp))
    ? [parseInt(res[1], 16), parseInt(res[2], 16), parseInt(res[3], 16), +transp]
    : [parseInt(res[1], 16), parseInt(res[2], 16), parseInt(res[3], 16)];
}

export const ColorsSelected = {
  // These colors came from "Pastel1" and "Pastel2" coloramps from ColorBrewer
  colorCodes: ['#b3e2cd', '#fdcdac', '#cbd5e8', '#f4cae4', '#e6f5c9', '#fff2ae', '#f1e2cc', '#cccccc',
    '#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec', '#f2f2f2'],
  // In order to avoid randomly returning the same color
  // as the last one, at least for the first layers
  seen: new Set(),
  random(to_rgb = false) {
    const nb_color = this.colorCodes.length;
    let { seen } = this;
    let result_color = this.colorCodes[0];
    let attempts = 40; // To avoid a while(true) if it went wrong for any reason
    if (seen.size === nb_color) {
      seen = new Set();
    }
    while (attempts > 0) {
      const ix = Math.round(Math.random() * (nb_color - 1));
      result_color = this.colorCodes[ix];
      if (!(seen.has(result_color))) {
        seen.add(result_color);
        break;
      } else {
        attempts -= 1;
      }
    }
    return to_rgb ? hex2rgb(result_color) : result_color;
  },
};


const getRandomNumber = (low, high) => Math.floor(Math.random() * (high - low + 1)) + low;

/**
* HSL to RGB using optimized conversion
* (reference : https://en.wikipedia.org/wiki/HSL_and_HSV#HSL_to_RGB_alternative)
* @param {number} h - Hue in range [0,360].
* @param {number} s - Saturation in range [0,1].
* @param {number} l - lightness in range [0,1].
*/
const hsl2hexrgb = (h, s, l) => {
  const a = s * Math.min(l, 1 - l);
  const f = (n, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, 0)).join('')}`;
};

/**
* Generate a random color from hue, saturation and lightness ranges.
*
* @param {array} h - The range for hue value (max range is [0, 360]).
* @param {array} s - The range for saturation value (max range is [0, 100]).
* @param {array} l - The range for lightness value (max range is [0, 100]).
* @return {string} - The generated color as a rgb hex code.
*
*/
export function getRandomColor2(h, s, l) {
  const hue = getRandomNumber(h[0], h[1]);
  const saturation = getRandomNumber(s[0], s[1]);
  const lightness = getRandomNumber(l[0], l[1]);
  return hsl2hexrgb(hue, saturation / 100, lightness / 100);
}
