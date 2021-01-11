<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";
    export let ripos;

    let margin = {left: 50, right: 20, top: 30, bottom: 50 };
    let width = 960 - margin.left - margin.right;
    let height = 500 - margin.top - margin.bottom;
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
    let selectedSpecies = {
        parentIndex: 0,
    }


    onMount( async () =>  {

        species = await ripos.speciesData.then(a => a);

    //function drawGraph() {


       bombusData =await ripos.bombusFreq.then(a => a);

        speciesId = speciesToSpeciesId(species);

        hierarchicalSpecie = createSpecieHierarchy(species);

               drawGraph()
    });
          async function drawGraph() {
            years = bombusData
                    .map((d) => parseInt(d.Year))
                    .filter(
                            (value, index, self) => self.indexOf(value) === index
                    );

           // bombusData = bombusFreq;
            getNumber(bombusData,years)
           // finaldata[1972]=2760;
            minDate= d3.min(bombusData,function(d){return d.Year})
            maxDate= d3.max(bombusData,function(d){return d.Year})


            let svg = d3.select("#my_dataviz")
                    .append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform",
                            "translate(" + margin.left + "," + margin.top + ")");

            let x = d3.scaleTime()
                    .domain(d3.extent(dataUtile, function(d) { return d3.timeParse("%Y")(d.date); }))
                    .range([0,width]);
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
                    .x(function(d) { return x(d3.timeParse("%Y")(d.date)) })
                    .y0(y(0))
                    .y1(function(d) { return y(d.value) })

            svg.append("text")
                    .attr("x", (width / 2))
                    .attr("y", 0 - (margin.top / 20))
                    .attr("text-anchor", "middle")
                    .style("fill", "#5a5a5a")
                    .style("font-family", "Raleway")
                    .style("font-weight", "300")
                    .style("font-size", "24px")
                    .text("Évolution des abeilles en fonction du temps");

            svg.append("linearGradient")
                    .attr("id", "areachart-gradient")
                    .attr("gradientUnits", "userSpaceOnUse")
                    .attr("x1", 0)
                    .attr("x2", 0)
                    .attr("y1", y(d3.min(dataUtile, d => d3.timeParse("%Y")(d.date))))
                    .attr("y2", y(d3.max(dataUtile, d => d3.timeParse("%Y")(d.date))))
                    .selectAll("stop")
                    .data([
                        {offset: "0%", color: "#d6910d"},
                        {offset: "100%", color: "#c1891e"}
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
                x.domain(d3.extent(dataUtile, function(d) { return d3.timeParse("%Y")(d.date); }))
                xAxis.transition().call(d3.axisBottom(x))
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

        console.log(hierarchicalSpecie[selectedSpecies.parentIndex].ids)

        hierarchicalSpecie[selectedSpecies.parentIndex].ids.forEach((id) => {
            console.log("yes")
            console.log(id)
        })





        years.forEach(y =>
                finaldata[y] = (data.filter((d) =>  d.Year == y.toString()  && filterId(d.SpecieId))).length

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



    function getNumber(data,years) {
        //console.log("enter");
        //console.log(years)
        years.forEach(y =>
                finaldata[y] = (data.filter((d) =>  d.Year == y.toString() /*&& d.SpecieId == "2"*/)).length

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
        selectedSpecies.parentIndex = index;
        console.log(index)

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
                    'ids':[]
                }
            }
            result[specieParentName].subspecies.push(getSubSpecie(specie.name));
            result[specieParentName].ids.push(specie.id);
        }
        console.log(Object.values(result))
        return Object.values(result);
    }

    function getSubSpecie(specieName) {
        return specieName.split(' ')[2];
    }

    function getSubSpecieId(specieName) {
        return specieName.split(' ')[3];
    }



</script>

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
<div id="2"><p style="text-align: center;">*Selectionner une zone pour zoomer</p></div>
