import * as d3 from 'd3';

import Home from './components/Home.svelte';
import Carte from './components/Carte.svelte';


// let euGeoJsonUrl = 'https://raw.githubusercontent.com/leakyMirror/map-of-europe/master/GeoJSON/europe.geojson';

let euGeoJsonUrl = '/custom.geo.json';
let bombusFreqUrl = '/bombus_terrestris_freqs.csv';
let speciesUrl = '/data_sources.json';

let ripos = {
    euGeoJson: d3.json(euGeoJsonUrl),
    speciesData: d3.json(speciesUrl),
    bombusFreq: d3.csv(bombusFreqUrl),
};


export default [
    {
        'name': 'Home',
        'href': '/',
        'component': Home,
        'ripos': ripos,
        'navbar': true
    },
    {
        'name': 'Carte',
        'href': '/carte',
        'component': Carte,
        'ripos': ripos,
        'navbar': true
    }
];
