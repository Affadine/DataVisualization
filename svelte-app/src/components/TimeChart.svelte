<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";
    import { fix_and_outro_and_destroy_block } from "svelte/internal";
    import MakeMapInteractive from "./MakeMapInteractive";
    // http://api-adresse.data.gouv.fr/reverse/?lat=48.8566969&lon=2.3514616
    //import buildCountriesColorsArray from "util2.js";

    export let ripos;
    

    let margin = {left: 70, right: 20, top: 30, bottom: 60 };
    let width = document.body.clientWidth - margin.left - margin.right - 20;
    let height = 500 - margin.top - margin.bottom;
    let height_selector = (height<800?100:20) + 0.10* ( window.innerHeight -40);
    let centerX = 9.454071, centerY = 52.279229, scale = 1200;
    let projection = getProjection(centerX, centerY, scale);
    let path = d3.geoPath().projection(projection);
    let loading = true;
    let year = 0, years = [], filtered_years = [];
    let bombusData = [];
    let countries = [];
    
    let species = [], selectedSpecie = 0;
    let allcountries = [];
    let selectorData = [];
    let legendCellSize = 20;
    let tooltipWidth = 5*210;

    let allColors = [ "#e0f3db", "#ccebc5", "#a8ddb5", "#7bccc4", "#4eb3d3", "#2b8cbe", "#0868ac", "#084081"
       , "#ffcccc", "#ffb3b3","#ff9999","#ff8080","#ff6666","#ff4d4d","#ff3333","#ff1a1a","#ff0000","#e60000","#cc0000","#b30000"
        ,"#990000","#800000","#660000"
        //,"#4d0000"
        //,"#330000"
        //,"#1a0000"
    ];
    //let callColors = buildCountriesColorsArray(20);
    let ref_countries = [];
    let colors = [];
    let mapColors = {};
    let mapKeyColors = {};
    let countryFilter = [];
    let firstLoading = true;
    let minYear = 1800;
    let maxYear = 2013;
    let minYearFilter = 1980;
    let minYearFilterIndex = 0;
    let yMax;
    let temperatures = [];
    let temperatures_year = {};
    let total;
    //let temperatures_year_country = {}
    //const margin = {top: 20, right: 20, bottom: 90, left: 120};
    
    //let svgInitalized = false;
    let svg_histo;
    let svg_selector;
    let legend;
    var pack = d3.pack()
		.size([width, height])
        .padding(1.5);
     var div_selector = d3.select("body").append("div")
		.attr("class", "tooltip")
		.style("opacity", 0);

    function getProjection(centerX, centerY, scale) {
        return d3.geoConicConformal().center([centerX, centerY]).scale(scale);
    }

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
        //console.log("agregateData1 : content1", content);
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
        //console.log("agregateData1 minTotal", minTotal );
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
        //console.log("agregateData1 testGap", testGap);
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

  

    function updateMinYearFilter() {
        var slider = document.getElementById("min_year_slider");
        minYearFilter = slider.value;
        console.log("updateMinYearFilter ", slider.value, minYearFilter);
        // minYearFilter =
        refreshAll();
    }


    async function refreshAll() {
        console.log("refreshAll begin", countryFilter, minYearFilter );
        if(firstLoading) {
            var slider = document.getElementById("min_year_slider");
            slider.defaultValue = minYearFilter;
            slider.value = "1980";
            console.log("slider.defaultValue", slider.value);
            //alert(slider.value);
        }
        ref_countries = (await ripos.countriesPos.then(countriesPos => countriesPos))
             .sort(function(a, b) { return (b.latitude - a.latitude); });
        var ref_test = {};
        var ref_country_color = {};
        for (var idx = 0; idx < ref_countries.length; idx++) {
            var row = ref_countries[idx];
            var idxColor = idx % (allColors.length);
            row['color'] = allColors[idxColor];
            var country = row['name'];
            ref_country_color[country] = row['color'];
            ref_test[country] = idxColor;
            //console.log(row);
        }

        console.log("refreshAll ref_countries", ref_countries, ref_country_color, ref_test);
        var allBombusData = (await ripos.bombusFreq.then(bombusFreq => bombusFreq));
        if(years.length==0) {
            years =allBombusData
                .map((d) => parseInt(d.Year))
                .filter((value, index, self) => self.indexOf(value) === index)
                .sort();
        }
        minYear = years[0];
        maxYear =  years[years.length - 1];
        console.log("refreshAll ", minYear, maxYear);
        var bombusData = allBombusData.filter(function (value) {
                return value.Year >= minYearFilter;
            });
        // Convertir les années en entier
        for (var idx = 0; idx < bombusData.length; idx++) {
            var row = bombusData[idx];
            row.Year = 1*row.Year;
            bombusData[idx] = row;
       }
       //console.log("refreshAll after year to int");
       /*
       filtered_years = bombusData
            .map((d) => parseInt(d.Year))
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort();*/
       filtered_years = years.filter(value => value>=minYearFilter)
            .sort();
       console.log("refreshAll filtered_years", filtered_years);
       var allcountries_0 = bombusData
            .map((d) => d.Country)
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort();
        //console.log("refreshAll step1A");
        total = agregateData0(bombusData);
        //console.log("refreshAll step1B", total);
        var totalByCountries =  agregateData1(bombusData,  "Country", allcountries_0, 0.01 );
        var totalByYear = agregateData1(bombusData,  "filtered_years", filtered_years, 0.0 );
        var keys = [];
        for(var key in totalByCountries) {
            keys.push(key);
        }
        if(totalByCountries.hasOwnProperty("Other")) {
            allcountries_0.push("Other");
        }
        console.log("refreshAll allcountries_0", allcountries_0, keys);
        allcountries = allcountries_0
            .filter((value, index, self) => self.indexOf(value) === index && keys.includes(value))
            .sort();
        var otherCountries = [];
        for (var idx = 0; idx < allcountries_0.length; idx++) {
            key = allcountries_0[idx];
            if(!allcountries.includes(key)) {
                otherCountries.push(key);
            }
        }
        if(firstLoading) {
            countryFilter = allcountries;
        }
        console.log("otherCountries", otherCountries);
        console.log("totalByCountries", total, totalByCountries);
        console.log("allcountries", allcountries);

        colors = [];
        mapColors = {};
        mapKeyColors = {};
        var colorIndx = 0;

        //console.log("countryFilter is empty");
        colorIndx = 0;
        for (var idx = 0; idx < allcountries.length ; idx++) {
            country = allcountries[idx];
            var nextColor = allColors[colorIndx];
            /*
            var nextColor = "#555";
            //console.log("nextColor", nextColor, country);
            colors.push(nextColor);
            if(ref_country_color.hasOwnProperty(country)) {
                nextColor = ref_country_color[country];
            }*/
            mapColors[country] =  nextColor;
            mapKeyColors["population_" + country] = nextColor;
            colorIndx++;
            if(colorIndx >=allColors.length ) {
                colorIndx = 0;
            }
        }
        console.log("colors", colors, mapColors);
        console.log("countryFilter", countryFilter);
        console.log("mapColors", mapColors);
        console.log("mapKeyColors", mapKeyColors);

        species = await ripos.speciesData.then(speciesData => speciesData);
        //console.log("species", species);
        console.log("allcountries", allcountries);
        countries = allcountries.filter(x => countryFilter.includes(x) );
        console.log("countries", countries);
        
        //console.log("_years", years);
        //console.log("_countries", countries);

        var content =  agregateData2(bombusData, "Year", "Country", filtered_years, countries, otherCountries );
        //console.log("content2", content, content[2009]) ;
        var data = [];
        var keys = [];
        for (var idx = 0; idx < years.length ; idx++) {
            var year = filtered_years[idx];
            if(year>=minYearFilter) {
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


        // Données du selecteur
        var nbYers = filtered_years.length;
        selectorData = [];
        var maxAvg = 0;
        for (var idx = 0; idx < allcountries.length ; idx++) {
            country = allcountries[idx];
            var avg = totalByCountries[country]/nbYers;
            if(avg > maxAvg) {
                maxAvg = avg;
            }
            var color = mapColors[country];
            item = {"country":country, "avg": avg, "value": 0, "color":color};
            selectorData.push(item);
        }
        for (var idx = 0; idx < selectorData.length ; idx++) {
            var row = selectorData[idx];
            row["value"] = 1*row["avg"]/maxAvg;
        }


        // Données de temperature
        temperatures = (await ripos.temperatures.then(temperatures => temperatures));
        //console.log("temperatures", temperatures);
        temperatures_year = {};
        for (var idx1 = 0; idx1 < filtered_years.length ; idx1++) {
            var nextYear = filtered_years[idx1];
            var yearTemperature = temperatures.filter(function (value) {
                return value.Year == nextYear;
            });
            //console.log("yearTemperature", nextYear, yearTemperature);
            var sum=0;
            for (var idx2 = 0; idx2 < yearTemperature.length ; idx2++) {
                var row = yearTemperature[idx2];
                //console.log(row,row.Temperature );
                sum = sum + 1*row.Temperature;
            }
            avg = 0;
            if(yearTemperature.length > 0) {
                avg = sum/yearTemperature.length
                //console.log("sum", sum,  avg);
            }
            temperatures_year[nextYear] = avg;
        }
        console.log("temperatures_year", temperatures_year);


        console.log("drawSelector selectorData", selectorData, maxAvg, nbYers);
        drawSelector();

        drawHistoBars(data, keys);
        firstLoading = false;
    }


    async function drawSelector() {
        // Construction du sélecteur
        if (typeof(svg_selector) == "undefined") {
            var svg_height =  height_selector + 0*margin.top + 0*margin.bottom;
            console.log("drawSelector svg_height", svg_height);
            svg_selector = d3.select("#bubble_selector").append("svg")
                .attr("id", "svg_selector")
                .attr("width", width + margin.left + margin.right)
                .attr("height", svg_height);
               // .text("Filtre pays")
                ;

            // Titre
            svg_selector.append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            div_selector = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);
            //svgInitalized = true;
        } else {
            div_selector = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);
            // Nettoyer
            console.log("Nettoyage svg_selector");
            svg_selector.selectAll("g").remove();
            svg_selector.selectAll("circle").remove();
            //svg_selector.selectAll("text").remove(); 
        }

        var root = d3.hierarchy({children: selectorData})
            .sum(function(d) { return 1*d.value; })
            .sort(function(a, b) { return (100*b.value - 100*a.value); });
        var radiusFactor = 1;
        console.log("root", root, root.children);
        var listRadius = [];
        var sumRadius1 = 0;
        var listRadius1 = [];
        var listRadius2 = [];
        //console.log("listRadius", listRadius);
        var xAxisPos = 0*margin.top + 0.5*height_selector + 0 ;
        var circleIdx = 0;
        var xCircle = margin.left;
        var node = svg_selector.selectAll(".node")
            .data(pack(root).leaves())
            .enter().append("g")
                .attr("class", "node")
        //console.log("drawSelector node", node);
        node.append("circle")
            .attr("id", function(d) { return d.id; })
            .attr("r", function(d) { 
                var radius = 1 * d.r;
                sumRadius1 = sumRadius1 + radius;
                //console.log("r function" , d.r, radius);
                listRadius1.push(radius);
                return radius;
            })
            .style(
                "stroke", function(d) {
                    var country = d.data.country;
                    //console.log("stroke",  country, countryFilter.includes(country));
                    if(countryFilter.includes(country)) {
                        return "#000";
                    } else {
                        return "grey";
                    }
            })
            .style("fill", function(d) { 
                //console.log("fill", d.data);
                return d.data.color; 
            })
            .on('click', handleSelectorClick);
       /*
        listRadius1 = [];
        d3.selectAll("circle").each(function(d,i) {
            var radius = d3.select(this).attr("r");
            listRadius1.push(radius);
            console.log("The radius  of the circle #" + i + " is " + radius)
        });*/
        var firstRadius1 = listRadius1[0];
        var maxSumRadius = (width - margin.left - margin.right)/2;
        var maxFirstRadius = 0.75*height_selector/2;
        while(radiusFactor*firstRadius1 > maxFirstRadius) {
            radiusFactor = radiusFactor-0.05;
        }
        while(radiusFactor*sumRadius1 > maxSumRadius) {
            radiusFactor = radiusFactor-0.05;
        }
        console.log("firstRadius1", firstRadius1, "maxFirstRadius", maxFirstRadius, "sumRadius1", sumRadius1, "maxRumRadius", maxSumRadius, "radiusFactor", radiusFactor);
        listRadius2 = [];
        d3.selectAll("circle").attr("r", function(d) { 
                var radius = 1*radiusFactor*d.r;
                //console.log("_r function" , d.r, radius);
                listRadius2.push(radius);
                return radius;
            })
        console.log("listRadius", listRadius1, listRadius2);
        // Réplacement des centres de chaque cercle : sur une droite
        node.attr("transform", function(d) { 
                circleIdx = circleIdx + 1;
                if(circleIdx>1) {
                    xCircle = xCircle + listRadius2[circleIdx-2];
                }
                xCircle = xCircle +  listRadius2[circleIdx-1];
                //console.log("transform xCircle", xCircle, circleIdx, d.r);
                //return "translate(" + scaleX(xCircle) + "," + xAxisPos  +  ")"; 
                return "translate(" + (xCircle) + "," + xAxisPos  +  ")"; 
            });

        var label = node.append("svg:text")
            .text(
                function(d) {
                    //console.log("append text", d);
                    return d.data.country;
                }
            )
            .on('click', handleSelectorClick)
            .style('text-anchor', 'middle')
            .style("fill",
                    function(d) {
                        var country = d.data.country;
                        if(countryFilter.includes(country)) {
                            return "black";
                        } else {
                            return "grey";
                        }
                    })
            .style("font-family", "Arial")
            .style("font-size", "10px")
        ;
        var test = d3.select("#unselect_all");
        console.log("#unselect_all", test);
        d3.select("#unselect_all") .on("click", function(){ 
            handleSelectorReset();
        });
        d3.select("#select_all") .on("click", function(){ 
            handleSelectAll();
        });
        console.log("end drawSelector");
    }

    function handleSelectorClick(e, d){
        // countryFilter
        console.log("handleSelectorClick", d.data);
        var country = d.data.country;
        if(countryFilter.includes(country)) {
            //countryFilter.remove(country);
            countryFilter = countryFilter.filter(item => item !== country)
        } else {
            countryFilter.push(country);
        }
        console.log("handleSelectorClick before refreshALL", countryFilter);
        refreshAll();
        return ;
    }

    function handleSelectorReset(e, d){
        console.log("handleSelectorReset");
        countryFilter = [];
        refreshAll();
        return ;
    }

    function handleSelectAll(e, d){
        console.log("handleSelectAll", allcountries);
        countryFilter = allcountries;
        refreshAll();
        return ;
    }


    function drawHistoBars(data, keys) {

         // Construction de l'histogramme
         console.log("drawHistoBars", keys, countries);
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

        if (typeof(svg_histo) == "undefined") {
            svg_histo = d3.select("#histo_chart").append("svg")
                .attr("id", "svg_histo")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            const div = d3.select("body").append("div")
                .attr("class", "tooltip")         
                .style("opacity", 0);
            //svgInitalized = true;
        } else {
            // Nettoyer
            console.log("Nettoyage");
            svg_histo.selectAll("rect").remove();
            svg_histo.selectAll("text").remove(); 
            svg_histo.selectAll("line").remove(); 
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
        svg_histo.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x).tickSize(0))
            .selectAll("text")	
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", ".15em")
                .attr("transform", "rotate(-65)");
        /*
        svg_histo.append("text")
            .attr("x", margin.left+30)
            .attr("y",  0)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .text("Evolution by year (selected countries)")
        */
        let groups = svg_histo.selectAll("g.countries")
            .data(series)
            .enter().append("g")
            //.style("fill", (d, i) => colors[i]);
            .style("fill",  function (d,i) {
                //console.log("fill histo", d.key, i, mapKeyColors[d.key], colors[i]);
                if(mapKeyColors.hasOwnProperty(d.key)) {
                    return mapKeyColors[d.key];
                }
                return "#ccc";
            });
        
        // Ajout de l'axe Y au SVG avec 6 éléments de légende en utilisant la fonction ticks (sinon D3JS en place autant qu'il peut).
        svg_histo.append("g")
            .call(d3.axisLeft(y).ticks(6));

         // Pour chaque élément d'une série nous construisons un rectangle dont la position sur l'axe X est liée à sa date,
        // Sa largeur est dépendante du nombre de données et fournie par x.bandWidth()
        // Sur l'axe Y, la hauteur du rectangle est donnée par d[0] et d[1] correspondant au début et à la fin du rectangle.
        let rect = groups.selectAll("rect")
            .data(d => d)
            .enter()
                .append("rect")
                .attr("x", function (d) {
                        //console.log("setXAttribute", d.data.year,  x(d.data.year));
                        return x(d.data.year);
                    })
                .attr("width", x.bandwidth())
                .attr("y", function (d, idx) {
                        return y(d[1]);
                    })
                .attr("height", d => height - y(d[1] - d[0]))
                /*
                .attr("key", function (d, e, f) {
                         console.log("key", d, e);
                        return x(d.data.year);
                    })*/
                ;

        var temperature_plot_data = [];
        var lastValue = -1;
        var lastYear = -1;
        var averagePopulation = total / (filtered_years.length);
        for (var idx1 = 0; idx1 < filtered_years.length ; idx1++) {
            var nextYear = filtered_years[idx1];
            var nextValue = temperatures_year[nextYear];
            if(lastYear>0) {
                //console.log("lastYear",lastYear);
                var row = {"Year1":lastYear , "Value1": lastValue, "Year2":nextYear , "Value2": nextValue};
                temperature_plot_data.push(row);
            }
            lastYear = nextYear;
            lastValue = nextValue;
        }

        const scale_temperature = d3.scaleLinear()
            .domain([5, 15])
            .range([height, 0]);

        for (var idx1 = 0; idx1 < temperature_plot_data.length ; idx1++) {
            var plotRow = temperature_plot_data[idx1];
            if(plotRow.Value1 > 0 && plotRow.Value2 > 0 ) {
                var simpleLine_manual = svg_histo
                //.enter()
                .append("line")
                .attr("x1", x(plotRow.Year1))
                .attr("y1",  scale_temperature(plotRow.Value1))
                .attr("x2", x(plotRow.Year2))
                .attr("y2",  scale_temperature(plotRow.Value2))
                .style("stroke","#000")
                .style("stroke-width","0.5")
                //.attr("transform", "translate(0, 5)");
                ;
                if(idx1 ==4) {
                    var labelTemp = svg_histo
                    //.enter()
                    .append("text")
                    .attr("id", "label_temperature")
                    .attr("x", x(plotRow.Year1))
                    .attr("y",  scale_temperature(0.5+plotRow.Value1))
                    .text("Temperature")
                    .style("stroke","#000")
                    .style("stroke-width","0.5")
                    //.attr("transform", "translate(0, 5)");
                ;
                }
            }
        }
        /*
        var simpleLine = svg_histo
            .data(temperature_plot_data)
            .enter()
            .append("line")
            .attr("x1", function (d, idx) {
                    console.log("simpleLine x1", d.Year1, d);
                    return x(1980);
                    //return x(1*d.Year1)
                })
            .attr("y1",  y(3500))
            .attr("x2", function (d, idx) {
                    console.log("simpleLine x2", d.Year2, d);
                    return x(1981);
                    //return x(1*d.Year2)
                })
            .attr("y2",  y(10000))
            .style("stroke","#000")
            .style("stroke-width","0.5")
            ; */

        addLegend(colors, keys);
        let tooltip = addTooltip(keys.length);
        handleMouseEvent(data, x, y, tooltip);

    }

   


    function addLegend(colors, keys) {
        //console.log("addLegend", keys, mapKeyColors);
        let reverseColors = colors.reverse(); // Pour présenter les catégories dans le même sens qu'elles sont utilisées
        let reverseKeys = keys.reverse();
        let usedColors = [];
        for(var idx = 0;idx<reverseKeys.length; idx++) {
            var key = reverseKeys[idx];
            var nextColor = mapKeyColors[key];
            usedColors.push(nextColor);
        }
        console.log("addLegend usedColors", usedColors);
        if (typeof(legend) == "undefined") {
            legend = svg_histo.append('g')
                .attr("id", "the_legend")
                .attr('transform', 'translate(10, 20)'); // Représente le point précis en haut à gauche du premier carré de couleur
        }
        // Pour chaque couleur, on ajoute un carré toujours positionné au même endroit sur l'axe X et décalé en fonction de la 
        // taille du carré et de l'indice de la couleur traitée sur l'axe Y
        //console.log("rect children1", legend.selectAll("text"));
        // Faire du nettoyage
        legend.selectAll("rect").remove();
        legend.selectAll("text").remove();
        legend.selectAll("line").remove();
        //console.log("rect children2", legend.selectAll("text"));
        legend.selectAll()
                .data(usedColors)
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
                .text(d => d.replaceAll("population_", ""));
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
        //console.log("buildMousePolygon tmpArray ", tmpArray);
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
        svg_histo.append("path")
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
                //console.log("mousemove", height, mouse[1],  (height - mouse[1] )/height ,y, mouse,event, d1 );
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

        var tooltip = svg_histo.append("g") // On regroupe tout le tooltip et on lui attribut un ID
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

    onMount(() => refreshAll());

   // document.body.onresize = () => refreshAll();
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
    .filter_link {
        font-size:14 ;color:blue;
    }
    .text_small {
        font-size:12px;
    }
    .text_hyperlink {
        font-size:12px;
        color:blue;
    }
    .explain_text {
        font-size:12px;
    }
    .bt_selector {
        font-size:11px;
    }
</style>
<div>
    <h2 class="text-center mt-4 mb-4"><img src="logo_bee.jpg" class="img-fluid"  width="50px"> Evolution by year <img src="logo_bee.jpg" class="img-fluid"  width="50px"></h2>
    <div>
    
    <div class="row">
        <div class="col-2"></div>
        <div class="col-8">
            <p class="text-muted">
            This view represents the evolution by year of the bee populations, both globally and in each country.<br/>
            You can use the country filter below to remove or add countries to the visualization.
            You can also use the slider on the right to lengthen or shorten the time range.<br>
            <u>Please note</u> :
            Since the amount of data is less for the years before 1970, this graph cannot show a realistic end-to-end evolution over a range beyond 50 years.<br>
            It is however interesting to note the countries which appear or disappear from the map if one uses a display over a long period.
            </p>
        </div>
        <div class="col-2">
            <span class='text_small'> Source :
                <br>    multi-color chart :    <a href="https://www.datavis.fr" target="_blank">datavis.fr</a>
                <br>    data : <a href="http://www.atlashymenoptera.net/page.aspx?id=169" target="_blank">atlashymenoptera.net</a>
            </span>
        </div>
    </div>

    </div>
    <span class='explain_text' id="label_min_year_slider">  &nbsp; &nbsp; &nbsp; Selected Countries : </span>
    <input id='unselect_all' class="bt_selector"  type="button" value="Unselect all"  >
    <input id='select_all'   class="bt_selector"  type="button" value="Select all"   >
    <span class='explain_text' id="label_min_year_slider">  &nbsp; &nbsp; &nbsp; Selected time range : &nbsp;&nbsp;&nbsp;   &nbsp;&nbsp;&nbsp;   &nbsp;&nbsp;&nbsp;  </span>
    <input style="width: 30%;" id="min_year_slider" type="range" step="1" min="{minYear}" max="{maxYear}" value="{minYearFilter}"
        on:input={() => updateMinYearFilter()} 
        class='form-range'
        />
    <span id="label_min_year_slider2"> &nbsp;&nbsp;&nbsp; {minYearFilter}  </span>
</div>
<div>
    <div id="bubble_selector"></div>
    <div id="histo_chart"></div>
</div>



<!-- 
<div class='todolist'>
    _TODO_ : 
    <ul>
        <li> Revoir les tooltip qd il y a bcp de pays : ils sont illisibles</li>
        <li> Ajouter des filtres par espèces, date min. </li>
        <li> faut-il intégrer les pays hors Europe ? (Ex Turquie, Jordanie, Iran, ?) </li>
    </ul>
</div>
-->