import '../css/card.css';
import '../css/clue.css';
import 'rangeslider-pure/dist/range-slider.min.css';
import uuidv4 from 'uuid/v4';
import chroma from 'chroma-js';
import rangeSlider from 'rangeslider-pure';
import makeFakeSelectElement from './components/fake_select';
import {
  callServiceBuffer,
  callServiceInterviz,
  callServiceSunmask,
} from './services_call';
import { default_tree_colors } from './model';
import {
  displayNotification, formatDateString, ONE_HOUR, substractTime,
} from './helpers';
import { getRandomColor2, hex2rgb, rgb2hex } from './colors';
import { makeSectionTarget, getTabFromClue, getTargetFromClue } from './clue_transformation';


const default_options = {
  selector: 'body',
  infos: null,
  cb_success: null,
};

const default_simple_clue_informations = {
  belief: '',
  visible: '',
  clue_natural_language: '',
  colors: {
    fill: '',
    stroke: '',
  },
  site: 'Victime',
  target: null,
  spatial_relation_service_options: {},
  spatial_relation_type: '',
  timestamp: '',
};


function fetchClueInformations(card, target) {
  const date_now = new Date();
  const c = { ...default_simple_clue_informations };
  c.clue_id = `clue_${uuidv4()}`;
  c.timestamp = formatDateString(date_now);
  c.site = 'Victime';
  c.belief = +card.querySelector('#belief-step').value;
  c.target = target;
  c.visible = true;
  c.spatial_relation_type = card.querySelector('label.active').children[0].value;

  // Fetch the informations about the instant or the duration:
  const instant_duration_elem = card.querySelector('.fake-select > .head > .content');
  const type_instant_duration = instant_duration_elem.getAttribute('value');

  // We are storing the kind of "instant or duration" and the real corresponding datetime,
  // This allows to compute the ZLP for all the clue which takes place "now"
  // (even if the date of creation when "now" is selected is slightly not the same)
  c.instant_or_duration = {
    type: type_instant_duration,
  };
  if (type_instant_duration === 'instant-now') {
    c.instant_or_duration.value = [
      formatDateString(date_now),
    ];
  } else if (type_instant_duration === 'instant-past') {
    const value_past = +instant_duration_elem.querySelector('input').value;
    c.instant_or_duration.value = [
      formatDateString(substractTime(date_now, value_past * ONE_HOUR)),
    ];
  } else if (type_instant_duration === 'duration-instant-to-now') {
    const value_past = +instant_duration_elem.querySelector('input').value;
    c.instant_or_duration.value = [
      formatDateString(substractTime(date_now, value_past * ONE_HOUR)),
      formatDateString(date_now),
    ];
  } else if (type_instant_duration === 'duration-instant-to-instant') {
    const values_past = Array.from(
      instant_duration_elem.querySelectorAll('input'),
    ).map((el) => +el.value);
    c.instant_or_duration.value = [
      formatDateString(substractTime(date_now, values_past[0] * ONE_HOUR)),
      formatDateString(substractTime(date_now, values_past[1] * ONE_HOUR)),
    ];
  } // TODO: handle the two next cases where the user
  // inputs a specific datetime
  // else if (type_instant_duration === 'instant-precise') {
  //
  // } else if (type_instant_duration === 'duration-precise') {
  //
  // }

  if (c.spatial_relation_type === 'Proximité immédiate') {
    c.spatial_relation_service_options = {
      distance_to_object: +card.querySelector('#dist-buffer-input').value,
      uncertainty: +card.querySelector('#uncertainty-buffer-input').value,
    };
  } else if (c.spatial_relation_type === 'Ombre / Soleil') {
    let value_ombre_soleil = Array.from(card
      .querySelectorAll('input[name="sunshadowchoice"]'))
      .filter((el) => el.checked)
      .map((el) => el.parentNode.querySelector('label').innerHTML)[0];
    value_ombre_soleil = value_ombre_soleil === 'au soleil' ? 'soleil' : 'ombre';
    c.spatial_relation_service_options = {
      type_zone: value_ombre_soleil,
    };
    // c.target = { type: value_ombre_soleil };
  }
  const selected_color = chroma(card.querySelector('.color_hex').value);
  c.colors = {
    fill: selected_color.alpha(0.15).css(),
    stroke: selected_color.alpha(1).css(),
  };
  return c;
}

function bindColorButtons(card) {
  const square_color = card.querySelector('.color_square');
  const input_hex_color = card.querySelector('.color_hex');
  input_hex_color.onchange = function hex_color_change() {
    const v = this.value;
    if (v && ( // eslint-disable-line no-mixed-operators
      v.startsWith('rgb') && v.endsWith(')')) || ( // eslint-disable-line no-mixed-operators
      v.startsWith('#') && v.length === 7)
    ) {
      square_color.style.backgroundColor = v;
    }
  };

  square_color.onclick = function square_color_click() {
    const self = this;
    const this_color = self.style.backgroundColor;
    const input_col = document.createElement('input');
    input_col.setAttribute('type', 'color');
    input_col.setAttribute('value', rgb2hex(this_color));
    input_col.className = 'color_input';
    input_col.onchange = (change) => {
      self.style.backgroundColor = hex2rgb(change.target.value, 'string');
      input_hex_color.value = change.target.value;
    };
    input_col.dispatchEvent(new MouseEvent('click'));
  };
}

/**
* Function used when a clue is modified to determine if we need to recompute
* the corresponding zone (as in some case we can directly change some paramaters
* like the color of the zone and so on..). The result depends on the type
* of spatial relation (Voit, Et à proximité immédiate, Ombre/Soleil, etc.)
* because (for example) changing the instant/duration property
* for "Ombre/Soleil" spatial relation needs to recompute the corresponding zone
* while changing it for "Proximité immédiate" doesn't.
*
* @param {Object} old_clue - The Object holding informations about the clue before modification
*                            (or empty informations if the user is creating a new clue).
* @param {Object} new_clue - The Object holding informations about the clue after the user
*                             validated it.
* @return {Object} - An Object with two fields (hasOldClue and needToComputeZone).
*
*/
function compareClues(old_clue, new_clue) {
  const hasOldClue = !!old_clue.corresponding_zone;
  // If there is no old clue data we can return early
  if (!(old_clue.corresponding_zone)) return { hasOldClue, needToComputeZone: true };

  // In any case, if the clue isn't the same in natural language or
  // if the spatial relation kind is not the same or
  // if the target of that relation isn't the same ..
  // ... we need to recompute the corresponding zone and we can return now :
  if (old_clue.clue_natural_language !== new_clue.clue_natural_language) {
    return { hasOldClue, needToComputeZone: true };
  }
  if (old_clue.target !== new_clue.target) {
    return { hasOldClue, needToComputeZone: true };
  }
  if (
    old_clue.spatial_relation_type !== new_clue.spatial_relation_type
  ) return { hasOldClue, needToComputeZone: true };

  // We are going to check the specific parameters for each
  // kind of spatial relation
  if (old_clue.spatial_relation_type === 'Proximité immédiate') {
    // We need to recompute this kind of clue
    // if one of the distance or uncertainty parameter changed
    if (
      (
        old_clue.spatial_relation_service_options.distance_to_object
        !== new_clue.spatial_relation_service_options.distance_to_object
      ) || (
        old_clue.spatial_relation_service_options.uncertainty
        !== new_clue.spatial_relation_service_options.uncertainty
      )
    ) {
      return { hasOldClue, needToComputeZone: true };
    }
  } else if (old_clue.spatial_relation_type === 'Ombre / soleil') {
    // We need to recompute this kind of clue
    // if the zone type changed (ombre / soleil)
    // and also if the instant / duration changed
    if (
      (old_clue.spatial_relation_service_options.type_zone
        !== new_clue.spatial_relation_service_options.type_zone)
      || (old_clue.instant_or_duration !== new_clue.instant_or_duration)
    ) {
      return { hasOldClue, needToComputeZone: true };
    }
  }
  // Once we verified that, we don't need to recompute the zone if
  // one of these parameters changed
  // (as they have no effect on the geometry of the computed zone)
  if (
    (old_clue.belief !== new_clue.belief)
    || (old_clue.colors !== new_clue.colors)
    || (old_clue.instant_or_duration !== new_clue.instant_or_duration)
  ) {
    return {
      hasOldClue,
      needToComputeZone: false,
      keepId: (old_clue.instant_or_duration === new_clue.instant_or_duration),
    };
  }

  // Recompute the zone in all other cases
  return { hasOldClue, needToComputeZone: true };
}

/**
* Select the appropriate service given a spatial relation and prepare
* the appropriates parameters.
*
* @param {object} data_clue - The data corresponding to the clue for which we
*                             want to compute the zone.
* @return {object} - An object with two fields, 'func_service' and 'parameters',
*                    respectively the service to be called and its paramaters
*                    given the data clue provided.
*/
function prepareOptionsForSpatialRelationService(data_clue) {
  const p = { ...data_clue.spatial_relation_service_options };
  let func_service;
  if (data_clue.spatial_relation_type === 'Proximité immédiate') {
    func_service = callServiceBuffer;
    if (data_clue.target.type === 'ESR') {
      p.geoms = [data_clue.target.feature.geometry];
    } else { // data_clue.target.type === 'ESC'
      p.geoms = data_clue.target.features.map((ft) => ft.geometry);
    }
    p.clue_id = data_clue.clue_id;
  } else if (data_clue.spatial_relation_type === 'Voir') {
    func_service = callServiceInterviz;
    if (data_clue.target.type === 'ESR') {
      p.geoms = [data_clue.target.feature.geometry];
    } else { // data_clue.target.type === 'ESC'
      p.geoms = data_clue.target.features.map((ft) => ft.geometry);
    }
    p.clue_id = data_clue.clue_id;
  } else if (data_clue.spatial_relation_type === 'Ombre / Soleil') {
    func_service = callServiceSunmask;
    p.instant_duration = data_clue.instant_or_duration;
    p.type = data_clue.spatial_relation_service_options.type_zone;
    p.clue_id = data_clue.clue_id;
  }
  return {
    func_service,
    parameters: p,
  };
}

function bindButtonsCard(card, cb_success, target, existing_info) {
  card.querySelector('.btn-chcs-confirm').onclick = () => { // eslint-disable-line no-param-reassign
    const data_clue = fetchClueInformations(card, target);
    // Compare the clue data before opening the clue window and now:
    const { hasOldClue, needToComputeZone, keepId } = compareClues(existing_info, data_clue);

    // Remove the existing clue if any
    if (hasOldClue) {
      const old_clue_id = existing_info.clue_id;
      State.clues.splice(
        State.clues.findIndex((el) => el.clue_id === old_clue_id),
        1,
      );
      State.clues = [].concat(State.clues);
    }

    if (needToComputeZone) {
      const {
        func_service, parameters,
      } = prepareOptionsForSpatialRelationService(data_clue);
      // Call the service allowing to transform the clue in some area(s)
      func_service(parameters)
        .then((features) => {
          // Update the clue object with the zone corresponding to this clue
          data_clue.corresponding_zone = {
            features,
            type: 'ZLC',
          };
          // Update the state object with this new clue:
          State.clues = [
            ...State.clues,
            data_clue,
          ];
        })
        .catch((e) => {
          displayNotification(
            `Une erreur s'est produite pendant le calcul de la zone : ${e}`,
            'error',
          );
          console.log(e);
        });
    } else { // No need to recompute the zone...
      // Retrieve the corresponding and already computed zone
      // on the existing data clue
      data_clue.corresponding_zone = existing_info.corresponding_zone;
      // Don't change the ID if the user only changed the color or the belief
      if (keepId) {
        data_clue.clue_id = existing_info.clue_id;
      }
      // Update the state object with this new clue:
      State.clues = [
        ...State.clues,
        data_clue,
      ];
      // TODO : we shouldn't recompute the ZLP after that if the ID didn't changed
      // (the ZLP already reference clues it's coming from, but we are throwing
      // the ZLP anyway for now...)
    }
    card.remove();
    if (cb_success) cb_success();
  };

  card.querySelector('.btn-chcs-cancel').onclick = () => { // eslint-disable-line no-param-reassign
    card.remove();
  };
}

function makeButtonsClue(names, checked) {
  return `
    <div class="btn-group btn-group-toggle" data-toggle="buttons">
      ${names.map((n, i) => `<label role="tab" class="btn btn-chcs-cluetype ${checked.indexOf(i) > -1 ? 'active' : ''}">
          <input type="checkbox" name="activity_${n}" id="cluetype_${n}" value="${n}" ${checked.indexOf(i) > -1 ? 'checked' : ''} />${n}</label>`).join('\n')}
    </div>`;
}

function bindButtonsCluetype(card) {
  const btns = card.querySelectorAll('.btn-chcs-cluetype');
  btns.forEach((el) => {
    el.children[0].onchange = () => { // eslint-disable-line no-param-reassign
      if (!el.classList.contains('active')) {
        btns.forEach((elem) => { elem.classList.remove('active'); });
        el.classList.add('active');
        const v = el.children[0].value;
        card.querySelectorAll('.card-clue-specifc-params')
          .forEach((elem) => { elem.classList.add('hidden'); });
        if (v === 'Ombre / Soleil') {
          card.querySelector('#params-service-sunmask').classList.remove('hidden');
        } else if (v === 'Proximité immédiate') {
          card.querySelector('#params-service-prochede').classList.remove('hidden');
        } else if (v === 'Voir') {
          card.querySelector('#params-service-voit').classList.remove('hidden');
        }
      }
    };
  });
}

function makeRadio(labels, name, ix_checked = 0) {
  return labels.map((label, i) => `
      <div class="pretty p-icon p-round">
          <input type="radio" name=${name} ${i === ix_checked ? 'checked' : ''}/>
          <div class="state p-primary">
              <i class="icon fas fa-check"></i>
              <label>${label}</label>
          </div>
      </div>
      `).join('');
}

function makeSpecificClueParams(active_tab, target_info, tab_options = {}) {
  const value_dist_buffer = tab_options.distance_to_object || 0;
  const value_uncertainty = tab_options.uncertainty || 100;
  const value_sun_shadow = tab_options.type_zone && tab_options.type_zone === 'ombre' ? 1 : 0;
  return `<div
    class="card-clue-specifc-params ${active_tab === 'Voir' ? '' : 'hidden'}"
    id="params-service-voit">
    <div class="card-text center card-clue-section">
        <div class="card-text" style="text-align:left;"><p><i><b>La victime voit ...</i></b></p>
        <div class="card-text-target" style="width: 90%;">
          ${makeSectionTarget(target_info)}
        </div>
      </div>
    </div>
  </div>

  <div class="card-clue-specifc-params center ${active_tab === 'Proximité immédiate' ? '' : 'hidden'}" id="params-service-prochede">
    <div class="card-text center card-clue-section">
      <div class="card-text" style="text-align:left;"><p><i><b>La victime est proche de ...</i></b></p>
        <div class="card-text-target" style="width: 90%;">
        ${makeSectionTarget(target_info)}
        </div>
      </div>
      <div style="text-align: center;">
        <div class="form-group row">
          <div class="col-sm-2"></div>
          <label for="dist-buffer-input" class="col-sm-4 col-form-label">Distance estimée</label>
          <div class="col-sm-3">
            <input
              type="number"
              min="0"
              step="10"
              value="${value_dist_buffer}"
              class="form-control"
              id="dist-buffer-input" />
          </div>
          <span class="card-clue-dist-unit col-sm-1">m</span>
          <div class="col-sm-2"></div>
        </div>
        <div class="form-group row">
          <div class="col-sm-2"></div>
          <label for="uncertainty-buffer-input" class="col-sm-4 col-form-label">Rayon d'incertitude</label>
          <div class="col-sm-3">
            <input
              type="number"
              min="5"
              step="10"
              value="${value_uncertainty}"
              class="form-control"
              id="uncertainty-buffer-input" />
          </div>
          <span class="card-clue-dist-unit col-sm-1">m</span>
          <div class="col-sm-2"></div>
        </div>
      </div>
    </div>
  </div>

  <div class="card-clue-specifc-params center ${active_tab === 'Ombre / Soleil' ? '' : 'hidden'}" id="params-service-sunmask">
    <div class="card-text center card-clue-section">
      <div style="text-align:left;"><p><i><b>La victime est dans une zone ...</i></b></p></div>
    </div>
    ${makeRadio(['au soleil', 'à l\'ombre'], 'sunshadowchoice', value_sun_shadow)}
  </div>`;
}

export default function createBoxClue(options) {
  // const params = Object.assign({}, default_options, options);
  const params = { ...default_options, ...options };
  const root = document.createElement('div');
  const clue_nl = params.infos && params.infos.clue_natural_language
    ? `"... ${params.infos.clue_natural_language}"` : '';
  const spatial_relation_types = ['Voir', 'Proximité immédiate', 'Ombre / Soleil', 'Entendre'];
  const tab = params.infos && params.infos.spatial_relation_type
    ? params.infos.spatial_relation_type
    : getTabFromClue(clue_nl);
  params.infos.target = params.infos && params.infos.target
    ? params.infos.target
    : getTargetFromClue(clue_nl, tab);
  root.className = 'card-container overlay';
  // Check if there is an existing color (if re-opening an existing clue)
  // if not, check if there is a predefined color for this category of objects,
  // if not, generate a random color:
  //          with hue in range [25,335] (avoids red color already used for ZLP)
  //          with saturation in range [90-100]
  //          and with fixed lightness of 25.
  // (the user is able to change the color later)
  const color = params.infos.colors
    ? chroma(params.infos.colors.fill).alpha(1).hex()
    : (
      default_tree_colors.get(params.infos.target.category)
      || getRandomColor2([25, 335], [90, 100], [25, 25])
    );
  console.log(color, params);
  root.innerHTML = `
  <div class="card card-clue center">
    <div class="card-header">
      <div class="card-clue-title">Création d'indice - Relation de localisation simple</div>
    </div>
    ${makeButtonsClue(spatial_relation_types, [spatial_relation_types.indexOf(tab)])}
    <div class="card-body">
      <div class="card-text">
        ${makeSpecificClueParams(tab, options.infos.target, options.infos.spatial_relation_service_options)}
      </div>
      <hr>
      <div style="display: flex;">
        <div style="width: 50%;">
          <div class="card-title center"><span class="card-section-title">Confiance</span></div>
          <div class="card-texcard-clue-belief" style="padding-top: 16px;">
            <div style="margin: auto; width: 60px;">
              <input type="range" id="belief-step" />
            </div>
            <div style="margin: auto; width: 120px;">
              <span style="float:left;">Faible</span><span style="float:right;">Forte</span>
            </div>
          </div>
        </div>
        <div style="width: 60%;">
          <div class="card-title center" style="margin-bottom: 0;">
            <span class="card-section-title">Instant ou durée</span>
          </div>
          <div class="card-text card-clue-instantduration center" style="margin-top: 0;">
          </div>
        </div>
      </div>
      <hr>
      <div class="card-title center"></div>
      <div class="card-text" style="width: 70%;">
        ${makeRadio([
    'Utiliser le service adapté',
    'Creation d\'un buffer autour du(des) objet(s)',
    'Dessiner la zone correspondante...',
    // 'Afficher seulement le(s) objet(s)',
  ], 'consideration-type')}
      </div>
      <hr style="display:${clue_nl !== '' ? 'block' : 'none'};">
      <div style="display:${clue_nl !== '' ? 'block' : 'none'};">
        <span class="center">Rappel de l'indice en langue naturelle :</span>
        <div class="card-clue-nl">
          <p>${clue_nl}</p>
        </div>
      </div>

      <hr>
      <div>
        <span class="center">Couleur d'affichage de l'indice :</span>
        <p class="color_square" style="background-color: ${color}"></p>
        <input class="color_hex" type='text' value="${color}"/>
      </div>

    </div>
    <div class="card-footer" style="text-align: right;">
      <div class="btn-group" role="group">
        <button class="btn btn-outline-secondary btn-chcs-cancel">Annulation</button>
        <button class="btn btn-outline-primary btn-chcs-confirm">Confirmation</button>
      </div>
    </div>
  </div>`;
  document.querySelector(params.selector).appendChild(root);
  const slider = document.querySelector('#belief-step');
  rangeSlider.create(slider, {
    vertical: false,
    min: 0,
    max: 1,
    step: 1,
    value: 1,
    borderRadius: 10,
  });
  makeFakeSelectElement('.card-clue-instantduration', [
    { value: 'instant-now', label: 'Maintenant' },
    {
      value: 'instant-past',
      label: 'Il y a <input disabled type="number" min="1" max="8" step="1" value="1"></input> heure(s)',
    },
    {
      value: 'instant-precise',
      label: 'Saisie précise d\'un instant ...',
    },
    {
      value: 'duration-instant-to-now',
      label: 'Entre <input disabled type="number" min="1" max="8" step="1" value="1"></input> heure(s) et maintenant',
    },
    {
      value: 'duration-instant-to-instant',
      label: 'Entre <input disabled type="number" min="1" max="8" step="1" value="1"></input> et <input disabled type="number" min="1" max="8" step="1" value="8"></input> heure(s)',
    },
    {
      value: 'duration-precise',
      label: 'Saisie précise d\'une durée ...',
    },
  ]);
  bindButtonsCard(root, params.cb_success, params.infos.target, params.infos);
  bindButtonsCluetype(root);
  bindColorButtons(root);
  return root;
}
