import DB from './DB';
import { trad_tree_concept, trad_tree_concept_singular } from './model';

/**
* Get the spatial relation from the clue in natural language.
*
* @param {string} clue_nl - The clue in natural language.
* @return {object} - The spatial relation as expected by the clue component.
*
*/
export const getTabFromClue = (clue_nl) => {
  const clue = clue_nl.toLowerCase();
  if (clue.indexOf('voit') > -1 || (clue.indexOf('voir') > -1 && clue.indexOf('réservoir') < 0)) {
    return 'Voir';
  }
  if (clue.indexOf('entend') > -1) {
    return 'Entendre';
  }
  if (clue.indexOf('ombre') > -1 || clue.indexOf('soleil') > -1) {
    return 'Ombre / Soleil';
  }
  return 'Proximité immédiate';
};

/**
* Get the target feature from the clue in natural language.
*
* @param {string} clue_nl - The clue in natural language.
* @return {object} - The target as expected by the clue component.
*
*/
/* eslint-disable no-else-return, dot-notation */
export const getTargetFromClue = (clue_nl, relation) => {
  const clue = clue_nl.toLowerCase();
  if (relation === 'Ombre / Soleil') {
    return {
      type: 'ESR',
    };
  }
  if (clue.indexOf('sentier') > -1 || clue.indexOf('chemin') > -1) {
    return {
      type: 'ESC',
      features: DB['ref_PATHWAY'],
      category: 'PATHWAY',
    };
  } else if (clue.indexOf('route') > -1) {
    return {
      type: 'ESC',
      features: DB['ref_ROAD'],
      category: 'ROAD',
    };
  } else if (clue.indexOf('piste') > -1) {
    return {
      type: 'ESC',
      features: DB['ref_PISTE'],
      category: 'PISTE',
    };
  } else if (
    clue.indexOf(' lac') > -1 || clue.indexOf('plan d\'eau') > -1
      || clue.indexOf(' étang') > -1 || (
      clue.indexOf(' eau') > -1 && clue.indexOf('plan ') > -1)
  ) {
    return {
      type: 'ESC',
      features: DB['ref_LAKE'],
      category: 'LAKE',
    };
  } else if (clue.indexOf(' réservoir') > -1 || clue.indexOf('reservoir') > -1) {
    return {
      type: 'ESC',
      features: DB['ref_RESERVOIR'],
      category: 'RESERVOIR',
    };
  } else if (clue.indexOf(' eau') > -1 || clue.indexOf('rivière') > -1 || clue.indexOf('ruisseau') > -1) {
    return {
      type: 'ESC',
      features: DB['ref_RIVER'],
      category: 'RIVER',
    };
  } else if (clue.indexOf('cable') > -1 || clue.indexOf(' remont') > -1) {
    return {
      type: 'ESC',
      features: DB['ref_SKILIFT'],
      category: 'SKILIFT',
    };
  } else if (clue.indexOf('electri') > -1 || clue.indexOf('électri') > -1 || clue.indexOf('ligne') > -1) {
    return {
      type: 'ESC',
      features: DB['ref_POWERLINE'],
      category: 'POWERLINE',
    };
  } else if (clue.indexOf('sommet') > -1 || clue.indexOf('pic ') > -1) {
    return {
      type: 'ESC',
      features: DB['ref_PEAK'],
      category: 'PEAK',
    };
  } else if (clue.indexOf(' col') > -1) {
    return {
      type: 'ESC',
      features: DB['ref_COL'],
      category: 'COL',
    };
  }
  return null;
};
/* eslint-enable no-else-return, dot-notation */

/**
* Make the "target section", to be used by the clue creation component
* and by the clue list component.
*
* @param {object} target_info - Informations regarding the target of a clue.
* @return {string} - The corresponding HTML code.
*
*/
/* eslint-disable no-else-return, consistent-return */
export function makeSectionTarget(target_info) {
  if (target_info.type === 'ESC') {
    return `<p style="margin: auto;">
<i class="fas fa-folder-plus"></i>
<span type="ESC" style="margin-left: 5px;">${trad_tree_concept[target_info.category]}</span>
</p>`;
  } else if (target_info.type === 'ESR' && target_info.feature) {
    const ft = target_info.feature;
    if (ft.properties.osm_id) {
      const display_name = ft.properties.name
        || ft.properties.ref
        || ft.properties.title
        || `1 <i>${trad_tree_concept_singular[ft.properties.CHOUCAS_CLASS]}</i> (sans nom)`;
      return `<p style="margin: auto;">
  <i class="fas fa-map-marker-alt"></i>
  <span type="ESR" style="margin-left: 5px;">${display_name}</span>
  </p>`;
    } else {
      return `<p style="margin: auto;">
  <i class="fas fa-map-marker-alt"></i>
  <span type="ESR" style="margin-left: 5px;">Point (${ft.geometry.coordinates})</span>
  </p>`;
    }
  }
}
/* eslint-enable no-else-return, consistent-return */
