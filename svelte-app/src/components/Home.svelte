<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";
    export let ripos;
    let site_url = "http://www.atlashymenoptera.net";
    let root_photo = site_url + "/pictures/009000/tn/";
    let imageLinks = [];
    const promise = fetch("data_sources.json").then(response => response.json());

    onMount( async () =>  {
        // Récupération de quelques liens d'images à afficher sur la page
        var speciesData = (await ripos.speciesData.then(speciesData => speciesData));
        var linksRow = [];
        //console.log("speciesData", speciesData);
        for (var idx = 0; idx < speciesData.length; idx++) {
            var nextSpecie = speciesData[idx];
            var specieName = nextSpecie.name;
            //console.log(nextSpecie.name);
            for (var idx2 = 0; idx2 < nextSpecie.imgs.length && imageLinks.length<2; idx2++) {
                var imageRrl = site_url + "/"+ nextSpecie.imgs[idx2];
                var link = {"src":imageRrl, "name":specieName}
                //console.log(link);
                linksRow.push(link);
                if(linksRow.length>=6 && imageLinks.length<2) {
                    imageLinks.push(linksRow);
                    linksRow = [];
                }
            }
        }
    });
    //console.log("imageLinks", imageLinks);
    function handleImageClick(imgs) {
        // Get the expanded image
        var expandImg = document.getElementById("expandedImg");
        // Get the image text
        var imgText = document.getElementById("imgtext");
        // Use the same src in the expanded image as the image being clicked on from the grid
        expandImg.src = imgs.src;
        // Use the value of the alt attribute of the clickable image as text inside the expanded image
        imgText.innerHTML = imgs.alt;
        // Show the container element (hidden with CSS)
        expandImg.parentElement.style.display = "block";
    } 
</script>
<div class="mt-5">
    <h1 class="text-center">
        <img class='logo' src="logo_bee.jpg"/>
        Project DataViz Lyon 1 (2020-2021)
        <img class='logo' src="logo_bee.jpg"/>
    </h1>
    <div class="row mt-3">
        <div class="col-3"></div>
        <div class="col-6">
            <p class='presentation'>
                In this project, we wanted to show the consequences of climate change on the evolution of European shymenoptera (different bee species of the genus Bombus). 
                <br/>
                <br><u>Data:</u>
                <br>The data that we represent come from the research site <a href="http://www.atlashymenoptera.net/page.aspx?id=169" target="_blank">atlashymenoptera.net</a>
                     and consist of 79 different species of hymenoptera which evolved on the European continent between 1800 and 2013. Thanks to the 79 files collected, we were able to collect and collate data from all species and we have represented them on different charts and maps.                
            </p>
            <br/>
            <p class='presentation'>
                <u>Contents:</u>
            <br>On this project, we set up four visualizations, showing the geographical distribution of the data, the evolution over time and also a study by country on the proliferation of different bee species.
            </p>
            <p class="presentation text-muted">
                <u>Contributors</u> : HOSSAIN Shajjad, BAMBA William, GLASS Philippe, HAMAT Abdoulaye.
                <br/>(Masters 2nd years students).
            </p>
            Data Source : <a href="http://www.atlashymenoptera.net/page.aspx?id=169" target="_blank">atlashymenoptera.net</a>
            <!-- Affichage de quelques images-->
            <p class="presentation">            </p>
                {#await promise then data}
                <table>
                    {#each imageLinks as row, i}
                    <tr>
                            {#each row as link, j}
                                <td>
                                    <img src="{link.src}" alt="photo" title="{link.name}">
                                </td>
                            {/each}
                    </tr>
                    {/each}
                </table>
                {/await}
        </div>
        <div class="col-3"></div>
    </div>
</div>