<script lang="ts">
  import { SvelteFlowProvider } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { activeCompany, refreshActiveCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import type { Company } from "$lib/pocketbase";
  import FactoryInner from "./FactoryInner.svelte";
  import NotificationBell from "$lib/components/NotificationBell.svelte";
  import GlobalChat from "$lib/components/GlobalChat.svelte";
  import CreateCompanyForm from "$lib/components/CreateCompanyForm.svelte";
  import UserMenu from "$lib/components/UserMenu.svelte";
  import { onMount } from "svelte";

  // Visit mode state
  let visitCompanyId = $derived($page.url.searchParams.get("visit"));
  let visitedCompany = $state<Company | null>(null);
  let loadingVisit = $state(false);

  // Determine which company to show
  let company = $derived(visitCompanyId ? visitedCompany : $activeCompany);
  let isVisitMode = $derived(!!visitCompanyId && !!visitedCompany);

  // Load visited company when URL changes
  $effect(() => {
    if (visitCompanyId) {
      loadVisitedCompany(visitCompanyId);
    } else {
      visitedCompany = null;
    }
  });

  async function loadVisitedCompany(companyId: string) {
    loadingVisit = true;
    try {
      const result = await pb
        .collection("companies")
        .getOne<Company>(companyId, {
          expand: "ceo",
        });
      visitedCompany = result;
    } catch (err) {
      console.error("Failed to load company for visit:", err);
      visitedCompany = null;
      goto("/factory"); // Return to own factory if company not found
    } finally {
      loadingVisit = false;
    }
  }

  function exitVisit() {
    goto("/factory");
  }

  async function handleCompanyCreated() {
    await refreshActiveCompany();
  }
</script>

<svelte:head>
  <title
    >{isVisitMode ? `Visite: ${visitedCompany?.name}` : "Factory"} | Ketsuna</title
  >
</svelte:head>

{#if loadingVisit || (visitCompanyId && !visitedCompany)}
  <!-- Loading visit or waiting for visited company data -->
  <div class="min-h-screen bg-[#020617] flex items-center justify-center">
    <div class="flex flex-col items-center gap-4">
      <div
        class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"
      ></div>
      <p class="text-slate-400 font-medium animate-pulse">
        Chargement de l'usine...
      </p>
    </div>
  </div>
{:else if !company}
  <!-- No company: Show create company form -->
  <div
    class="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden"
  >
    <!-- Background Industrial touches -->
    <div
      class="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none"
    ></div>
    <div
      class="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"
    ></div>

    <div class="max-w-md w-full relative z-10">
      <div class="text-center mb-8">
        <span class="text-6xl block mb-4 drop-shadow-xl">🏭</span>
        <h1
          class="text-3xl font-black text-white mb-2 uppercase tracking-tight"
        >
          Bienvenue sur <span
            class="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"
            >Ketsuna</span
          >
        </h1>
        <p class="text-slate-400 font-medium">
          Pour commencer votre aventure industrielle, vous devez d'abord créer
          votre société.
        </p>
      </div>
      <CreateCompanyForm onCreated={handleCompanyCreated} />
    </div>
  </div>
{:else}
  <div class="factory-container">
    <SvelteFlowProvider>
      <FactoryInner {company} readOnly={!!visitCompanyId} />
    </SvelteFlowProvider>

    <div class="ui-overlay pointer-events-none fixed inset-0 z-50">
      <!-- Visit Banner -->
      {#if isVisitMode}
        <div class="absolute top-0 left-0 right-0 pointer-events-auto">
          <div
            class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 flex items-center justify-between shadow-lg"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl">👁️</span>
              <div>
                <p class="font-bold text-sm">Mode Visite</p>
                <p class="text-xs text-white/80">
                  Vous visitez l'usine de <span class="font-semibold"
                    >{visitedCompany?.name}</span
                  >
                  (Niveau {visitedCompany?.level})
                </p>
              </div>
            </div>
            <button
              on:click={exitVisit}
              class="bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            >
              ← Retour à mon usine
            </button>
          </div>
        </div>
      {/if}

      <div
        class="absolute top-4 right-4 pointer-events-auto"
        class:top-16={isVisitMode}
      >
        <UserMenu />
      </div>
      <div
        class="absolute top-4 right-20 pointer-events-auto"
        class:top-16={isVisitMode}
      >
        <NotificationBell />
      </div>
      <div
        class="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto"
      >
        <GlobalChat />
      </div>
    </div>
  </div>
{/if}

<style>
  .factory-container {
    display: flex;
    height: 100vh;
    background: #020617; /* Darker industrial background */
    color: #e2e8f0;
    overflow: hidden;
  }
</style>
