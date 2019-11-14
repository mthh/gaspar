import '../../css/loader_overlay.css';

/**
* An object allowing to show or hide the overlay (covering the whole page)
* with the loading animation.
*
*
*/
const loading_overlay = (() => {
  const el = document.createElement('div');
  el.className = 'overlay';
  el.style.opacity = 0;
  el.style.height = 0;
  el.innerHTML = '<div style="display: none;" class="loader"></div><div class="overlay-message"></div>';
  document.body.appendChild(el);
  const inner_loader = el.querySelector('.loader');
  const msg_zone = el.querySelector('.overlay-message');
  return {
    show: (message = 'Calcul en cours') => {
      msg_zone.innerHTML = message;
      inner_loader.style.display = null;
      el.style.opacity = 1;
      el.style.height = '100%';
      // By doing this we get a delayed (0.2s) transition (of 0.2s itself)
      // when the overlay is appearing but not when is disappearing.
      // It avoids the overlay to be displayed at all
      // when very small computations (< 0.2s) are done
      // (therefore it avoids some kind of blinking effect on the screen for the user).
      setTimeout(() => {
        el.classList.add('active');
      }, 10);
    },
    hide: () => {
      inner_loader.style.display = 'none';
      msg_zone.innerHTML = '';
      el.style.opacity = 0;
      el.style.height = 0;
      setTimeout(() => {
        el.classList.remove('active');
      }, 10);
    },
  };
})();

export default loading_overlay;
