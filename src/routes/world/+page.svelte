<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import CompanyGrid from "$lib/components/CompanyGrid.svelte";
  import {
    loadCompaniesWithCounts,
    type CompanyWithCounts,
  } from "$lib/services/companyLoader";
  import { notifications } from "$lib/notifications";

  let companies: CompanyWithCounts[] = [];
  let loading = true;

  onMount(async () => {
    try {
      companies = await loadCompaniesWithCounts();
    } catch (err: any) {
      console.error("Failed to load world map", err);
      notifications.error("Impossible de charger la carte du monde");
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Carte du Monde | Ketsuna: Iron Symphony</title>
</svelte:head>

{#if loading}
  <div
    class="min-h-screen bg-slate-950 flex items-center justify-center"
    transition:fade
  >
    <div class="flex flex-col items-center gap-4">
      <div
        class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"
      ></div>
      <p class="text-slate-400 font-medium animate-pulse">
        Chargement du monde...
      </p>
    </div>
  </div>
{:else}
  <CompanyGrid {companies} />
{/if}
