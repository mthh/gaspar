import '../css/tour.css';
import introJs from 'intro.js';
import { toLonLat } from 'ol/proj';
import createBoxClue from './clue_panel';
import { makePtFeature } from './helpers';


export default function makeTour() {
  const tour = introJs.introJs();
  tour.setOption('exitOnOverlayClick', false);
  tour.setOption('scrollToElement', false);
  tour.setOption('keyboardNavigation', true);


  // 0
  tour.addStep({
    tooltipClass: 'steptour',
    intro: '<p class="titlestep">INTRODUCTION</p>',
    disableInteraction: true,
  });

  // 1
  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#menuLeft'),
    intro: `
<p class="importantstep">GASPAR est organisé en trois panneaux.<br> \
Le <b>menu de gauche</b> est consacrée à <b>la victime</b>, \
à <b>la zone initiale de recherche</b> et \
à la <b>gestion des indices</b>. \
On y trouve également la <b>liste des objets</b> présents dans la \
zone initiale de recherche, une fois celle-ci sélectionnée.</p>`,
    position: 'right',
    disableInteraction: true,
  });

  // 2
  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#map-terrain-container'),
    intro: `
<p class="importantstep"><b>L'espace central</b> est consacré à la (ou les) carte(s).<br>
C'est dans cet espace que seront affichées les zones qui correspondent à chaque \
indice ainsi que la Zone de Localisation Probable de la victime.</p>`,
    position: 'left',
    disableInteraction: true,
  });

  // 3
  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#menuRight'),
    intro: `
<p class="importantstep"><b>L'espace latéral droit</b> est consacré au bloc de saisie d'indices \
et à la légende des couches supplémentaires. D'autres composants \
(outils de dessins par exemple) peuvent s'ajouter à ce menu.<br> \
(nous reviendrons plus tard sur l'utilité de ces composants)</p>`,
    position: 'right',
    disableInteraction: true,
  });

  // 4
  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#menuBar'),
    intro: `
<p class="importantstep">Aucune des fonctionnalités \
présentes dans la <b>barre de menu</b> n'est indispensable pour traiter une alerte, \
toutefois certaines de ces fonctionnalités peuvent être utiles selon les cas d'utilisation \
(sauvegarde / import d'une alerte, changement de fond de carte, ajout de données supplémentaires, etc.), \
</p>`,
    position: 'bottom',
    disableInteraction: true,
  });

  // 5
  tour.addStep({
    tooltipClass: 'steptour',
    intro: '<p class="titlestep">COMMENT UTILISER GASPAR ?</p>',
    disableInteraction: true,
  });

  // 6
  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#victim_infos'),
    intro: `
<p class="titlestep">Étape 0 : Renseigner les informations concernant la victime <i>(optionnel)</i></p> \
`,
    position: 'right',
    // disableInteraction: true,
  });

  // 7
  tour.addStep({
    tooltipClass: 'steptour',
    intro: `
<p class="titlestep">Étape 0 : Renseigner les informations concernant la victime <i>(optionnel)</i></p> \
La sélection d'une activité va avoir un impact sur les couches additionnelles chargées, \
nous n'allons pas sélectionner d'activité pour l'instant.
`,
    position: 'right',
    disableInteraction: true,
  });

  // 8
  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#isa_infos'),
    intro: `
<p class="titlestep">Étape 1 : Sélectionner la Zone Initiale de Recherche</p> \
La <b>Zone Initiale de Recherche</b> correspond à la zone, déterminée dès le début de \
l'alerte, dans laquelle doit se dérouler la recherche.<br>
Il peut par exemple s'agir de l'ensemble d'un massif (<i>le Vercors</i>),
ou bien d'une zone englobant très largement les alentours de la dernière position connue \
de la victime.
`,
    position: 'right',
    disableInteraction: true,
  });

  // 9
  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#map-terrain-container'),
    intro: `
<p class="titlestep">Étape 1 : Sélectionner la Zone Initiale de Recherche</p> \
La <b>Zone Initiale de Recherche</b> correspond à la zone, déterminée dès le début de \
l'alerte, dans laquelle doit se dérouler la recherche.<br>
Il peut par exemple s'agir de l'ensemble d'un massif (<i>le Vercors</i>),
ou bien d'une zone englobant très largement les alentours de la dernière positions connue \
de la victime.
`,
    position: 'right',
    disableInteraction: true,
  });

  // 10
  tour.addStep({
    tooltipClass: 'steptour',
    intro: `
<p class="titlestep">Étape 2 : Ajouter des indices de localisations et les convertir en zones</p> \
<p class="importantstep">
Plusieurs possibilités existent pour saisir un <b>indice</b> de localisation...</p>`,
    position: 'right',
    disableInteraction: true,
  });

  // 11
  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#map-terrain-container'),
    intro: `
<p class="titlestep">Étape 2 <i>(suite)</i></p> \
<p class="importantstep">
- en ouvrant un menu contextuel (clic-droit) sur la carte</p>
`,
    position: 'right',
    disableInteraction: true,
  });

  // 12
  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#features-tree'),
    intro: `
<p class="titlestep">Étape 2 <i>(suite)</i></p> \
<p class="importantstep">
- ou bien en ouvrant un menu contextuel (clic-droit) sur un objet ou une catégorie d'objets de l'arbre</p>
`,
    position: 'right',
    disableInteraction: true,
  });

  // 13
  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#noteWidget'),
    intro: `
<p class="titlestep">Étape 2 <i>(suite)</i></p> \
<p class="importantstep">
- ou bien saisissant l'indice en langage naturel dans le bloc-note prévu à cet effet puis en ouvrant un menu contextuel \
permettant de le transformer en indice</p>
`,
    position: 'right',
    disableInteraction: true,
  });

  // 14
  tour.addStep({
    tooltipClass: 'steptour',
    intro: `
<p class="titlestep">Étape 2 <i>(suite)</i></p> \
<p class="importantstep">
La boite de creation d'indices permet d'ajuster la transformation de l'indice en une zone correspondante \
en sélectionnant le type de <b>relation de localisation</b>, la <b>cible</b> de cette relation, \
l'<b>instant ou la durée</b> qui correspond à l'indice ainsi que sa <b>couleur de matérialisation</b>.</p>
`,
    position: 'right',
    disableInteraction: true,
  });

  // 15
  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#map-terrain-container'),
    intro: `
<p class="titlestep">Étape 2 <i>(suite)</i></p> \
<p class="importantstep">Une fois ces informations saisies et validées, l'indice est converti \
en <b>Zone de Localisation Compatible</b>.</p>
`,
    position: 'right',
    disableInteraction: true,
  });

  // 16
  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#map-terrain-container'),
    intro: `
<p class="titlestep">Étape 3 : Obtention d'une <i>Zone de Localisation Probable</i></p> \
<p class="importantstep">L'ajout de plusieurs indices va permettre la création de la <b>Zone de Localisation Probable</b> \
créée en combinant les différents Zone de Localisation issues des différents indices.
`,
    position: 'right',
    disableInteraction: true,
  });

  // 17
  tour.addStep({
    tooltipClass: 'steptour',
    element: document.querySelector('#clues_zones'),
    intro: `
<p class="titlestep">Étape 4 : Manipulation des indices</p> \
<p class="importantstep">La prise en compte de chacun des indices ainsi que la visibilité de la zone correspondante \
peut être modifiée dans le menu prévu à cet effet</p>
`,
    position: 'right',
    disableInteraction: true,
  });

  // 18
  tour.addStep({
    tooltipClass: 'steptour',
    intro: `
<p class="titlestep">C'est tout pour l'instant !</p> \
<p class="importantstep">Vous êtes maintenant prêt pour effectuer votre première recherche !</p>
`,
    position: 'right',
    disableInteraction: true,
  });

  tour.onafterchange(() => {
    switch (tour._currentStep) {
      case 6:
        setTimeout(() => {
          document.querySelector('#victim_infos').click();
          setTimeout(() => {
            document.querySelectorAll('.btn.btn-info.btn-chcs-activity')[0].click();
          }, 1000);
          setTimeout(() => {
            document.querySelector('#health2').value = 'Multiples blessures';
          }, 1200);
          setTimeout(() => {
            document.querySelector('#is_caller').click();
          }, 1400);
        }, 3000);
        break;
      case 8:
        {
          const ok_button = document.querySelector('.btn-chcs-confirm');
          if (ok_button) ok_button.click();
        }
        break;
      case 9:
        {
          const map_view = State.map_widget.getMapView();
          map_view.setCenter([639116.78, 5664285.74]);
          map_view.setZoom(14.33);
          setTimeout(() => {
            document.getElementById('use_current_bbox').click();
          }, 1000);
          setTimeout(() => {
            map_view.setZoom(13.82);
          }, 2000);
        }
        break;
      case 12:
        setTimeout(() => {
          document.getElementById('HYDRO').click();
        }, 800);
        //   setTimeout(() => {
        //     const r = document.getElementById('RIVER');
        //     const bbox = r.getBoundingClientRect();
        //     const e = new MouseEvent('contextmenu', {
        //       bubbles: true,
        //       view: window,
        //       target: r,
        //       screenX: bbox.right - 50,
        //       screenY: bbox.bottom - 3,
        //     });
        //     r.dispatchEvent(e);
        //     setTimeout(() => {
        //       const m = document.querySelector('.context-menu');
        //       m.style.left = `${bbox.right - 50}px`;
        //       m.style.top = `${bbox.bottom - 3}px`;
        //     })
        //   }, 1000);
        break;
      case 14:
        {
          const coords_clicked = toLonLat([639116.78, 5664285.74])
            .map((n) => Math.round(n * 10000) / 10000)
            .join(', ');
          createBoxClue({
            infos: {
              target: {
                type: 'ESR',
                feature: makePtFeature(coords_clicked),
              },
            },
          });
          setTimeout(() => {
            document.querySelector('#uncertainty-buffer-input').value = 1700;
          }, 25);
        }
        break;
      case 15:
        {
          const ok_button = document.querySelector('.btn-chcs-confirm');
          if (ok_button) ok_button.click();
        }
        break;
      case 16:
        {
          const coords_clicked = toLonLat([639800.78, 5663900.74])
            .map((n) => Math.round(n * 10000) / 10000)
            .join(', ');
          createBoxClue({
            infos: {
              target: {
                type: 'ESR',
                feature: makePtFeature(coords_clicked),
              },
            },
          });
          setTimeout(() => {
            document.querySelector('#uncertainty-buffer-input').value = 1300;
            document.querySelector('.btn-chcs-confirm').click();
          }, 25);
        }
        break;
      default:
        break;
    }
  });

  return tour;
}
