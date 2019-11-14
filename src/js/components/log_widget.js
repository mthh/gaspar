import '../../css/log.css';
import { Widget } from '@phosphor/widgets';

class LogWidget extends Widget {
  static createNode({ id }) {
    const container = document.createElement('div');
    container.id = id;
    container.innerHTML = `
  <div class="menu_logs">
    <div class="menu_logs_title">
      <h5>Niveau d'affichage :</h5>
    </div>
    <div class="menu_logs_radio">
      <div>
        <input name="log_level" id="l_error" value="error" type="radio"></input>
        <label for="l_error">Error</label>
      </div>
      <div>
        <input name="log_level" id="l_info" value="info" type="radio" checked></input>
        <label for="l_info">Info</label>
      </div>
      <div>
        <input name="log_level" id="l_debug" value="debug" type="radio"></input>
        <label for="l_debug">Debug</label>
      </div>
    </div>
  </div>
  <div class="container_logging_area">
    <div class="inner_logging_area">
      <br><br><br><br><br><br>
    </div>
  </div>`;
    return container;
  }

  constructor(options) {
    super({ node: LogWidget.createNode(options) });
    this.addClass('whiteboard-wrapper');
    this.title.label = 'Logs';
    this.title.closable = true;
    this.title.caption = 'Logs d\'utilisation de la session en cours';
  }

  // onAfterAttach() {
  // }
}

export default LogWidget;
