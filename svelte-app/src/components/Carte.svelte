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
    let species = [];
    let colors = ["#B4FC98", "#2DA500", "#FADD04", "#FA0404"];
    let color = d3.scaleQuantize().range(colors);
    let countriesPos = [];
    let geojson = [];
    let speciesId = {};
    let min, max;

    let hierarchicalSpecie = [];

    let selectedSpecies = {
        parentIndex: 0,
        subSpecie: [],
    }

    let parentSpecieFresqs = {};

    let selectedPoint = {};



    onMount( async () =>  {
        geojson = await ripos.euGeoJson.then(a => a);
        bombusData = await ripos.bombusFreq.then(a => a);
        species = await ripos.speciesData.then(a => a);
        countriesPos = await ripos.countriesPos.then(a => a);

        speciesId = speciesToSpeciesId(species);
        hierarchicalSpecie = createSpecieHierarchy(species);
        
        selectedSpecies.subSpecie = hierarchicalSpecie[selectedSpecies.parentIndex].subspecies;
        parentSpecieFresqs = calculateFreqParSpecie(bombusData, speciesId);

        drawSvgMap()
    });


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

        let data = bombusData.filter((d) => {
            if (d.Year != years[year]) return false;
            const specie = speciesId[parseInt(d.SpecieId)];
            const specieParentName = getParentSpecie(specie.name);
            const selectedSpecie = hierarchicalSpecie[selectedSpecies.parentIndex];
            if (specieParentName != selectedSpecie.name) return false;
            return selectedSpecies.subSpecie.includes(getSubSpecie(specie.name));
        });


        let freqs = data.map(d => parseInt(d.Frequency))
                        .filter((value, index, self) => self.indexOf(value) === index);

        min = Math.min(...freqs);
        max = Math.max(...freqs);

        color.domain([min, max]); 

        svg.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => projection([d["Longitude"], d["Latitude"]])[0])
            .attr("cy", d => projection([d["Longitude"], d["Latitude"]])[1])
            .attr("r", 7)
            .style("fill", d => color(parseInt(d.Frequency)) )
            .on('click', (e, d) => {
                selectedPoint.long = d["Longitude"];
                selectedPoint.lat = d["Latitude"];
                selectedPoint.freq = d["Frequency"];
                const specie = speciesId[parseInt(d['SpecieId'])];
                selectedPoint.specie = getSubSpecie(specie.name);
            })


        if (scale < 200) return;

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

    function getSubSpecie(specieName) {
        return specieName.split(' ')[2];
    }

    function getParentSpecie(specieName) {
        return specieName.split(' ')[0] + ' ' + specieName.split(' ')[1];
    }


    function addIfExists(result, specieName, data) {
        const yearSpecie = combineSpecieYear(specieName, data.Year);

        if (!result[yearSpecie]) result[yearSpecie] = 0;
        result[yearSpecie] += parseInt(data.Frequency);
    }

    function calculateFreqParSpecie(bombusData, speciesId) {

        let result = {}
        for (let i = 0; i < bombusData.length; i++) {
            const data = bombusData[i];
            const specie = speciesId[parseInt(data.SpecieId)];
            const specieParentName = getParentSpecie(specie.name);
            const subSpecieName = getSubSpecie(specie.name);
            addIfExists(result, specieParentName, data);
            addIfExists(result, subSpecieName, data);

        }

        return result;
    }

    function combineSpecieYear(specieName, year) {
        return specieName + '-' + year;
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
            result[specieParentName].subspecies.push(getSubSpecie(specie.name));
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

    function getSpecieFreqByYear(specieName, year, parent = true) {
        let name = getParentSpecie(specieName);
        if (!parent) {
            name = specieName;
        }

        const k = combineSpecieYear(name, years[year])

        return parentSpecieFresqs[k] || 0;
    }


    function handleSubSpecieCheckbox(evt) {
        const checkbox = evt.target;
        const subSpecie = checkbox.value;
        
        if (checkbox.checked) {
            selectedSpecies.subSpecie.push(subSpecie);
        } else {
            selectedSpecies.subSpecie = selectedSpecies.subSpecie.filter(s => s != subSpecie);
        }

        updateInfos();
    }

    function handleParentSpecieClick(index, subspecies) {
        selectedSpecies.parentIndex = index;
        selectedSpecies.subSpecie = subspecies;
        updateInfos();
    }

</script>

<style>
    /* .hidden {
            display: none;
        } */

    /* .tooltip {
        color: #000;
        background-color: #fff;
        padding: 0.5em;
        text-shadow: #f5f5f5 0 1px 0;
        border-radius: 2px;
        opacity: 0.9;
        position: absolute;
    } */
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
                    <div class="row">
                        <div class="col-3 text-left">min: { isFinite(min) ? min : 'NaN'}</div>
                        <div class="col-6"></div>
                        <div class="col-3 text-right">max: {isFinite(max) ? max: 'NaN'}</div>
                    </div>
                    <svg width="90%" height="25">
                        <defs>
                            <linearGradient id="gradient">
                                {#each colors as color, i}
                                    <stop offset="{(i/colors.length)*100}%" stop-color="{color}"></stop>
                                {/each}
                            </linearGradient>
                        </defs>
                        <rect x="0" y="0" width="600" height="100" fill="url(#gradient)" stroke="black" stroke-width="1" />
                    </svg>
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
    
    <div class="row">
        <div class="card">
            <div class="card-body">
                Longitude: {selectedPoint.long || 0} Latitude: {selectedPoint.lat|| 0} Frequency: {selectedPoint.freq|| 0}
                <span>
                    {#if selectedPoint.long && selectedPoint.lat}
                        Specie: {selectedPoint.specie}
                        <a href="https://www.google.com/maps/@{selectedPoint.lat},{selectedPoint.long},11z" target="_blank" >Show In Google Map</a>
                    {/if}
                </span>
            </div>
        </div>
    </div>

    <div class="row m-1">
        <div class="col-9">
            <div id="app" class="mt-2 text-center border" />
        </div>
        <div class="col-3 mt-2">
            <ul class='list-group'>
                {#each hierarchicalSpecie as specie, i}
                    <li 
                        style='cursor: pointer;' 
                        class="list-group-item d-flex justify-content-between align-items-center {selectedSpecies.parentIndex == i ? ' active ': ''}"
                        on:click={() => handleParentSpecieClick(i, specie.subspecies)}
                    >
                        {specie.name}
                        <span class="badge bg-primary rounded-pill">{getSpecieFreqByYear(specie.name, year, true)}</span>
                    </li>
                    {#if selectedSpecies.parentIndex == i }
                        <ul class="list-group list-group-flush">
                            {#each specie.subspecies as subspecies, i}
                                <li class='list-group-item d-flex justify-content-between align-items-center'>
                                    <span>
                                        <input class="form-check-input me-1" type="checkbox" on:input={handleSubSpecieCheckbox} checked={true} value={subspecies} >
                                        {subspecies}
                                    </span>
                                    <span class="badge text-dark">{getSpecieFreqByYear(subspecies, year, false)}</span>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                {/each}
            </ul>
        </div>
    </div>
</div>
