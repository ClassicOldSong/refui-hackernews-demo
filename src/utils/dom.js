export function addTargetBlankToLinks({source}) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(source, 'text/html');
	const links = doc.body.querySelectorAll('a');
	links.forEach(link => {
		link.setAttribute('target', '_blank');
	});
	return Array.from(doc.body.childNodes);
}
