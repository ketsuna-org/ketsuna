<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import pb from "$lib/pocketbase";
  import { activeCompany } from "$lib/stores";
  import { notifications } from "$lib/notifications";

  interface MinableItem {
    id: string;
    name: string;
    type: string;
    productionTime: number;
    basePrice: number;
  }

  interface CurrentHarvest {
    itemId: string;
    itemName: string;
    startedAt: string;
    productionTime: number;
    remainingSeconds: number;
    isComplete: boolean;
  }

  let minableItems: MinableItem[] = $state([]);
  let currentHarvest: CurrentHarvest | null = $state(null);
  let loading = $state(true);
  let actionLoading = $state(false);
  let error = $state("");

  let pollInterval: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    loadStatus();
    // Poll every second for progress updates
    pollInterval = setInterval(() => {
      if (currentHarvest && !currentHarvest.isComplete) {
        currentHarvest.remainingSeconds = Math.max(
          0,
          currentHarvest.remainingSeconds - 1
        );
        if (currentHarvest.remainingSeconds <= 0) {
          currentHarvest.isComplete = true;
        }
      }
    }, 1000);
  });

  onDestroy(() => {
    if (pollInterval) clearInterval(pollInterval);
  });

  async function loadStatus() {
    loading = true;
    error = "";
    try {
      const response = await pb.send<{
        currentHarvest: CurrentHarvest | null;
        minableItems: MinableItem[];
      }>("/api/harvest/status", { method: "GET" });

      currentHarvest = response.currentHarvest;
      minableItems = response.minableItems || [];
    } catch (err: any) {
      error = err.message || "Erreur de chargement";
      notifications.error(error);
    } finally {
      loading = false;
    }
  }

  async function startHarvest(itemId: string) {
    actionLoading = true;
    try {
      const response = await pb.send<{
        success: boolean;
        message: string;
        productionTime: number;
      }>("/api/harvest/start", { method: "POST", body: { itemId } });

      notifications.success(response.message);
      await loadStatus();
    } catch (err: any) {
      notifications.error(err.message || "Erreur");
    } finally {
      actionLoading = false;
    }
  }

  async function collectHarvest() {
    actionLoading = true;
    try {
      const response = await pb.send<{ success: boolean; message: string }>(
        "/api/harvest/collect",
        { method: "POST" }
      );

      notifications.success(response.message);
      await loadStatus();
    } catch (err: any) {
      notifications.error(err.message || "Erreur");
    } finally {
      actionLoading = false;
    }
  }

  function formatTime(seconds: number): string {
    if (seconds <= 0) return "Terminé";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  const progressPercent = $derived.by(() => {
    const harvest = currentHarvest;
    if (!harvest) return 0;
    return Math.min(
      100,
      ((harvest.productionTime - harvest.remainingSeconds) /
        harvest.productionTime) *
        100
    );
  });
</script>

<div class="min-h-screen bg-slate-950 text-slate-200 p-6">
  <div class="max-w-5xl mx-auto space-y-8">
    <!-- Header -->
    <header>
      <h1
        class="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3"
      >
        <span class="p-2 bg-amber-500/10 rounded-xl text-amber-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="m14.5 9-5 5"></path>
            <path d="m9.5 9 5 5"></path>
          </svg>
        </span>
        Récolte Manuelle
      </h1>
      <p class="text-slate-400 mt-2 text-sm ml-1">
        Récoltez des ressources de base sans machines. Idéal pour démarrer votre
        empire !
      </p>
    </header>

    {#if loading}
      <div class="flex flex-col items-center justify-center py-20">
        <div class="relative w-16 h-16">
          <div
            class="absolute top-0 left-0 w-full h-full border-4 border-slate-700 rounded-full"
          ></div>
          <div
            class="absolute top-0 left-0 w-full h-full border-4 border-amber-500 rounded-full animate-spin border-t-transparent"
          ></div>
        </div>
        <p class="mt-6 text-slate-400 font-medium animate-pulse">
          Chargement...
        </p>
      </div>
    {:else}
      <!-- Current Harvest -->
      {#if currentHarvest}
        <section
          class="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
          transition:fade
        >
          <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span class="text-amber-400">⚒️</span> Récolte en cours
          </h2>

          <div class="flex items-center gap-6">
            <div
              class="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center text-3xl"
            >
              🪨
            </div>
            <div class="flex-1">
              <p class="text-xl font-bold text-white">
                {currentHarvest.itemName}
              </p>
              <div class="mt-2">
                <div
                  class="w-full bg-slate-800 h-3 rounded-full overflow-hidden"
                >
                  <div
                    class="h-full rounded-full transition-all duration-1000"
                    class:bg-amber-500={!currentHarvest.isComplete}
                    class:bg-emerald-500={currentHarvest.isComplete}
                    style="width: {progressPercent}%"
                  ></div>
                </div>
                <p class="text-sm text-slate-400 mt-1">
                  {#if currentHarvest.isComplete}
                    <span class="text-emerald-400 font-bold"
                      >Prêt à collecter !</span
                    >
                  {:else}
                    Temps restant: <span class="text-amber-400 font-mono"
                      >{formatTime(currentHarvest.remainingSeconds)}</span
                    >
                  {/if}
                </p>
              </div>
            </div>
            <button
              onclick={collectHarvest}
              disabled={!currentHarvest.isComplete || actionLoading}
              class="px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              class:bg-emerald-500={currentHarvest.isComplete}
              class:hover:bg-emerald-600={currentHarvest.isComplete}
              class:text-white={currentHarvest.isComplete}
              class:bg-slate-700={!currentHarvest.isComplete}
              class:text-slate-400={!currentHarvest.isComplete}
            >
              {#if actionLoading}
                <span class="animate-spin">⏳</span>
              {:else}
                Collecter
              {/if}
            </button>
          </div>
        </section>
      {/if}

      <!-- Available Resources -->
      <section>
        <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span class="text-slate-400">📦</span> Ressources disponibles
        </h2>

        {#if minableItems.length === 0}
          <div
            class="text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed"
          >
            <span class="text-4xl block mb-4">🏜️</span>
            <p class="text-slate-400">
              Aucune ressource récoltable pour le moment.
            </p>
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each minableItems as item (item.id)}
              <div
                class="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 hover:border-amber-500/30 transition-all group"
              >
                <div class="flex items-start justify-between mb-3">
                  <div
                    class="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
                  >
                    {#if item.type === "Ressource Brute"}
                      🪨
                    {:else}
                      📦
                    {/if}
                  </div>
                  <span
                    class="text-xs font-bold bg-slate-800 text-slate-400 px-2 py-1 rounded"
                  >
                    {item.type}
                  </span>
                </div>

                <h3 class="text-lg font-bold text-white mb-2">{item.name}</h3>

                <div
                  class="flex items-center justify-between text-sm text-slate-400 mb-4"
                >
                  <span class="flex items-center gap-1">
                    ⏱️ {formatTime(item.productionTime)}
                  </span>
                  <span class="flex items-center gap-1">
                    💰 {item.basePrice.toFixed(0)}€
                  </span>
                </div>

                <button
                  onclick={() => startHarvest(item.id)}
                  disabled={currentHarvest !== null || actionLoading}
                  class="w-full py-2.5 rounded-xl font-bold text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {#if actionLoading}
                    <span class="animate-spin">⏳</span>
                  {:else if currentHarvest}
                    Récolte en cours...
                  {:else}
                    Récolter
                  {/if}
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    background-color: rgb(15, 23, 42);
  }
</style>
