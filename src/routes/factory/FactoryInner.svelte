<script lang="ts">
  import { onMount } from "svelte";
  import pb from "$lib/pocketbase";
  import MachineNode from "$lib/components/nodes/MachineNode.svelte";
  import DepositNode from "$lib/components/nodes/DepositNode.svelte";
  import CompanyNode from "$lib/components/nodes/CompanyNode.svelte";
  import ZoneNode from "$lib/components/nodes/ZoneNode.svelte";
  import GameIcon from "$lib/components/GameIcon.svelte";
  import ExplorationModal from "$lib/components/ExplorationModal.svelte";
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
    unplaceNode,
    NODE_DIMENSIONS,
    type FactoryNode,
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
  let showExploration = $state(false);
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
  const { screenToFlowPosition, getNodes, fitView } = useSvelteFlow();

  let canvasBounds = $derived(getCanvasBounds(company?.level || 1));

  // Group unplaced machines by machine_id for stacking
  interface GroupedMachine {
    machine_id: string;
    ids: string[]; // Array of actual record IDs
    count: number;
  }

  let groupedUnplacedMachines = $derived.by(() => {
    const groups = new Map<string, string[]>();
    for (const machine of unplacedMachines) {
      const existing = groups.get(machine.machine_id) || [];
      existing.push(machine.id);
      groups.set(machine.machine_id, existing);
    }
    return Array.from(groups.entries()).map(([machine_id, ids]) => ({
      machine_id,
      ids,
      count: ids.length,
    })) as GroupedMachine[];
  });

  // Removed real-time subscriptions - they cause unnecessary refreshes
  // Since the user is the one making changes, we don't need them

  // Track if this is the initial load (for one-time fitView)
  let hasInitiallyLoaded = false;

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
        draggable: true,
        selectable: true,
        // Only machines can be removed, company and deposits are permanent
        deletable: node.type === "machine",
      }));

      nodes = [zoneNode, ...childNodes] as Node[];
      edges = data.edges as Edge[];
      unplacedMachines = await loadUnplacedMachines(company.id);

      // Focus on the company node ONLY on initial load
      if (!hasInitiallyLoaded && nodes.length > 0) {
        hasInitiallyLoaded = true;
        setTimeout(() => {
          fitView({
            nodes: [{ id: company.id }],
            padding: 2,
            duration: 800,
          });
        }, 100);
      }
    } catch (err) {
      console.error("Failed to load factory data:", err);
    } finally {
      loading = false;
    }
  }

  // Effect to watch for company changes
  $effect(() => {
    if (company?.id) {
      loadData();
    }
  });

  onMount(() => {
    // Initial load
    if (company?.id) {
      loadData();
    }
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
    const x = Math.round(position.x - machineDim.width / 2);
    const y = Math.round(position.y - machineDim.height / 2);

    // Filter out zone node for collision check - TEMPORARILY DISABLED
    // const childNodes = nodes.filter((n) => n.type !== "zone") as FactoryNode[];

    // if (checkCollision(x, y, machineDim.width, machineDim.height, childNodes)) {
    //   console.warn("Cannot place: collision detected");
    //   return;
    // }

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

  async function onNodeDragStop({
    targetNode: node,
    nodes: _eventNodes, // Renamed to avoid shadowing component state
  }: {
    targetNode: Node | null;
    nodes: Node[];
    event: MouseEvent | TouchEvent;
  }) {
    // 1. Guard clause for null target or specific restricted zones
    if (!node || node.id === ZONE_ID) return;

    // 2. Use measured dimensions for precision (critical for collision)
    // Svelte Flow populates 'measured' after the node renders.
    const nodeDim = {
      width:
        node.measured?.width ??
        NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS]?.width ??
        140,
      height:
        node.measured?.height ??
        NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS]?.height ??
        100,
    };

    // 3. Filter child nodes for collision (excluding the one being dragged)
    // Use component-level nodes state, not the event's nodes array
    const otherNodes = nodes.filter(
      (n) => n.type !== "zone" && n.id !== node.id
    ) as FactoryNode[];

    // 4. Boundary Validation
    const isOutOfBounds =
      node.position.x < 0 ||
      node.position.y < 0 ||
      node.position.x > canvasBounds.width - nodeDim.width ||
      node.position.y > canvasBounds.height - nodeDim.height;

    if (isOutOfBounds) {
      console.warn("Node out of bounds, resetting position");
      await loadData(); // Revert state from source of truth
      return;
    }

    // 5. Collision Validation - TEMPORARILY DISABLED for debugging
    // The collision logic was causing false positives, preventing all node movement
    // TODO: Re-enable after fixing the collision detection logic
    /*
    const hasCollision = checkCollision(
      node.position.x,
      node.position.y,
      nodeDim.width,
      nodeDim.height,
      otherNodes,
      node.id
    );

    if (hasCollision) {
      console.warn("Collision detected, resetting position");
      await loadData(); // Revert state
      return;
    }
    */

    // 6. Persistence
    try {
      const roundedX = Math.round(node.position.x);
      const roundedY = Math.round(node.position.y);

      const success = await updateNodePosition(
        node.type as "machine" | "deposit" | "company",
        node.id,
        roundedX,
        roundedY
      );

      if (!success) {
        await loadData();
      } else {
        // Update local state with rounded values to avoid visual drift
        const nodeIndex = nodes.findIndex((n) => n.id === node.id);
        if (nodeIndex !== -1) {
          nodes[nodeIndex].position = { x: roundedX, y: roundedY };
        }
      }
    } catch (error) {
      console.error("Failed to update node position:", error);
      await loadData();
    }
  }

  async function onConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;

    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) return;

    /* Restriction removed: connections now allowed between machines
    if (targetNode.type !== "company") {
      console.warn(
        "Connections are only supported to the Company node for now."
      );
      return;
    }
    */

    const success = await createEdge(
      connection.source,
      sourceNode.type as "machine" | "deposit",
      targetNode.id,
      targetNode.type as "machine" | "company" | "deposit",
      (sourceNode.data.itemId as string) ||
        (sourceNode.data.resourceId as string) ||
        ""
    );

    if (success) {
      await loadData();
    }
  }

  async function onDelete({
    nodes: deletedNodes,
    edges: deletedEdges,
  }: {
    nodes: Node[];
    edges: Edge[];
  }) {
    // Handle node deletions (machines only - can be "unplaced")
    for (const node of deletedNodes) {
      if (node.type === "machine") {
        const success = await unplaceNode("machine", node.id);
        if (success) {
          // Update local state directly instead of reloading
          nodes = nodes.filter((n) => n.id !== node.id);
          // Reload unplaced machines to show it in sidebar
          unplacedMachines = await loadUnplacedMachines(company.id);
        }
      }
      // Note: deposits and company nodes cannot be removed this way
    }

    // Handle edge deletions
    for (const edge of deletedEdges) {
      await deleteEdge(edge.id);
    }

    // Only reload if edges were deleted (to update connection state)
    if (deletedEdges.length > 0) {
      await loadData();
    }
  }

  function onNodeDrag(_event: {
    targetNode: Node | null;
    nodes: Node[];
    event: MouseEvent | TouchEvent;
  }) {
    // Let Svelte Flow handle position updates via bind:nodes
    // No manual intervention needed during drag
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

    {#if groupedUnplacedMachines.length > 0}
      <div class="unplaced-section">
        <h3>Machines à placer</h3>
        <div class="unplaced-list">
          {#each groupedUnplacedMachines as group}
            {@const item = getItem(group.machine_id)}
            <div
              class="unplaced-item"
              draggable="true"
              role="button"
              tabindex="0"
              ondragstart={(e) => onDragStart(e, group.ids[0])}
            >
              <div class="item-icon">
                <GameIcon
                  icon={item?.icon || "⚙️"}
                  size={24}
                  alt={item?.name || "Machine"}
                />
              </div>
              <div class="item-info">
                <span class="item-name">{item?.name || "Machine"}</span>
                <span class="item-id">{group.machine_id}</span>
              </div>
              {#if group.count > 1}
                <span class="item-count">×{group.count}</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="stats-section">
      <h3>Actions</h3>
      <button
        class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/25"
        onclick={() => (showExploration = true)}
      >
        <span>🧭</span>
        <span>Exploration</span>
      </button>
    </div>

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
      bind:edges
      {nodeTypes}
      defaultEdgeOptions={{ type: "smoothstep", animated: true }}
      onconnect={onConnect}
      ondelete={onDelete}
      onnodedrag={onNodeDrag}
      onnodedragstop={onNodeDragStop}
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

{#if showExploration}
  <ExplorationModal onClose={() => (showExploration = false)} />
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

  .item-count {
    margin-left: auto;
    padding: 4px 10px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
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

  :global(.svelte-flow__edge-path) {
    stroke: #64748b;
    stroke-width: 3;
    transition: stroke 0.3s;
  }

  :global(.svelte-flow__edge.animated .svelte-flow__edge-path) {
    stroke: #3b82f6;
    stroke-dasharray: 5;
    animation: dashdraw 0.5s linear infinite;
  }

  @keyframes dashdraw {
    from {
      stroke-dashoffset: 10;
    }
    to {
      stroke-dashoffset: 0;
    }
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
