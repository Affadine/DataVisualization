<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";
    export let ripos;

    let margin = {top: 60, right: 230, bottom: 50, left: 50};
    let width = 2200 - margin.left - margin.right;
    let height = 1200 - margin.top - margin.bottom;
    let years = [];
    let bombusData = [];
    let svg;
    let minDate = 0;
    let maxDate = 0;

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

               drawGraph()
    });
          async function drawGraph() {

            years = bombusData
                    .map((d) => parseInt(d.Year))
                    .filter(
                            (value, index, self) => self.indexOf(value) === index
                    );

            getNumber(bombusData,years)
            minDate= d3.min(bombusData,function(d){return d.Year})
            maxDate= d3.max(bombusData,function(d){return d.Year})



               svg = d3.select("#my_dataviz")
                       .append("svg")
                       .attr("width", width + margin.left + margin.right)
                       .attr("height", height + margin.top + margin.bottom)
                       .append("g")
                       .attr("transform",
                               "translate(" + margin.left + "," + margin.top + ")");

              let keys = []
              let h = 0
              hierarchicalSpecie.forEach(x=>{
                  keys[h]=x.name
                  h++
              })
              console.log(keys)

              let color = d3.scaleOrdinal()
                      .domain(keys)
                      .range(d3.schemeSet3);

              let stackedData = d3.stack()
                      .keys(keys)
                      (newData)

              // Add X axis
              x = d3.scaleLinear()
                      .domain(d3.extent(newData, function(d) { return d.date; }))
                      .range([ 0, width ]);
              xAxis = svg.append("g")
                      .attr("transform", "translate(0," + height + ")")
                      .call(d3.axisBottom(x).ticks(5))

              // Add X axis label:
              svg.append("text")
                      .attr("text-anchor", "end")
                      .attr("x", width)
                      .attr("y", height+40 )
                      .text("Time (year)");

              /*svg.append("text")
                      .attr("x", (width / 2))
                      .attr("y", 0 - (margin.top / 20))
                      .attr("text-anchor", "middle")
                      .style("fill", "#5a5a5a")
                      .style("font-family", "Raleway")
                      .style("font-weight", "300")
                      .style("font-size", "24px")
                      .text("Evolution of bees over time");*/

              // Add Y axis label:
              svg.append("text")
                      .attr("text-anchor", "end")
                      .attr("x", 0)
                      .attr("y", -20 )
                      .text("Frequency")
                      .attr("text-anchor", "start")

              // Add Y axis
              y = d3.scaleLinear()
                      .domain([0, 12000])
                      .range([ height, 0 ]);
              svg.append("g")
                      .call(d3.axisLeft(y).ticks(5))

              let clip = svg.append("defs").append("svg:clipPath")
                      .attr("id", "clip")
                      .append("svg:rect")
                      .attr("width", width )
                      .attr("height", height )
                      .attr("x", 0)
                      .attr("y", 0);

              let brush = d3.brushX().extent( [ [0,0], [width,height] ] )
                      .on("end", updateChart)

              let areaChart = svg.append('g').attr("clip-path", "url(#clip)")


              area = d3.area()
                      .x(function(d) { return x(d.data.date); })
                      .y0(function(d) { return y(d[0]); })
                      .y1(function(d) { return y(d[1]); })

              areaChart
                      .selectAll("mylayers")
                      .data(stackedData)
                      .enter()
                      .append("path")
                      .attr("class", function(d) {return "myArea " + d.key })
                      .style("fill", function(d) { return color(d.key); })
                      .attr("d", area)

              areaChart
                      .append("g")
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
                    areaChart.select(".brush").call(brush.move, null)
                }


                xAxis.transition().duration(1000).call(d3.axisBottom(x))
                areaChart.selectAll("path")
                        .transition()
                        .duration(1000)
                        .attr("d", area)
            }

              var size = 40
              svg.selectAll("myrect")
                      .data(keys)
                      .enter()
                      .append("rect")
                      .attr("x", 1800)
                      .attr("y", function(d,i){ return 10 + i*(size+5)}) // 100 is where the first dot appears. 25 is the distance between dots
                      .attr("width", size)
                      .attr("height", size)
                      .style("fill", function(d){ return color(d)})


              // Add one dot in the legend for each name.
              svg.selectAll("mylabels")
                      .data(keys)
                      .enter()
                      .append("text")
                      .attr("x", 1800 + size*1.2)
                      .attr("y", function(d,i){ return 10 + i*(size+5) + (size/2)}) // 100 is where the first dot appears. 25 is the distance between dots
                      .style("fill", function(d){ return color(d)})
                      .text(function(d){ return d})
                      .attr("text-anchor", "left")
                      .style("alignment-baseline", "middle")

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



    function getNumber(data,years) {
        console.log(hierarchicalSpecie.length)
        let j = 0
        years.forEach(annee=>{
            let dict = {'date': 0}
            dict['date'] = annee
            for(let x=0 ; x < hierarchicalSpecie.length ; x++) {
                selectedSpecies.parentIndex= x
                dict[hierarchicalSpecie[x].name] = (bombusData.filter((d) => d.Year == annee.toString() && filterId(d.SpecieId))).length

            }

            newData[j]=dict

            j+=1
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
<h1 class="text-center mt-4 mb-4" style='font-family:Raleway'><img class='logo' src="logo_bee.jpg"/> Stack Area chart of the evolution of bees<img class='logo' src="logo_bee.jpg"/> </h1>
<div id="3"><p style="text-align: left;">This  stacked area chart represents the evolution of the Bombus and its species throught time . We can zoom to a specific period for more insight. </p></div>

<div id="my_dataviz" ></div>

