import '../../css/fake_select.css';

/**
* Create a 'select-like' element (allowing to use normal DOM elements)
* in the 'option' values.
*
* @param {HTMLElement} parent - The parent element on which adding this fake select
* @param {Object} options - The option for this element creation.
*
*/
export default function makeFakeSelectElement(parent, options) {
  const is_empty = options.length === 0;
  const container = document.createElement('div');
  container.className = 'fake-select';
  const head_elem = document.createElement('div');
  head_elem.className = 'head';
  const content_elem = document.createElement('span');
  content_elem.className = 'content';
  if (!is_empty) {
    content_elem.setAttribute('value', options[0].value);
    content_elem.innerHTML = options[0].label;
  }
  const caretdown_elem = document.createElement('i');
  caretdown_elem.className = 'fa fa-caret-down';
  const list_elem = document.createElement('div');
  list_elem.className = 'list';
  head_elem.appendChild(content_elem);
  head_elem.appendChild(caretdown_elem);
  container.appendChild(head_elem);
  container.appendChild(list_elem);
  options
    .forEach(({ label, value }) => {
      const p_elem = document.createElement('p');
      p_elem.innerHTML = label;
      p_elem.setAttribute('value', value);
      p_elem.addEventListener('click', () => {
        list_elem.classList.remove('active');
        content_elem.innerHTML = p_elem.innerHTML;
        content_elem.setAttribute('value', p_elem.getAttribute('value'));
        content_elem.querySelectorAll('input')
          .forEach((el) => { el.disabled = false; }); // eslint-disable-line no-param-reassign
      });
      list_elem.appendChild(p_elem);
    });
  caretdown_elem.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (list_elem.classList.contains('active')) {
      list_elem.classList.remove('active');
    } else {
      list_elem.classList.add('active');
    }
  });
  document.querySelector(parent).appendChild(container);
}
