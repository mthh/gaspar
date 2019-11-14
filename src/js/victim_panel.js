import '../css/card.css';
import uuidv4 from 'uuid/v4';

const default_options = {
  selector: 'body',
  infos: null,
};

const default_victim_informations = {
  victim_id: null,
  health_status: {
    infos_general_physical_condition: '',
    infos_current_health: '',
    may_move: null,
  },
  equipment: {
    worn_clothing: '',
    other_distinctive_features: '',
  },
  is_caller: null,
  activity: [],
};

function makeButtonsActivity(names) {
  return `<div class="btn-group btn-group-toggle" data-toggle="buttons">
    ${names
    .map((n) => `
  <label class="btn btn-info btn-chcs-activity">
  <input type="checkbox" name="activity_${n}" id="activity_${n}" value="${n}" />${n}</label>`).join('\n')}
    </div>`;
}

function displayVictimInformations(card, infos) {
  card.querySelector('#health1').value = infos.health_status.infos_general_physical_condition; // eslint-disable-line no-param-reassign
  card.querySelector('#health2').value = infos.health_status.infos_current_health; // eslint-disable-line no-param-reassign
  card.querySelector('#equipment1').value = infos.equipment.worn_clothing; // eslint-disable-line no-param-reassign
  card.querySelector('#equipment2').value = infos.equipment.other_distinctive_features; // eslint-disable-line no-param-reassign
  card.querySelector('#may_move').checked = infos.health_status.may_move; // eslint-disable-line no-param-reassign
  card.querySelector('#is_caller').checked = infos.health_status.is_caller; // eslint-disable-line no-param-reassign
  card.querySelectorAll('.card-activity-section label')
    .forEach((el) => {
      if (infos.activity.indexOf(el.children[0].value) > -1) {
        el.classList.add('active');
      }
    });
}

function fetchVictimInformations(card) {
  const victim_informations = { ...default_victim_informations };
  victim_informations.victim_id = `victim_${uuidv4()}`;
  victim_informations.health_status.infos_general_physical_condition = card.querySelector('#health1').value;
  victim_informations.health_status.infos_current_health = card.querySelector('#health2').value;
  victim_informations.health_status.may_move = !!card.querySelector('#may_move').checked;
  victim_informations.equipment.worn_clothing = card.querySelector('#equipment1').value;
  victim_informations.equipment.other_distinctive_features = card.querySelector('#equipment2').value;
  victim_informations.activity = Array.from(card
    .querySelectorAll('label.active'))
    .map((el) => el.children[0].value)
    .filter((a) => a !== 'Aucune');
  victim_informations.is_caller = !!card.querySelector('#is_caller').checked;
  return victim_informations;
}

function bindButtonsCard(card) {
  card.querySelector('.btn-chcs-confirm').onclick = () => { // eslint-disable-line no-param-reassign
    const data = fetchVictimInformations(card);
    State.victim = data;
    card.remove();
  };

  card.querySelector('.btn-chcs-cancel').onclick = () => { // eslint-disable-line no-param-reassign
    card.remove();
  };
}


function bindButtonsActivity(card) {
  card.querySelectorAll('.btn-chcs-activity')
    .forEach((el) => {
      el.children[0].onchange = () => { // eslint-disable-line no-param-reassign
        if (!el.classList.contains('active')) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      };
    });
}

export default function createCard(options) {
  const params = { ...default_options, ...options };
  const root = document.createElement('div');
  root.className = 'card-container overlay';
  root.innerHTML = `
  <div class="card card-victim center">
    <div class="card-header">
      <div class="card-victime-title">Informations Victime</div>
    </div>
    <div class="card-body center">
      <div class="card-title center"><h5>Activité pratiquée</h5></div>
      <div class="card-text center card-activity-section">
        ${makeButtonsActivity(['Aucune', 'Ski', 'VTT', 'Escalade', 'Randonnée Pédestre'], [0])}
        ${makeButtonsActivity(['Canyoning', 'Spéléologie', 'Parapente', 'Autre Activité'])}
      </div>
      <div class="card-title center"><h5>Équipement</h5></div>
      <div class="card-text">
        <div class="form-group">
          <label for="equipment1">Tenue vestimentaire</label>
          <input type="text" class="form-control" id="equipment1" placeholder="Ex: Blouson orange">
        </div>
        <div class="form-group">
          <label for="equipment2">Autre(s) élément(s) distinctif(s)</label>
          <input type="text" class="form-control" id="equipment2" placeholder="Ex: Voile de couleur rouge">
        </div>
      </div>
      <div class="card-title center"><h5>Santé</h5></div>
      <div class="card-text">
        <div class="form-group">
          <label for="health1">Condition physique générale</label>
          <input type="text" class="form-control" id="health1" placeholder="...">
        </div>
        <div class="form-group">
          <label for="health2">Informations spécifiques à l'alerte</label>
          <input type="text" class="form-control" id="health2" placeholder="Ex: Blessure consécutive à une chute">
        </div>
        <div class="pretty p-default p-jelly p-round p-bigger">
          <input type="checkbox" id="may_move" />
          <div class="state p-success-o">
              <label style="vertical-align: middle;">La victime peut se déplacer ?</label>
          </div>
        </div>
      </div>
      <div class="card-text">
        <div class="pretty p-default p-jelly p-round p-bigger">
          <input type="checkbox" id="is_caller" />
          <div class="state p-success-o">
              <label style="vertical-align: middle;">La victime est également le requérant ?</label>
          </div>
        </div>
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
  if (
    params.infos && params.infos.health_status
    && params.infos.equipment && params.infos.activity
  ) {
    displayVictimInformations(root, params.infos);
  }
  bindButtonsCard(root);
  bindButtonsActivity(root);
  return root;
}
