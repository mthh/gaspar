import '../../css/menubar.css';
import { Menu, MenuBar } from '@phosphor/widgets';
import commands from '../commands';

export default function createMenuBar() {
  const menu1 = new Menu({ commands });
  menu1.addItem({ command: 'example:new' });
  menu1.addItem({ command: 'example:save' });
  menu1.addItem({ command: 'example:load' });
  // menu1.addItem({ command: 'example:print' });
  menu1.addItem({ command: 'example:close' });
  menu1.addClass('bar-menu-child');
  menu1.id = 'a1';
  menu1.title.label = 'Fichier';
  menu1.title.mnemonic = 0;

  const menu2 = new Menu({ commands });
  menu2.addItem({ command: 'tools:display_log' });
  menu2.addItem({ command: 'tools:new_note' });
  menu2.addItem({ command: 'tools:legend_acitivity_layers' });
  menu2.title.label = 'Outils';
  menu2.title.mnemonic = 0;
  menu2.addClass('bar-menu-child');
  menu2.id = 'a2';

  const menu3 = new Menu({ commands });
  menu3.addItem({ command: 'param:basemap' });
  menu3.addItem({ command: 'param:dataimport' });
  menu3.addItem({ command: 'param:ui' });
  menu3.addItem({ command: 'param:extra' });
  menu3.addClass('bar-menu-child');
  menu3.id = 'a3';
  menu3.title.label = 'Paramètres';
  menu3.title.mnemonic = 0;

  const menu4 = new Menu({ commands });
  menu4.addItem({ command: 'help:man' });
  menu4.addItem({ command: 'help:version' });
  menu4.addItem({ command: 'help:tour' });
  // menu4.addItem({ command: 'help:get_search_case' });
  menu4.addClass('bar-menu-child');
  menu4.id = 'a4';
  menu4.title.label = 'Aide';
  menu4.title.mnemonic = 0;

  const bar = new MenuBar();
  bar.addMenu(menu1);
  bar.addMenu(menu2);
  bar.addMenu(menu3);
  bar.addMenu(menu4);
  bar.addClass('main-bar');
  bar.id = 'menuBar';

  return bar;
}
