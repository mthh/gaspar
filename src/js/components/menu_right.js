import '../../css/menu_right.css';
import { DockPanel, Widget } from '@phosphor/widgets';
import Note from './note_widget';

const makeLegendActivityLayerWidget = () => {
  const legend_activity_layer = new Widget();
  legend_activity_layer.id = 'legendActivityLayer';
  legend_activity_layer.title.label = 'Couches supplémentaires';
  legend_activity_layer.title.closable = true;
  legend_activity_layer.node.innerHTML = `
<div id="legend-activity">
  <div id="legend_drawing_zone"></div>
</div>`;
  return legend_activity_layer;
};

export default function createRightMenu() {
  const menu_right = new DockPanel();
  menu_right.id = 'menuRight';

  menu_right.addNoteWidget = () => {
    menu_right.addWidget(new Note({ id: 'noteWidget' }), {
      mode: 'split-top',
    });
  };
  menu_right.addLegendActivityLayer = () => {
    menu_right.addWidget(makeLegendActivityLayerWidget(), {
      ref: menu_right.widgets().next(),
      mode: 'split-bottom',
    });
  };
  menu_right.onAfterAttach = function menurightonafterattach() {
    this.addNoteWidget();
    // this.addLegendActivityLayer();
  };

  return menu_right;
}
