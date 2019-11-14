import '../../css/notes.css';
import { transform } from 'ol/proj';
import { Widget } from '@phosphor/widgets';
import { getTabFromClue, getTargetFromClue } from '../clue_transformation';
import commands from '../commands';
import ContextMenu from './context_menu';
import DB from '../DB';
import { displayNotification, setCaretEnd, toLowerCaseNoAccent } from '../helpers';
import { click_use_current_bbox } from '../init_search_area';
import { callServiceGeocoding, callServiceParseClue } from '../services_call';


const moveToResultsGeocoding = (place_name) => {
  callServiceGeocoding({
    place_name,
    osm_key: 'place',
  }).then((result) => {
    const best_result = result.features[0];
    if (best_result) {
      const map_view = State.map_widget.getMapView();
      map_view.setCenter(transform(best_result.geometry.coordinates, 'EPSG:4326', 'EPSG:3857'));
      map_view.setZoom(best_result.properties.osm_value === 'city' ? 12 : 13);
      displayNotification(
        `Meilleure réponse : <b>${best_result.properties.name} (${best_result.properties.state})</b>`,
        'success',
      );
    } else {
      throw new Error(`Pas de résultat pour '${place_name}'`);
    }
  }).catch((e) => {
    displayNotification(
      `Une erreur s'est produite lors de l'appel au service : ${e}`,
      'error',
      5000,
    );
  });
};

const context_menu = new ContextMenu();

const displayNoteContextMenu = function displayNoteContextMenu(_e) {
  _e.preventDefault();
  _e.stopPropagation();
  const note = this;
  const note_content = note.innerHTML;
  if (note_content.startsWith('<del>')) {
    context_menu.showMenu(_e, document.body, [
      { name: 'Supprimer le fragment de texte', action: () => { this.remove(); } },
    ]);
  } else if (State.initial_search_area !== null) {
    context_menu.showMenu(_e, document.body, [
      {
        name: 'Créer un indice à partir du fragment de texte ...',
        action: () => {
          // TODO : part of speech and named entities parsing should be put outside this function..
          callServiceParseClue(note_content)
            .then(({ part_of_speech, named_entities }) => {
              console.log(part_of_speech);
              // Get the type of spatal relation (Voit, est à coté de, etc.)
              const type_relation = getTabFromClue(note_content);
              // Does the text contain some distance value in meter...
              const hasDistanceMeter = !!part_of_speech.find((d) => d[1] === 'NUM')
                && (
                  !!part_of_speech.find((d) => d[2] === 'm')
                  || !!part_of_speech.find((d) => toLowerCaseNoAccent(d[2]) === 'metre')
                );
              // If so we will use it (regarding to the spatial relation type ...
              // for now only 'Proximité immédiate' is using it
              const spatial_relation_service_options = ( // eslint-disable-line no-nested-ternary
                hasDistanceMeter && type_relation === 'Proximité immédiate'
              ) ? {
                  distance_to_object: +part_of_speech.find((d) => d[1] === 'NUM')[2],
                  uncertainty: 100,
                } : type_relation === 'Ombre / Soleil'
                  ? { type_zone: note_content.toLowerCase().indexOf('soleil') > -1 ? 'soleil' : 'ombre' }
                  : {};

              // Lets build the target object to fill the clue box to be opened...
              let clue_target;
              let err;
              if (named_entities.length === 0) {
                // We have a category of objects
                clue_target = getTargetFromClue(note_content, type_relation);
                if (!clue_target) {
                  err = 'Pas de correspondance trouvée pour l\'objet ou la catégorie d\'objets demandé.';
                }
              } else {
                // We have a named entity so we are trying to match its name
                // against one of our reference features...
                const name = named_entities[0][0].toLowerCase();
                const values = Array.from(document.querySelectorAll('.end-node'))
                  .map((el) => [el.innerHTML.toLowerCase(), el.getAttribute('cat'), el.getAttribute('ft_id')])
                  .filter((v) => v[0].indexOf('unamed') < 0); // Exclude the 'Unamed' features
                const match = values.filter((d) => d[0] === name);
                // There might be multiple matches but we don't take this into account for
                // now as it's more a POC for parsing clues than a fully working implementation
                // ... we could warn the user though...
                if (match.length > 0) {
                  const [, category, ft_id] = match[0];
                  const ft = DB[`ref_${category}`].find((f) => f.id === ft_id);
                  clue_target = {
                    category,
                    type: 'ESR',
                    feature: ft,
                  };
                } else {
                  err = `Pas de correspondance trouvée pour : "${named_entities[0][0]}". \
                    Essayez une recherche dans l'arbre des objets ou avec tous les objets du même type.`;
                }
              }
              if (clue_target) {
                commands.execute('ctx:new_clue', {
                  infos: {
                    clue_nl: note_content,
                    target: clue_target,
                    spatial_relation_type: type_relation,
                    spatial_relation_service_options,
                  },
                  cb_success: () => { this.innerHTML = `<del>${this.innerHTML}</del>`; },
                });
              } else {
                displayNotification(err, 'error');
              }
            }).catch((e) => {
              displayNotification(
                `Une erreur s'est produite lors de l'appel au service : ${e}`,
                'error',
              );
              console.log(e);
            });
        },
      },
      { type: 'separator' },
      { name: 'Marquer comme déjà transformé en indice', action: () => { this.innerHTML = `<del>${this.innerHTML}</del>`; } },
      { name: 'Supprimer le fragment de texte', action: () => { this.remove(); } },
    ]);
  } else {
    const options = [
      { name: 'Utiliser le fragment de texte pour définir la Zone Initiale de Recherche', action: () => { click_use_current_bbox(); } },
      { type: 'separator' },
      { name: 'Supprimer le fragment de texte', action: () => null },
    ];
    const selected_text = window.getSelection().toString();
    if (selected_text.length > 0) {
      options.push({ type: 'separator' });
      options.push({
        name: `Rechercher le lieu ''${selected_text}''...`,
        action: () => { moveToResultsGeocoding(selected_text); },
      });
    }
    context_menu.showMenu(_e, document.body, options);
  }
};

class Note extends Widget {
  static createNode({ id }) {
    const note = document.createElement('div');
    note.id = id;
    note.className = 'note';
    note.style.fontSize = '24px';
    note.innerHTML = `
  <ul>
    <li id="note1" class="note-inner-content" contenteditable="true">...</li>
  </ul>`;
    return note;
  }

  constructor(options) {
    super({ node: Note.createNode(options) });
    this.title.label = 'Bloc note indices';
    this.title.closable = true;
    this.title.caption = 'Bloc note de saisie des indices en langage naturel';
    this.title.className = 'note-title-tab';
  }

  inputNode() {
    const elems = this.node.querySelectorAll('ul > li');
    return elems[elems.length - 1];
  }

  onActivateRequest(_msg) { // eslint-disable-line no-unused-vars
    // console.log(_msg);
    if (this.isAttached) {
      this.inputNode().focus();
    }
  }

  createNewNote(id, content = '') {
    const note_parent = this.node.querySelector('ul');
    const p = document.createElement('li');
    p.id = id;
    p.className = 'note-inner-content';
    p.setAttribute('contenteditable', 'true');
    p.innerHTML = content;
    note_parent.appendChild(p);
    return p;
  }

  onAfterAttach() {
    const self = this;
    let n_note = 1;
    const keydownnote = function keydownnote(ev) {
      if (ev.key === 'Enter' || ev.code === 'Enter') {
        ev.preventDefault();
        ev.stopPropagation();
        n_note += 1;
        const p = self.createNewNote(`note${n_note}`);
        p.focus();
        p.onkeydown = keydownnote;
        p.oncontextmenu = displayNoteContextMenu;
        // setCaretEnd(p);
      } else if (
        this.innerHTML.length <= 1
        && this.id !== 'note1'
        && (ev.key === 'Backspace' || ev.code === 'Backspace')
      ) {
        const previous = this.previousElementSibling;
        this.remove();
        previous.focus();
        setCaretEnd(previous);
      }
    };
    this.node.querySelector('.note-inner-content').onkeydown = keydownnote;
    this.node.querySelector('.note-inner-content').oncontextmenu = displayNoteContextMenu;
    this.updateNotes = (notes) => {
      const existings = this.node.querySelectorAll('.note-inner-content');
      existings.forEach((el) => {
        if (notes.indexOf([el.id, el.innerHTML]) < 0) {
          el.remove();
        }
      });
      notes
        .forEach(({ id, content }, ix) => {
          const p_note = this.createNewNote(id, content);
          p_note.onkeydown = keydownnote;
          p_note.oncontextmenu = displayNoteContextMenu;
          if (ix === notes.length - 1) {
            p_note.focus();
          }
        });
    };
  }
}

export default Note;
