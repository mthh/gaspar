import murmurHash3 from 'murmurhash3js';
import { fromLonLat } from 'ol/proj';
import { getModifFromUrl } from './helpers';
import updateActivityLegend from './legend';
import {
  handleIsaChange,
  handleZlpChange,
  handleClueChange,
  handleVictimChange,
} from './state_handlers';


/**
* Default initial state of the application.
*
*
*/
const App = {
  map: {
    zoom: 10.8,
    center: fromLonLat([5.78, 45.15]),
  },
  map_widget: null,
  initial_search_area: null,
  currentBaseMap: 'OTM',
  victim: null,
  clues: [],
  zlp: null,
};

global.traces = [];
function saveState(current_state, date) {
  const n = { ...current_state, ...{ map_widget: null, date } };
  const o = {};
  Object.keys(n)
    .forEach((k) => {
      if (k) o[k] = n[k];
    });
  global.traces.push(JSON.stringify(o));
}

const [State, stateHandler] = (function makeStateHandler(_modif) {
  let shouldUpdate = true;
  let popstateUpdateGuard = false;
  const _App = { ...App, ..._modif };
  const _State = new Proxy(_App, {
    set(target, key, value) {
      const dt = new Date();
      console.log(`(${dt.toLocaleString()}) INFO : State change requested on key ${key}`);
      saveState(State, dt);
      if (key === 'initial_search_area') {
        handleIsaChange(value, target[key]);
      } else if (key === 'victim') {
        handleVictimChange(value, target[key]);
      } else if (key === 'clues') {
        handleClueChange(value);
      } else if (key === 'map') {
        // Style for activity layer depends on zoom level:
        updateActivityLegend();
      } else if (key === 'currentBaseMap') {
        if (!(State.map_widget) || !(State.map_widget._map)) return;
        State.map_widget.changeBaseMap(value);
      } else if (key === 'ZLP') {
        handleZlpChange(value);
      }
      // Actually change the value:
      target[key] = value; // eslint-disable-line no-param-reassign
      // eslint-disable-next-line no-use-before-define
      if (State.map_widget && State.map_widget._map && !popstateUpdateGuard) updatePermalink();
      return true; // eslint-disable-line
    },
    get(target, key) {
      return target[key];
    },
  });
  const round = (v) => Math.round(v * 100) / 100;

  /**
  * Function triggered each time the state of the application is changing
  * to generate a new corresponding URL.
  *
  */
  const updatePermalink = () => {
    if (!shouldUpdate) {
      // do not update the URL when the view was changed in the 'popstate' handler
      shouldUpdate = true;
      return;
    }
    const map_view = State.map_widget.getMapView();
    const center = map_view.getCenter();
    const state_json = JSON.stringify({
      map: State.map,
      victim: State.victim,
      clues: State.clues,
      initial_search_area: State.initial_search_area,
      currentBaseMap: State.currentBaseMap,
    });
    const hash_obj = murmurHash3.x64.hash128(state_json);
    const hash = `#map=${map_view.getZoom()}/${round(center[0])}/${round(center[1])}/${hash_obj}`;
    if (hash !== window.location.hash) {
      window.history.pushState(JSON.parse(state_json), 'map', hash);
    }
  };

  /**
  * Function triggered when the user click on the 'back' or 'next' button.
  *
  */
  const popstate = (event) => {
    if (event.state === null) {
      return;
    }
    const map_view = State.map_widget.getMapView();
    map_view.setCenter(event.state.map.center);
    map_view.setZoom(event.state.map.zoom);
    shouldUpdate = false;
    popstateUpdateGuard = true;
    State.map.center = event.state.map.center;
    State.map.zoom = event.state.map.zoom;
    State.initial_search_area = event.state.initial_search_area;
    State.victim = event.state.victim;
    State.currentBaseMap = event.state.currentBaseMap;
    State.clues = event.state.clues;
    popstateUpdateGuard = false;
  };
  return [
    _State, {
      updatePermalink,
      popstate,
    },
  ];
}(getModifFromUrl()));

export {
  State,
  stateHandler,
};
