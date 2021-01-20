<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";
    export let ripos;

    let margin = {left: 50, right: 20, top: 30, bottom: 50 };
    let width = 2200 - margin.left - margin.right;
    let height = 1200 - margin.top - margin.bottom;
    let years = [];
    let bombusData = [];
    let svg;
    let minDate = 0;
    let maxDate = 0;
    let finaldata = []
    let dataUtile = []
    let species = [];
    let speciesId = {};
    let hierarchicalSpecie = [];
    let newData = []
    let selectedSpecies = {
        parentIndex: 0,
    }
    let x
    let areaGenerator
    let area
    let xAxis
    let y
    let yAxis

    onMount( async () =>  {

        species = await ripos.speciesData.then(a => a);

        bombusData = await ripos.bombusFreq.then(a => a);

        speciesId = speciesToSpeciesId(species);


        hierarchicalSpecie = createSpecieHierarchy(species);

        hierarchicalSpecie.forEach( id =>{
            console.log(id.ids)
            if('42' in id.ids){
                console.log("no "+ id.Parent_id.toString())
            }
        })

        console.log(hierarchicalSpecie)

        drawGraph2()
    });
    async function drawGraph2() {
        years = bombusData
                .map((d) => parseInt(d.Year))
                .filter(
                        (value, index, self) => self.indexOf(value) === index
                );

        getNumber(bombusData,years)
        minDate= d3.min(bombusData,function(d){return d.Year})
        maxDate= d3.max(bombusData,function(d){return d.Year})


        let svg = d3.select("#my_dataviz")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform",
                        "translate(" + margin.left + "," + margin.top + ")");

        x = d3.scaleTime()
                .domain(d3.extent(dataUtile, function(d) { return d3.timeParse("%Y")(d.date); }))
                .range([0,width]);
        xAxis = svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x));

        y = d3.scaleLinear()
                .domain([0, d3.max(dataUtile, function(d) { return +d.value; })])
                .range([ height, 0 ]);
        yAxis = svg.append("g")
                .call(d3.axisLeft(y));

        let brush = d3.brushX().extent( [ [0,0], [width,height] ] )
                .on("end", updateChart)

        area = svg.append('g').attr("clip-path", "url(#clip2)")


        areaGenerator = d3.area()
                .x(function(d) { return x(d3.timeParse("%Y")(d.date)) })
                .y0(y(0))
                .y1(function(d) { return y(d.value) })

        /*svg.append("text")
                .attr("x", (width / 2))
                .attr("y", 0 - (margin.top / 20))
                .attr("text-anchor", "middle")
                .style("fill", "#5a5a5a")
                .style("font-family", "Raleway")
                .style("font-weight", "300")
                .style("font-size", "24px")
                .text("Evolution of bees over time");


*/
        svg.append("text")
                .attr("text-anchor", "end")
                .attr("x", 0)
                .attr("y", -20 )
                .text("Frequency")
                .attr("text-anchor", "start")

        svg.append("text")
                .attr("text-anchor", "end")
                .attr("x", width)
                .attr("y", height+40 )
                .text("Time (year)");


        svg.append("linearGradient")
                .attr("id", "areachart-gradient")
                .attr("gradientUnits", "userSpaceOnUse")
                .attr("x1", 0)
                .attr("x2", 0)
                .attr("y1", y(d3.min(dataUtile, d => d3.timeParse("%Y")(d.date))))
                .attr("y2", y(d3.max(dataUtile, d => d3.timeParse("%Y")(d.date))))
                .selectAll("stop")
                .data([
                    {offset: "0%", color: "#bae399"},
                    {offset: "100%", color: "#93dd5a"}
                ])
                .enter().append("stop")
                .attr("offset", d => d.offset)
                .attr("stop-color", d => d.color);

        area.append("path")
                .datum(dataUtile)
                .attr("class", "myArea")
                .style("fill", "url(#areachart-gradient)")
                .style("opacity", "0.6")
                .attr("d", areaGenerator )

        area.append("g")
                .attr("class", "brush")
                .call(brush);

        let idleTimeout
        function idled() { idleTimeout = null; }

        function updateChart({selection}) {

            let extent = selection

            if(!extent){
                if (!idleTimeout) return idleTimeout = setTimeout(idled, 350);
                x.domain([parseInt(minDate), parseInt(maxDate)])
            }else{
                x.domain([ x.invert(extent[0]), x.invert(extent[1]) ])
                area.select(".brush").call(brush.move, null)
            }


            xAxis.transition().duration(1000).call(d3.axisBottom(x))
            area.select('.myArea')
                    .transition()
                    .duration(1000)
                    .attr("d", areaGenerator)
        }


        svg.on("dblclick",function(){
            x.domain(d3.extent(dataUtile, function(d) { return d3.timeParse("%Y")(d.date); }))
            y.domain([0, d3.max(dataUtile, function(d) { return +d.value; })])
            xAxis.transition().call(d3.axisBottom(x))
            yAxis.transition().call(d3.axisLeft(y))
            area.select('.myArea')
                    .transition()
                    .attr("d", areaGenerator)
        });

    };



    function filterId(item){
        let bool = false

        hierarchicalSpecie[selectedSpecies.parentIndex].ids.forEach((id) => {
            if(item == id.toString()){

                bool = true;
            }
        })
        return bool;
    }

    function updateInfos(data,years){

        if(selectedSpecies.parentIndex == -1){
            getNumber(data,years)

        }else {

            //console.log(hierarchicalSpecie[selectedSpecies.parentIndex].ids)

            years.forEach(y =>
                    finaldata[y] = (data.filter((d) => d.Year == y.toString() && filterId(d.SpecieId))).length
            );

            let dataf = finaldata.map(function (d, id) {
                return {
                    date: (id),
                    value: (d)
                };
            });
            let i = 0

            dataf.forEach((item) => {
                if (item != undefined) {
                    dataUtile[i] = item
                    i++
                }
            });

        }

        x.domain(d3.extent(dataUtile, function(d) { return d3.timeParse("%Y")(d.date); }))
        y.domain([0, d3.max(dataUtile, function(d) { return +d.value; })])
        xAxis.transition().call(d3.axisBottom(x))
        yAxis.transition().call(d3.axisLeft(y))
        area.select('.myArea')
                .transition()
                .attr("d", areaGenerator)






    }

    function getNumber(data,years) {


        years.forEach(y =>
                finaldata[y] = (data.filter((d) =>  d.Year == y.toString())).length

        );
        let dataf = finaldata.map(function(d,id) {
            return {
                date: (id),
                value: (d)
            };
        });




        let i =0
        dataf.forEach((item) => {
            if(item != undefined) {
                dataUtile[i] = item
                i++
            }
        });
        console.log(dataUtile)
    }

    function getParentSpecie(specieName) {
        return specieName.split(' ')[0] + ' ' + specieName.split(' ')[1];
    }

    function speciesToSpeciesId(species) {
        let result = {};
        for (let i = 0; i < species.length; i++) {
            const specie = species[i];
            if (!result[specie.name]) {
                result[specie.id] = specie;
            }

        }
        return result;
    }

    function handleParentSpecieClick(index) {
        if(selectedSpecies.parentIndex == index){
            index = -1
        }
        selectedSpecies.parentIndex = index;
        //console.log(index)
        updateInfos(bombusData,years);
    }

    function createSpecieHierarchy(species) {
        let result = {}

        for (let i = 0; i < species.length; i++) {
            const specie = species[i];
            const specieParentName = getParentSpecie(specie.name);
            if (!result[specieParentName]) {
                result[specieParentName] = {
                    'name': specieParentName,
                    'subspecies': [],
                    'Parent_id': i,
                    'ids':[]
                }
            }
            result[specieParentName].subspecies.push(getSubSpecie(specie.name));
            result[specieParentName].ids.push(specie.id);
        }
        return Object.values(result);
    }

    function getSubSpecie(specieName) {
        return specieName.split(' ')[2];
    }

    function getSubSpecieId(specieName) {
        return specieName.split(' ')[3];
    }

</script>
<h1 class="text-center mt-4 mb-4" style='font-family:Raleway'><img class='logo' src="logo_bee.jpg"/>Area chart of the evolution of bees<img class='logo' src="logo_bee.jpg"/> </h1>

<div class="row m-1">
    <div class="col-9">
        <div id="my_dataviz" />
    </div>
    <div class="col-3 mt-2">
        <ul class='list-group'>
            {#each hierarchicalSpecie as specie, i}
                <li
                        style='cursor: pointer;'
                        class="list-group-item d-flex justify-content-between align-items-center {selectedSpecies.parentIndex == i ? ' active ': ''}"
                        on:click={() => handleParentSpecieClick(i)}
                >
                    {specie.name}
                </li>

            {/each}
        </ul>
    </div>
</div>

<div id="3"><p style="text-align: left;">This chart represents the evolution of the Bombus and its species throught time . We can zoom to a specific period for more insight </p></div>

<div id="2"><p style="text-align: center;">*Select an area to zoom and Double click to reset</p></div>

