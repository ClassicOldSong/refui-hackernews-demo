import { createDOMRenderer } from 'refui/dom';
import { defaults } from 'refui/browser';
import App from './components/App.jsx';

const renderer = createDOMRenderer(defaults);

renderer.render(document.getElementById('app'), App);