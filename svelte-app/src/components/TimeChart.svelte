<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";
    import MakeMapInteractive from "./MakeMapInteractive";
    //import {nest} from 'd3-collection';
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
    //let svg;
    let species = [], selectedSpecie = 0;

    let colors = ["#f7fcf0", "#e0f3db", "#ccebc5", "#a8ddb5", "#7bccc4", "#4eb3d3", "#2b8cbe", "#0868ac", "#084081"];

    function getProjection(centerX, centerY, scale) {
        return d3.geoConicConformal().center([centerX, centerY]).scale(scale);
    }

    async function drawSvgChart() {
        console.log("drawSvgChart");
        bombusData = await ripos.bombusFreq.then(bombusFreq => bombusFreq);
        //console.log(bombusData);
        years = bombusData
            .map((d) => parseInt(d.Year))
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort();

        countries = bombusData
            .map((d) => d.Country)
            .filter((value, index, self) => self.indexOf(value) === index && (value == "Finland" || value == "France"))
            .sort();
        console.log("_years", years);
        console.log("_countries", countries);
        
        var totalByYear = {};
        var content = {};
        for (var idx = 0; idx < years.length ; idx++) {
            var year = years[idx];
            totalByYear[year] = 0;
            content[year] = {};
            for (var idx2 = 0; idx2 < countries.length; idx2++ ) {
                var country = countries[idx2];
                content[year][country] = 0;
            }
        }
        //console.log("content1", content);
        for (var idx = 0; idx < bombusData.length; idx++) {
            var row = bombusData[idx];
            year =  row.Year
            country = row.Country;
            //console.log(row.Frequency, year);
            if (!totalByYear.hasOwnProperty(year)) {
                totalByYear[year] = 0;
            }            
            totalByYear[year] = totalByYear[year] + 1*row.Frequency;
            if( countries.indexOf(country)>=0) {
                //console.log();
                content[year][country] = content[year][country] + 1*row.Frequency;
            }
        }
        console.log("content2", content);
        var data=[];
        /**/
        for (var idx = 0; idx < years.length ; idx++) {
            var year = years[idx];
            if(year>=1990) {
                var item = {"year":year  , "foo":13 }
                for (var idx2 = 0; idx2 < countries.length; idx2++ ) {                    
                    country = countries[idx2];
                    var field = "population_" + country;
                    //console.log("field", field, country, content[year], content[year][country]);
                    item[field] = content[year][country];
                    
                }
                data.push(item);
            }
        }
        
        // Construction de l'histogramme
        var keys = ['population_France', 'population_Finland'];
        console.log("___countries", keys);
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
        console.log("series", series );
        //const y = d3.scaleLinear().range([height, 0]);

        const margin = {top: 20, right: 20, bottom: 90, left: 120},

        svg = d3.select("#chart").append("svg")
            .attr("id", "svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


        const div = d3.select("body").append("div")
            .attr("class", "tooltip")         
            .style("opacity", 0);


        

        // Conversion des caractères en nombres
        //data.forEach(d => d.population_france = +d.population_France);

        // A l'horizontale nous avons nos dates. Nous souhaitons pouvoir afficher toutes les dates de nos données (le domain) sur la largeur 
        // prédéfinie (le range). On précise également qu'un espace (padding) sera appliqué entre chaque barre verticale
        const x = d3.scaleBand()
            .domain(data.map(d => d.year))
            .range([0, width])
            .padding(0.1);

        
       // A la verticale, notre range est la hauteur du graphique et notre domaine va de 0 à la valeur maximale des séries
        // Voir un peu plus bas l'objet series 
        var yMax = 2*d3.max(d3.max(series[series.length - 1]));
        console.log("test1", series[series.length - 1], yMax);
        
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
            //.style("text-decoration", "underline")  
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
        // Ajout des bars en utilisant les données de notre fichier data.tsv
        // La largeur de la barre est déterminée par la fonction x
        // La hauteur par la fonction y en tenant compte de la population
        // La gestion des events de la souris pour le popup
        svg.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.year))
            .attr("width", x.bandwidth())
            .attr("y", d => y( d.population_France))
            //.attr("height", d => height - y(d.population_France))	
            .attr("height", d => height - y(d.population_France))	
            .style("fill", handleFill)
            .on("mouseover", function(d) {
                div.transition()        
                    .duration(200)      
                    .style("opacity", .9);
                div.html("Population : " + d.population_France)
                    .style("left", (d3.event.pageX + 10) + "px")     
                    .style("top", (d3.event.pageY - 50) + "px");
            })
            .on("mouseout", function(d) {
                div.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

    }

    function handleFill(d,i) {
        console.log("handleFill", d, i);
        if(i<colors.length) {
            return colors[i];
        }
        // colors[i]
      //on prend la valeur recuperee plus haut
      //console.log("d", d);
      /*
      var value = d.properties.hosp;
      if (value) {
        return color(value);
      } else {
        // si pas de valeur alors en gris
        return "#ccc";
      }
      */
      return "#ccc";
    }


    function addLegend(colors) {
        let reverseColors = colors.reverse(); // Pour présenter les catégories dans le même sens qu'elles sont utilisées
        let reverseKeys = keys.reverse();

        let legend = svg.append('g')
            .attr('transform', 'translate(10, 20)'); // Représente le point précis en haut à gauche du premier carré de couleur
            
        // Pour chaque couleur, on ajoute un carré toujours positionné au même endroit sur l'axe X et décalé en fonction de la 
        // taille du carré et de l'indice de la couleur traitée sur l'axe Y
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

    
    onMount(() => drawSvgChart());

    //document.body.onresize = () => drawSvgChart();
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
    <div id="chart"></div>
</div>
