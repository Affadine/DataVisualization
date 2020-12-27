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
    let left, top, text = "", showLabel = false;
    let year = 0, years = [];
    let bombusData = [];
    let svg;

    onMount(() => drawSvgMap(path));

    document.body.onresize = () => drawSvgMap(path);

    function drawSvgMap(path) {
        width = document.body.clientWidth - 100;
        height = window.innerHeight - 100;

        d3.select("#app").selectAll("svg").remove();

        let dragZoom = mapInteractions("#app", drawCircles);

        svg = d3
            .select("#app")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("cursor", "pointer")
            .attr("draggable", true)
            .call(dragZoom.drag)
            .call(dragZoom.zoom);

        ripos.euGeoJson.then((geojson) => {
            ripos.bombusFreq.then((bombusFreq) => {
                svg.selectAll("path")
                    .data(geojson.features)
                    .enter()
                    .append("path")
                    .attr("d", path)
                    .attr("class", (d) => d.properties.name)
                    .style("fill", "#FDFEFE")
                    .style("stroke", "black");
                    // .on("mouseenter", (evt, d) => {
                    //     showLabel = true;
                    //     left = evt.clientX - 10;
                    //     top = evt.clientY - 30;
                    //     text = d.properties.name;
                    // })
                    // .on("mouseout", () => (showLabel = false));

                years = bombusFreq
                    .map((d) => parseInt(d.Year))
                    .filter(
                        (value, index, self) => self.indexOf(value) === index
                    );

                bombusData = bombusFreq;

                let data = bombusData.filter((d) => d.Year == '1972');

                console.log(bombusFreq.length);
                console.log(data.length);

                drawCircles(projection);
                loading = false;
            });
        });
    }

    function drawCircles(proj) {
        svg.selectAll("circle").remove();

        let data = bombusData.filter((d) => d.Year == years[year]);

        svg.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", (d) => proj([d["Longitude"], d["Latitude"]])[0])
            .attr("cy", (d) => proj([d["Longitude"], d["Latitude"]])[1])
            .attr("r", 5)
            .style("fill", "rgba(145, 145, 0, 0.2)");
    }

    function getProjection(centerX, centerY, scale) {
        return d3.geoConicConformal().center([centerX, centerY]).scale(scale);
    }

    function mapInteractions(
        htmlId,
        updates,
        _centerX = 9.454071,
        _centerY = 52.279229,
        _scale = 1200
    ) {
        let startK;
        let startX, startY;
        let centerX = _centerX,
            centerY = _centerY,
            scale = _scale;

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
            updates(projection);
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
            updates(projection);
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
            <label for="year-range">Year: {years[year]}</label>
            <input type="range" min='0' max={years.length-1} 
                bind:value={year}
                on:input={() => drawCircles(projection)} 
                class='form-range'
                id='year-range'
                />
        </div>
    </div>
    {#if loading}
        <div class="spinner-border text-center" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    {/if}
    <div id="app" class="mt-2 text-center border" />
    <!-- {#if showLabel}
        <div class="tooltip" style="left: {left}px; top: {top}px">{text}</div>
    {/if} -->
</div>
