import * as d3 from 'd3';

import Home from './components/Home.svelte';
import Carte from './components/Carte.svelte';
import Graph from './components/Graph.svelte';
//import TotalMap from './components/TotalMap.svelte';
import TimeChart from './components/TimeChart.svelte';
import horizontal_histo from './components/horizontal_histo.svelte';


// let euGeoJsonUrl = 'https://raw.githubusercontent.com/leakyMirror/map-of-europe/master/GeoJSON/europe.geojson';

let euGeoJsonUrl = '/custom.geo.json';
let euGeo2JsonUrl = '/european-union-countries.json';
let bombusFreqUrl = '/bombus_terrestris_freqs.csv';
let speciesUrl = '/data_sources.json';
let countriesPosUrl = '/countries.csv';
let temperatureUrl = '/temperature.csv';

let ripos = {
    euGeoJson: d3.json(euGeoJsonUrl),
    euGeo2Json : d3.json(euGeo2JsonUrl),
    speciesData: d3.json(speciesUrl),
    bombusFreq: d3.csv(bombusFreqUrl),
    countriesPos: d3.csv(countriesPosUrl),
    temperatures : d3.csv(temperatureUrl),
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
    },
    /*
    {
        'name': 'TotalMap',
        'href': '/TotalMap',
        'component': TotalMap,
        'ripos': ripos,
        'navbar': true
    },*/
    {
        'name': 'Time evolution',
        'href': '/TimeChart',
        'component': TimeChart,
        'ripos': ripos,
        'navbar': true
    },

    {
        'name': 'Bar chart races',
        'href': '/HorizontalChat',
        'component': horizontal_histo,
        'ripos': ripos,
        'navbar': true
    },
    {
        'name': 'Area Chart',
        'href': '/Graph',
        'component': Graph,
        'ripos': ripos,
        'navbar': true
    }
];
