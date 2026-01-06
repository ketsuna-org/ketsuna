<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import pb from "$lib/pocketbase";
  import { activeCompany } from "$lib/stores";
  import MachineNode from "$lib/components/nodes/MachineNode.svelte";
  import DepositNode from "$lib/components/nodes/DepositNode.svelte";
  import CompanyNode from "$lib/components/nodes/CompanyNode.svelte";
  import ZoneNode from "$lib/components/nodes/ZoneNode.svelte";
  import { getItem } from "$lib/data/game-static";
  import {
    loadFactory,
    loadUnplacedMachines,
    getCanvasBounds,
    checkCollision,
    updateNodePosition,
    placeNode,
    createEdge,
    deleteEdge,
    NODE_DIMENSIONS,
    type FactoryNode,
    type FactoryEdge,
  } from "$lib/services/factory";
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    useSvelteFlow,
    type Connection,
    type Edge,
    type Node,
  } from "@xyflow/svelte";

  let { company } = $props<{ company: any }>();

  // Custom node types
  const nodeTypes = {
    machine: MachineNode,
    deposit: DepositNode,
    company: CompanyNode,
    zone: ZoneNode,
  };

  // State
  let nodes = $state<Node[]>([]);
  let edges = $state<Edge[]>([]);
  let unplacedMachines = $state<any[]>([]);
  let loading = $state(true);

  // Zone ID constant
  const ZONE_ID = "factory-zone";

  // Derived Energy Calculation
  let totalEnergy = $derived.by(() => {
    let prod = 0;
    let cons = 0;
    for (const node of nodes) {
      if (node.type === "machine") {
        const item = getItem((node.data as any).itemId);
        if (item) {
          prod += item.produce_energy || 0;
          cons += item.need_energy || 0;
        }
      }
    }
    return prod - cons;
  });

  function formatEnergy(val: number) {
    const abs = Math.abs(val);
    const sign = val < 0 ? "-" : "";
    if (abs >= 1000) return sign + (abs / 1000).toFixed(1) + " MW";
    return sign + abs.toLocaleString() + " kW";
  }

  // Get the svelte flow instance (correct hook usage)
  const { screenToFlowPosition, getNodes } = useSvelteFlow();

  let canvasBounds = $derived(getCanvasBounds(company?.level || 1));

  let unsubscribeMachines: (() => void) | null = null;
  let unsubscribeEdges: (() => void) | null = null;

  async function loadData() {
    if (!company?.id) return;
    try {
      const data = await loadFactory(company.id);

      // Create the zone node as the parent subgroup
      const zoneNode: FactoryNode = {
        id: ZONE_ID,
        type: "zone",
        position: { x: 0, y: 0 },
        data: {
          name: "Zone de Production",
          width: canvasBounds.width,
          height: canvasBounds.height,
          level: company.level || 1,
          placed: true,
        },
        draggable: false,
        selectable: false,
      };

      // Set all other nodes to have the zone as their parent
      const childNodes = data.nodes.map((node: any) => ({
        ...node,
        parentId: ZONE_ID,
        extent: "parent" as const,
      }));

      nodes = [zoneNode, ...childNodes] as Node[];
      edges = data.edges as Edge[];
      unplacedMachines = await loadUnplacedMachines(company.id);
    } catch (err) {
      console.error("Failed to load factory data:", err);
    } finally {
      loading = false;
    }
  }

  // Effect to watch for company changes (resolves infinite loading)
  $effect(() => {
    if (company?.id) {
      loadData();
      subscribeToData();
    }
  });

  async function subscribeToData() {
    if (!company?.id) return;

    try {
      unsubscribeMachines = await pb
        .collection("machines")
        .subscribe("*", () => {
          loadData();
        });

      unsubscribeEdges = await pb
        .collection("edge_relation")
        .subscribe("*", () => {
          loadData();
        });
    } catch (err) {
      console.error("Failed to subscribe to factory data", err);
    }
  }

  onMount(() => {
    // Initial load try
    if (company?.id) {
      loadData();
      subscribeToData();
    }

    return () => {
      if (unsubscribeMachines) unsubscribeMachines();
      if (unsubscribeEdges) unsubscribeEdges();
    };
  });

  // Handle DnD Start
  function onDragStart(event: DragEvent, machineId: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData("application/svelteflow", machineId);
      event.dataTransfer.effectAllowed = "move";
    }
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  async function onDrop(event: DragEvent) {
    event.preventDefault();

    if (!event.dataTransfer) return;

    const machineId = event.dataTransfer.getData("application/svelteflow");
    if (!machineId) return;

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const machineDim = NODE_DIMENSIONS.machine;
    const x = position.x - machineDim.width / 2;
    const y = position.y - machineDim.height / 2;

    // Filter out zone node for collision check
    const childNodes = nodes.filter((n) => n.type !== "zone") as FactoryNode[];

    if (checkCollision(x, y, machineDim.width, machineDim.height, childNodes)) {
      console.warn("Cannot place: collision detected");
      return;
    }

    if (
      x < 0 ||
      y < 0 ||
      x > canvasBounds.width - machineDim.width ||
      y > canvasBounds.height - machineDim.height
    ) {
      console.warn("Cannot place: out of bounds");
      return;
    }

    const success = await placeNode("machine", machineId, x, y);
    if (success) {
      // We don't necessarily need to reload all data,
      // but it's safer to ensure we get the right ID from the server
      await loadData();
    }
  }

  async function onNodeDragStop(event: any, node: any) {
    // Don't allow moving the zone node
    if (node.id === ZONE_ID) return;

    const childNodes = nodes.filter((n) => n.type !== "zone") as FactoryNode[];
    const dim =
      NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] ||
      NODE_DIMENSIONS.machine;

    if (
      node.position.x < 0 ||
      node.position.y < 0 ||
      node.position.x > canvasBounds.width - dim.width ||
      node.position.y > canvasBounds.height - dim.height
    ) {
      console.warn("Node out of bounds, resetting position");
      await loadData();
      return;
    }

    if (
      checkCollision(
        node.position.x,
        node.position.y,
        dim.width,
        dim.height,
        childNodes,
        node.id
      )
    ) {
      console.warn("Collision detected, resetting position");
      await loadData();
      return;
    }

    await updateNodePosition(
      node.type as "machine" | "deposit" | "company",
      node.id,
      node.position.x,
      node.position.y
    );
  }

  async function onConnect(params: Connection) {
    if (!params.source || !params.target) return;

    const sourceNode = nodes.find((n) => n.id === params.source);
    const targetNode = nodes.find((n) => n.id === params.target);

    if (!sourceNode || !targetNode) return;

    if (targetNode.type !== "company") {
      console.warn(
        "Connections are only supported to the Company node for now."
      );
      return;
    }

    const success = await createEdge(
      params.source,
      sourceNode.type as "machine" | "deposit",
      targetNode.id,
      sourceNode.data.itemId || sourceNode.data.resourceId || ""
    );

    if (success) {
      await loadData();
    }
  }

  async function onDelete(params: { edges: Edge[] }) {
    for (const edge of params.edges) {
      await deleteEdge(edge.id);
    }
    await loadData();
  }

  function onNodesChange(changes: any[]) {
    // Basic manual implementation if applyNodeChanges is missing
    // Svelte Flow Svelte 5 usually handles this via bind:nodes or internal state
    // but if we are providing nodes, we should handle selection/dragging changes
    for (const change of changes) {
      if (change.type === "position" && change.dragging) {
        const node = nodes.find((n) => n.id === change.id);
        if (node && change.position) {
          node.position = change.position;
        }
      }
      if (change.type === "select") {
        const node = nodes.find((n) => n.id === change.id);
        if (node) {
          node.selected = change.selected;
        }
      }
    }
  }
</script>

{#if loading}
  <div class="loading-overlay">
    <div class="spinner"></div>
    <p>Chargement de l'usine...</p>
  </div>
{:else}
  <!-- Toolbar -->
  <div class="toolbar">
    <div class="toolbar-header">
      <h2>🏭 Usine</h2>
      <span class="bounds-info"
        >{canvasBounds.width} × {canvasBounds.height}</span
      >
    </div>

    {#if unplacedMachines.length > 0}
      <div class="unplaced-section">
        <h3>Machines à placer</h3>
        <div class="unplaced-list">
          {#each unplacedMachines as machine}
            {@const item = getItem(machine.machine_id)}
            <div
              class="unplaced-item"
              draggable="true"
              role="button"
              tabindex="0"
              ondragstart={(e) => onDragStart(e, machine.id)}
            >
              <span class="item-icon">{item?.icon || "⚙️"}</span>
              <div class="item-info">
                <span class="item-name">{item?.name || "Machine"}</span>
                <span class="item-id">{machine.machine_id}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="stats-section">
      <h3>Statistiques</h3>
      <div class="stat-row">
        <span>Machines</span>
        <span>{nodes.filter((n) => n.type === "machine").length}</span>
      </div>
      <div class="stat-row">
        <span>Gisements</span>
        <span>{nodes.filter((n) => n.type === "deposit").length}</span>
      </div>
      <div class="stat-row">
        <span>Connexions</span>
        <span>{edges.length}</span>
      </div>
    </div>
  </div>

  <!-- Canvas -->
  <div
    class="canvas-wrapper"
    ondragover={onDragOver}
    ondrop={onDrop}
    role="region"
    aria-label="Zone de production"
  >
    <SvelteFlow
      bind:nodes
      {edges}
      {nodeTypes}
      fitView
      onnodeschange={onNodesChange}
      onnodeDragStop={onNodeDragStop}
      onconnect={onConnect}
      ondelete={onDelete}
    >
      <Background bgColor="#334155" gap={20} />
      <Controls />
      <MiniMap
        style="background-color: #0f172a; border: 1px solid #334155;"
        nodeColor="#3b82f6"
      />
    </SvelteFlow>

    <!-- Stats overlay -->
    <div class="stats-overlay">
      <div class="glass-pill balance-pill">
        <span class="pill-icon">💰</span>
        <span class="pill-value"
          >{company?.balance?.toLocaleString() || 0} $</span
        >
      </div>
      <div class="glass-pill energy-pill">
        <span class="pill-icon">⚡</span>
        <span
          class="pill-value {totalEnergy < 0
            ? 'text-red-400'
            : 'text-amber-400'}"
        >
          {formatEnergy(totalEnergy)}
        </span>
      </div>
    </div>
  </div>
{/if}

<style>
  .loading-overlay {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: #0f172a;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #334155;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-overlay p {
    margin-top: 16px;
    color: #94a3b8;
    font-weight: 500;
  }

  .toolbar {
    width: 280px;
    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
    border-right: 1px solid #334155;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
  }

  .toolbar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16px;
    border-bottom: 1px solid #334155;
  }

  .toolbar-header h2 {
    font-size: 18px;
    font-weight: 700;
    color: #f1f5f9;
    margin: 0;
  }

  .bounds-info {
    font-size: 11px;
    color: #64748b;
    background: #1e293b;
    padding: 4px 8px;
    border-radius: 6px;
    font-family: monospace;
  }

  .unplaced-section h3,
  .stats-section h3 {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 12px;
  }

  .unplaced-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .unplaced-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    cursor: grab;
    transition: all 0.2s;
  }

  .unplaced-item:hover {
    background: #334155;
    border-color: #6366f1;
    transform: translateY(-2px);
  }

  .unplaced-item:active {
    cursor: grabbing;
  }

  .item-icon {
    font-size: 24px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f172a;
    border-radius: 8px;
  }

  .item-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .item-name {
    font-weight: 600;
    font-size: 13px;
    color: #f1f5f9;
  }

  .item-id {
    font-size: 10px;
    color: #64748b;
    font-family: monospace;
  }

  .stats-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #1e293b;
    border-radius: 8px;
    font-size: 13px;
  }

  .stat-row span:first-child {
    color: #94a3b8;
  }

  .stat-row span:last-child {
    font-weight: 700;
    color: #f1f5f9;
  }

  .canvas-wrapper {
    flex: 1;
    position: relative;
    height: 100%;
  }

  .stats-overlay {
    position: absolute;
    top: 16px;
    right: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 10;
  }

  .glass-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .pill-icon {
    font-size: 16px;
  }

  .pill-value {
    color: #f1f5f9;
  }

  .balance-pill {
    border-color: rgba(16, 185, 129, 0.3);
  }

  .energy-pill {
    border-color: rgba(245, 158, 11, 0.3);
  }

  .text-red-400 {
    color: #f87171 !important;
  }

  .text-amber-400 {
    color: #fbbf24 !important;
  }

  /* SvelteFlow overrides */
  :global(.svelte-flow) {
    background: #0f172a !important;
  }

  :global(.svelte-flow__minimap) {
    background-color: #0f172a !important;
    border: 1px solid #334155 !important;
    border-radius: 8px;
  }

  :global(.svelte-flow__controls) {
    background: #1e293b !important;
    border: 1px solid #334155 !important;
    border-radius: 8px;
    overflow: hidden;
  }

  :global(.svelte-flow__controls-button) {
    background: #1e293b !important;
    border-bottom: 1px solid #334155 !important;
    fill: #94a3b8 !important;
  }

  :global(.svelte-flow__controls-button:hover) {
    background: #334155 !important;
    fill: #f1f5f9 !important;
  }
</style>
