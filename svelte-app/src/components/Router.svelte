<div>
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
        <div class="container-fluid">
          <a class="navbar-brand" href="#/">Home</a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavAltMarkup" aria-controls="navbarNavAltMarkup" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="navbarNavAltMarkup">
            <div class="navbar-nav">
                {#each routes as route}
                    {#if currentHash == '#' + route.href}
                        <a class="nav-link active" aria-current="page" href="#{route.href}">{route.name}</a>
                    {:else}
                        <a class="nav-link" href="#{route.href}">{route.name}</a>
                    {/if}
                {/each}
            </div>
          </div>
        </div>
    </nav>

    {#each routes as route}
            {#if currentHash == '#' + route.href}
                <svelte:component this="{route.component}" ripos={route.ripos} />		
            {/if}
    {/each}
</div>

<script>
    export let routes;

    let getCurrentRoute = () => window.location.hash;

    let currentHash = getCurrentRoute();

    window.onhashchange = () => currentHash = getCurrentRoute();

    if (getCurrentRoute() == '') window.location.href = '/#/';

</script>


