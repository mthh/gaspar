import '../../css/zlp_info.css';
import { Fill, Stroke, Style } from 'ol/style';
import { Widget } from '@phosphor/widgets';
import { area as turf_area } from '@turf/turf';
import getIntersectingFeatures from '../filter_items_zlp';
import { counter } from '../helpers';

function removeZlpFragsFromMap() {
  const _removeOneZLp = (id) => {
    State.map_widget.layers[id].getSource().clear();
    State.map_widget._map.removeLayer(State.map_widget.layers[id]);
    delete State.map_widget.layers[id];
  };
  Object.keys(State.map_widget.layers)
    .forEach((id) => {
      if (id.indexOf('zlp_frag_') === 0) {
        _removeOneZLp(id);
      }
    });
}

function addZlpFragToMap(ft, i) {
  removeZlpFragsFromMap();
  State.map_widget.addGeojsonLayer(`zlp_frag_${i}`, [ft], new Style({
    stroke: new Stroke({
      color: 'black',
      width: 5,
    }),
    fill: new Fill({
      color: 'rgba(250, 32, 32, 0.4)',
    }),
  }));
}

export default class ZLPInfoWidget extends Widget {
  static createNode({ id }) {
    const container = document.createElement('div');
    container.id = id;
    return container;
  }

  constructor(options) {
    super({ node: ZLPInfoWidget.createNode(options) });
    this.title.label = 'Info. ZLP';
    this.title.closable = true;
    // this.title.caption = 'Affichage d'informations sur la Zone de Localisation Probable';
  }

  // onAfterAttach() {
  // }

  updateContent(zlp) {
    if (zlp) {
      const geom_zlp = zlp.geometry;
      const area = Math.round(turf_area(geom_zlp) / 10000) / 100;
      const nb_fragments = geom_zlp.type === 'Polygon'
        ? 1
        : geom_zlp.coordinates.length;
      this.node.innerHTML = `
      <div>
        <h5>Taille de la ZLP</h5>
        <span class="ZLP-info-size">${area} km²</span>
      </div>

      <div>
        <h5>Nombre de fragments</h5>
        <span class="ZLP-info-frag">${nb_fragments}</span>
      </div>

      <div style="overflow: auto;">
        <h5>Indices utilisables</h5>
        <button class="btn btn-primary ZLP-info-filter-clues">Recherche d'indices pouvant être receuillis ...</button>
        <p class="ZLP-info-filter-clues-result"></p>
      </div>`;
      this.node.querySelector('.ZLP-info-filter-clues').onclick = () => {
        getIntersectingFeatures()
          .then((result) => {
            const parent = this.node.querySelector('.ZLP-info-filter-clues-result');
            parent.innerHTML = '';
            const keys = Object.keys(result);
            // How many fragments with intersecting features :
            const n_zones = keys.filter((k) => result[k].intersecting_features.length > 0).length;
            // All the category of object encountered (within all fragments)
            const all_cats = [];
            keys.forEach((k) => {
              all_cats.push(...Object.keys(result[k].category_count));
            });
            // How many times each category was encountered (at the fragment 'scale',
            // but we also have the information within each fragments to be used later)
            const count_categories = counter(all_cats);
            // In order to find discriminating features, we are looking at features
            // which are not present in every fragments :
            const intersecting_cats = Object.keys(count_categories)
              .filter((k) => count_categories[k] < n_zones);
            console.log(n_zones, all_cats, count_categories, intersecting_cats);
            keys
              .forEach((k, i) => {
              // eslint-disable-next-line no-unused-vars
                const { zlp_frag_geom, intersecting_features, category_count } = result[k];
                console.log(intersecting_features, category_count);
                const area_m = turf_area(zlp_frag_geom);
                const area_formated = area_m <= 10000
                  ? `${Math.round(area_m)} m²`
                  : `${Math.round(area_m / 10000) / 100} km²`;
                const innerlist = Object.keys(category_count)
                  .map((el) => {
                    if (intersecting_cats.indexOf(el) > -1) {
                      return `<li><b>${el}</b></li>`;
                    }
                    return `<li>${el}</li>`;
                  }).join('');
                const section = document.createElement('section');
                section.innerHTML = `\
                  <div>Fragment ${i}</div>
                  <div>Superficie : ${area_formated}</div>
                  <div>
                    <span>Objets d'intérets :</span>
                    <ul>${innerlist}</ul>
                  </div> \
                `;
                section.onmouseenter = () => { addZlpFragToMap(zlp_frag_geom, i); };
                section.onmouseout = () => { removeZlpFragsFromMap(i); };
                parent.appendChild(section);
              });
          });
      };
    } else {
      this.node.innerHTML = `
      <div>
        <h5><i>Pas de zone de localisation probable</i></h5>
      </div>`;
    }
  }
}
