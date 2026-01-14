<script lang="ts">
  import "./layout.css";
  import favicon from "$lib/assets/favicon.svg";
  import { onMount } from "svelte";
  import { initFirebase, setAnalyticsUserId } from "$lib/firebase";
  import pb from "$lib/pocketbase";
  import { currentUser, activeCompany } from "$lib/stores";
  import type { Company } from "$lib/pocketbase";
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

  import {
    startProductionHeartbeat,
    stopProductionHeartbeat,
  } from "$lib/services/productionHeartbeat";

  onMount(() => {
    let unsubscribe: (() => void) | undefined;

    (async () => {
      // Initialise Firebase/Analytics
      await initFirebase();

      // Load static game data from backend API
      loadGameData();
      unsubscribe = pb.authStore.onChange(async (token, model) => {
        currentUser.set(model);

        // Sync Analytics User ID
        if (model?.id) {
          setAnalyticsUserId(model.id);
          // Start heartbeat when logged in
          startProductionHeartbeat();
        } else {
          setAnalyticsUserId(null);
          // Stop heartbeat when logged out
          stopProductionHeartbeat();
        }

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
    })();

    return () => {
      stopProductionHeartbeat();
      unsubscribe?.();
    };
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
