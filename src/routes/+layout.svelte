<script lang="ts">
  import "./layout.css";
  import favicon from "$lib/assets/favicon.svg";
  import { onMount } from "svelte";
  import { initFirebase } from "$lib/firebase";
  import pb from "$lib/pocketbase";
  import { currentUser, activeCompany } from "$lib/stores";
  import type { Company } from "$lib/pocketbase";
  import { goto } from "$app/navigation";
  import NotificationCenter from "$lib/components/NotificationCenter.svelte";
  import NavigationHub from "$lib/components/NavigationHub.svelte";
  import NavFab from "$lib/components/NavFab.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import { loadGameData } from "$lib/data/game-static";
  // Import stores to initialize them (they auto-start when imported)
  import { gamedataStore } from "$lib/stores/gamedataStore";
  import { graphRefreshStore } from "$lib/stores/graphRefreshStore";

  import { page } from "$app/stores";

  let { children } = $props();

  let navHubOpen = $state(false);

  onMount(async () => {
    // Initialise Firebase/Analytics
    initFirebase();

    // Load static game data from backend API
    loadGameData();
    pb.authStore.onChange(async (token, model) => {
      currentUser.set(model);
      if (model && model.active_company) {
        try {
          const company = await pb
            .collection("companies")
            .getOne<Company>(model.active_company);
          activeCompany.set(company);
        } catch (e) {
          console.error("Failed to load active company", e);
        }
      } else {
        activeCompany.set(null);
      }
    }, true);
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="flex flex-col min-h-screen">
  <div class="grow">
    {@render children()}
  </div>
  {#if !$page.url.pathname.startsWith("/factory")}
    <Footer />
  {/if}
</div>

<NotificationCenter />

<!-- Navigation Hub (Global) -->
<NavigationHub bind:isOpen={navHubOpen} />

<!-- Floating Action Button (only when logged in) -->
{#if $currentUser}
  <NavFab onclick={() => (navHubOpen = true)} />
{/if}
