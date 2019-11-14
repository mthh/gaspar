import '../../css/context_menu.css';

/**
* Create a new ContextMenu
* @constructor
*/
export default function ContextMenu() {
  this.items = [];

  this.addItem = function addItem(item) {
    this.items.push({
      isSimpleItem: true,
      name: item.name,
      action: item.action,
      type: item.type,
    });
  };

  this.addSubMenu = function addSubMenu(item) {
    this.items.push({
      isSimpleItem: false,
      name: item.name,
      menu: new ContextMenu(),
    });
    this.items[this.items.length - 1].menu.setItems(item.items);
  };

  this.removeItemByName = function removeItemByName(name) {
    for (let i = this.items.length - 1; i > 0; i--) {
      if (this.items[i].name.valueOf() === name.valueOf()) {
        this.items.splice(i, 1);
        break;
      }
    }
  };

  this.setItems = function setItems(items) {
    this.items = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].name || items[i].type) {
        if (items[i].action || items[i].type === 'separator') {
          this.addItem(items[i]);
        } else if (items[i].items) {
          this.addSubMenu(items[i]);
        }
      }
    }
  };

  this.showMenu = function showMenu(event, parent, items, onshow, onclose) {
    if (items) {
      this.setItems(items);
    }

    if (event.preventDefault) {
      event.preventDefault();
    } else {
      event.returnValue = false; // eslint-disable-line no-param-reassign
    }

    if (event.stopPropagation) {
      event.stopPropagation();
    }

    // Ensure no other context menu is opened in the application
    const other = document.querySelector('.context-menu');
    if (other) { other.remove(); }
    if (onshow && typeof onshow === 'function') { onshow(); }
    this.initMenu(parent);
    const bbox = this.DOMObj.getBoundingClientRect();
    if ((event.clientY + window.scrollY + bbox.height) < window.innerHeight
        || (event.clientX + bbox.width) < window.innerWidth) {
      this.DOMObj.style.top = `${event.clientY + window.scrollY}px`;
      this.DOMObj.style.left = `${event.clientX}px`;
    } else {
      this.DOMObj.style.top = `${event.clientY + window.scrollY - bbox.height}px`;
      this.DOMObj.style.left = `${event.clientX - bbox.width}px`;
    }

    const hideMenu = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (onclose && typeof onclose === 'function') { onclose(); }
      if (this.DOMObj && this.DOMObj.parentNode && this.DOMObj.parentNode.removeChild) {
        this.DOMObj.parentNode.removeChild(this.DOMObj);
      }
      this.onclick = undefined;
      document.removeEventListener('contextmenu', hideMenu);
      document.removeEventListener('click', hideMenu);
      document.removeEventListener('drag', hideMenu);
    };
    setTimeout(() => {
      document.removeEventListener('contextmenu', hideMenu);
      document.addEventListener('click', hideMenu);
      document.removeEventListener('drag', hideMenu);
    }, 275);
  };

  this.initMenu = function initMenu(parent) {
    if (this.DOMObj && this.DOMObj.parentNode && this.DOMObj.parentNode.removeChild) {
      this.DOMObj.parentNode.removeChild(this.DOMObj);
    }
    const self = this;
    const ctxmenuclick = function ctxmenuclick() {
      const ix = this.getAttribute('data-index');
      self.items[ix].action();
    };
    const menu = document.createElement('div');
    menu.className = 'context-menu noselect';
    const list = document.createElement('ul');
    menu.appendChild(list);
    for (let i = 0; i < this.items.length; i++) {
      const item = document.createElement('li');
      list.appendChild(item);
      if (this.items[i].type === 'separator') {
        item.innerHTML = '<hr class="separator" />';
      } else {
        item.setAttribute('data-index', i);
        const name = document.createElement('span');
        name.className = 'context-menu-item-name';
        name.textContent = this.items[i].name;
        item.appendChild(name);
        if (this.items[i].isSimpleItem) {
          // item.onclick = ctxmenuclick;
          item.onmouseup = ctxmenuclick;
        } else {
          const arrow = document.createElement('span');
          arrow.className = 'arrow';
          arrow.innerHTML = '&#9658;';
          name.appendChild(arrow);
          this.items[i].menu.initMenu(item);
          this.items[i].menu.DOMObj.style.display = 'none';
          item.onmouseover = function ctxmenumouseover() {
            setTimeout(() => {
              this.querySelectorAll('.context-menu')[0].style.display = '';
            }, 500);
          };
          item.onmouseout = function ctxmenumouseout() {
            setTimeout(() => {
              this.querySelectorAll('.context-menu')[0].style.display = 'none';
            }, 500);
          };
        }
      }
    }
    menu.oncontextmenu = (e) => {
      // Disable 'contextmenu' behavior on the context menu itself
      e.preventDefault();
      e.stopPropagation();
    };
    this.DOMObj = menu;
    parent.appendChild(menu);
  };
}
