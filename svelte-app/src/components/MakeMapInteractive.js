import * as d3 from "d3";

export default (htmlId, projection, getProjection, updates,  _centerX = 9.454071, _centerY = 52.279229, _scale = 1200) => {


    let startK;
    let startX, startY;
    let centerX = _centerX, centerY = _centerY, scale = _scale;

    
    let path = d3.geoPath().projection(projection);


    let drag = d3.drag()
            .on('start', (evt) => {
                let coords = projection.invert([evt.x, evt.y]);
                startX = coords[0];
                startY = coords[1];
            })
            .on('drag', translateMap)
            .on('end', translateMap);


    let zoom = d3.zoom()
                .on('start', (evt) => startK = evt.transform.k)
                .on('zoom', zoomUnZoom)
                .on('end', zoomUnZoom);


    function translateMap(evt) {
        let coords = projection.invert([evt.x, evt.y]);

        let x = (coords[0] - startX);
        let y = (coords[1] - startY);
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

        if (k > 0) scale *= 1.1; // zoom
        else if (k < 0) scale *= 0.9; // dezoom

        projection = getProjection(centerX, centerY, scale);
        path = d3.geoPath().projection(projection);
        startK = evt.transform.k;

        d3.select(htmlId).selectAll("path").attr("d", path);
        updates(projection);
    }

    return {zoom, drag}
}