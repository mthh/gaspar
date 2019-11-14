import '../../css/drawing_toolbox.css';
import { Widget } from '@phosphor/widgets';

/**
*
* This drawing toolbox only provides a container and the inner button.
* The specific behavior of the creation of a Feature with this toolbox
* depends on its context of utilisation, so the constructor expect an object
* as argument with a few parameters :
*  - map_widget: the map widget on which this drawing widget will act
*  - ondrawend: a callback function for when the drawing of a feature ends
*  - oncancel: a callback function for when the "cancel" button is clicked
*
*/
class DrawingToolbox extends Widget {
  static createNode({ id }) {
    const container = document.createElement('div');
    container.id = id;
    container.className = 'drawing-tools';
    container.innerHTML = `
<div style="text-align: center; margin: auto;">
  <button class="btn-outline-primary" title="Polygone" id="polygon">
    <i class="fas fa-draw-polygon"></i>
  </button>
  <button class="btn-outline-primary"
      title="Polygone à main levée" id="polygon-hand">
    <span class="fa-stack fa-1x">
      <i class="fas fa-draw-polygon fa-stack-1x"></i>
      <i class="fas fa-pencil-alt fa-stack-1x"
          style="transform:scale(0.85) translate(16px, -14px);">
      </i>
    </span>
  </button>
  <button class="btn-outline-primary" title="Zone circulaire" id="circle">
    <i class="fas fa-circle"></i>
  </button>
  <button class="btn-outline-primary"
      title="Zone rectangulaire" id="rectangle">
    <i class="fas fa-square" style="transform:scaleX(1.5);"></i>
  </button>
</div>
<div style="text-align:center;">
  <button class="btn btn-danger btn-cancel-drawing">Annulation</button>
</div>`;

    return container;
  }

  constructor(options) {
    super({ node: DrawingToolbox.createNode(options) });
    this.title.label = 'Outils de dessin';
    this.title.closable = false;
    this.title.caption = 'Outils de dessin pour la création de zones';
    this.title.className = 'drawing-tools-title-tab';

    this._map_widget_instance = options.map_widget;
    this.ondrawend = options.ondrawend || (() => {});
    this.oncancel = options.oncancel || (() => {});
  }

  onAfterAttach() {
    // eslint-disable-next-line no-param-reassign
    this.node.querySelector('#polygon').onclick = () => {
      this._map_widget_instance.activeDrawInteraction(
        'polygon',
        this.ondrawend,
        false,
      );
    };
    // eslint-disable-next-line no-param-reassign
    this.node.querySelector('#polygon-hand').onclick = () => {
      this._map_widget_instance.activeDrawInteraction(
        'polygon-freehand',
        this.ondrawend,
        false,
      );
    };
    // eslint-disable-next-line no-param-reassign
    this.node.querySelector('#circle').onclick = () => {
      this._map_widget_instance.activeDrawInteraction(
        'circle',
        this.ondrawend,
        false,
      );
    };
    // eslint-disable-next-line no-param-reassign
    this.node.querySelector('#rectangle').onclick = () => {
      this._map_widget_instance.activeDrawInteraction(
        'rectangle',
        this.ondrawend,
        false,
      );
    };
    // eslint-disable-next-line no-param-reassign
    this.node.querySelector('.btn-cancel-drawing').onclick = this.oncancel;
  }
}

export default DrawingToolbox;
