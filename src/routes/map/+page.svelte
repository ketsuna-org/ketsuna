<script lang="ts">
  import { SvelteFlowProvider, type Node, type Edge } from "@xyflow/svelte";
  import MapComponent from "$lib/components/MapComponent.svelte";
  import "@xyflow/svelte/dist/style.css";
  import "./map.css";
  // --- State ---
  // Initial nodes
  let nodes = $state<Node[]>([
    {
      id: "0",
      type: "group",
      position: { x: 0, y: 0 },
      width: 1800,
      height: 1800,
      deletable: false,
      data: { label: "Zone de jeu" },
    },
    {
      id: "1",
      type: "headQuater",
      data: { label: "Siège Social" },
      position: { x: 820, y: 820 },
      parentId: "0",
      extent: "parent",
      deletable: false,
      width: 180,
      height: 180,
      style:
        "background: #1e293b; color: white; border: 1px solid #475569; border-radius: 8px; text-align: center;",
    },
  ]);

  let edges = $state<Edge[]>([]);

  // Inventory Mock Data
  const inventoryItems = [
    {
      id: "item-1",
      name: "Extracteur",
      icon: "⛏️",
      color: "bg-amber-500/20 text-amber-500 border-amber-500/40",
    },
    {
      id: "item-2",
      name: "Usine",
      icon: "🏭",
      color: "bg-emerald-500/20 text-emerald-500 border-emerald-500/40",
    },
    {
      id: "item-3",
      name: "Entrepôt",
      icon: "📦",
      color: "bg-indigo-500/20 text-indigo-500 border-indigo-500/40",
    },
    {
      id: "item-4",
      name: "Laboratoire",
      icon: "⚗️",
      color: "bg-rose-500/20 text-rose-500 border-rose-500/40",
    },
  ];

  let isInventoryOpen = $state(true);
</script>

<svelte:head>
  <title>Carte du Projet | Ketsuna</title>
</svelte:head>

<div
  class="h-screen w-screen bg-slate-950 flex flex-col relative overflow-hidden text-slate-200 font-sans selection:bg-indigo-500/30"
>
  <SvelteFlowProvider>
    <MapComponent {nodes} {edges} {inventoryItems} bind:isInventoryOpen />
  </SvelteFlowProvider>
</div>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
  }
</style>
