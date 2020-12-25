<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";

    export let ripos;

    let width = 900,
        height = 700;

    // let euGeoJsonUrl = '/european-union-countries.geojson';
    // let euGeoJsonUrl = '/custom.geo.json'; // generate from 'https://geojson-maps.ash.ms/'
    // generate from 'https://geojson-maps.ash.ms/'
    // have a look at https://datahub.io/core/geo-nuts-administrative-boundaries

    var projection = d3
        .geoConicConformal()
        .center([14.454071, 49.279229])
        .scale(1200);

    let path = d3.geoPath().projection(projection);
    let euGeoJson = ripos.euGeoJson;

    onMount(() => {
        let svg = d3
            .select("#app")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        euGeoJson.then((data) => {
            svg.selectAll("path")
                .data(data.features)
                .enter()
                .append("path")
                .attr("d", path);
        });
    });
</script>

<div>
    <div id="app" class="mt-5 text-center" />
</div>
