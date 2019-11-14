import DB from './DB';
import eyeOpen from '../img/eye_open.png';
import eyeClosed from '../img/eye_closed.png';


const start_section = (ix) => `<div layer-id="${ix}" class="additional-layer-legend"><div>`;

const titleSectionActivity = (name) => `<h5>Activité ${name}</h5>`;
const titleSection = (name) => `<h5>${name}</h5>`;

const elemLegendSquare = (name, bg_color) => `<div>
  <p class="color_square" style="background-color: ${bg_color};"></p>
  <span>${name}</span>
</div>`;

const elemLegendLine = (name, bg_color) => `<div>
  <p class="color_square" style="background-color: ${bg_color}; height: 4px; vertical-align: middle;"></p>
  <span>${name}</span>
</div>`;

const elemLegendCircle = (name, bg_color, inner_text) => `<div>
  <p class="color_circle" style="background-color: ${bg_color};">
  ${inner_text || ''}</p>
  <span>${name}</span>
</div>`;

const elemLegendCircleSmall = (name, bg_color, inner_text) => `<div>
  <p class="color_circle_small" style="background-color: ${bg_color};">
  ${inner_text || ''}</p>
  <span>${name}</span>
</div>`;

const end_section = (visible) => `</div>
  <div class="switch-visibility-additional" title="Affichage de la couche sur la carte">
    <img src="${visible ? eyeOpen : eyeClosed}" class="additional-layer-visible" />
  </div>
</div>`;

const onclickvisibilityadditionallayer = function onclickvisibilityadditionallayer() {
  const lyr_id = this.parentNode.parentNode.getAttribute('layer-id');
  const layers = Object.keys(State.map_widget.layers)
    .filter((d) => d.indexOf(lyr_id) > -1)
    .map((d) => State.map_widget.layers[d]);
  if (this.classList.contains('additional-layer-visible')) {
    this.classList.remove('additional-layer-visible');
    this.src = eyeClosed;
    layers.forEach((lyr) => lyr.setVisible(false));
  } else {
    this.classList.add('additional-layer-visible');
    this.src = eyeOpen;
    layers.forEach((lyr) => lyr.setVisible(true));
  }
};

// To avoid redrawing the legend when not need..this is rudimentary but due to the
// dynamic nature of the legend (changes on various zoom levels) we have
// to check on each zoom level change.
// TODO: improve this.
let last = '';

function updateActivityLegend() {
  const drawing_zone = document.getElementById('legend_drawing_zone');
  if (!drawing_zone) return;
  const resolution = State.map_widget._map.getView().getResolution();
  const layer_names = Object.keys(DB);
  const content = [];
  if (layer_names.some((n) => n.indexOf('activity_ski') === 0)) {
    content.push(start_section('activity_ski'));
    if (resolution < 40) {
      content.push(
        titleSectionActivity('Ski'),
        elemLegendSquare('Domaine skiable', 'rgb(51, 153, 204)'),
        elemLegendLine('Remontées mécaniques', 'rgb(0, 0, 0)'),
      );
    } else {
      content.push(
        titleSectionActivity('Ski'),
        elemLegendCircle('Station de ski', 'rgb(51, 153, 204)', DB.activity_ski.length),
      );
    }
    content.push(end_section(State.map_widget.layers['activity_ski'].getVisible()));
  }

  if (layer_names.some((n) => n.indexOf('activity_escalade') === 0)) {
    content.push(start_section('activity_escalade'));
    if (resolution < 40) {
      content.push(
        titleSectionActivity('Escalade'),
        elemLegendCircleSmall('', 'rgb(58, 202, 91)'),
        elemLegendLine('Voies d\'escalade', 'rgb(58, 202, 91)'),
        elemLegendSquare('', 'rgb(58, 202, 91)'),
      );
    } else {
      content.push(
        titleSectionActivity('Escalade'),
        elemLegendCircle('Voies d\'escalade', 'rgb(8, 107, 31)', DB.activity_escalade.length),
      );
    }
    content.push(end_section(State.map_widget.layers['activity_escalade'].getVisible()));
  }

  if (layer_names.some((n) => n.indexOf('activity_speleologie') === 0)) {
    content.push(start_section('activity_speleologie'));
    if (resolution < 40) {
      content.push(
        titleSectionActivity('Spéléogie'),
        elemLegendCircleSmall('Entrées de grottes', 'rgb(163, 82, 41)'),
      );
    } else {
      content.push(
        titleSectionActivity('Spéléogie'),
        elemLegendCircle('Entrées de grottes', 'rgb(163, 82, 41)', DB.activity_speleologie.length),
      );
    }
    content.push(end_section(State.map_widget.layers['activity_speleologie'].getVisible()));
  }

  // if (layer_names.some(n => n.indexOf('activity_randonnee') === 0)) {
  //   content.push(start_section('activity_randonnee'));
  //   content.push(
  //     titleSectionActivity('Randonnée pédestre'),
  //     elemLegendLine('Sentiers / chemins', 'rgb(51, 220, 51)'),
  //   );
  //   if (State.map.zoom >= 12) {
  //     content.push(end_section(true));
  //   } else {
  //     content.push(end_section(false));
  //   }
  // }

  if (layer_names.some((n) => n.indexOf('activity_vtt') === 0)) {
    content.push(start_section('activity_vtt'));
    content.push(
      titleSectionActivity('VTT'),
      elemLegendLine('Chemins spécifiques ou d\'intéret', 'rgb(255, 20, 147)'),
    );
    content.push(end_section(State.map_widget.layers['activity_vtt'].getVisible()));
    // if (State.map.zoom >= 11) {
    //   content.push(end_section(true));
    // } else {
    //   content.push(end_section(false));
    // }
  }

  // Also create legend for the layers added by the user if any
  layer_names.filter((n) => n.indexOf('additional_') === 0)
    .forEach((layer_name) => {
      content.push(start_section(layer_name));
      content.push(
        titleSection(`Couche utilisateur : ${layer_name.replace('additional_', '')}`),
        elemLegendSquare('Entitées', 'rgb(241, 241, 241)'),
      );
      // const visible = State.map_widget.layers[layer_name].getVisible();
      content.push(end_section(State.map_widget.layers[layer_name].getVisible()));
    });

  // Updates the element
  if (content.length > 0) {
    const j = content.join('');
    if (j !== last) drawing_zone.innerHTML = j;
    last = j;
    drawing_zone.style.display = null;
    drawing_zone.querySelectorAll('.switch-visibility-additional > img')
      .forEach((el) => {
        el.onclick = onclickvisibilityadditionallayer; // eslint-disable-line no-param-reassign
      });
  } else {
    drawing_zone.innerHTML = '';
    drawing_zone.style.display = 'none';
    last = '';
  }
}

export default updateActivityLegend;
