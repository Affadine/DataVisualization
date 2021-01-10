<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";
    export let ripos;

    let margin = {left: 50, right: 20, top: 20, bottom: 50 };
    let width = 960 - margin.left - margin.right;
    let height = 500 - margin.top - margin.bottom;
    let years = [];
    let bombusData = [];
    let svg;
    let minDate = 0;
    let maxDate = 0;
    let finaldata = []

    onMount(() => drawGraph());


    function drawGraph() {

        ripos.bombusFreq.then((bombusFreq) => {

            years = bombusFreq
                    .map((d) => parseInt(d.Year))
                    .filter(
                            (value, index, self) => self.indexOf(value) === index
                    );

            bombusData = bombusFreq;
            getNumber(bombusData,years)
            finaldata[1972]=2760
            minDate= d3.min(bombusData,function(d){return d.Year})
            maxDate= d3.max(bombusData,function(d){return d.Year})
            let dataf = finaldata.map(function(d,id) {
                return {
                    date: (id),
                    value: (d)
                };
            });
            let dataUtile = []
            let i =0

            dataf.forEach((item) => {
                if(item != undefined) {
                    dataUtile[i] = item
                    i++
                }


            });

            let svg = d3.select("#my_dataviz")
                    .append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform",
                            "translate(" + margin.left + "," + margin.top + ")");

            let x = d3.scaleLinear()
                    .domain([minDate,maxDate])
                    .range([ 0, width ]);
            let xAxis = svg.append("g")
                    .attr("transform", "translate(0," + height + ")")
                    .call(d3.axisBottom(x));

            let y = d3.scaleLinear()
                    .domain([0, d3.max(dataUtile, function(d) { return +d.value; })])
                    .range([ height, 0 ]);
            let yAxis = svg.append("g")
                    .call(d3.axisLeft(y));

            let clip = svg.append("defs").append("svg:clipPath")
                    .attr("id", "clip")
                    .append("svg:rect")
                    .attr("width", width )
                    .attr("height", height )
                    .attr("x", 0)
                    .attr("y", 0);


            let brush = d3.brushX().extent( [ [0,0], [width,height] ] )
                    .on("end", updateChart)

            let area = svg.append('g').attr("clip-path", "url(#clip)")


            let areaGenerator = d3.area()
                    .x(function(d) { return x(d.date) })
                    .y0(y(0))
                    .y1(function(d) { return y(d.value) })

            area.append("path")
                    .datum(dataUtile)
                    .attr("class", "myArea")
                    .attr("fill", "#69b3a2")
                    .attr("fill-opacity", .3)
                    .attr("stroke", "black")
                    .attr("stroke-width", 1)
                    .attr("d", areaGenerator )


            area.append("g")
                    .attr("class", "brush")
                    .call(brush);


            let idleTimeout
            function idled() { idleTimeout = null; }


            function updateChart({selection}) {

                let extent = selection
                //console.log(extent)


                if(!extent){
                    // console.log("here")
                    if (!idleTimeout) return idleTimeout = setTimeout(idled, 350);
                    x.domain([parseInt(minDate), parseInt(maxDate)])
                }else{
                    x.domain([ x.invert(extent[0]), x.invert(extent[1]) ])
                    area.select(".brush").call(brush.move, null)
                }


                //console.log("yes")
                //console.log(x.domain[0])
                xAxis.transition().duration(1000).call(d3.axisBottom(x))
                area.select('.myArea')
                        .transition()
                        .duration(1000)
                        .attr("d", areaGenerator)
            }


            svg.on("dblclick",function(){
                x.domain([minDate,maxDate])
                xAxis.transition().call(d3.axisBottom(x))
                area.select('.myArea')
                        .transition()
                        .attr("d", areaGenerator)
            });



        });}

    function getNumber(data,years) {
        //console.log("enter");
        //console.log(years)
        years.forEach(y =>
                finaldata[y] = (data.filter((d) =>  d.Year == y.toString())).length

        );


    }

</script>

<div id="my_dataviz" style="text-align: center"></div>
<div id="2"><p style="text-align: center;font-weight:bold;">Carte représentant le nombre d'abeille en fonction du temps</p><p style="text-align: center;">*Selectionner une zone pour zoomer</p></div>