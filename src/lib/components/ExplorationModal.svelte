<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade, scale } from "svelte/transition";
  import type { Employee } from "$lib/pocketbase";
  import pb from "$lib/pocketbase";
  import { activeCompany } from "$lib/stores";
  import { notifications } from "$lib/notifications";
  import { getAllItems } from "$lib/data/game-static";

  let { onClose } = $props<{ onClose: () => void }>();

  // Tabs state
  let activeTab = $state<"new" | "active">("new");

  // New Mission State
  let availableEmployees = $state<Employee[]>([]);
  let selectedEmployee = $state<string | null>(null);
  let selectedResource = $state<string | null>(null);
  let activeExplorations = $state<any[]>([]); // New state for active missions

  let loading = $state(true);
  let starting = $state(false);

  // Intervals
  let refreshInterval: any;

  // Get only resources (Ressource Brute)
  const availableResources = getAllItems().filter(
    (r: any) => r.type === "Ressource Brute"
  );

  async function loadExplorers() {
    if (!$activeCompany) return;
    try {
      // Fetch idle Explorers (no deposit, no exploration) and filter by employer
      const result = await pb.collection("employees").getFullList<Employee>({
        filter: `employer = "${$activeCompany.id}" && deposit = "" && exploration = "" && exploration_luck > 0`,
        sort: "-exploration_luck",
      });
      availableEmployees = result;
      if (availableEmployees.length > 0 && !selectedEmployee) {
        selectedEmployee = availableEmployees[0].id;
      }
    } catch (e) {
      console.error("Failed to load explorers", e);
    }
  }

  async function loadActiveExplorations() {
    if (!$activeCompany) return;
    try {
      const result = await pb.send("/api/explorations", { method: "GET" });
      activeExplorations = result;
    } catch (e) {
      console.error("Failed to load active explorations", e);
    }
  }

  async function refreshData() {
    loading = true;
    await Promise.all([loadExplorers(), loadActiveExplorations()]);
    loading = false;
  }

  onMount(() => {
    refreshData();
    // Auto-refresh active list every 10s? Or rely on manual refresh/close re-open
    // For now, simple load once
  });

  async function handleStartMission() {
    if (!selectedEmployee || !selectedResource) return;

    starting = true;
    try {
      await pb.send("/api/exploration/start", {
        method: "POST",
        body: {
          employeeId: selectedEmployee,
          resourceId: selectedResource,
        },
      });

      notifications.success("Mission d'exploration lancée !");
      // Switch tab to active missions and refresh
      await refreshData();
      activeTab = "active";
      selectedEmployee = null; // Reset selection
      selectedResource = null;
    } catch (e: any) {
      console.error("Exploration error:", e);
      notifications.error(
        e.message || "Erreur lors du lancement de la mission"
      );
    } finally {
      starting = false;
    }
  }

  async function handleAcknowledge(explorationId: string) {
    try {
      await pb.send("/api/exploration/acknowledge", {
        method: "POST",
        body: { explorationId },
      });
      notifications.success("Mission terminée !");
      await refreshData();
    } catch (e: any) {
      console.error("Acknowledge error:", e);
      notifications.error(e.message || "Erreur lors de l'acquittement");
    }
  }

  function getTimeRemaining(endTime: string) {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return "Terminé";

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case "Succès":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "Echec":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
    }
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
  transition:fade={{ duration: 200 }}
>
  <div
    class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
    transition:scale={{ duration: 200, start: 0.95 }}
  >
    <!-- Header -->
    <div
      class="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0"
    >
      <h2 class="text-xl font-bold text-white flex items-center gap-2">
        <span class="text-2xl">🧭</span> Exploration
      </h2>
      <button
        onclick={onClose}
        aria-label="Fermer"
        class="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-x"
          ><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
        >
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-slate-800 bg-slate-950/30 shrink-0">
      <button
        class="flex-1 py-3 text-sm font-medium border-b-2 transition-colors {activeTab ===
        'new'
          ? 'border-indigo-500 text-white'
          : 'border-transparent text-slate-500 hover:text-slate-300'}"
        onclick={() => (activeTab = "new")}
      >
        Nouvelle Mission
      </button>
      <button
        class="flex-1 py-3 text-sm font-medium border-b-2 transition-colors {activeTab ===
        'active'
          ? 'border-indigo-500 text-white'
          : 'border-transparent text-slate-500 hover:text-slate-300'}"
        onclick={() => (activeTab = "active")}
      >
        Missions en cours ({activeExplorations.length})
      </button>
    </div>

    <!-- Body -->
    <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
      {#if activeTab === "new"}
        <div
          class="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4"
        >
          <p class="text-indigo-200 text-sm leading-relaxed">
            Envoyez vos explorateurs découvrir un gisement de la ressource
            choisie. Nécessite un explorateur disponible.
          </p>
        </div>

        <!-- Resource Selection -->
        <div class="space-y-3">
          <label
            for="resource-select"
            class="text-sm font-medium text-slate-300 uppercase tracking-wider block"
          >
            Ressource Cible
          </label>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            {#each availableResources as res}
              <button
                class="flex flex-col items-center justify-center p-3 rounded-xl border transition-all {selectedResource ===
                res.id
                  ? 'bg-indigo-600/20 border-indigo-500 text-white'
                  : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'}"
                onclick={() => (selectedResource = res.id)}
              >
                <span class="text-2xl mb-1">{res.icon || "📦"}</span>
                <span class="text-xs font-bold text-center">{res.name}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Employee Selection -->
        <div class="space-y-3">
          <span
            class="text-sm font-medium text-slate-300 uppercase tracking-wider block"
          >
            Explorateur disponible
          </span>

          {#if loading}
            <div class="h-12 bg-slate-800 rounded-xl animate-pulse"></div>
          {:else if availableEmployees.length === 0}
            <div
              class="text-center py-8 border-2 border-dashed border-slate-800 rounded-xl"
            >
              <p class="text-slate-500 mb-2">Aucun explorateur disponible.</p>
              <p class="text-xs text-slate-600">
                Recrutez des explorateurs ou attendez qu'ils finissent leur
                mission.
              </p>
            </div>
          {:else}
            <select
              bind:value={selectedEmployee}
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {#each availableEmployees as emp}
                <option value={emp.id}>
                  {emp.name} (Exploration: {emp.exploration_luck ?? 0})
                </option>
              {/each}
            </select>
          {/if}
        </div>

        <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            onclick={onClose}
            class="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-medium text-sm"
          >
            Annuler
          </button>
          <button
            onclick={handleStartMission}
            disabled={!selectedEmployee ||
              !selectedResource ||
              availableEmployees.length === 0 ||
              starting}
            class="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2"
          >
            {#if starting}
              <div
                class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
              ></div>
              <span>Lancement...</span>
            {:else}
              <span>🚀 Lancer</span>
            {/if}
          </button>
        </div>
      {:else}
        <!-- Active Missions Tab -->
        {#if activeExplorations.length === 0}
          <div class="text-center py-12">
            <span class="text-4xl opacity-20 mb-4 block">🏝️</span>
            <p class="text-slate-400 font-medium">Aucune mission en cours</p>
            <p class="text-xs text-slate-600 mt-2">
              Lancez une nouvelle exploration depuis l'autre onglet.
            </p>
          </div>
        {:else}
          <div class="space-y-3">
            {#each activeExplorations as mission (mission.id)}
              {@const resource = availableResources.find(
                (r) => r.id === mission.target_resource_id
              )}
              <div
                class="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-3"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-2xl border border-slate-700/50"
                  >
                    {resource?.icon || "📦"}
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-white text-sm truncate">
                      Recherche de {resource?.name || "Ressource"}
                    </h4>
                    <p class="text-xs text-slate-400 mt-0.5">
                      Par {mission.expand?.employee?.name || "un expert"}
                    </p>
                  </div>
                  <div class="text-right">
                    <span
                      class="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border {getStatusStyle(
                        mission.status
                      )}"
                    >
                      {mission.status}
                    </span>
                    {#if mission.status === "En cours"}
                      <div class="text-[11px] text-indigo-300 font-mono mt-1.5">
                        {getTimeRemaining(mission.end_time)}
                      </div>
                    {/if}
                  </div>
                </div>

                {#if mission.status !== "En cours"}
                  <button
                    onclick={() => handleAcknowledge(mission.id)}
                    class="w-full py-2 {mission.status === 'Succès'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-slate-700 hover:bg-slate-600'} text-white text-xs font-bold rounded-lg transition-colors shadow-lg"
                  >
                    {mission.status === "Succès"
                      ? "Confirmer & Récupérer"
                      : "Acquitter"}
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        <div class="flex justify-end pt-4 border-t border-slate-800">
          <button
            onclick={onClose}
            class="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-medium text-sm"
          >
            Fermer
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(30, 41, 59, 0.5);
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(71, 85, 105, 0.8);
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.6);
  }
</style>
