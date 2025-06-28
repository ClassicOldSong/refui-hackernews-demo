export function addTargetBlankToLinks(htmlString) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(htmlString, 'text/html');
	const links = doc.body.querySelectorAll('a');
	links.forEach(link => {
		link.setAttribute('target', '_blank');
	});
	return [...doc.body.childNodes];
}
