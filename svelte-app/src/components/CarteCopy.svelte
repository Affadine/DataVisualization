<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";

    export let ripos;

    // let euGeoJsonUrl = '/european-union-countries.geojson';
    // let euGeoJsonUrl = '/custom.geo.json'; // generate from 'https://geojson-maps.ash.ms/'
    // generate from 'https://geojson-maps.ash.ms/'
    // have a look at https://datahub.io/core/geo-nuts-administrative-boundaries


    let width = document.body.clientWidth - 100;
    let height = window.innerHeight - 100;

    let euGeoJson = ripos.euGeoJson;

    let startX, startY;

    let centerX = 9.454071, centerY = 52.279229, scale = 1200;

    let projection = getProjection(centerX, centerY, scale);

    let path = d3.geoPath().projection(projection);
    let startK;

    onMount(() => drawSvgMap(path));

    document.body.onresize = () => drawSvgMap(path);

    let drag = d3.drag()
            .on('start', (evt) => {
                let coords = projection.invert([evt.x, evt.y]);
                startX = coords[0];
                startY = coords[1];
                count = 0;
            })
            .on('drag', reDrawMap)
            .on('end', reDrawMap);
    

    let zoom = d3.zoom()
                .on('start', (evt) => {
                    startK = evt.transform.k;
                    count = 0;
                })
                .on('zoom', zoomUnZoom)
                .on('end', zoomUnZoom);

    function drawSvgMap(path) {

        width = document.body.clientWidth - 100;
        height = window.innerHeight - 100;

        d3.select('#app').selectAll("svg").remove();


        let svg = d3
            .select('#app')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('cursor', 'pointer')
            .attr('draggable', true)
            .call(drag)
            .call(zoom);

        euGeoJson.then((data) => {
            svg.selectAll("path")
                .data(data.features)
                .enter()
                .append("path")
                .attr("d", path)
                .style('fill', '#FDFEFE')
                .style('stroke', 'black');
        });
    }


    function getProjection(centerX, centerY, scale) {
        return d3
        .geoConicConformal()
        .center([centerX, centerY])
        .scale(scale);
    }

    function reDrawMap(evt){
        let coords = projection.invert([evt.x, evt.y]);

        let x = (coords[0] - startX);
        let y = (coords[1] - startY);

        if (x == 0 || y == 0) return;

        centerX +=  -x;
        centerY +=  -y;

        projection = getProjection(centerX, centerY, scale);
        path = d3.geoPath().projection(projection);

        d3.select('#app').selectAll("path").attr("d", path);
    }

    function zoomUnZoom(evt) {

        let k = evt.transform.k - startK;

        if (k > 0) scale *= 1.1; // zoom
        else if (k < 0) scale *= 0.9; // dezoom

        projection = getProjection(centerX, centerY, scale);
        path = d3.geoPath().projection(projection);
        startK = evt.transform.k;

        d3.select('#app').selectAll("path").attr("d", path);

    }

</script>

<div>
    <div id="app" class="mt-2 text-center border"  />
</div>
