import Toastify from 'toastify-js';

/**
* Parse the window URL to reconstruct the state (zoom / center)
* of the map. Returns an object if it succeed or null otherwise.
*
*/
export function getModifFromUrl() {
  if (window.location.hash !== '') {
    // try to use center and zoom-level from the URL
    const hash = window.location.hash.replace('#map=', '');
    const parts = hash.split('/');
    if (parts.length === 4) {
      return {
        map: {
          zoom: parseInt(parts[0], 10),
          center: [
            parseFloat(parts[1]),
            parseFloat(parts[2]),
          ],
        },
      };
    }
  }
  return null;
}

/**
*
* @param {String} coords_str - Coordinates in one string, separated by
*                              a comma, like '12.21, 34.09'.
* @return {Object} The GeoJSON constructed from this coordinates.
*
*/
export const makePtFeature = (coords_str) => {
  const coordinates = coords_str.split(',').map((n) => +(n.trim()));
  return {
    type: 'Feature',
    properties: {
      origin: 'click',
    },
    geometry: {
      coordinates,
      type: 'Point',
    },
  };
};

/**
* Get the bounding box (xmin, ymin, xmax, ymax) of a LineString or the bounding box
* of the ring of a Polygon.
*
* @param {Array} ring - The ring on which computing the extent.
* @return {Array} The bbox as [xmin, ymin, xmax, ymax];
*
*/
export const getRingExtent = (ring) => {
  const n_coords = ring.length;
  let [xmin, ymin, xmax, ymax] = [Infinity, Infinity, -Infinity, -Infinity];
  let i;
  let x;
  let y;
  for (i = 0; i < n_coords; i++) {
    [x, y] = ring[i];
    if (x > xmax) xmax = x;
    else if (x < xmin) xmin = x;
    if (y > ymax) ymax = y;
    else if (y < ymin) ymin = y;
  }
  return [xmin, ymin, xmax, ymax];
};

/**
* Returns a GeoJSON Feature which geometry is intended to covers the whole
* world (in Web-Mercator), excepted the surface of the bbox given in argument.
*
* @param {array} bbox - The bbox of the initial search area.
* @return {object} - The corresponding GeoJSON feature
*
*/
export const makeCoveringFeatureFromBBox = ([xmin, ymin, xmax, ymax]) => ({
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-20026376, -20048966],
        [20026376, -20048966],
        [20026376, 20048966],
        [-20026376, 20048966],
        [-20026376, -20048966],
      ],
      [[xmin, ymin], [xmax, ymin], [xmax, ymax], [xmin, ymax], [xmin, ymin]],
    ],
  },
});

/**
* Returns a GeoJSON Feature which geometry is intended to covers the whole
* world (in Web-Mercator), excepted the surface of the bbox given in argument.
*
* @param {array} bbox - The bbox of the initial search area.
* @return {object} - The corresponding GeoJSON feature
*
*/
export const makeCoveringFeatureFromPolygon = (ring) => ({
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-20026376, -20048966],
        [20026376, -20048966],
        [20026376, 20048966],
        [-20026376, 20048966],
        [-20026376, -20048966],
      ],
      ring.reverse(),
    ],
  },
});

/**
* Returns wheter the argument is (or can be casted to) a finite number.
*
* @param {unknown} n
* @return {boolean}
*
*/
export const is_num = (n) => (typeof n === 'number'
  ? !Number.isNaN(n)
  : !Number.isNaN(n) && !Number.isNaN(parseFloat(n)));

/**
  * Move the caret at the end of the editable element given in argument.
  *
  * @param {HTMLElement} editable_elem - The bbox of the initial search area.
  * @return {void}
  *
  */
export const setCaretEnd = (editable_elem) => {
  const range = document.createRange();
  const sel = window.getSelection();
  const line = editable_elem.childNodes[editable_elem.childNodes.length - 1];
  range.setStart(line, line.textContent.length);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
};

export const pipe = (...fns) => (x) => fns.reduce((y, f) => f(y), x);

export const withConstructor = (constructor) => (o) => ({
  // create the delegate [[Prototype]]
  __proto__: {
    // add the constructor prop to the new [[Prototype]]
    constructor,
  },
  // mix all o's props into the new object
  ...o,
});

/**
* Format a Date Object to string according to https://tools.ietf.org/html/rfc3339
* (code from https://stackoverflow.com/questions/7244246/generate-an-rfc-3339-timestamp-similar-to-google-tasks-api)
*
* @param {Date} d - The Date to be formated.
* @return {str}
*
*/
export const formatDateString = (d) => {
  const pad = (n) => (n < 10 ? `0${n}` : n);
  return `${d.getUTCFullYear()}-${
    pad(d.getUTCMonth() + 1)}-${
    pad(d.getUTCDate())}T${
    pad(d.getUTCHours())}:${
    pad(d.getUTCMinutes())}:${
    pad(d.getUTCSeconds())}Z`;
};

export const ONE_HOUR = 1000 * 60 * 60;

export const substractTime = (d, ms) => new Date(d.getTime() - ms);

export const toLowerCaseNoAccent = (str) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
* Try to parse a JSON string into. Returns an Array of two elements :
* like [true, data] if parsing suceeded or like [false, error] if it failed.
*
* @param {String} txt - The JSON string to be parsed.
* @return {Array} An Array of two element, this first one is a Boolean (wheter
* parsing the string sucedded or not) and the second is the resulting object or
* the error thrown.
*/
export const isValidJSON = (txt) => {
  try {
    return [true, JSON.parse(txt)];
  } catch (e) {
    return [false, e];
  }
};

/**
* Debounce a function execution.
*
* @param {Function} func - The function to be executed after the debounce time.
* @param {Number} wait - The amount of time to wait after the last
*                         execution and before executing `func`.
* @param {Object} context - Context in which to call `func`.
* @return {Function} The resulting debounced function.
*/
export function debounce(func, wait, context) {
  let result;
  let timeout = null;
  return function executedFunction(...args) {
    const ctx = context || this;
    const later = () => {
      timeout = null;
      result = func.apply(ctx, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    return result;
  };
}

/**
*
*
*
*
*
*/
export function filterObj(obj1, obj2) {
  const result = {};
  Object.keys(obj1)
    .forEach((key) => {
      if (obj2[key] !== obj1[key]) {
        result[key] = obj2[key];
      }
      if (Array.isArray(obj2[key]) && Array.isArray(obj1[key])) {
        result[key] = filterObj(obj1[key], obj2[key]);
      }
      if (typeof obj2[key] === 'object' && typeof obj1[key] === 'object') {
        result[key] = filterObj(obj1[key], obj2[key]);
      }
    });

  return result;
}

const type_to_color = new Map([
  ['error', 'linear-gradient(to right, #d22373, #d22323)'],
  ['success', 'linear-gradient(to right, #00b09b, #96c93d)'],
  ['info', '#5bc0de'],
]);

/**
* Display a non blocking notification using Toastify.
*
* @param {String} msg - The content of the message to display.
* @param {String} type_message - The type of the message, within {'error', 'info', 'success'}.
* @param {Number} duration - The duration before closing this notification.
* @return {Void}
*
*/
export function displayNotification(msg, type_message = 'info', duration = 3000) {
  Toastify({
    text: msg,
    duration,
    close: true,
    gravity: 'top',
    position: 'center',
    backgroundColor: type_to_color.get(type_message.toLowerCase()),
  }).showToast();
}

/**
* Converts chainIterator (used by some phosphor.js widgets)
* to an Array.
*
* @param {chainIterator} chain_iter - The chainIterator to convert.
* @return {Array} A regular Array with the content
*                 collected while iterating on the input.
*/
export function chainIterToArray(chain_iter) {
  const result = [];
  let a;
  while (a = chain_iter.next()) { // eslint-disable-line no-cond-assign
    result.push(a);
  }
  return result;
}

export function getChildrenWidgets(parent_widget, id) {
  // SplitPanel and DockPanel doesn't provide the same interface to
  // access their widgets:
  const list_widgets = Array.isArray(parent_widget.widgets)
    ? parent_widget.widgets
    : chainIterToArray(parent_widget.widgets());
  let result_widget = list_widgets.find((w) => w.id === id);
  if (result_widget) return result_widget;
  list_widgets.forEach((_w) => {
    if (!_w.widgets) return;
    const r = getChildrenWidgets(_w, id);
    if (r) result_widget = r;
  });
  return result_widget;
}

/**
* Count the number of each item in arr, returns an object with keys being
* items of 'arr' and values being the number of time each one was encountered
* Example :
* ```
* let c = counter(['foo', 'bar', 'foo']);
* console.log(c); // {"foo": 2, "bar": 1}
* ```
* @param {Array} arr - The array on which conting the items.
* @return {Object}
*/
export function counter(arr) {
  const o = {};
  const n_elem = arr.length;
  for (let i = 0; i < n_elem; i++) {
    const item = arr[i];
    if (o[item]) {
      o[item] += 1;
    } else {
      o[item] = 1;
    }
  }
  return o;
}
