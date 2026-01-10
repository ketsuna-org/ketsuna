<script lang="ts">
  import { onMount } from "svelte";
  import pb from "$lib/pocketbase";
  import MachineNode from "$lib/components/nodes/MachineNode.svelte";
  import DepositNode from "$lib/components/nodes/DepositNode.svelte";
  import CompanyNode from "$lib/components/nodes/CompanyNode.svelte";
  import ZoneNode from "$lib/components/nodes/ZoneNode.svelte";
  import StorageNode from "$lib/components/nodes/StorageNode.svelte";
  import { PipeEdge } from "$lib/components/edges";
  import GameIcon from "$lib/components/GameIcon.svelte";
  import ExplorationModal from "$lib/components/ExplorationModal.svelte";
  import MarketView from "$lib/components/MarketView.svelte";
  import InventoryView from "$lib/components/InventoryView.svelte";
  import WorkshopView from "$lib/components/WorkshopView.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { getItem } from "$lib/data/game-static";
  import {
    loadFactory,
    loadUnplacedMachines,
    loadUnplacedDeposits,
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
  import { graphRefreshStore } from "$lib/stores/graphRefreshStore";
  import { gamedataStore } from "$lib/stores/gamedataStore";
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
  import { logAnalyticsEvent } from "$lib/firebase";

  let { company } = $props<{ company: any }>();

  // Custom node types
  const nodeTypes = {
    machine: MachineNode,
    deposit: DepositNode,
    company: CompanyNode,
    zone: ZoneNode,
    storage: StorageNode,
  };

  // Custom edge types
  const edgeTypes = {
    pipe: PipeEdge,
  };

  // State
  let nodes = $state<Node[]>([]);
  let edges = $state<Edge[]>([]);
  let unplacedMachines = $state<any[]>([]);
  let unplacedDeposits = $state<any[]>([]);
  let showExploration = $state(false);
  let showMarket = $state(false);
  let showInventory = $state(false);
  let showWorkshop = $state(false);
  let showMobileSidebar = $state(false); // Mobile sidebar toggle
  let loading = $state(true);

  // Placement State
  interface PlacementSelection {
    type: "machine" | "deposit";
    id: string; // The specific item ID (e.g. machine unique ID)
    machineId?: string; // The generic definition ID (e.g. 'thermal_plant')
    icon?: string;
  }
  let placingSelection = $state<PlacementSelection | null>(null);

  // Mobile Connection Mode State
  let isConnectionMode = $state(false);
  let connectionSourceId = $state<string | null>(null);

  // Derived Selection State
  let selectedNode = $derived(nodes.find((n) => n.selected === true));
  let selectedEdge = $derived(edges.find((e) => e.selected === true));

  function handlePlacementSelect(
    type: "machine" | "deposit",
    id: string,
    machineId: string,
    icon: string
  ) {
    placingSelection = { type, id, machineId, icon };
    showMobileSidebar = false; // Always close sidebar
  }

  function cancelPlacement() {
    placingSelection = null;
  }

  async function confirmPlacement() {
    if (!placingSelection) return;

    // Calculate center of screen relative to viewport
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Convert to flow position
    const position = screenToFlowPosition({ x: centerX, y: centerY });

    // Get dimensions based on node type
    const nodeDim =
      placingSelection.type === "deposit"
        ? NODE_DIMENSIONS.deposit
        : NODE_DIMENSIONS.machine;

    const x = Math.round(position.x - nodeDim.width / 2);
    const y = Math.round(position.y - nodeDim.height / 2);

    // Bounds check
    if (
      x < 0 ||
      y < 0 ||
      x > canvasBounds.width - nodeDim.width ||
      y > canvasBounds.height - nodeDim.height
    ) {
      alert("Impossible de placer ici : Hors limites");
      return;
    }

    // Place node
    const success = await placeNode(
      placingSelection.type,
      placingSelection.id,
      x,
      y
    );

    if (success) {
      placingSelection = null;
      await loadData();
    }
  }

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
  const { screenToFlowPosition, getNodes, fitView, deleteElements } =
    useSvelteFlow();

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
        // Machines and storages can be removed, company and deposits are permanent
        deletable: node.type === "machine" || node.type === "storage",
      }));

      nodes = [zoneNode, ...childNodes] as Node[];
      edges = data.edges as Edge[];
      unplacedMachines = await loadUnplacedMachines(company.id);
      unplacedDeposits = await loadUnplacedDeposits(company.id);

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

  // Effect to reload data when graph refresh completes
  let lastRefreshTime: Date | null = null;
  $effect(() => {
    const currentRefreshTime = $graphRefreshStore.lastRefresh;

    // Only reload if we have a new refresh (not initial null)
    if (currentRefreshTime && currentRefreshTime !== lastRefreshTime) {
      lastRefreshTime = currentRefreshTime;
      console.log("[FACTORY] Graph refresh detected, reloading factory data");
      loadData();
    }
  });

  onMount(() => {
    // Initial load
    if (company?.id) {
      loadData();
    }
  });

  // Handle DnD Start for machines
  function onDragStart(event: DragEvent, machineId: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData("application/svelteflow", machineId);
      event.dataTransfer.setData("nodeType", "machine");
      event.dataTransfer.effectAllowed = "move";
    }
  }

  // Handle DnD Start for deposits
  function onDragStartDeposit(event: DragEvent, depositId: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData("application/svelteflow", depositId);
      event.dataTransfer.setData("nodeType", "deposit");
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

    const nodeId = event.dataTransfer.getData("application/svelteflow");
    const nodeType = event.dataTransfer.getData("nodeType") || "machine";
    if (!nodeId) return;

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    // Get dimensions based on node type
    const nodeDim =
      nodeType === "deposit"
        ? NODE_DIMENSIONS.deposit
        : NODE_DIMENSIONS.machine;
    const x = Math.round(position.x - nodeDim.width / 2);
    const y = Math.round(position.y - nodeDim.height / 2);

    // Bounds check
    if (
      x < 0 ||
      y < 0 ||
      x > canvasBounds.width - nodeDim.width ||
      y > canvasBounds.height - nodeDim.height
    ) {
      console.warn("Cannot place: out of bounds");
      return;
    }

    // Place the node (machines use "machine", deposits use "deposit")
    const success = await placeNode(
      nodeType as "machine" | "deposit",
      nodeId,
      x,
      y
    );
    if (success) {
      // Close mobile sidebar on drop if open
      showMobileSidebar = false;
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
        node.type as "machine" | "deposit" | "company" | "storage",
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

        // Log movement
        logAnalyticsEvent("factory_node_moved", {
          node_id: node.id,
          node_type: node.type,
          new_x: roundedX,
          new_y: roundedY,
        });
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
      logAnalyticsEvent("factory_connection_created", {
        source_id: sourceNode.id,
        source_type: sourceNode.type,
        target_id: targetNode.id,
        target_type: targetNode.type,
        resource_id:
          (sourceNode.data.itemId as string) ||
          (sourceNode.data.resourceId as string) ||
          "",
      });
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
    // Handle node deletions (machines and storages can be "unplaced")
    for (const node of deletedNodes) {
      if (node.type === "machine" || node.type === "storage") {
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

  // Handle context actions
  async function handleDeleteSelection() {
    if (selectedNode) {
      if (!selectedNode.deletable) return;
      await deleteElements({ nodes: [selectedNode] });
    } else if (selectedEdge) {
      await deleteElements({ edges: [selectedEdge] });
    }
  }

  function handleOpenNode(node: Node) {
    // Future implementation: Open specific details/management modal for the node
    // For now, simpler interaction or just placeholder
    console.log("Open node", node);
    // Example: If it's a machine, maybe show a quick status or config modal
    alert(`Machine: ${node.data.label || "Details"}`);
  }

  function onNodeDrag(_event: {
    targetNode: Node | null;
    nodes: Node[];
    event: MouseEvent | TouchEvent;
  }) {
    // Let Svelte Flow handle position updates via bind:nodes
    // No manual intervention needed during drag
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      // Force deselect all nodes and edges
      nodes = nodes.map((n) => ({ ...n, selected: false }));
      edges = edges.map((e) => ({ ...e, selected: false }));
      // Also close any open modals or sidebar
      showExploration = false;
      showMarket = false;
      showInventory = false;
      showWorkshop = false;
      showMobileSidebar = false;

      if (isConnectionMode) {
        cancelConnectionMode();
      }
    }
  }

  function toggleConnectionMode() {
    isConnectionMode = !isConnectionMode;
    connectionSourceId = null;
    showMobileSidebar = false;

    // Deselect everything when determining mode
    if (isConnectionMode) {
      nodes = nodes.map((n) => ({ ...n, selected: false }));
      edges = edges.map((e) => ({ ...e, selected: false }));
    }
  }

  function cancelConnectionMode() {
    isConnectionMode = false;
    connectionSourceId = null;
  }

  async function handleNodeClick({
    event,
    node,
  }: {
    event: MouseEvent | TouchEvent;
    node: Node;
  }) {
    if (!isConnectionMode) return;

    if (!connectionSourceId) {
      // Step 1: Select Source
      console.log("Mobile Connection: Selecting source", node);
      if (node.type === "company") {
        notifications.error(
          "Le Quartier Général ne peut pas être une source !"
        );
        return;
      }
      connectionSourceId = node.id;
      // Visual feedback: Select the node
      nodes = nodes.map((n) => ({ ...n, selected: n.id === node.id }));
      notifications.info(`Source: ${node.data.label || node.type}`);
    } else {
      // Step 2: Select Target
      console.log("Mobile Connection: Selecting target", node);

      if (node.id === connectionSourceId) {
        // Clicked same node -> Deselect
        connectionSourceId = null;
        nodes = nodes.map((n) => ({ ...n, selected: false }));
        notifications.info("Sélection annulée");
        return;
      }

      const sourceNode = nodes.find((n) => n.id === connectionSourceId);
      const targetNode = node;

      if (sourceNode && targetNode) {
        const resourceId =
          (sourceNode.data.itemId as string) ||
          (sourceNode.data.resourceId as string) ||
          "";
        console.log("Mobile Connection: Attempting createEdge", {
          source: sourceNode.id,
          target: targetNode.id,
          resourceId,
        });

        try {
          const success = await createEdge(
            sourceNode.id,
            sourceNode.type as "machine" | "deposit",
            targetNode.id,
            targetNode.type as "machine" | "company" | "deposit",
            resourceId
          );

          if (success) {
            logAnalyticsEvent("factory_connection_created_mobile", {
              source_id: sourceNode.id,
              source_type: sourceNode.type,
              target_id: targetNode.id,
              target_type: targetNode.type,
              resource_id: resourceId,
            });

            await loadData();

            notifications.success("Connexion établie !");
            connectionSourceId = null;
            nodes = nodes.map((n) => ({ ...n, selected: false }));
          } else {
            console.warn("Mobile Connection: createEdge returned false");
            notifications.error(
              "Échec de la connexion. Vérifiez la distance ou la compatibilité."
            );
          }
        } catch (err: any) {
          console.error("Mobile Connection: Error in createEdge", err);
          notifications.error("Erreur technique: " + (err.message || err));
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
  <!-- Mobile Menu Toggle -->
  <button
    class="md:hidden fixed top-4 left-4 z-50 bg-[#1e293b] text-white p-3 rounded-xl border border-[#334155] shadow-lg"
    onclick={() => (showMobileSidebar = !showMobileSidebar)}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      {#if showMobileSidebar}
        <path d="M18 6 6 18" /><path d="m6 6 18 12" />
      {:else}
        <line x1="4" x2="20" y1="12" y2="12" /><line
          x1="4"
          x2="20"
          y1="6"
          y2="6"
        /><line x1="4" x2="20" y1="18" y2="18" />
      {/if}
    </svg>
  </button>

  <!-- Toolbar -->
  <!-- Responsive classes: hidden on mobile unless toggled, fixed inset for mobile drawer -->
  <!-- Moved CSS properties to Tailwind to fix specificity issues -->
  <div
    class="
    toolbar
    {showMobileSidebar ? 'flex fixed inset-0 w-full h-full z-50' : 'hidden'}
    md:flex md:static md:w-[300px] md:h-auto flex-col gap-8 p-6
  "
  >
    <div class="toolbar-header">
      <h2>🏭 Usine</h2>
      <span class="bounds-info"
        >{canvasBounds.width} × {canvasBounds.height}</span
      >
      <!-- Close button for mobile only -->
      <button
        class="md:hidden text-slate-400"
        onclick={() => (showMobileSidebar = false)}
      >
        <span class="sr-only">Fermer</span>
        ✕
      </button>
    </div>

    {#if groupedUnplacedMachines.length > 0}
      <div class="unplaced-section">
        <h3>Machines à placer</h3>
        <div class="unplaced-list">
          {#each groupedUnplacedMachines as group}
            {@const item = getItem(group.machine_id)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_interactive_supports_focus -->
            <div
              class="unplaced-item"
              draggable="true"
              role="button"
              ondragstart={(e) => onDragStart(e, group.ids[0])}
              onclick={() =>
                handlePlacementSelect(
                  "machine",
                  group.ids[0],
                  group.machine_id,
                  item?.icon || "⚙️"
                )}
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

    {#if unplacedDeposits.length > 0}
      <div class="unplaced-section deposit-section">
        <h3>Gisements à placer</h3>
        <div class="unplaced-list">
          {#each unplacedDeposits as deposit}
            {@const resourceItem = getItem(deposit.ressource_id)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_interactive_supports_focus -->
            <div
              class="unplaced-item deposit-item"
              draggable="true"
              role="button"
              ondragstart={(e) => onDragStartDeposit(e, deposit.id)}
              onclick={() =>
                handlePlacementSelect(
                  "deposit",
                  deposit.id,
                  "",
                  resourceItem?.icon || "⛏️"
                )}
            >
              <div class="item-icon deposit-icon">
                <GameIcon
                  icon={resourceItem?.icon || "⛏️"}
                  size={24}
                  alt={resourceItem?.name || "Gisement"}
                />
              </div>
              <div class="item-info">
                <span class="item-name">{resourceItem?.name || "Gisement"}</span
                >
                <span class="item-id"
                  >Qté: {deposit.quantity.toLocaleString()}</span
                >
              </div>
              <span class="item-count size-badge">Niv.{deposit.size}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="stats-section">
      <h3>Actions</h3>
      <div class="action-grid">
        <button
          class="action-btn exploration"
          onclick={() => {
            showExploration = true;
            showMobileSidebar = false;
          }}
        >
          <span class="btn-icon">🧭</span>
          <span class="btn-label">Exploration</span>
        </button>
        <button
          class="action-btn market"
          onclick={() => {
            showMarket = true;
            showMobileSidebar = false;
          }}
        >
          <span class="btn-icon">💰</span>
          <span class="btn-label">Marché</span>
        </button>
        <button
          class="action-btn workshop full-width"
          onclick={() => {
            showWorkshop = true;
            showMobileSidebar = false;
          }}
        >
          <span class="btn-icon">⚒️</span>
          <span class="btn-label">Atelier</span>
        </button>
        <button
          class="action-btn inventory full-width"
          onclick={() => {
            showInventory = true;
            showMobileSidebar = false;
          }}
        >
          <span class="btn-icon">📦</span>
          <span class="btn-label">Inventaire & Stock</span>
        </button>
        <!-- Mobile Connection Mode Toggle -->
        <button
          class="action-btn full-width {isConnectionMode
            ? 'bg-amber-600 border-amber-500'
            : 'bg-[#1e293b] border-[#334155]'}"
          onclick={toggleConnectionMode}
          style={isConnectionMode
            ? "background: linear-gradient(135deg, #d97706 0%, #b45309 100%); box-shadow: 0 4px 0 #78350f;"
            : ""}
        >
          <span class="btn-icon">🔗</span>
          <span class="btn-label"
            >{isConnectionMode
              ? "Mode Liaison Activé"
              : "Mode Liaison (Mobile)"}</span
          >
        </button>
      </div>
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
      {edgeTypes}
      defaultEdgeOptions={{
        type: "pipe",
      }}
      proOptions={{
        hideAttribution: true,
      }}
      onconnect={onConnect}
      ondelete={onDelete}
      onnodedrag={onNodeDrag}
      onnodedragstop={onNodeDragStop}
      onnodeclick={handleNodeClick}
    >
      <Background bgColor="#334155" gap={20} />
      <Controls />
    </SvelteFlow>

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

  <!-- Connection Mode Overlay (Mobile) -->
  {#if isConnectionMode}
    <div
      class="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none"
    >
      <div
        class="bg-slate-900/95 backdrop-blur border border-amber-500/50 text-white px-6 py-4 rounded-2xl shadow-2xl flex flex-col items-center gap-2 animate-bounce-in pointer-events-auto w-full"
      >
        <div
          class="flex items-center gap-2 font-bold text-amber-400 uppercase tracking-widest text-xs"
        >
          <span>🔗 Mode Liaison</span>
        </div>

        <p class="text-center font-bold text-lg">
          {#if !connectionSourceId}
            Sélectionnez la <span class="text-blue-400">Source</span>
          {:else}
            Sélectionnez la <span class="text-emerald-400">Destination</span>
          {/if}
        </p>

        <p class="text-[10px] text-slate-400 text-center">
          {#if !connectionSourceId}
            Touchez une machine ou un gisement
          {:else}
            Touchez la machine ou l'entrepôt de destination
          {/if}
        </p>

        <button
          onclick={cancelConnectionMode}
          class="mt-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors w-full"
        >
          Terminer
        </button>
      </div>
    </div>
  {/if}

  <!-- Tap-to-Place Overlay -->
  {#if placingSelection}
    <div
      class="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
    >
      <!-- Reticle / Ghost Node -->
      <!-- Fixed center of screen -->
      <div
        class="relative w-32 h-32 flex flex-col items-center justify-center pointer-events-none"
      >
        <!-- Crosshair lines -->
        <div
          class="absolute inset-0 border-2 border-dashed border-white/30 rounded-lg animate-pulse"
        ></div>

        <!-- Icon -->
        <div
          class="text-6xl filter drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"
        >
          {#if placingSelection.icon}<GameIcon
              icon={placingSelection.icon}
              size={64}
              alt="Placement"
            />
          {:else}📍{/if}
        </div>

        <div
          class="absolute -bottom-8 bg-slate-900/80 px-3 py-1 rounded text-xs text-white uppercase tracking-wider"
        >
          Placer ici
        </div>
      </div>

      <!-- Controls (Pointer events enabled) -->
      <div
        class="fixed bottom-32 left-0 w-full flex items-center justify-center gap-8 pointer-events-auto"
      >
        <button
          onclick={cancelPlacement}
          class="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg flex items-center justify-center border-4 border-slate-900 active:scale-95 transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path d="M18 6 6 18" /><path d="m6 6 18 12" /></svg
          >
        </button>

        <button
          onclick={confirmPlacement}
          class="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center justify-center border-4 border-slate-900 active:scale-95 transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg
          >
        </button>
      </div>

      <!-- Instruction Toast -->
      <div
        class="fixed top-24 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700 text-white px-6 py-3 rounded-full shadow-xl pointer-events-auto text-center text-sm font-bold animate-bounce-in"
      >
        Déplacez la carte pour positionner
      </div>
    </div>
  {/if}

  <!-- Context Action Bar (Mobile/Touch) -->
  {#if selectedNode || selectedEdge}
    <div
      class="fixed bottom-0 left-0 w-full z-40 bg-[#1e293b] border-t border-[#334155] p-4 pr-24 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] flex items-center justify-between animate-slide-up"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-lg bg-[#0f172a] border border-[#334155] flex items-center justify-center"
        >
          <span class="text-xl">
            {#if selectedNode?.type === "machine"}⚙️
            {:else if selectedNode?.type === "deposit"}⛏️
            {:else if selectedNode?.type === "company"}🏢
            {:else if selectedNode?.type === "storage"}📦
            {:else if selectedEdge}🔗
            {:else}📍{/if}
          </span>
        </div>
        <div>
          <h3 class="font-bold text-white text-sm uppercase tracking-wider">
            {#if selectedNode}
              {selectedNode.data?.label || selectedNode.type}
            {:else if selectedEdge}
              Connexion
            {/if}
          </h3>
          <p class="text-xs text-slate-400">
            {#if selectedNode}
              {Math.round(selectedNode.position.x)}, {Math.round(
                selectedNode.position.y
              )}
            {:else}
              Transfert de ressources
            {/if}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        {#if selectedNode && selectedNode.type !== "company" && selectedNode.type !== "deposit" && selectedNode.type !== "zone"}
          <!-- Delete Button -->
          <button
            onclick={handleDeleteSelection}
            class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 hover:bg-red-500/20 active:scale-95 transition-all"
            aria-label="Supprimer"
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
              ><path d="M3 6h18" /><path
                d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
              /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line
                x1="10"
                x2="10"
                y1="11"
                y2="17"
              /><line x1="14" x2="14" y1="11" y2="17" /></svg
            >
          </button>
        {/if}

        {#if selectedEdge}
          <!-- Delete Button for Edge -->
          <button
            onclick={handleDeleteSelection}
            class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 hover:bg-red-500/20 active:scale-95 transition-all"
            aria-label="Supprimer"
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
              ><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line
                x1="9"
                y1="9"
                x2="15"
                y2="15"
              /><line x1="15" y1="9" x2="9" y2="15" /></svg
            >
          </button>
        {/if}
      </div>
    </div>
  {/if}
{/if}

<svelte:window onkeydown={handleKeyDown} />

{#if showExploration}
  <ExplorationModal onClose={() => (showExploration = false)} />
{/if}

{#if showMarket}
  <Modal
    title="<span class='text-2xl'>🛒</span> Marché Global"
    onClose={() => (showMarket = false)}
  >
    <MarketView />
  </Modal>
{/if}

{#if showWorkshop}
  <Modal
    title="<span class='text-2xl'>🔨</span> Atelier de Fabrication"
    onClose={() => (showWorkshop = false)}
  >
    <WorkshopView />
  </Modal>
{/if}

{#if showInventory}
  <Modal
    title="<span class='text-2xl'>📦</span> Inventaire & Stockage"
    onClose={() => (showInventory = false)}
  >
    <InventoryView />
  </Modal>
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

  /* ... inside <style> ... */
  .toolbar {
    /* attributes removed and moved to tailwind classes in template */
    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
    border-right: 2px solid #334155;
    overflow-y: auto;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
    z-index: 20;
    position: relative;
  }
  /* ... rest of style ... */

  /* Metallic separator lines */
  .toolbar::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, #3b82f6, #06b6d4);
  }

  .toolbar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 20px;
    border-bottom: 2px solid #334155;
  }

  .toolbar-header h2 {
    font-size: 20px;
    font-weight: 800;
    color: #e2e8f0;
    margin: 0;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
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
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Add little decorative line to headers */
  .unplaced-section h3::after,
  .stats-section h3::after {
    content: "";
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, #334155, transparent);
  }

  .unplaced-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Unplaced Item Card - Industrial Style */
  .unplaced-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: linear-gradient(135deg, #1e293b 0%, #172033 100%);
    border: 1px solid #334155;
    border-radius: 8px;
    cursor: grab;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  }

  .unplaced-item::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: #334155;
    transition: background 0.2s;
  }

  .unplaced-item:hover {
    background: #252f45;
    transform: translateY(-2px) translateX(2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
    border-color: #475569;
  }

  .unplaced-item:hover::before {
    background: #3b82f6;
  }

  .unplaced-item.deposit-item:hover::before {
    background: #10b981;
  }

  .unplaced-item:active {
    cursor: grabbing;
  }

  .item-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f172a;
    border-radius: 6px;
    border: 1px solid #28354c;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
  }

  .item-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .item-name {
    font-weight: 700;
    font-size: 13px;
    color: #e2e8f0;
    letter-spacing: 0.01em;
  }

  .item-id {
    font-size: 10px;
    color: #64748b;
    font-family: monospace;
  }

  .item-count {
    padding: 4px 8px;
    background: #334155;
    color: #e2e8f0;
    font-size: 11px;
    font-weight: 700;
    border-radius: 4px;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
    border: 1px solid #475569;
    min-width: 24px;
    text-align: center;
  }

  .size-badge {
    background: #0f392b; /* Dark emerald */
    color: #34d399;
    border-color: #059669;
  }

  .stats-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Stats Rows */
  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 6px;
    font-size: 13px;
    transition: border-color 0.2s;
  }

  .stat-row:hover {
    border-color: #475569;
  }

  .stat-row span:first-child {
    color: #94a3b8;
    font-weight: 500;
  }

  .stat-row span:last-child {
    font-weight: 700;
    color: #e2e8f0;
    font-family: monospace;
  }

  .canvas-wrapper {
    flex: 1;
    position: relative;
    height: 100%;
    background: #020617; /* Very dark background for canvas container */
  }

  /* Top Right Stats Pills */
  .stats-overlay {
    position: absolute;
    top: 96px; /* Moved down to avoid UserMenu/Notifications overlap */
    right: 24px;
    left: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 10;
    align-items: flex-end;
  }

  @media (max-width: 768px) {
    .stats-overlay {
      top: 80px;
      right: 16px;
      gap: 8px;
    }

    .glass-pill {
      min-width: auto;
      padding: 8px 12px;
      font-size: 13px;
    }
  }

  .glass-pill {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(12px);
    border: 1px solid #334155;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 700;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    min-width: 140px;
    justify-content: flex-end;
  }

  .glass-pill:hover {
    border-color: #475569;
    transform: translateY(-1px);
  }

  .pill-icon {
    font-size: 18px;
  }

  .pill-value {
    color: #f1f5f9;
    font-family: monospace;
    letter-spacing: 0.05em;
  }

  .balance-pill {
    border-left: 4px solid #10b981;
  }

  .energy-pill {
    border-left: 4px solid #f59e0b;
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

  /* Pipe edges handle their own animation */

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

  /* Action Button Styles */
  .action-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    position: relative;
    overflow: hidden;
  }

  /* Glossy shine effect */
  .action-btn::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 50%;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    pointer-events: none;
  }

  .action-btn.full-width {
    grid-column: span 2;
    flex-direction: row;
    padding: 12px;
  }

  .action-btn.full-width .btn-icon {
    font-size: 20px;
  }

  .action-btn .btn-icon {
    font-size: 24px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
  }

  .action-btn .btn-label {
    color: white;
    z-index: 2;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }

  .action-btn:hover {
    transform: translateY(-2px);
    filter: brightness(1.1);
  }

  .action-btn:active {
    transform: translateY(0);
    filter: brightness(0.95);
  }

  /* Button Variants - Deep, rich industrial colors */
  .action-btn.exploration {
    background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
    box-shadow:
      0 4px 0 #312e81,
      0 8px 16px rgba(0, 0, 0, 0.4);
  }

  .action-btn.market {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    box-shadow:
      0 4px 0 #064e3b,
      0 8px 16px rgba(0, 0, 0, 0.4);
  }

  .action-btn.workshop {
    background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
    box-shadow:
      0 4px 0 #78350f,
      0 8px 16px rgba(0, 0, 0, 0.4);
  }

  .action-btn.inventory {
    background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
    box-shadow:
      0 4px 0 #155e75,
      0 8px 16px rgba(0, 0, 0, 0.4);
  }

  /* Hover light effect for buttons */
  .action-btn.exploration:hover,
  .action-btn.market:hover,
  .action-btn.workshop:hover,
  .action-btn.inventory:hover {
    box-shadow:
      0 6px 0 rgba(0, 0, 0, 0.2),
      0 12px 20px rgba(0, 0, 0, 0.4);
  }
</style>
