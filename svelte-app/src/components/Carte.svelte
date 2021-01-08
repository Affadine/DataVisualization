<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";

    export let ripos;

    // let width = document.body.clientWidth - 400;
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
    let countriesPos = [];
    let geojson = [];
    let speciesId = {};

    let hierarchicalSpecie = [];

    let selectedSpecies = {
        parentIndex: 0,
        subSpecie: [],
    }

    let parentSpecieFresqs = {};



    onMount( async () =>  {
        geojson = await ripos.euGeoJson.then(a => a);
        bombusData = await ripos.bombusFreq.then(a => a);
        species = await ripos.speciesData.then(a => a);
        countriesPos = await ripos.countriesPos.then(a => a);

        speciesId = speciesToSpeciesId(species);
        hierarchicalSpecie = createSpecieHierarchy(species);
        
        // selectedSpecies.parentSpecie = hierarchicalSpecie[0].name;
        parentSpecieFresqs = calculateFreqParParentSpecie(bombusData, speciesId);


        drawSvgMap()
    });

    // document.body.onresize = () => {
    //     projection = getProjection(centerX, centerY, scale);
    //     drawSvgMap();
    // };

    async function drawSvgMap() {
        // width = document.body.clientWidth - 100;
        height = window.innerHeight - 100;

        d3.select("#app").selectAll("svg").remove();

        let dragZoom = mapInteractions("#app");

        svg = d3
            .select("#app")
            .append("svg")
            .attr("width", "100%")
            .attr("height", height)
            .attr("cursor", "pointer")
            .attr("draggable", true)
            .call(dragZoom.drag)
            .call(dragZoom.zoom);



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

        updateInfos();
        loading = false;
    }

    function updateInfos() {

        svg.selectAll("circle").remove();
        svg.selectAll("text").remove();


        let data = bombusData.filter((d) => d.Year == years[year] && d.SpecieId == species[selectedSpecie]?.id);


        let freqs = data.map(d => parseInt(d.Frequency))
                        .filter((value, index, self) => self.indexOf(value) === index);

        let min = Math.min(...freqs);
        let max = Math.max(...freqs);

        color.domain([min, max]); 

        svg.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => projection([d["Longitude"], d["Latitude"]])[0])
            .attr("cy", d => projection([d["Longitude"], d["Latitude"]])[1])
            .attr("r", 5)
            .style("fill", d => color(parseInt(d.Frequency)) );

        svg.selectAll('text')
            .data(countriesPos)
            .enter()
            .append('text')
            .text(d => {
                if (scale < 800)
                    return d.country;
                return d.name;
            
            })
            .attr('x', d => projection([d["longitude"], d["latitude"]])[0])
            .attr('y', d => projection([d["longitude"], d["latitude"]])[1])
            .style('fill', '#000')

        
    }

    function getParentSpecie(specieName) {
        return specieName.split(' ')[0] + ' ' + specieName.split(' ')[1];
    }

    function calculateFreqParParentSpecie(bombusData, speciesId) {

        let result = {}
        for (let i = 0; i < bombusData.length; i++) {
            const data = bombusData[i];
            const specie = speciesId[parseInt(data.SpecieId)];
            const specieParentName = getParentSpecie(specie.name);
            const yearSpecie = combineSpecieYear(specieParentName, data.Year);
            
            if (!result[yearSpecie]) result[yearSpecie] = 0;
            result[yearSpecie] += parseInt(data.Frequency);
        }

        return result;
    }

    function combineSpecieYear(specieParentName, year) {
        return specieParentName + '-' + year;
    }

    function numberOfBombusDataByParentSpecies(bombusData, specieName) {
        let c = 0;

        for (let i = 0; i < bombusData.length; i++) {
            const data = bombusData[i];
            let specie = speciesId[parseInt(data.SpecieId)];
            if (selectedSpecies.parentSpecie == specie.name.split(' ')[0] + ' ' + specie.name.split(' ')[1]) {
                c++;
            }
        }

        return c;
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
            updateInfos();
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
            updateInfos();
        }

        return { zoom, drag };
    }

    function createSpecieHierarchy(species) {
        let result = {}

        for (let i = 0; i < species.length; i++) {
            const specie = species[i];
            const specieParentName = getParentSpecie(specie.name);
            if (!result[specieParentName]) {
                result[specieParentName] = {
                    'name': specieParentName,
                    'subspecies': []
                }
            }
            result[specieParentName].subspecies.push(specie.name.split(' ')[2]);
        }

        return Object.values(result);
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

    function getSpecieFreqByYear(specieName, year) {
        const specieParentName = getParentSpecie(specieName);
        const k = combineSpecieYear(specieParentName, years[year])

        return parentSpecieFresqs[k] || 0;
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
                        on:input={() => updateInfos()} 
                        class='form-range'
                        id='year-range'
                        />
                </div>
                <div class="col-4">
                    <label for="selectedSpecie">Selected Specie</label>
                    <select id='selectedSpecie' class="form-select" bind:value={selectedSpecie} on:change={() => updateInfos()} >
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
    <div class="row m-1">
        <div class="col-7">
            <div id="app" class="mt-2 text-center border" />
        </div>
        <div class="col-5 mt-2">
            <ul class='list-group'>
                {#each hierarchicalSpecie as specie, i}
                    <li 
                        style='cursor: pointer;' 
                        class="list-group-item d-flex justify-content-between align-items-center {selectedSpecies.parentIndex == i ? ' active ': ''}"
                        on:click={() => selectedSpecies.parentIndex = i}
                    >
                        {specie.name}
                        <span class="badge bg-primary rounded-pill">{getSpecieFreqByYear(specie.name, year)}</span>
                    </li>
                    {#if selectedSpecies.parentIndex == i }
                        <ul class="list-group list-group-flush">
                            {#each specie.subspecies as subspecies, i}
                                <li class='list-group-item'>
                                    <input class="form-check-input me-1" type="checkbox" checked={true} >
                                    {subspecies}
                                </li>
                            {/each}
                        </ul>
                    {/if}
                {/each}
            </ul>
        </div>
    </div>
</div>
