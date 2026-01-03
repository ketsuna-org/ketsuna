<script lang="ts">
  import type {
    CanvasNode,
    MachineData,
    StorageData,
    HQData,
    GisementData,
  } from "$lib/canvas/canvasTypes";
  import { getSpaceTotal, getCompanyLevel } from "$lib/canvas/mockData";
  import { slide } from "svelte/transition";

  export let selectedNode: CanvasNode | null = null;
  export let onRemoveNode: (nodeId: string) => void = () => {};

  let showDetails = false;

  $: if (selectedNode) {
    showDetails = true;
  }

  function formatNumber(n: number): string {
    return n.toLocaleString("fr-FR");
  }

  function getNodeIcon(type: string): string {
    switch (type) {
      case "hq":
        return "🏢";
      case "machine":
        return "⚙️";
      case "storage":
        return "📦";
      case "gisement":
        return "⛏️";
      default:
        return "❓";
    }
  }

  function getNodeTypeLabel(type: string): string {
    switch (type) {
      case "hq":
        return "Siège Social";
      case "machine":
        return "Machine";
      case "storage":
        return "Stockage";
      case "gisement":
        return "Gisement";
      default:
        return "Inconnu";
    }
  }

  function handleRemove() {
    if (
      selectedNode &&
      selectedNode.type !== "hq" &&
      selectedNode.type !== "gisement"
    ) {
      onRemoveNode(selectedNode.id);
    }
  }
</script>

<div
  class="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 z-50"
>
  <!-- Stats Bar -->
  <div
    class="flex items-center justify-between px-4 py-2 border-b border-slate-800/50"
  >
    <div class="flex items-center gap-6 text-sm">
      <div class="flex items-center gap-2">
        <span class="text-indigo-400">🏢</span>
        <span class="text-slate-300">Niveau</span>
        <span class="font-bold text-white">{getCompanyLevel()}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-cyan-400">📐</span>
        <span class="text-slate-300">Espace</span>
        <span class="font-bold text-white">12/{getSpaceTotal()}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-emerald-400">⚡</span>
        <span class="text-slate-300">Énergie</span>
        <span class="font-bold text-emerald-400">OK</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-amber-400">💰</span>
        <span class="text-slate-300">Balance</span>
        <span class="font-bold text-amber-300">{formatNumber(125000)} ¥</span>
      </div>
    </div>

    <!-- Zoom Controls -->
    <div class="flex items-center gap-2">
      <button
        class="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm font-bold transition-colors"
      >
        −
      </button>
      <span class="text-xs text-slate-500 w-12 text-center">100%</span>
      <button
        class="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm font-bold transition-colors"
      >
        +
      </button>
      <button
        class="ml-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-xs font-bold transition-colors"
      >
        Centrer
      </button>
    </div>
  </div>

  <!-- Selection Details (expandable) -->
  {#if selectedNode}
    <div
      class="px-4 py-3 cursor-pointer hover:bg-slate-800/30 transition-colors"
      on:click={() => (showDetails = !showDetails)}
      on:keydown={(e) => e.key === "Enter" && (showDetails = !showDetails)}
      role="button"
      tabindex="0"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">{getNodeIcon(selectedNode.type)}</span>
          <div>
            <h3 class="text-white font-bold">{selectedNode.label}</h3>
            <p class="text-xs text-slate-400">
              {getNodeTypeLabel(selectedNode.type)}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Quick status -->
          {#if selectedNode.type === "machine" && selectedNode.data}
            {@const data = selectedNode.data as MachineData}
            <div class="flex items-center gap-2">
              <span
                class={`px-2 py-1 rounded-full text-xs font-bold ${data.producing ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}
              >
                {data.producing ? "Actif" : "Arrêté"}
              </span>
              <span class="text-xs text-slate-400">
                👥 {data.employees}/{data.maxEmployees}
              </span>
            </div>
          {/if}

          <!-- Expand indicator -->
          <svg
            class="w-5 h-5 text-slate-500 transition-transform {showDetails
              ? 'rotate-180'
              : ''}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </div>

    <!-- Expanded Details -->
    {#if showDetails}
      <div
        class="px-4 pb-4 border-t border-slate-800/50"
        transition:slide={{ duration: 200 }}
      >
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
          {#if selectedNode.type === "machine" && selectedNode.data}
            {@const data = selectedNode.data as MachineData}
            <div class="bg-slate-800/50 rounded-xl p-3">
              <p class="text-xs text-slate-500 uppercase mb-1">Entrée</p>
              <p class="text-white font-medium text-sm">
                {data.inputItem || "Aucune"}
              </p>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-3">
              <p class="text-xs text-slate-500 uppercase mb-1">Sortie</p>
              <p class="text-white font-medium text-sm">
                {data.outputItem || "Aucune"}
              </p>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-3">
              <p class="text-xs text-slate-500 uppercase mb-1">Cycle</p>
              <p class="text-white font-medium text-sm">
                {data.productionTime}s
              </p>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-3">
              <p class="text-xs text-slate-500 uppercase mb-1">Énergie</p>
              <p class="text-white font-medium text-sm">
                {data.needsEnergy} kWh
              </p>
            </div>
          {:else if selectedNode.type === "storage" && selectedNode.data}
            {@const data = selectedNode.data as StorageData}
            <div class="bg-slate-800/50 rounded-xl p-3">
              <p class="text-xs text-slate-500 uppercase mb-1">Capacité</p>
              <p class="text-white font-medium text-sm">
                {data.used}/{data.capacity}
              </p>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-3 col-span-3">
              <p class="text-xs text-slate-500 uppercase mb-1">Contenu</p>
              <div class="flex flex-wrap gap-2 mt-1">
                {#each data.storedItems as item}
                  <span
                    class="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300"
                  >
                    {item.itemType}: {item.quantity}
                  </span>
                {/each}
              </div>
            </div>
          {:else if selectedNode.type === "gisement" && selectedNode.data}
            {@const data = selectedNode.data as GisementData}
            <div class="bg-slate-800/50 rounded-xl p-3">
              <p class="text-xs text-slate-500 uppercase mb-1">Ressource</p>
              <p class="text-white font-medium text-sm">{data.resourceType}</p>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-3">
              <p class="text-xs text-slate-500 uppercase mb-1">Quantité</p>
              <p class="text-white font-medium text-sm">
                {formatNumber(data.quantity)}
              </p>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-3">
              <p class="text-xs text-slate-500 uppercase mb-1">Richesse</p>
              <p class="text-amber-400 font-medium text-sm">
                {Math.round(data.richness * 100)}%
              </p>
            </div>
          {:else if selectedNode.type === "hq" && selectedNode.data}
            {@const data = selectedNode.data as HQData}
            <div class="bg-slate-800/50 rounded-xl p-3">
              <p class="text-xs text-slate-500 uppercase mb-1">Niveau</p>
              <p class="text-white font-medium text-sm">{data.level}</p>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-3">
              <p class="text-xs text-slate-500 uppercase mb-1">Espace</p>
              <p class="text-white font-medium text-sm">
                {data.spaceUsed}/{data.spaceTotal}
              </p>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-3 col-span-2">
              <p class="text-xs text-slate-500 uppercase mb-1">Balance</p>
              <p class="text-amber-400 font-bold">
                {formatNumber(data.balance)} ¥
              </p>
            </div>
          {/if}
        </div>

        <!-- Actions -->
        <div class="flex gap-2 mt-4">
          {#if selectedNode.type === "machine"}
            <button
              class="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-bold transition-colors"
            >
              Gérer Employés
            </button>
            <button
              class="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white text-sm font-bold transition-colors"
            >
              Modifier
            </button>
            <button
              on:click={handleRemove}
              class="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-white text-sm font-bold transition-colors"
              title="Retirer cette machine"
            >
              🗑️ Retirer
            </button>
          {:else if selectedNode.type === "storage"}
            <button
              class="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white text-sm font-bold transition-colors"
            >
              Voir Contenu
            </button>
            <button
              on:click={handleRemove}
              class="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-white text-sm font-bold transition-colors"
              title="Retirer ce stockage"
            >
              🗑️ Retirer
            </button>
          {:else if selectedNode.type === "gisement"}
            <button
              class="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-white text-sm font-bold transition-colors"
            >
              Connecter Extracteur
            </button>
          {:else if selectedNode.type === "hq"}
            <button
              class="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-bold transition-colors"
            >
              Améliorer Niveau
            </button>
          {/if}
        </div>
      </div>
    {/if}
  {:else}
    <div class="px-4 py-3 text-center text-slate-500 text-sm">
      Cliquez sur un élément pour voir ses détails
    </div>
  {/if}
</div>
