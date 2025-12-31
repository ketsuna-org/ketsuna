<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import pb from "$lib/pocketbase";
  import type { Company } from "$lib/types";
  import WorldMap from "$lib/components/WorldMap.svelte";
  import CompanyDetailModal from "$lib/components/CompanyDetailModal.svelte";
  import { notifications } from "$lib/notifications";

  let companies: Company[] = [];
  let loading = true;
  let selectedCompany: Company | null = null;

  onMount(async () => {
    try {
      // Fetch all companies sorted by prestige or level
      const result = await pb.collection("companies").getFullList<Company>({
        sort: "-level",
        expand: "ceo",
        requestKey: null,
      });
      companies = result;
    } catch (err: any) {
      console.error("Failed to load world map", err);
      notifications.error("Impossible de charger la carte du monde");
    } finally {
      loading = false;
    }
  });

  function handleSelectCompany(company: Company) {
    selectedCompany = company;
  }
</script>

<svelte:head>
  <title>Ketsuna - Carte du Monde</title>
</svelte:head>

<div class="h-screen w-screen bg-slate-950 overflow-hidden relative">
  <!-- UI Overlays -->
  <div class="absolute top-0 left-0 p-6 z-10 pointer-events-none">
    <h1 class="text-3xl font-black text-white tracking-tight drop-shadow-md">
      Carte du Monde
    </h1>
    <p class="text-slate-400 text-sm drop-shadow-sm mt-1">
      Explorez {companies.length} sociétés industrielles. Utilizez la souris ou le
      tactile pour naviguer.
    </p>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div
      class="absolute inset-0 flex items-center justify-center z-20 bg-slate-950"
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
  {/if}

  <!-- Interactive Map -->
  <WorldMap {companies} onSelectCompany={handleSelectCompany} />

  <!-- Detail Modal -->
  {#if selectedCompany}
    <CompanyDetailModal
      company={selectedCompany}
      onClose={() => (selectedCompany = null)}
    />
  {/if}
</div>
