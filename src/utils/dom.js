export function addTargetBlankToLinks(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const fragment = document.createDocumentFragment();
  while (doc.body.firstChild) {
    fragment.appendChild(doc.body.firstChild);
  }
  const links = fragment.querySelectorAll('a');
  links.forEach(link => {
    link.setAttribute('target', '_blank');
  });
  return fragment;
}