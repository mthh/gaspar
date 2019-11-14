import '../../css/menu_left.css';
import { SplitPanel, Widget } from '@phosphor/widgets';
import fuzzysearch from 'fuzzysearch';
import { GeoJSON } from 'ol/format';
import DB from '../DB';
import createBoxClue from '../clue_panel';
import { makeSectionTarget } from '../clue_transformation';
import commands from '../commands';
import ContextMenu from './context_menu';
import { debounce } from '../helpers';
import {
  click_use_current_bbox, click_delete_current_zone,
  click_reduce_current_zone, click_use_drawing_toolbox,
} from '../init_search_area';
import { tree, trad_tree_concept } from '../model';
import createCard from '../victim_panel';
import eyeOpen from '../../img/eye_open.png';
import eyeClosed from '../../img/eye_closed.png';
import choucasLogoSmall from '../../img/logo-choucas-small.png';


const context_menu_tree = new ContextMenu();
const geojson = new GeoJSON({ featureProjection: 'EPSG:3857' });

function featureTreeContextMenu(_e, ft) {
  context_menu_tree.showMenu(_e, document.body, [
    {
      name: 'Créer un indice à partir de l\'objet de référence ...',
      action: () => {
        commands.execute('ctx:new_clue', {
          infos: {
            target: {
              type: 'ESR',
              feature: ft,
              category: ft.properties.CHOUCAS_CLASS,
            },
          },
        });
      },
    },
    { type: 'separator' },
    { name: 'Afficher plus d\'informations sur l\'objet', action: () => { } },
    { type: 'separator' },
    {
      name: 'Zoomer sur l\'objet',
      action: () => {
        const ol_ft = new GeoJSON()
          .readFeature(ft, {
            featureProjection: 'EPSG:3857',
          });
        State.map_widget.getMapView()
          .fit(ol_ft.getGeometry(), {
            padding: [30, 30, 30, 30],
            minResolution: 8,
          });
      },
    },
  ]);
}


export function ESCCategoryTreeContextMenu(_e, categ) {
  context_menu_tree.showMenu(_e, document.body, [
    {
      name: 'Créer un indice à partir des objets candidats ...',
      action: () => {
        commands.execute('ctx:new_clue', {
          infos: {
            target: {
              type: 'ESC',
              category: categ,
              features: DB[`ref_${categ}`],
            },
          },
        });
      },
    },
    { type: 'separator' },
    { name: 'Afficher plus d\'informations sur les objets', action: () => { } },
  ]);
}

const onFeatureTreeContextMenu = function onFeatureTreeContextMenu(e) {
  const feature_id = this.getAttribute('ft_id');
  const category = this.getAttribute('cat');
  featureTreeContextMenu(e, DB[`ref_${category}`].find((f) => f.id === feature_id));
};

const onFeatureTreeMouseOver = function onFeatureTreeMouseOver(e) {
  e.stopPropagation();
  const feature_id = this.getAttribute('ft_id');
  const category = this.getAttribute('cat');
  State.map_widget.addHoverFeatures([
    geojson.readFeature(
      DB[`ref_${category}`].find((f) => f.id === feature_id),
      { featureProjection: 'EPSG:3857' },
    ),
  ]);
};

const onFeatureTreeMouseOut = () => {
  State.map_widget.removeHoverFeatures();
};

const onCategoryTreeContextMenu = function onCategoryTreeContextMenu(e) {
  ESCCategoryTreeContextMenu(e, this.id);
};

const onCategoryTreeMouseOver = function onCategoryTreeMouseOver() {
  State.map_widget.addHoverFeatures(
    geojson.readFeatures(
      { type: 'FeatureCollection', features: DB[`ref_${this.id}`] },
      { featureProjection: 'EPSG:3857' },
    ),
  );
};

const onCategoryTreeMouseOut = () => {
  State.map_widget.removeHoverFeatures();
};


class FeatureTree extends Widget {
  static createNode({ id }) { // eslint-disable-line class-methods-use-this
    const node = document.createElement('div');
    node.id = id;
    node.className = 'bottom-box';
    node.innerHTML = `
    <div class="tree-loader-container" style="display:none;">
      <div class="tree-loader">
        <div class="tree-loader-anim"></div>
      </div>
    </div>
    <div id="treetreetree" class="disabled menuflex">
      <div class="tree-title">
        <i class="fas fa-database"></i>
        <label>Objets du territoire</label>
      </div>
      <div class="tree-search">
        <input aria-label="Recherche d'objets" placeholder="Rechercher des objets dans l'arbre ..."></input>
      </div>
      <div class="tree-container">
        <ul>
        ${
  Object.keys(tree)
    .map((k) => {
      const b = [` \
        <li class="pnode" id="${k}"> \
          <i class="fas fa-folder-plus"></i> \
          <span>${trad_tree_concept[k]}</span> \
        </li> \
        <ul id="sublist-${k}" class="hidden">`];
      tree[k].forEach((subK) => {
        b.push(` \
          <li class="cnode" pcat="${k}" id="${subK}"> \
            <i class="fas fa-folder-plus"></i> \
            <span>${trad_tree_concept[subK]}</span> \
            <span class="badge badge-info"></span> \
          </li> \
          <ul id="sublist-${subK}" class="hidden"></ul>`);
      });
      b.push('</ul>');
      return b.join('');
    })
    .join('')}
        </ul>
      </div>
    </div>`;
    return node;
  }

  constructor(options = {}) {
    super({ node: FeatureTree.createNode(options) });
    this.title.label = 'Objets du territoire';
    this.title.closable = false;
  }

  toogleLoader(state) {
    if (state === true) {
      this.node.querySelector('.tree-loader-container').style.display = null;
    } else {
      this.node.querySelector('.tree-loader-container').style.display = 'none';
    }
  }

  /**
  * Updates the item tree, after setting the value of the initial search area.
  * @param {Array} results
  * @return {void}
  *
  */
  updateEntries(results) {
    // Remove all the existing end nodes in any case
    this.node
      .querySelectorAll('.end-node')
      .forEach((el) => { el.remove(); });

    // Deactivate the tree and return early if there is no items...
    if (!results) {
      this.node
        .querySelectorAll('li > i') // eslint-disable-next-line no-param-reassign
        .forEach((el) => { el.className = 'fas fa-folder-plus'; });
      this.node
        .querySelector('ul')
        .querySelectorAll('ul')
        .forEach((el) => { el.classList.add('hidden'); });
      const input_elem = this.node.querySelector('.tree-search > input');
      input_elem.value = '';
      input_elem.onkeyup = null;
      return;
    }

    // ..otherwise, for each category, add the corresponding item in the tree
    // and binds the various action (mouseover, contextmenu, etc.)
    results.forEach(([category, features]) => {
      const container = this.node.querySelector(`ul#sublist-${category}`);
      const li_elem_title_category = container.previousElementSibling;
      if (features.length === 0) {
        li_elem_title_category.classList.add('disabled');
      } else {
        li_elem_title_category.classList.remove('disabled');
      }
      // Add the number of features for this category in a small badge at the end of the line
      li_elem_title_category.querySelector('.badge').innerHTML = features.length || '';

      li_elem_title_category.onmouseover = onCategoryTreeMouseOver;
      li_elem_title_category.onmouseout = onCategoryTreeMouseOut;
      features.forEach((ft) => {
        const li = document.createElement('li');
        li.setAttribute('cat', category);
        li.setAttribute('ft_id', ft.id);
        li.className = 'end-node';
        li.innerHTML = ft.properties.name || `Unamed (id: ${ft.properties.osm_id})`;
        li.oncontextmenu = onFeatureTreeContextMenu;
        li.onmouseover = onFeatureTreeMouseOver;
        li.onmouseout = onFeatureTreeMouseOut;
        container.appendChild(li);
      });
    });
    const parent = this.node.querySelector('.tree-container > ul');
    // Fetch all the entries right now to use them in the keyup event:
    const entries = Array.from(parent.querySelectorAll('.end-node'));
    // Hide all the end nodes and fetch their values
    const title_section = this.node.querySelector('.tree-title');
    const values = entries
      .map((el, i) => [el.innerHTML.toLowerCase(), el.getAttribute('cat'), i])
      .filter((v) => v[0].indexOf('unamed') < 0); // Exclude the 'Unamed' features
    const nb_values = values.length;

    // What happens when the user is typing some text in the input element
    // of the feature tree :
    const fuzzylistmatch = function fuzzylistmatch() {
      const input_string = this.value.toLowerCase();

      // First of all, hide all the section
      parent.querySelectorAll('ul:not(.hidden)')
        .forEach((el) => {
          el.classList.add('hidden');
          // eslint-disable-next-line no-param-reassign
          el.previousElementSibling
            .querySelector('i.fas').className = 'fas fa-folder-plus';
        });

      // If the input string is empty we want to restore the tree in it's
      // initial state
      if (input_string.trim() === '') {
        // Restore the visibility of all the end nodes
        entries.forEach((el) => {
          el.classList.remove('hidden');
        });
        // Set the state of the title as "not filtered"
        title_section.innerHTML = `
          <i class="fas fa-database"></i> \
          <label>Objets du territoire</label>`;
      } else { // There is an input string, we want to display the filtered tree
        // Hide all the end nodes and fetch their values
        entries.forEach((el) => {
          el.classList.add('hidden');
        });
        // Try to match the input string with our values
        const matched = [];
        const display_category = new Set();
        for (let _ix = 0; _ix < nb_values; _ix++) {
          const [name, category, id] = values[_ix];
          if (fuzzysearch(input_string, name)) {
            matched.push(id);
            display_category.add(category);
          }
        }
        // Unhide the matched values...
        matched.forEach((ix) => {
          entries[ix].classList.remove('hidden');
        });
        // .. and their (grand) parent nodes :
        display_category.forEach((category) => {
          const ul = parent.querySelector(`#sublist-${category}`);
          ul.classList.remove('hidden');
          const title = ul.previousElementSibling;
          title.querySelector('i.fas').className = 'fas fa-folder-minus';
          const _p = parent.querySelector(`#sublist-${title.getAttribute('pcat')}`);
          _p.classList.remove('hidden');
          _p.previousElementSibling.querySelector('i.fas').className = 'fas fa-folder-minus';
        });
        // Set the state of the title as being "filtered"
        title_section.innerHTML = `
          <span class="fa-stack fa-1x"> \
            <i class="fas fa-database fa-stack-1x"></i> \
            <i class="fas fa-filter fa-stack-1x"></i> \
          </span>
          <label>Objets du territoire</label>`;
      }
    };

    // Listen no-more than every 150ms
    this.node.querySelector('.tree-search > input').onkeyup = debounce(fuzzylistmatch, 150);
  }

  onAfterAttach() {
    const parent = this.node.querySelector('#treetreetree');
    parent.querySelectorAll('.cnode')
      .forEach((elem) => {
        elem.oncontextmenu = onCategoryTreeContextMenu; // eslint-disable-line no-param-reassign
      });

    // Hide / display when user click on category names:
    parent.querySelectorAll('.cnode, .pnode')
      .forEach((el) => {
        el.onclick = () => { // eslint-disable-line no-param-reassign
          const icon = el.querySelector('i.fas');
          icon.classList.toggle('fa-folder-minus');
          icon.classList.toggle('fa-folder-plus');
          el.nextElementSibling.classList.toggle('hidden');
          if (el.matches('.cnode')) {
            const badge = el.querySelector('.badge');
            badge.classList.toggle('hidden');
          }
        };
      });
  }
}


function bindClueItem(item) {
  // Interaction for when the user toogles the "visibility" button
  item.querySelector('.switch-visibility-clue > img') // eslint-disable-line no-param-reassign
    .onclick = function onclickvisibilityclue() {
      const map_widget = mainPanel.getWidget('map1');
      const itowns_widget = mainPanel.getWidget('itowns-terrain');
      const clue_id = item.getAttribute('clue-id');
      const this_clue = State.clues.find((el) => el.clue_id === clue_id);
      // Don't allow to toggle visibility when belief is 0 (or maybe we should ?)
      if (this_clue.belief === 0) return;

      const layer = map_widget.layers[clue_id];
      if (this.classList.contains('clue-visible')) {
        this_clue.visible = false;
        this.classList.remove('clue-visible');
        this.src = eyeClosed;
        layer.setVisible(false);
      } else {
        this_clue.visible = true;
        this.classList.add('clue-visible');
        this.src = eyeOpen;
        layer.setVisible(true);
      }
      if (itowns_widget) {
        itowns_widget.setVisibleLayer(clue_id, this_clue.visible);
      }
    };
  // Interaction for when the user toogles the "belief" button
  item.querySelector('.switch-belief-clue > input') // eslint-disable-line no-param-reassign
    .onchange = function onchangebeliefclue() {
      const id_clue = item.getAttribute('clue-id');
      // Retrieve the 'clue' object corresponding to this id
      const this_clue = State.clues.splice(
        State.clues.findIndex((el) => el.clue_id === id_clue),
        1,
      )[0];
      const belief_value = this.checked ? 1 : 0;
      // Change the values for the belief:
      this_clue.belief = belief_value;
      // Update the state object with this new clue:
      State.clues = [
        ...State.clues,
        this_clue,
      ];
      // Also reflect the belief in the visibilty icon
      const visibility_icon = item.querySelector('.switch-visibility-clue > img');
      if (belief_value === 1) {
        visibility_icon.classList.add('clue-visible');
        visibility_icon.src = eyeOpen;
      } else {
        visibility_icon.classList.remove('clue-visible');
        visibility_icon.src = eyeClosed;
      }
    };

  // Basic context menu on right-click
  item.oncontextmenu = (e) => { // eslint-disable-line no-param-reassign
    const context_menu = new ContextMenu();
    const id_clue = item.getAttribute('clue-id');
    context_menu.showMenu(
      e, document.body, [
        {
          name: 'Modifier l\'indice',
          action: () => {
            const current_clue_data = State.clues.find((d) => d.clue_id === id_clue);
            createBoxClue({
              selector: 'body',
              infos: JSON.parse(JSON.stringify(current_clue_data)),
              cb_success: null,
            });
          },
        },
        {
          type: 'separator',
        },
        {
          name: 'Supprimer l\'indice',
          action: () => {
            State.clues.splice(
              State.clues.findIndex((el) => el.clue_id === id_clue),
              1,
            );
            State.clues = [].concat(State.clues);
          },
        },
      ],
    );
  };
}

// TODO : allow to toogle the visibility of the underlying layer
// (and its belief value)
function createClueItemMenuLeft(clue_data) {
  const elem = document.createElement('li');
  elem.className = 'clue-item';
  elem.setAttribute('clue-id', clue_data.clue_id);
  const site = clue_data.instant_or_duration.type !== 'instant-now'
    ? '<i class="fas fa-user-clock"></i>'
    : '<i class="fas fa-user-tag"></i>';
  const toogle_belief = `
    <div class="pretty p-switch p-fill switch-belief-clue" title="Prise en compte de l'indice dans le calcul de la ZLP"> \
      <input type="checkbox" ${clue_data.belief === 1 ? 'checked ' : ''}/> \
      <div class="state"><label></label></div> \
    </div>`;
  const toogle_visibility = `
    <div class="switch-visibility-clue" title="Affichage de l'indice sur la carte">
      <img src="${clue_data.visible ? eyeOpen : eyeClosed}" class="clue-visible" />
    </div>`;
  if (clue_data.spatial_relation_type === 'Proximité immédiate') {
    const target = makeSectionTarget(clue_data.target)
      .replace('<p', '<br><span')
      .replace('</p', '</span')
      .replace('<br>', '<wbr>');
    const { distance_to_object, uncertainty } = clue_data.spatial_relation_service_options;
    elem.innerHTML = `
    <div class="clue-content">
      <span class="line">${site} -> à proximité immédiate (${distance_to_object}m) -> </span>
      <span class="line">${target} (incertitude de ${uncertainty}m)</span>
    </div>
    ${toogle_belief}
    ${toogle_visibility}`;
  } else if (clue_data.spatial_relation_type === 'Ombre / Soleil') {
    elem.innerHTML = `
    <div class="clue-content">
      <span class="line">${site} -> dans zone </span>
      <span class="line">${clue_data.spatial_relation_service_options.type_zone}</span>
    </div>
    ${toogle_belief}
    ${toogle_visibility}`;
  } else if (clue_data.spatial_relation_type === 'Voir') {
    const target = makeSectionTarget(clue_data.target)
      .replace('<p', '<br><span')
      .replace('</p', '</span')
      .replace('<br>', '<wbr>');
    elem.innerHTML = `
    <div class="clue-content">
      <span class="line">${site} -> voit -> </span>
      <span class="line">${target}</span>
    </div>
    ${toogle_belief}
    ${toogle_visibility}`;
  } else if (clue_data.spatial_relation_type === 'Entendre') {
    elem.innerHTML = `
    <div class="clue-content">
      <span class="line">${site} -> entend -> </span>
      <span class="line">${clue_data.target}</span>
    </div>
    ${toogle_belief}
    ${toogle_visibility}`;
  }
  document.querySelector('ul.inner_list').append(elem);
  bindClueItem(elem);
}

export default function createLeftMenu() {
  const clues_box_panel = new Widget();
  clues_box_panel.addClass('top-box');
  clues_box_panel.node.innerHTML = `
  <!-- <div style="text-align:center;font-style:italic;margin:3px;display: flex;">
    <img height="40px" style="opacity: 0.3;" src="${choucasLogoSmall}" alt='logoChoucas'/>
    <h5 style="margin:auto;">${APPLICATION_NAME}</h5>
    <img height="40px" style="opacity: 0.3;" src="${choucasLogoSmall}" alt='logoChoucas'/>
  </div> -->
  <div class="menuflex noselect">
    <!-- <hr> -->
    <div id="victim_infos">
      <div>
        <i class="fas fa-address-card"></i>
        <label>Informations sur la victime</label>
      </div>
    </div>
    <hr>
    <div id="isa_infos">
      <div class="menu-toogle pretty p-toggle p-plain">
        <input aria-label="Définition de la zone initiale..." id="init_zone_chk" type="checkbox" />
        <div class="state p-off">
          <i class="icon fas fa-times-circle"></i>
          <label>Zone initiale non sélectionnée</label>
        </div>
        <div class="state p-on">
          <i class="icon fas fa-check-circle"></i>
          <label>Zone initiale sélectionnée</label>
          <span class="surface-display"></span>
        </div>
      </div>
      <p id="use_current_bbox" class="mod-zone-init isa_unset">Utiliser l'emprise actuelle de la carte</p>
      <p id="use_drawing_toolbox" class="mod-zone-init isa_unset">Utiliser les outils de dessin ...</p>
      <!-- <p id="use_isa_massifdebelledonne" class="hidden mod-zone-init isa_unset">Chaîne de Belledonne</p>
      <p id="use_isa_chartreuse" class="hidden mod-zone-init isa_unset">Massif de la Chartreuse</p>
      <p id="use_isa_ecrins" class="hidden mod-zone-init isa_unset">Massif des Écrins (Zone Isère)</p>
      <p id="use_isa_cerces" class="hidden mod-zone-init isa_unset">Massif des Cerces (Zone Isère)</p>
      <p id="use_isa_depisere" class="hidden mod-zone-init isa_unset">Département de l'isère</p> -->
      <p id="delete_current_zone" class="hidden mod-zone-init isa_set">Oublier la zone actuelle</p>
      <p id="reduce_current_zone" class="hidden mod-zone-init isa_set">Réduire la zone actuelle ...</p>
    </div>
    <hr>
    <div id="clues_header" class="disabled">
      <div>
        <i class="fas fa-user-nurse"></i>
        <label>Gestion des indices</label>
      </div>
    </div>
    <div id="clues_zones">
      <ul class="inner_list"></ul>
      </div>
    </div>`;

  const tree_obj = new FeatureTree({ id: 'features-tree' });

  const menu_left = new SplitPanel({ spacing: 0, orientation: 'vertical' });
  menu_left.addWidget(clues_box_panel);
  menu_left.addWidget(tree_obj);
  menu_left.setRelativeSizes([5, 5]);
  menu_left.id = 'menuLeft';
  menu_left.updateISA = (isa_properties) => {
    const parent = clues_box_panel.node.querySelector('#isa_infos');
    if (!isa_properties) {
      parent.title = '';
      parent.querySelector('#init_zone_chk').checked = false;
      parent.querySelectorAll('.isa_unset')
        .forEach((el) => { el.classList.remove('hidden'); });
      parent.querySelectorAll('.isa_set')
        .forEach((el) => { el.classList.add('hidden'); });
      parent.querySelector('.surface-display').innerHTML = '';
      clues_box_panel.node.querySelector('#clues_header').classList.add('disabled');
      tree_obj.node.querySelector('#treetreetree').classList.add('disabled');
    } else {
      const {
        xmin, ymin, xmax, ymax, area,
      } = isa_properties;
      parent.title = `(xmin=${xmin}, ymin=${ymin}, xmax=${xmax}, ymax=${ymax})`;
      parent.querySelector('#init_zone_chk').checked = true;
      parent.querySelectorAll('.isa_unset')
        .forEach((el) => { el.classList.add('hidden'); });
      parent.querySelectorAll('.isa_set')
        .forEach((el) => { el.classList.remove('hidden'); });
      parent.querySelector('.surface-display').innerHTML = `(${Math.round(area / 10000) / 100} km²)`;
      clues_box_panel.node.querySelector('#clues_header').classList.remove('disabled');
      tree_obj.node.querySelector('#treetreetree').classList.remove('disabled');
    }
  };
  // Keep track of the existing clues to only render the needed one
  menu_left._renderedClues = new Set();
  menu_left.updateClues = (clues) => {
    const all = new Set();
    const r = {
      added: [],
      removed: [],
      hidden: new Set(),
    };
    clues.forEach((clue) => {
      const { belief, clue_id, visible } = clue;
      all.add(clue_id);
      if (!menu_left._renderedClues.has(clue_id)) {
        createClueItemMenuLeft(clue);
        menu_left._renderedClues.add(clue_id);
        r.added.push(clue_id);
      }
      if (belief < 1 || visible < 1) r.hidden.add(clue_id);
    });
    menu_left._renderedClues.forEach((clue_id) => {
      if (!all.has(clue_id)) {
        document.querySelector(`li[clue-id="${clue_id}"]`).remove();
        r.removed.push(clue_id);
      }
    });
    menu_left._renderedClues = all;
    return r;
  };
  menu_left.onAfterAttach = function menuleftafterattach() {
    // Binds some interactions on the left menu
    this.node.querySelector('#use_current_bbox').onclick = click_use_current_bbox;
    this.node.querySelector('#delete_current_zone').onclick = click_delete_current_zone;
    this.node.querySelector('#reduce_current_zone').onclick = click_reduce_current_zone;
    this.node.querySelector('#victim_infos').onclick = () => {
      createCard({
        selector: 'body',
        infos: State.victim,
      });
    };
    this.node.querySelector('#use_drawing_toolbox').onclick = click_use_drawing_toolbox;
    // TODO (?): reallow to select features from different categories with checkbox
    // and reallow to create clue when clicking on the clue header
    // menuLeft.node.querySelector('#clues_header').onclick = () => {
    //   commands.execute('ctx:new_clue');
    // };
  };
  return menu_left;
}
