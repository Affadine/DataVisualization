<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";
    import MakeMapInteractive from "./MakeMapInteractive";
    // http://api-adresse.data.gouv.fr/reverse/?lat=48.8566969&lon=2.3514616

    export let ripos;

    let width = document.body.clientWidth - 100;
    let height = window.innerHeight - 100;
    let centerX = 9.454071, centerY = 52.279229, scale = 1200;
    let projection = getProjection(centerX, centerY, scale);
    let path = d3.geoPath().projection(projection);
    let loading = true;
    let year = 0, years = [];
    let bombusData = [];
    let svg;
    let species = [], selectedSpecie = 0;
    let color = d3.scaleQuantize().range(["#bae4b3", "#74c476", "#31a354", "#006d2c"]);

    onMount(() => drawSvgMap());

    document.body.onresize = () => drawSvgMap();

    async function drawSvgMap() {
        width = document.body.clientWidth - 100;
        height = window.innerHeight - 100;

        d3.select("#app").selectAll("svg").remove();

        let dragZoom = mapInteractions("#app");

        svg = d3
            .select("#app")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("cursor", "pointer")
            .attr("draggable", true)
            .call(dragZoom.drag)
            .call(dragZoom.zoom);

        let geojson = await ripos.euGeoJson.then(geojson => geojson);
        bombusData = await ripos.bombusFreq.then(bombusFreq => bombusFreq);
        species = await ripos.speciesData.then(speciesData => speciesData);
                
        svg.selectAll("path")
            .data(geojson.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", (d) => d.properties.name)
            .style("fill", "#FDFEFE")
            .style("stroke", "black");

        years = bombusData
            .map((d) => parseInt(d.Year))
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort();

        drawCircles();
        loading = false;
    }

    function drawCircles() {
        svg.selectAll("circle").remove();

        let data = bombusData.filter((d) => d.Year == years[year] && d.SpecieId == species[selectedSpecie]?.id);
        let freqs = data.map(d => parseInt(d.Frequency))
                        .filter((value, index, self) => self.indexOf(value) === index);

        let min = Math.min(...freqs);
        let max = Math.max(...freqs);

        color.domain([min, max]); 
        // color.domain([0, 500]); // for more visible colors comment on real data

        svg.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => projection([d["Longitude"], d["Latitude"]])[0])
            .attr("cy", d => projection([d["Longitude"], d["Latitude"]])[1])
            .attr("r", 5)
            .style("fill", d => color(parseInt(d.Frequency)) );
    }


    function getProjection(centerX, centerY, scale) {
        return d3.geoConicConformal().center([centerX, centerY]).scale(scale);
    }


    function mapInteractions(htmlId) {
        let startK;
        let startX, startY;

        let path = d3.geoPath().projection(projection);

        let drag = d3
            .drag()
            .on("start", (evt) => {
                let coords = projection.invert([evt.x, evt.y]);
                startX = coords[0];
                startY = coords[1];
            })
            .on("drag", translateMap)
            .on("end", translateMap);

        let zoom = d3
            .zoom()
            .on("start", (evt) => (startK = evt.transform.k))
            .on("zoom", zoomUnZoom)
            .on("end", zoomUnZoom);

        function translateMap(evt) {
            let coords = projection.invert([evt.x, evt.y]);

            let x = coords[0] - startX;
            let y = coords[1] - startY;
            if (x == 0 && y == 0) return;

            centerX -= x;
            centerY -= y;

            projection = getProjection(centerX, centerY, scale);
            path = d3.geoPath().projection(projection);

            d3.select(htmlId).selectAll("path").attr("d", path);
            drawCircles();
        }

        function zoomUnZoom(evt) {
            let k = evt.transform.k - startK;

            if (k > 0) scale *= 1.1;
            // zoom
            else if (k < 0) scale *= 0.9; // dezoom

            projection = getProjection(centerX, centerY, scale);
            path = d3.geoPath().projection(projection);
            startK = evt.transform.k;

            d3.select(htmlId).selectAll("path").attr("d", path);
            drawCircles();
        }

        return { zoom, drag };
    }

</script>

<style>
    /* .hidden {
            display: none;
        } */

    .tooltip {
        color: #000;
        background-color: #fff;
        padding: 0.5em;
        /* text-shadow: #f5f5f5 0 1px 0; */
        border-radius: 2px;
        opacity: 0.9;
        position: absolute;
    }
</style>

<div>
    <div class="card">
        <div class="card-body">
            <div class="row">
                <div class="col-8">
                    <label for="year-range">Year: {years[year]}</label>
                    <input type="range" min='0' max={years.length-1} 
                        bind:value={year}
                        on:input={() => drawCircles()} 
                        class='form-range'
                        id='year-range'
                        />
                </div>
                <div class="col-4">
                    <label for="selectedSpecie">Selected Specie</label>
                    <select id='selectedSpecie' class="form-select" bind:value={selectedSpecie} on:change={() => drawCircles()} >
                        {#each species as specie, index}
                            <option value={index}>{specie.name}</option>
                        {/each}
                    </select>
                </div>
            </div>
        </div>
    </div>
    {#if loading}
        <div class='text-center card'>
            <div class="card-body">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        </div>
    {/if}
    <div id="app" class="mt-2 text-center border" />
</div>
