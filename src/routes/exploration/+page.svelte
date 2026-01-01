<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade, slide } from "svelte/transition";
  import pb from "$lib/pocketbase";
  import { notifications } from "$lib/notifications";
  import { activeCompany } from "$lib/stores";
  import type { Item } from "$lib/types";
  import {
    type Exploration,
    type Deposit,
    startExploration,
    getExplorations,
    getDeposits,
  } from "$lib/services/exploration";

  let loading = $state(true);
  let explorableItems = $state<Item[]>([]);
  let activeExplorations = $state<Exploration[]>([]);
  let myDeposits = $state<Deposit[]>([]);
  let selectedTab = $state<"explore" | "deposits">("explore");

  // Timer for countdowns
  let now = $state(new Date());
  let timerInterval: any;

  // Constants
  const EXPLORATION_COST = 5000;

  async function loadData() {
    if (!$activeCompany) return;
    loading = true;
    try {
      // 1. Load explorable items (Catalog)
      // Note: User must add 'is_explorable' (bool) to items collection
      const itemsResult = await pb.collection("items").getList<Item>(1, 50, {
        filter: "is_explorable = true",
        sort: "name",
      });
      explorableItems = itemsResult.items;

      // 2. Load active explorations
      activeExplorations = await getExplorations();

      // 3. Load deposits
      myDeposits = await getDeposits($activeCompany.id);
    } catch (err) {
      console.error("Failed to load exploration data", err);
      notifications.error("Erreur de chargement des données");
    } finally {
      loading = false;
    }
  }

  async function handleStartExploration(item: Item) {
    if (!$activeCompany) return;
    if ($activeCompany.balance < EXPLORATION_COST) {
      notifications.error("Fonds insuffisants pour lancer l'exploration");
      return;
    }

    if (
      !confirm(
        `Lancer une exploration pour ${item.name} ? Coût: ${EXPLORATION_COST}€`
      )
    ) {
      return;
    }

    try {
      await startExploration(item.id);
      notifications.success("Exploration lancée !");
      // Refresh data
      activeExplorations = await getExplorations();
      // Update balance locally if possible or reload company
      // For now, simpler to rely on automatic store update or ignore until reload
    } catch (err: any) {
      notifications.error(err.message || "Echec du lancement");
    }
  }

  function getTimeRemaining(endTimeStr: string): string {
    const end = new Date(endTimeStr).getTime();
    const current = now.getTime();
    const diff = end - current;

    if (diff <= 0) return "Terminé";

    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  onMount(() => {
    loadData();
    timerInterval = setInterval(() => {
      now = new Date();
      // Auto-refresh if an exploration might have finished?
      // Simple logic: if any exploration end_time < now and status is still 'En cours' in UI, maybe reload?
      // But we rely on manual reload or efficient polling.
    }, 1000);
  });

  onDestroy(() => {
    if (timerInterval) clearInterval(timerInterval);
  });
</script>

<div class="space-y-6 animate-in fade-in duration-500">
  <!-- Header -->
  <div
    class="flex justify-between items-center bg-gray-900/50 p-6 rounded-2xl border border-white/5 backdrop-blur-sm shadow-xl"
  >
    <div>
      <h1
        class="text-3xl font-bold text-white tracking-tight flex items-center gap-3"
      >
        <span class="text-4xl text-amber-400">🔭</span>
        Exploration & Gisements
      </h1>
      <p class="text-gray-400 mt-2 text-lg">
        Découvrez et exploitez les ressources naturelles du monde de Ketsuna.
      </p>
    </div>
    <div
      class="bg-gray-800/80 px-6 py-3 rounded-xl border border-white/5 shadow-inner"
    >
      <span class="text-gray-400 text-sm uppercase tracking-wider font-medium"
        >Coût Mission</span
      >
      <div class="text-2xl font-bold text-amber-400 font-mono mt-1">
        {EXPLORATION_COST.toLocaleString()} €
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div
    class="flex gap-2 bg-gray-900/30 p-1.5 rounded-xl w-fit border border-white/5"
  >
    <button
      class="px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 {selectedTab ===
      'explore'
        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
        : 'text-gray-400 hover:text-white hover:bg-white/5'}"
      onclick={() => (selectedTab = "explore")}
    >
      Missions d'Exploration
    </button>
    <button
      class="px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 {selectedTab ===
      'deposits'
        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
        : 'text-gray-400 hover:text-white hover:bg-white/5'}"
      onclick={() => (selectedTab = "deposits")}
    >
      Mes Gisements ({myDeposits.length})
    </button>
  </div>

  {#if loading}
    <div class="flex justify-center py-20">
      <div
        class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"
      ></div>
    </div>
  {:else if selectedTab === "explore"}
    <!-- Active Explorations -->
    {#if activeExplorations.length > 0}
      <div
        class="bg-gray-900/50 p-6 rounded-2xl border border-amber-500/20 shadow-lg mb-8"
      >
        <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span class="animate-pulse text-amber-400">📡</span> Missions en cours
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each activeExplorations as exp (exp.id)}
            <div
              class="bg-gray-800/60 p-4 rounded-xl border border-white/10 flex items-center justify-between"
            >
              <div class="flex items-center gap-4">
                <div
                  class="h-10 w-10 bg-amber-500/20 rounded-lg flex items-center justify-center text-xl"
                >
                  🚀
                </div>
                <div>
                  <div class="text-white font-medium">
                    {exp.expand?.target_resource.name}
                  </div>
                  <div class="text-xs text-amber-400 font-mono">
                    {getTimeRemaining(exp.end_time)}
                  </div>
                </div>
              </div>
              <div
                class="text-xs px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 animate-pulse"
              >
                Scan en cours...
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Available Resources -->
    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {#each explorableItems as item (item.id)}
        <div
          class="group relative bg-gray-900/40 hover:bg-gray-800/60 rounded-2xl border border-white/5 hover:border-amber-500/30 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1"
        >
          <div class="flex items-center gap-4 mb-4">
            <div
              class="h-14 w-14 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform duration-300"
            >
              💎
            </div>
            <div>
              <h3
                class="text-lg font-bold text-white group-hover:text-amber-400 transition-colors"
              >
                {item.name}
              </h3>
              <div class="text-xs text-gray-500">Ressource Brut</div>
            </div>
          </div>

          <div
            class="flex justify-between items-center mt-6 pt-4 border-t border-white/5"
          >
            <button
              class="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-amber-500/25"
              onclick={() => handleStartExploration(item)}
            >
              <span>🔭</span>
              Lancer l'exploration
            </button>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Deposits List -->
    {#if myDeposits.length === 0}
      <div class="flex flex-col items-center justify-center py-20 text-center">
        <div class="text-6xl mb-4 opacity-50">🗺️</div>
        <h3 class="text-xl font-bold text-gray-300">
          Aucun gisement découvert
        </h3>
        <p class="text-gray-500 max-w-md mt-2">
          Lancez des missions d'exploration pour trouver des ressources à
          exploiter.
        </p>
        <button
          class="mt-6 px-6 py-2 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors"
          onclick={() => (selectedTab = "explore")}
        >
          Lancer une mission
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each myDeposits as deposit (deposit.id)}
          <div
            class="bg-gray-900/40 rounded-2xl border border-emerald-500/20 p-6 relative overflow-hidden group hover:bg-gray-800/60 transition-colors"
          >
            <div
              class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
            >
              <span class="text-8xl">📍</span>
            </div>

            <div class="relative z-10">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h3 class="text-xl font-bold text-white">
                    {deposit.expand?.ressource.name}
                  </h3>
                  <div class="text-xs text-emerald-400 font-mono mt-1">
                    Gisement #{deposit.id.slice(0, 5)}
                  </div>
                </div>
                <div class="text-3xl">🏞️</div>
              </div>

              <div class="space-y-4">
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-400">Abondance</span>
                    <span class="text-white font-bold"
                      >{Math.floor(deposit.quantity).toLocaleString()} u</span
                    >
                  </div>
                  <div class="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-emerald-500"
                      style="width: 100%"
                    ></div>
                    <!-- TODO: Calc % based on initial quantity? We don't verify initial qty yet -->
                  </div>
                </div>

                <div
                  class="flex justify-between items-center bg-gray-800/50 px-3 py-2 rounded-lg"
                >
                  <span class="text-sm text-gray-400">Pureté (Richesse)</span>
                  <div class="flex items-center gap-2">
                    <span class="text-white font-bold"
                      >{(deposit.richness * 100).toFixed(0)}%</span
                    >
                    {#if deposit.richness > 1.2}
                      <span class="text-xs text-yellow-400">★ ★ ★</span>
                    {:else if deposit.richness > 1.0}
                      <span class="text-xs text-yellow-400">★ ★</span>
                    {:else}
                      <span class="text-xs text-gray-600">★</span>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
