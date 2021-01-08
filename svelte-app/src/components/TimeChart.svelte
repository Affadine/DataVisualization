<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";
    import { fix_and_outro_and_destroy_block } from "svelte/internal";
    import MakeMapInteractive from "./MakeMapInteractive";
    // http://api-adresse.data.gouv.fr/reverse/?lat=48.8566969&lon=2.3514616

    export let ripos;
    

    let width = document.body.clientWidth - 100;
    let height = window.innerHeight - 100;
    let centerX = 9.454071, centerY = 52.279229, scale = 1200;
    let projection = getProjection(centerX, centerY, scale);
    let path = d3.geoPath().projection(projection);
    let loading = true;
    let year = 0, years = [];
    let bombusData = [];
    let countries = [];
    
    let species = [], selectedSpecie = 0;
    let allcountries = [];
    let legendCellSize = 20;
    let tooltipWidth = 5*210;

    let allColors = [ "#e0f3db", "#ccebc5", "#a8ddb5", "#7bccc4", "#4eb3d3", "#2b8cbe", "#0868ac", "#084081"
       , "#ffcccc", "#ffb3b3","#ff9999","#ff8080","#ff6666","#ff4d4d","#ff3333","#ff1a1a","#ff0000","#e60000","#cc0000","#b30000"
        ,"#990000","#800000","#660000","#4d0000","#330000","#1a0000"];
    let colors = [];
    let mapColors = {};
    let mapKeyColors = {};
    var countryFilter = ["Finland", "France", "Russia", "Austria", "__United Kingdom"];
    var minYear = 1980;
    let yMax;
    const margin = {top: 20, right: 20, bottom: 90, left: 120};


    function getProjection(centerX, centerY, scale) {
        return d3.geoConicConformal().center([centerX, centerY]).scale(scale);
    }
    let svgInitalized = false;
    let svg;
    let legend;

    function agregateData0(arrayData ) {
        var result = 0;
        //console.log("content1", content);
        for (var idx = 0; idx < arrayData.length; idx++) {
            var row = arrayData[idx];
            result = result + 1*row.Frequency;
        }
        return result;
    }

    /**
     * Regroupe les données avec un seul citrère
     * @param arrayData
     * @param dim1
     * @param dim1Values
     */
    function agregateData1(arrayData, dim1, dim1Values, minRatio ) {
        var content = {};
        // Initialisation des valeurs à 0
        var total = 0;
        for (var idx1 = 0; idx1 < dim1Values.length ; idx1++) {
            var dim1Key = dim1Values[idx1];
            content[dim1Key] = 0;
        }
        console.log("content1", content);
        for (var idx = 0; idx < arrayData.length; idx++) {
            var row = arrayData[idx];
            var dim1Key = row[dim1];       //row.Year
            // if(dim1=='Year' && 1*dim1Key==1980)  console.log("dim1Key", dim1Key, typeof dim1Key, typeof dim1Values[0], dim1Values.indexOf(1*dim1Key), dim1Values);
            if(dim1Values.indexOf(dim1Key)>=0) {
                content[dim1Key] = content[dim1Key] + 1*row.Frequency;
                total=total + 1*row.Frequency;
            }
        }
        //console.log("content1", content);
        var minTotal =  minRatio * total;
        console.log("agregateData1 minTotal", minTotal );
        var testGap = 0;
        for (var idx1 = 0; idx1 < dim1Values.length ; idx1++) {
            var dim1Key = dim1Values[idx1];
            //console.log("agregateData1", dim1Key );
            if(content[dim1Key] < minTotal) {
                if(!content.hasOwnProperty("Other")) {
                    content["Other"] = 0;
                }
                //console.log("agregateData1 other for ", dim1Key , content[dim1Key]);
                testGap = testGap + 1*content[dim1Key];
                content["Other"] = content["Other"] + 1*content[dim1Key];
                delete(content[dim1Key]); 
            }
        }
        console.log("agregateData1 testGap", testGap);
        return content;
    }

    /**
     * Regroupe les données avec 2 critères
     * @param arrayData
     * @param dim1
     * @param dim2
     * @param dim1Values
     * @param dim2Values
     */
    function agregateData2(arrayData, dim1, dim2, dim1Values, dim2Values, dim2Others ) {
        console.log("agregateData2 dim2Others:", dim2Others);
        var content = {};
        // Initialisation des valeurs à 0
        for (var idx1 = 0; idx1 < dim1Values.length ; idx1++) {
            var dim1Val = dim1Values[idx1];
            content[dim1Val] = {};
            for (var idx2 = 0; idx2 < dim2Values.length; idx2++ ) {
                var dim2Val = dim2Values[idx2];
                content[dim1Val][dim2Val] = 0;
            }
        }
        //console.log("content1", content);
        for (var idx = 0; idx < arrayData.length; idx++) {
            var row = arrayData[idx];
            var dim1Val = row[dim1];       //row.Year
            var dim2Val = row[dim2];       // row.Country;
            if(  dim2Values.indexOf(dim2Val)>=0) {
                //console.log("test", dim1Val, dim1Values.indexOf(dim1Val));
                content[dim1Val][dim2Val] = content[dim1Val][dim2Val] + 1*row.Frequency;
            } else if (dim2Others.indexOf(dim2Val) >=0) {
                content[dim1Val]["Other"] = content[dim1Val]["Other"] + 1*row.Frequency;
            }
        }
        return content;
    }

    function filterYear(value) {
        return value.Year >= minYear;
    }

    async function drawSvgChart() {
        console.log("drawSvgChart", selectedCountries.value );
        var bombusData = (await ripos.bombusFreq.then(bombusFreq => bombusFreq))
            .filter(filterYear);
        var test2009 = [];
        for (var idx = 0; idx < bombusData.length; idx++) {
            var row = bombusData[idx];
            row.Year = 1*row.Year;
            bombusData[idx] = row;
            if(idx<6) console.log((bombusData[idx]));
            if(row.Year == 2009) {
                test2009.push(row);
            }
        }
        //console.log("test2009", test2009, agregateData0(test2009));
        years = bombusData
            .map((d) => parseInt(d.Year))
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort();
       var allcountries_0 = bombusData
            .map((d) => d.Country)
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort();
        var total = agregateData0(bombusData);
        var totalByCountries =  agregateData1(bombusData,  "Country", allcountries_0, 0.01 );
        var totalByYear = agregateData1(bombusData,  "Year", years, 0.0 );
        var keys = [];
        for(var key in totalByCountries) {
            keys.push(key);
            if(key == "Other") {
                allcountries_0.push("Other");
            }
        }
        var allcountries = allcountries_0
            .filter((value, index, self) => self.indexOf(value) === index && keys.includes(value))
            .sort();
        var otherCountries = [];
        for (var idx = 0; idx < allcountries_0.length; idx++) {
            key = allcountries_0[idx];
            if(!allcountries.includes(key)) {
                otherCountries.push(key);
            }
        }
        console.log("otherCountries", otherCountries);
        console.log("totalByCountries", total, totalByCountries);
        console.log("allcountries", allcountries);
        console.log("Total 2009",totalByYear[2009], agregateData1(test2009, "Country", allcountries_0, 0.01 ));
        var countryFilter = [];

        colors = [];
        mapColors = {};
        mapKeyColors = {};
        var colorIndx = 0;
        for (var option of document.getElementById('selectedCountries').options) {
            if (option.selected) {
                var country = option.value;
                countryFilter.push(country);
                var nextColor = allColors[colorIndx];
                colors.push(nextColor);
                mapColors[country] = nextColor;
                mapKeyColors["population_" + country] = nextColor;
                colorIndx++;
            }
        }
        if(countryFilter.length==0) {
            console.log("countryFilter is empty");
            colorIndx = 0;
            for (var idx = 0; idx < allcountries.length ; idx++) {
                country = allcountries[idx];
                var nextColor = allColors[colorIndx];
                console.log("nextColor", nextColor, country);
                colors.push(nextColor);
                mapColors[country] = nextColor;
                mapKeyColors["population_" + country] = nextColor;
                colorIndx++;
                if(colorIndx >=allColors.length ) {
                    colorIndx = 0;
                }
            }
        }
        console.log("colors", colors, mapColors);
        console.log("countryFilter", countryFilter);
        console.log("mapColors", mapColors);
        console.log("mapKeyColors", mapKeyColors);


        species = await ripos.speciesData.then(speciesData => speciesData);
        console.log("allcountries", allcountries);
        countries = allcountries.filter(x => countryFilter.includes(x) || countryFilter.length==0);
        console.log("countries", countries);
        
        console.log("_years", years);
        console.log("_countries", countries);

        var content =  agregateData2(bombusData, "Year", "Country", years, countries, otherCountries );
        console.log("content2", content, content[2009]) ;
        var data = [];
        var keys = [];
        for (var idx = 0; idx < years.length ; idx++) {
            var year = years[idx];
            if(year>=minYear) {
                var item = {"year":year , "Total":0}
                for (var idx2 = 0; idx2 < countries.length; idx2++ ) {                    
                    var country = countries[idx2];
                    var field = "population_" + country;
                    item[field] = content[year][country];
                    item["Total"] = item["Total"] + content[year][country];
                    if( countries.indexOf(country)>=0 && keys.indexOf(field) < 0) {
                        keys.push(field);
                    }
                }
                data.push(item);
            }
        }

        // Construction de l'histogramme
        console.log("___keys", keys, countries);
        // Construction d'un générateur de diagramme empilé avec les valeurs par défaut. 
        // C'est ici que nous fournissons la variable keys indiquant nos différentes catégories
        var stack = d3.stack()
            .keys(keys)
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);

        console.log("stack", stack );
        // Nos données en TSV ont été chargées, elles peuvent directement être fournies au générateur
        // La variable series contient des données structurées sous forme de matrice auxquelles ont été appliquées les paramètres du générateur
        var series = stack(data);
        console.log("data" , data);


        if (typeof(svg) == "undefined") {
            svg = d3.select("#histo_chart").append("svg")
                .attr("id", "svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            const div = d3.select("body").append("div")
                .attr("class", "tooltip")         
                .style("opacity", 0);
            svgInitalized = true;
        } else {
            // Nettoyer
            console.log("Nettoyage");
            svg.selectAll("rect").remove();
            svg.selectAll("text").remove(); 
        }

        // A l'horizontale nous avons nos dates. Nous souhaitons pouvoir afficher toutes les dates de nos données (le domain) sur la largeur 
        // prédéfinie (le range). On précise également qu'un espace (padding) sera appliqué entre chaque barre verticale
        const x = d3.scaleBand()
            .domain(data.map(d => d.year))
            .range([0, width])
            .padding(0.1);

        
       // A la verticale, notre range est la hauteur du graphique et notre domaine va de 0 à la valeur maximale des séries
        // Voir un peu plus bas l'objet series
        console.log("series", series );
        yMax = d3.max(series[series.length - 1], d => d[1]);
        console.log("yMax", yMax);
        
        const y = d3.scaleLinear()
            .domain([0, yMax])
            .range([height, 0]);      


        // Ajout de l'axe X au SVG
        // Déplacement de l'axe horizontal et du futur texte (via la fonction translate) au bas du SVG
        // Selection des noeuds text, positionnement puis rotation
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x).tickSize(0))
            .selectAll("text")	
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", ".15em")
                .attr("transform", "rotate(-65)");

        svg.append("text")
            .attr("x", (width / 2))             
            .attr("y", height + 35 + (margin.top / 1))
            .attr("text-anchor", "middle")  
            .style("font-size", "24px") 
            .text("total par année (toutes espèces confondues)")

        let groups = svg.selectAll("g.countries")
            .data(series)
            .enter().append("g")
            //.style("fill", (d, i) => colors[i]);
            .style("fill", handleFill);
        
        // Ajout de l'axe Y au SVG avec 6 éléments de légende en utilisant la fonction ticks (sinon D3JS en place autant qu'il peut).
        svg.append("g")
            .call(d3.axisLeft(y).ticks(6));

        console.log("test2", y, y(0) );
        var setXAttribute =  function (d) {
            //console.log("setXAttribute", d.data.year,  x(d.data.year));
            return x(d.data.year);
        }

        var setYAttribute =  function (d, idx) {
            if(d.data.year==2009999) {
                console.log("setYAttribute", d, d.data, idx, d[1]);
            }
            return y(d[1]);
        }

         // Pour chaque élément d'une série nous construisons un rectangle dont la position sur l'axe X est liée à sa date,
        // Sa largeur est dépendante du nombre de données et fournie par x.bandWidth()
        // Sur l'axe Y, la hauteur du rectangle est donnée par d[0] et d[1] correspondant au début et à la fin du rectangle.
        let rect = groups.selectAll("rect")
            .data(d => d)
            .enter()
                .append("rect")
                .attr("x", setXAttribute)
                .attr("width", x.bandwidth())
                .attr("y", setYAttribute)
                .attr("height", d => height - y(d[1] - d[0]))
                //.style("fill", handleFill)
                ;
        addLegend(colors, keys);
        let tooltip = addTooltip(keys.length);
        handleMouseEvent(data, x, y, tooltip);
    }


   

    function handleFill(d,i) {
        //console.log("handleFill", d.key, i, mapKeyColors[d.key], colors[i]);
        if(i<colors.length) {
            return colors[i];
        }
      return "#ccc";
    }


    function addLegend(colors, keys) {
        console.log("addLegend", colors, keys);
        let reverseColors = colors.reverse(); // Pour présenter les catégories dans le même sens qu'elles sont utilisées
        let reverseKeys = keys.reverse();
        if (typeof(legend) == "undefined") {
            legend = svg.append('g')
                .attr("id", "the_legend")
                .attr('transform', 'translate(10, 20)'); // Représente le point précis en haut à gauche du premier carré de couleur
        }
        // Pour chaque couleur, on ajoute un carré toujours positionné au même endroit sur l'axe X et décalé en fonction de la 
        // taille du carré et de l'indice de la couleur traitée sur l'axe Y
        //console.log("rect children1", legend.selectAll("text"));
        // Faire du nettoyage
        legend.selectAll("rect").remove();
        legend.selectAll("text").remove();
        //console.log("rect children2", legend.selectAll("text"));
        legend.selectAll()
                .data(reverseColors)
                .enter().append('rect')
                    .attr('height', legendCellSize + 'px')
                    .attr('width', legendCellSize + 'px')
                    .attr('x', 5)
                    .attr('y', (d,i) => i * legendCellSize)
                    .style("fill", d => d);

        // On procéde de la même façon sur les libellés avec un positionement sur l'axe X de la taille des carrés 
        // à laquelle on rajoute 10 px de marge
        legend.selectAll()
            .data(reverseKeys)
            .enter().append('text')
                .attr("transform", (d,i) => "translate(" + (legendCellSize + 10) + ", " + (i * legendCellSize) + ")")
                .attr("dy", legendCellSize / 1.6) // Pour centrer le texte par rapport aux carrés
                .style("font-size", "13px")
                .style("fill", "grey")
                .text(d => d);
    }

    function buildMousePolygon(data, x, y) {
        console.log("buildMousePolygon", data, x, y);
        const tmpline = d3.line()
            .x(d => x.bandwidth() + x(d.year))
            .y(d => y(d.value))
            .curve(d3.curveStepBefore); // Nous utilisons une courbe sous forme d'escalier pour coller à nos barres

        let tmpArray = [];
        for (let i = 0; i < data.length; ++i) {
            //console.log("buildMousePolygon total ", data[i].Total);
            tmpArray.push({"year": data[i].year, "value": data[i].Total});
        }
        console.log("buildMousePolygon tmpArray ", tmpArray);
        // Création d'un groupe qui n'est pas ajouté à la page
        const detachedGroup = d3.create("g");

        detachedGroup.append("path")
            .datum(tmpArray)
            .attr("d", tmpline);

        // Le path ajouté ci-dessous ne forme pas un chemin fermé sur lui même, nous le complétons avec ce chemin construit manuellement
        // https://www.dashingd3js.com/svg-paths-and-d3js
        let strPath = "M " + x.bandwidth() + " " + y(data[0].Total) + " H 0 V " + height + " H " + width + " V " + y(data[data.length - 1].Total);

        console.log("buildMousePolygon strPath ", strPath);

        detachedGroup.append("path")
            .attr("d", strPath);

        // Réunion de tous les path en un seul
        var mergedPath = "";
        detachedGroup.selectAll("path")
            .each(function() {
                mergedPath += d3.select(this).attr("d"); 

            });
        //console.log("mergedPath", mergedPath);
        return mergedPath;
    }

    function handleMouseEvent(data, x, y, tooltip) {
        let mergedPath = buildMousePolygon(data, x, y); // construction du polygone
        svg.append("path")
            .attr("d", mergedPath)
            .style("opacity", 0) // Ajout du polygone avec une opacity de 0
            .on("mouseover", function() {
                tooltip.style("opacity", 1);
            })
            .on("mouseout", function() {
                tooltip.style("opacity", 0);
            })
            .on("mousemove", function(event, d1) {
                // D3JS ne fournit pas de fonction pour retrouver les données associées à la position de la souris comme il le fait les courbes.
                // Il faut donc procéder par calcul pour retrouver quelle donnée est associée à la position de la souris.
                // https://stackoverflow.com/questions/38633082/d3-getting-invert-value-of-band-scales
                let mouse = d3.pointer(event),
                    i = Math.floor((mouse[0] / x.step())), // step = bandWidth + paddingInner : https://observablehq.com/@d3/d3-scaleband
                    d = data[i];
                //console.log("mousemove2",i,  d, mouse, data);
                if (d === undefined) { return ; }

                // On empèche ici le tooltip de sortir du graphique lorsque la souris se rapproche des bords
                let boundedX = mouse[0] < (tooltipWidth / 2) ? 0 : mouse[0] > (width - (tooltipWidth / 2)) ? width - tooltipWidth : mouse[0] - (tooltipWidth / 2); 
                tooltip.attr("transform", "translate(" + boundedX + "," + (mouse[1] - 90) + ")");
                y = (height - mouse[1] )*yMax/height;
                console.log("mousemove", height, mouse[1],  (height - mouse[1] )/height ,y, event);
                tooltip.select('#tooltip-date')
                    .text("Total " + d.year + " : " + d["Total"]);
                //console.log( d.year, d, countries);
                for (let i = 0; i < countries.length; i++) {
                    var country = countries[i];
                    var key = "population_" + countries[i];
                    //console.log(key, d.key, d[key]);
                    if(d[key]>0) {
                        tooltip.select('#tooltip-' + (i+1)).text(d[key]);
                    }
                }
            });
    }

    function addTooltip(nbCategories) {
        let values = d3.range(1, nbCategories + 1);
        //values = values.reverse();
        let band = tooltipWidth / values.length;
        console.log("addTooltip values", values, nbCategories);

        var tooltip = svg.append("g") // On regroupe tout le tooltip et on lui attribut un ID
            .attr("id", "tooltip")
            .style("opacity", 0);

        tooltip.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", tooltipWidth)
            .attr("height", 80)
            .style("opacity","0.9")
            .style("fill", "white")
            .style("stroke-width","1")
            .style("stroke","#929292")
            .style("padding", "1em");

        tooltip.append("line") // La ligne entre le titre et les valeurs
            .attr("x1", 40)
            .attr("y1", 25)
            .attr("x2", 160)
            .attr("y2", 25)
            .style("stroke","#929292")
            .style("stroke-width","0.5")
            .attr("transform", "translate(0, 5)");

        var text = tooltip.append("text") // Ce TEXT contiendra tous les TSPAN
            .style("font-size", "13px")
            .style("fill", "grey")
            .attr("transform", "translate(0, 20)");

        text.append("tspan") // Le titre qui contient la date avec définition d'un ID
            .attr("x", tooltipWidth / 2)
            .attr("y", 0)
            .attr("id", "tooltip-date")
            .attr("text-anchor", "middle")
            .style("font-weight", "600")
            .style("font-size", "16px");

        text.selectAll("text.population") // Le nom des catégories, ici "1", "2"...
            .data(values)
            .enter().append("tspan")
                .attr("x", d => band / 2 + band * ((1+nbCategories-d) - 1))
                .attr("y", 30)
                .attr("text-anchor", "middle")
                .style("fill", "grey")
                .text(d => countries[d-1]);

        text.selectAll("text.population") // La valeur des catégories avec définition d'un ID : "tooltip-1", "tooltip-2"...
            .data(values)
            .enter().append("tspan")
                .attr("x", d => band / 2 + band * ((1+nbCategories-d) - 1))
                .attr("y", 45)
                .attr("id", d => "tooltip-" + d)
                .attr("text-anchor", "middle")
                .style("fill", "grey")
                .style("font-size", "0.8em")
                .style("font-weight", "bold");

        return tooltip;
    }

    onMount(() => drawSvgChart());

   // document.body.onresize = () => drawSvgChart();
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
    .todolist {
        font-size: 11px;

    }
</style>

<div class='todolist'>
    _TODO_ : 
    <ul>
        <li> Faire une catégorie de pays "autre" pour ceux ayant une faible valeur totale</li>
        <li> Revoir les tooltip qd il y a bcp de pays : ils sont illisibles</li>
        <li> Affecter des couleurs pour tous les pays </li>
        <li> Ajouter des filtres par pays, espèces, date min. </li>
        <li> faut-il intégrer les pays hors Europe ? (Ex Turquie, Jordanie, Iran, ?) </li>
    </ul>
</div>

<div class="col-4">
    <label for="selectedCountries">countries filter</label>
    <select id='selectedCountries' multiple class="form-select" __bind:value={allcountries}  >
        {#each allcountries as country, index}
            <option value={country}>{country}</option>
        {/each}
    </select>
    <button id='btRefresh' on:click={() => drawSvgChart()} >Refresh</button>    
</div>
<div>
    <div id="histo_chart"></div>
</div>
