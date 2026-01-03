<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import pb from "$lib/pocketbase";
  import { activeCompany } from "$lib/stores";
  import type { CanvasNode } from "$lib/canvas/canvasTypes";
  import CompanyCanvas from "$lib/components/CompanyCanvas.svelte";
  import BottomPanel from "$lib/components/BottomPanel.svelte";
  import InventoryToolbar from "$lib/components/InventoryToolbar.svelte";

  let selectedNode: CanvasNode | null = null;
  let canvasComponent: CompanyCanvas;

  onMount(() => {
    // Vérifier l'authentification
    if (!pb.authStore.isValid) {
      goto("/login");
      return;
    }
  });

  function handleNodeSelect(node: CanvasNode | null) {
    selectedNode = node;
  }

  function handleCenterClick() {
    canvasComponent?.centerOnHQ();
  }

  function handlePlaceNode(node: CanvasNode) {
    canvasComponent?.addNode(node);
  }

  function handleRemoveNode(nodeId: string) {
    canvasComponent?.removeNode(nodeId);
    selectedNode = null;
  }
</script>

<svelte:head>
  <title>Dashboard | Ketsuna</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 relative overflow-hidden">
  <!-- Canvas Area -->
  <div class="absolute inset-0" style="bottom: 100px;">
    <CompanyCanvas
      bind:this={canvasComponent}
      onNodeSelect={handleNodeSelect}
    />
  </div>

  <!-- HUD Overlay (top left) -->
  <div class="absolute top-4 left-4 z-40">
    <div
      class="bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-700/50 p-3"
    >
      <h1 class="text-lg font-bold text-white flex items-center gap-2">
        <span class="text-indigo-400">🏭</span>
        {$activeCompany?.name || "Ma Société"}
      </h1>
      <p class="text-xs text-slate-400 mt-1">
        Siège Social • Canvas de Gestion
      </p>
    </div>
  </div>

  <!-- Inventory Toolbar (top center-right) -->
  <InventoryToolbar onPlaceNode={handlePlaceNode} />

  <!-- Zoom Controls (top right) -->
  <div class="absolute top-4 right-4 z-40 flex flex-col gap-2">
    <button
      class="p-2 bg-slate-900/80 backdrop-blur-sm hover:bg-slate-800 rounded-lg border border-slate-700/50 text-white text-lg font-bold transition-colors"
      title="Zoom +"
    >
      +
    </button>
    <button
      class="p-2 bg-slate-900/80 backdrop-blur-sm hover:bg-slate-800 rounded-lg border border-slate-700/50 text-white text-lg font-bold transition-colors"
      title="Zoom -"
    >
      −
    </button>
    <button
      on:click={handleCenterClick}
      class="p-2 bg-indigo-600/80 backdrop-blur-sm hover:bg-indigo-500 rounded-lg border border-indigo-500/50 text-white transition-colors"
      title="Centrer sur le Siège"
    >
      🎯
    </button>
  </div>

  <!-- Légende (bottom left, above panel) -->
  <div class="absolute bottom-28 left-4 z-40">
    <div
      class="bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700/50 p-2 text-xs"
    >
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm bg-[#1e1b4b] border border-[#6366f1]"
          ></span>
          <span class="text-slate-400">HQ</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm bg-[#1e293b] border border-[#475569]"
          ></span>
          <span class="text-slate-400">Machine</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm bg-[#0c1929] border border-[#0ea5e9]"
          ></span>
          <span class="text-slate-400">Stockage</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm bg-[#451a03] border border-[#f59e0b]"
          ></span>
          <span class="text-slate-400">Gisement</span>
        </div>
        <div class="flex items-center gap-1 text-slate-500">
          <span>•</span>
          <span>Clic droit sur connecteur = supprimer</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom Panel -->
  <BottomPanel {selectedNode} onRemoveNode={handleRemoveNode} />
</div>
