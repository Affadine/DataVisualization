import * as d3 from 'd3';

import Home from './components/Home.svelte';
import Carte from './components/Carte.svelte';


let euGeoJsonUrl = 'https://raw.githubusercontent.com/leakyMirror/map-of-europe/master/GeoJSON/europe.geojson';

let ripos = {
    euGeoJson: d3.json(euGeoJsonUrl)
};


export default [
    {
        'name': 'Home',
        'href': '/',
        'component': Home,
        'ripos': ripos
    },
    {
        'name': 'Carte',
        'href': '/carte',
        'component': Carte,
        'ripos': ripos
    }
];
