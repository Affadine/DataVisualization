<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";
    export let ripos;

    let margin = {left: 50, right: 20, top: 50, bottom: 50 };
    let width = document.body.clientWidth * 0.7;
    let height = window.innerHeight * 0.6;
    let years = [];
    let bombusData = [];
    let svg;
    let minDate = 0;
    let maxDate = 0;
    let finaldata = []
    let dataUtile = []
    let allData = []
    let species = [];
    let speciesId = {};
    let hierarchicalSpecie = [];
    let newData = []
    let selectedSpecies = []
    let x
    let areaGenerator
    let area
    let xAxis
    let y
    let yAxis
    let z
    let choice =-1

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

        minDate= d3.min(bombusData,function(d){return d.Year})
        maxDate= d3.max(bombusData,function(d){return d.Year})

        svg = d3.select("#my_dataviz")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform",
                        "translate(" + margin.left + "," + margin.top + ")");

        let color = d3.scaleOrdinal()
                .domain(selectedSpecies)
                .range(['rgba(192, 57, 43, 0.5)', 'rgba(136, 78, 160, 0.5)',
                    'rgba(36, 113, 163, 0.5)', 'rgba(23, 165, 137, 0.5)',
                    'rgba(30, 132, 73, 0.5)', 'rgba(241, 196, 15, 0.5)',
                    'rgba(131, 145, 146, 0.5)']);//d3.schemeSet3);

        x = d3.scaleTime()
                .domain(d3.extent(dataUtile, function(d) { return d3.timeParse("%Y")(d.date); }))
                .range([0,width]);
        xAxis = svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x));

        y = d3.scaleLinear()
                .domain([0, 2200/*d3.max(dataUtile, function(d) { return +d.value; })*/])
                .range([ height, 0 ]);
        yAxis = svg.append("g")
                .call(d3.axisLeft(y));

        z = color;

        /*let brush = d3.brushX().extent([[0,0],[width,height]])
                .on("end", updateChart)*/

        area = svg.append('g').attr("clip-path", "url(#clip2)")


        areaGenerator = d3.area()
                .x(function(d) { return x(d3.timeParse("%Y")(d.date)) })
                .y0(y(0))
                .y1(function(d) { return y(d.value) })


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


        for(let i =0;i<=13;i++){
            choice = i
            updateInfos(bombusData,years)
            area.append("path")
                    .datum(dataUtile)
                    .attr("class", "myArea"+choice)
                    .style("fill", color(choice))
                    .style("opacity", "0")
                    .attr("d", areaGenerator )
        }

        /*area.append("g")
                .attr("class", "brush")
                .call(brush);
*/

        let idleTimeout
        function idled() { idleTimeout = null; }
/*
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
            for(let i=0;i<=13;i++){

                area.select('.myArea'+i.toString())
                        .transition()
                        .duration(1000)
                        .attr("d", areaGenerator)
            }
        }*/


        svg.on("dblclick",function(){
            for(let i=0;i<=13;i++) {
                x.domain(d3.extent(allData[i], function(d) { return d3.timeParse("%Y")(d.date); }))
                y.domain([0, d3.max(allData[i], function(d) { return +d.value; })])
                xAxis.transition().call(d3.axisBottom(x))
                yAxis.transition().call(d3.axisLeft(y))
                area.select('.myArea'+i.toString())
                        .transition()
                        .attr("d", areaGenerator)
            }
        });

    };


    function filterId(item){
        let bool = false

        hierarchicalSpecie[choice].ids.forEach((id) => {
            if(item == id.toString()){

                bool = true;
            }
        })
        return bool;
    }

    function updateInfos(data,years){
        console.log(choice)


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
            allData.push(dataUtile)

        x.domain(d3.extent(dataUtile, function(d) { return d3.timeParse("%Y")(d.date); }))
        y.domain([0, d3.max(dataUtile, function(d) { return +d.value; })])
        xAxis.transition().call(d3.axisBottom(x))
        yAxis.transition().call(d3.axisLeft(y))
        area.select('.myArea'+choice.toString())
                .transition()
                .attr("d", areaGenerator)






    }

    /* function getNumber(data,years) {


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
     }*/

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

    function handleParentSpecieClick(evt) {
        const checkbox = evt.target;
        console.log(checkbox.value)
        if (selectedSpecies.indexOf(checkbox.value) !== -1) {
            console.log("deja present")
            selectedSpecies.splice(selectedSpecies.indexOf(checkbox.value), 1);
            svg.selectAll(".myArea"+checkbox.value.toString()).transition().duration(1000).style("opacity", "0")

        }else {
            selectedSpecies.push(checkbox.value)
            svg.selectAll(".myArea"+checkbox.value.toString()).transition().duration(1000).style("opacity", "0.6")
        }





        console.log(selectedSpecies)
        /*const subSpecie = checkbox.value;

        if (selectedSpecies.indexOf(checkbox.value.toString() !== -1) {
            delete(selectedSpecies.indexOf(checkbox.value.toString())
        } else {
            selectedSpecies.subSpecie = selectedSpecies.subSpecie.filter(s => s != subSpecie);
        }

        updateInfos();*/
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
                <li class='list-group-item d-flex justify-content-between align-items-center'>
                                    <span>
                                        <input class="form-check-input me-1" type="checkbox" on:click={handleParentSpecieClick} checked={false} value={i} >
                                        {specie.name}
                                    </span>

                </li>

            {/each}
        </ul>
    </div>
</div>

<div id="3"><p style="text-align: left;">This chart represents the evolution of the Bombus for each species . We can select the species we want to show on the checkbox. This graph allow us to easily compare the species with one and others. </p></div>

<div id="2"><p style="text-align: center;">Source : https://www.d3-graph-gallery.com/graph/area_brushZoom.html
        </p><p style="text-align: center;">Source : ttps://www.d3-graph-gallery.com/graph/area_basic.html</p></div>

