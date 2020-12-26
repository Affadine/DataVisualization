<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";
    import MakeMapInteractive from "./MakeMapInteractive";
    

    export let ripos;


    let width = document.body.clientWidth - 100;
    let height = window.innerHeight - 100;
    let centerX = 9.454071, centerY = 52.279229, scale = 1200;
    let projection = getProjection(centerX, centerY, scale);
    let path = d3.geoPath().projection(projection);
    let left, top, text = '', showLabel = false;


    onMount(() => drawSvgMap(path));

    document.body.onresize = () => drawSvgMap(path);

    function drawSvgMap(path) {

        width = document.body.clientWidth - 100;
        height = window.innerHeight - 100;

        d3.select('#app').selectAll("svg").remove();

        let dragZoom = MakeMapInteractive('#app', getProjection);

        let svg = d3
            .select('#app')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('cursor', 'pointer')
            .attr('draggable', true)
            .call(dragZoom.drag)
            .call(dragZoom.zoom);

        

        ripos.euGeoJson.then(geojson => {
            ripos.bombusFreq.then(bombusFreq => {


                svg.selectAll('path')
                    .data(geojson.features)
                    .enter()
                    .append('path')
                    .attr('d', path)
                    .attr('class', d => d.properties.name)
                    .style('fill', '#FDFEFE')
                    .style('stroke', 'black')
                    .on('click', (evt, d) => {
                        showLabel = true;
                        left = evt.clientX - 10;
                        top = evt.clientY - 30;
                        text = d.properties.name;
                        // d3.selectAll('.' + d.properties.name).style('fill', 'red');
                    })
                    .on('mouseout', () => showLabel = false)
            })
        });
    }


    function getProjection(centerX, centerY, scale) {
        return d3
        .geoConicConformal()
        .center([centerX, centerY])
        .scale(scale);
    }


</script>

<div>
    <div id="app" class="mt-2 text-center border"></div>
    {#if showLabel}
        <div class='tooltip' style="left: {left}px; top: {top}px">{text}</div>
    {/if}
</div>


<style>
    /* .hidden {
            display: none;
        } */

    .tooltip {
        color: #000;
        background-color: #fff;
        padding: .5em;
        /* text-shadow: #f5f5f5 0 1px 0; */
        border-radius: 2px;
        opacity: 0.9;
        position: absolute;
    }
</style>