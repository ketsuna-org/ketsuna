<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade, scale } from "svelte/transition";
  import type { Employee } from "$lib/pocketbase";

  let { onClose } = $props<{ onClose: () => void }>();

  // Mock data for now - will be replaced by real data fetch
  let availableEmployees: Employee[] = []; // Populate with employees capable of exploration
  let selectedEmployee: string | null = null;
  let missionDuration = 60; // Minutes

  function handleStartMission() {
    if (!selectedEmployee) return;
    console.log("Starting exploration mission for", selectedEmployee);
    // TODO: Call backend API to start mission
    onClose();
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
  transition:fade={{ duration: 200 }}
>
  <div
    class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative"
    transition:scale={{ duration: 200, start: 0.95 }}
  >
    <!-- Header -->
    <div
      class="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50"
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

    <!-- Body -->
    <div class="p-6 space-y-6">
      <div class="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4">
        <p class="text-indigo-200 text-sm leading-relaxed">
          Envoyez vos explorateurs découvrir de nouveaux gisements de
          ressources. Les missions d'exploration consomment de l'énergie et
          nécessitent des employés qualifiés.
        </p>
      </div>

      <!-- Employee Selection (Mock) -->
      <div class="space-y-3">
        <span
          class="text-sm font-medium text-slate-300 uppercase tracking-wider block"
        >
          Explorateur disponible
        </span>
        {#if availableEmployees.length === 0}
          <div
            class="text-center py-8 border-2 border-dashed border-slate-800 rounded-xl"
          >
            <p class="text-slate-500">
              Aucun explorateur disponible pour le moment.
            </p>
          </div>
        {:else}
          <!-- List would go here -->
        {/if}
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <button
          onclick={onClose}
          class="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-medium text-sm"
        >
          Annuler
        </button>
        <button
          onclick={handleStartMission}
          disabled={!selectedEmployee && availableEmployees.length > 0}
          class="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2"
        >
          Lancer la mission
        </button>
      </div>
    </div>
  </div>
</div>
