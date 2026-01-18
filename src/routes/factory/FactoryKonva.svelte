<script lang="ts">
    /**
     * FactoryKonva - Canvas-based factory visualization using svelte-konva
     *
     * This is the Konva-based alternative to FactoryInner.svelte.
     * It renders the factory graph on a native HTML5 Canvas for better
     * performance with large numbers of nodes.
     *
     * @prop company - The company data
     * @prop readOnly - Whether in read-only/visit mode
     */
    import { onMount, setContext, untrack } from "svelte";
    import { browser } from "$app/environment";
    import { notifications } from "$lib/notifications";
    import GameIcon from "$lib/components/GameIcon.svelte";
    import ExplorationModal from "$lib/components/ExplorationModal.svelte";
    import MarketView from "$lib/components/MarketView.svelte";
    import InventoryView from "$lib/components/InventoryView.svelte";
    import WorkshopView from "$lib/components/WorkshopView.svelte";
    import ChatView from "$lib/components/ChatView.svelte";
    import Modal from "$lib/components/Modal.svelte";
    import ConfirmationModal from "$lib/components/ConfirmationModal.svelte";
    import { getItem } from "$lib/data/game-static";
    import {
        loadFactory,
        loadUnplacedMachines,
        loadUnplacedDeposits,
        getCanvasBounds,
        updateNodePosition,
        placeNode,
        createEdge,
        deleteEdge,
        unplaceNode,
        NODE_DIMENSIONS,
        type FactoryNode,
        type FactoryEdge,
    } from "$lib/services/factory";
    import { graphRefreshStore } from "$lib/stores/graphRefreshStore";
    import { machineRefreshStore } from "$lib/stores/machineRefreshStore";
    import { factoryReloadStore } from "$lib/stores/factoryReloadStore";
    import { logAnalyticsEvent } from "$lib/firebase";

    // Konva components - direct imports
    import { Stage, Layer } from "svelte-konva";
    import KonvaZoneNode from "$lib/components/konva/nodes/KonvaZoneNode.svelte";
    import KonvaMachineNode from "$lib/components/konva/nodes/KonvaMachineNode.svelte";
    import KonvaDepositNode from "$lib/components/konva/nodes/KonvaDepositNode.svelte";
    import KonvaCompanyNode from "$lib/components/konva/nodes/KonvaCompanyNode.svelte";
    import KonvaStorageNode from "$lib/components/konva/nodes/KonvaStorageNode.svelte";
    import KonvaEdge from "$lib/components/konva/edges/KonvaEdge.svelte";

    interface Company {
        id: string;
        name?: string;
        balance?: number;
        level?: number;
        location?: { lng?: number; lat?: number };
    }

    interface UnplacedMachine {
        id: string;
        machine_id: string;
    }

    interface UnplacedDeposit {
        id: string;
        ressource_id: string;
        quantity: number;
        size?: number;
    }

    let { company, readOnly = false } = $props<{
        company: Company;
        readOnly?: boolean;
    }>();

    // Share readOnly state with components via context
    setContext("factorySettings", {
        get readOnly() {
            return readOnly;
        },
    });

    // State
    let nodes = $state<FactoryNode[]>([]);
    let edges = $state<FactoryEdge[]>([]);
    let unplacedMachines = $state<UnplacedMachine[]>([]);
    let unplacedDeposits = $state<UnplacedDeposit[]>([]);
    let loading = $state(true);
    let showExploration = $state(false);
    let showMarket = $state(false);
    let showInventory = $state(false);
    let showWorkshop = $state(false);
    let showChat = $state(false);
    let showMobileSidebar = $state(false);

    // Selection state
    let selectedNodeId = $state<string | null>(null);
    let selectedEdgeId = $state<string | null>(null);

    // Delete confirmation
    let showDeleteConfirm = $state(false);
    let pendingDeleteType = $state<"node" | "edge" | null>(null);
    let pendingDeleteId = $state<string | null>(null);

    // Connection mode (mobile)
    let isConnectionMode = $state(false);
    let connectionSourceId = $state<string | null>(null);

    // Placement state
    interface PlacementSelection {
        type: "machine" | "deposit";
        id: string;
        machineId?: string;
        icon?: string;
    }
    let placingSelection = $state<PlacementSelection | null>(null);

    // Canvas/Stage state
    let stageRef = $state<any>(null);
    let containerRef = $state<HTMLDivElement | null>(null);
    let containerWidth = $state(800);
    let containerHeight = $state(600);
    let scale = $state(1);
    let stageX = $state(0);
    let stageY = $state(0);

    // Global conveyor animation clock
    let globalAnimOffset = $state(0);
    onMount(() => {
        if (!browser) return;
        let frame: number;
        const animate = () => {
            globalAnimOffset = (globalAnimOffset + 1.5) % 1000;
            frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    });

    // No longer need dynamic loading
    let isKonvaReady = $derived(browser);

    let canvasBounds = $derived(getCanvasBounds(company?.level || 1));

    // Group unplaced machines by machine_id
    interface GroupedMachine {
        machine_id: string;
        ids: string[];
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

    // Derived nodes by type for rendering order
    let zoneNodes = $derived(nodes.filter((n) => n.type === "zone"));
    let machineNodes = $derived(nodes.filter((n) => n.type === "machine"));
    let depositNodes = $derived(nodes.filter((n) => n.type === "deposit"));
    let companyNodes = $derived(nodes.filter((n) => n.type === "company"));
    let storageNodes = $derived(nodes.filter((n) => n.type === "storage"));

    // Handle resize on mount with ResizeObserver for accurate sizing
    onMount(() => {
        if (!browser) return;

        let resizeObserver: ResizeObserver | null = null;

        const updateSize = () => {
            if (containerRef) {
                containerWidth = containerRef.clientWidth;
                containerHeight = containerRef.clientHeight;
            }
        };

        // Use ResizeObserver for accurate sizing
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => {
                updateSize();
            });
            if (containerRef) {
                resizeObserver.observe(containerRef);
            }
        }

        // Initial size
        updateSize();
        // Also listen for window resize as fallback
        window.addEventListener("resize", updateSize);

        return () => {
            window.removeEventListener("resize", updateSize);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        };
    });

    // Effect to update size when containerRef becomes available
    $effect(() => {
        if (containerRef && browser) {
            containerWidth = containerRef.clientWidth || 800;
            containerHeight = containerRef.clientHeight || 600;
        }
    });

    // Track initial load
    let hasInitiallyLoaded = false;

    // Listen for factory reload events
    let lastFactoryReload: Date | null = null;
    $effect(() => {
        const reloadState = $factoryReloadStore;
        if (
            reloadState.lastReload &&
            reloadState.lastReload !== lastFactoryReload
        ) {
            lastFactoryReload = reloadState.lastReload;
            console.log(
                "[FACTORY-KONVA] Reloading due to:",
                reloadState.reason,
            );
            loadData();
        }
    });

    async function loadData() {
        if (!company?.id) return;
        try {
            const data = await loadFactory(company.id);
            nodes = data.nodes;
            edges = data.edges;
            unplacedMachines = (await loadUnplacedMachines(
                company.id,
            )) as UnplacedMachine[];
            unplacedDeposits = (await loadUnplacedDeposits(
                company.id,
            )) as UnplacedDeposit[];

            // Center view on first load
            if (!hasInitiallyLoaded && nodes.length > 0) {
                hasInitiallyLoaded = true;
                centerOnCompany();
            }
        } catch (err) {
            console.error("Failed to load factory data:", err);
        } finally {
            loading = false;
        }
    }

    function centerOnCompany() {
        const companyNode = nodes.find((n) => n.type === "company");
        if (companyNode && containerWidth && containerHeight) {
            const targetX = containerWidth / 2 - companyNode.position.x - 110;
            const targetY = containerHeight / 2 - companyNode.position.y - 140;
            stageX = targetX;
            stageY = targetY;
        }
    }

    // Effect to watch for company changes
    let lastCompanyId: string | null = null;
    $effect(() => {
        const currentId = company?.id;
        if (currentId && currentId !== lastCompanyId) {
            console.log(
                `[FACTORY-KONVA] Company changed from ${lastCompanyId} to ${currentId}`,
            );
            lastCompanyId = currentId;
            hasInitiallyLoaded = false;
            loadData();
        }
    });

    // Graph refresh effect
    let lastRefreshTime: Date | null = null;
    $effect(() => {
        const currentRefreshTime = $graphRefreshStore.lastRefresh;
        if (currentRefreshTime && currentRefreshTime !== lastRefreshTime) {
            lastRefreshTime = currentRefreshTime;
            console.log(
                "[FACTORY-KONVA] Graph refresh detected - nodes update individually",
            );
        }
    });

    // Machine refresh effect
    let lastMachineRefresh: Date | null = null;
    $effect(() => {
        const refreshEvent = $machineRefreshStore;
        if (
            refreshEvent &&
            refreshEvent.timestamp !== lastMachineRefresh &&
            company?.id
        ) {
            lastMachineRefresh = refreshEvent.timestamp;
            console.log(
                "[FACTORY-KONVA] Machine refresh triggered:",
                refreshEvent.reason,
            );
            loadUnplacedMachines(company.id).then((machines) => {
                unplacedMachines = machines as UnplacedMachine[];
            });
        }
    });

    // Zoom handling
    function handleWheel(e: any) {
        e.evt.preventDefault();
        const stage = e.target.getStage();
        const scaleBy = 1.1;
        const oldScale = scale;
        const pointer = stage.getPointerPosition();

        const mousePointTo = {
            x: (pointer.x - stageX) / oldScale,
            y: (pointer.y - stageY) / oldScale,
        };

        const direction = e.evt.deltaY > 0 ? -1 : 1;
        const newScale =
            direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
        const clampedScale = Math.max(0.1, Math.min(3, newScale));

        scale = clampedScale;
        stageX = pointer.x - mousePointTo.x * clampedScale;
        stageY = pointer.y - mousePointTo.y * clampedScale;
    }

    // Stage drag handling
    function handleStageDragEnd(e: any) {
        // More robust check to ensure we only respond to Stage drags
        const isStage = e.target.className === 'Stage' || e.target.getType?.() === 'Stage';
        if (!isStage) return;

        stageX = e.target.x();
        stageY = e.target.y();
        console.log(`[FACTORY-KONVA] Stage (camera) moved to: ${stageX}, ${stageY}`);
    }

    // Derived map for fast node lookups - used for edge positioning
    // We use $derived.by to ensure we track the individual node positions
    const nodeMap = $derived.by(() => {
        const map = new Map<string, FactoryNode>();
        for (const node of nodes) {
            // Accessing position ensures the derived tracks it for edge updates
            const _x = node.position.x;
            const _y = node.position.y;
            map.set(node.id, node);
        }
        return map;
    });

    // Real-time node drag move - updates position immediately for edge following
    function handleNodeDragMove(id: string, newX: number, newY: number) {
        const node = nodeMap.get(id);
        if (node) {
            // Check if position actually changed to avoid redundant updates
            if (node.position.x === newX && node.position.y === newY) {
                return;
            }

            // Update in-place for Svelte 5 fine-grained reactivity
            // Real-time updates are smooth for better UX
            node.position.x = newX;
            node.position.y = newY;
        }
    }

    // Node drag handling
    async function handleNodeDragEnd(id: string, newX: number, newY: number) {
        if (readOnly) {
            await loadData();
            return;
        }

        const node = nodeMap.get(id);
        if (!node) return;

        // Ensure final position is snapped
        const snappedX = Math.round(newX / 50) * 50;
        const snappedY = Math.round(newY / 50) * 50;

        const dim = NODE_DIMENSIONS[
            node.type as keyof typeof NODE_DIMENSIONS
        ] || { width: 100, height: 100 };

        // Bounds check
        const clampedX = Math.max(
            0,
            Math.min(snappedX, canvasBounds.width - dim.width),
        );
        const clampedY = Math.max(
            0,
            Math.min(snappedY, canvasBounds.height - dim.height),
        );

        console.log(
            `[FACTORY-KONVA] Node ${id} drag end: ${clampedX}, ${clampedY}`,
        );

        try {
            const success = await updateNodePosition(
                node.type as "machine" | "deposit" | "company" | "storage",
                id,
                Math.round(clampedX),
                Math.round(clampedY),
            );

            if (success) {
                // Local state already updated by handleNodeDragMove, but we ensure it's exact
                node.position.x = clampedX;
                node.position.y = clampedY;

                logAnalyticsEvent("factory_node_moved_konva", {
                    node_type: node.type,
                });
            } else {
                notifications.error("Échec de la mise à jour de la position");
                await loadData();
            }
        } catch (err) {
            console.error("Failed to update node position:", err);
            await loadData();
        }
    }

    // Node click handling
    function handleNodeClick(id: string) {
        if (isConnectionMode) {
            handleConnectionClick(id);
        } else {
            selectedNodeId = selectedNodeId === id ? null : id;
            selectedEdgeId = null;
        }
    }

    // Edge click handling
    function handleEdgeClick(id: string) {
        if (!isConnectionMode) {
            selectedEdgeId = selectedEdgeId === id ? null : id;
            selectedNodeId = null;
        }
    }

    // Connection mode handling
    function toggleConnectionMode() {
        isConnectionMode = !isConnectionMode;
        connectionSourceId = null;
        showMobileSidebar = false;

        if (isConnectionMode) {
            selectedNodeId = null;
            selectedEdgeId = null;
        }
    }

    function cancelConnectionMode() {
        isConnectionMode = false;
        connectionSourceId = null;
    }

    async function handleConnectionClick(nodeId: string) {
        if (!connectionSourceId) {
            // Select source
            const node = nodes.find((n) => n.id === nodeId);
            if (!node) return;

            if (node.type === "company") {
                notifications.error(
                    "Le Quartier Général ne peut pas être une source !",
                );
                return;
            }

            connectionSourceId = nodeId;
            selectedNodeId = nodeId;
            notifications.info(`Source: ${node.data.name || node.type}`);
        } else {
            // Select target
            if (nodeId === connectionSourceId) {
                connectionSourceId = null;
                selectedNodeId = null;
                notifications.info("Sélection annulée");
                return;
            }

            const sourceNode = nodes.find((n) => n.id === connectionSourceId);
            const targetNode = nodes.find((n) => n.id === nodeId);

            if (sourceNode && targetNode) {
                const resourceId =
                    (sourceNode.data.itemId as string) ||
                    (sourceNode.data.resourceId as string) ||
                    "";

                try {
                    const success = await createEdge(
                        sourceNode.id,
                        sourceNode.type as "machine" | "deposit",
                        targetNode.id,
                        targetNode.type as "machine" | "company" | "deposit",
                        resourceId,
                        undefined,
                        undefined,
                    );

                    if (success) {
                        logAnalyticsEvent("factory_connection_created_konva", {
                            source_type: sourceNode.type,
                            target_type: targetNode.type,
                        });

                        edges = [
                            ...edges,
                            {
                                id: success,
                                source: sourceNode.id,
                                target: targetNode.id,
                                type: "pipe",
                                data: { item: resourceId },
                            },
                        ];

                        notifications.success("Connexion établie !");
                    } else {
                        notifications.error("Échec de la connexion.");
                    }
                } catch (err: any) {
                    notifications.error("Erreur: " + (err.message || err));
                }
            }

            connectionSourceId = null;
            selectedNodeId = null;
        }
    }

    // Placement handling
    function handlePlacementSelect(
        type: "machine" | "deposit",
        id: string,
        machineId: string,
        icon: string,
    ) {
        placingSelection = { type, id, machineId, icon };
        showMobileSidebar = false;
    }

    function cancelPlacement() {
        placingSelection = null;
    }

    async function confirmPlacement() {
        if (!placingSelection) return;

        // Place at center of current view
        const centerX = (containerWidth / 2 - stageX) / scale;
        const centerY = (containerHeight / 2 - stageY) / scale;

        const nodeDim =
            placingSelection.type === "deposit"
                ? NODE_DIMENSIONS.deposit
                : NODE_DIMENSIONS.machine;

        // Grid snapping (50px) for consistent placement
        const x = Math.round((centerX - nodeDim.width / 2) / 50) * 50;
        const y = Math.round((centerY - nodeDim.height / 2) / 50) * 50;

        // Bounds check
        if (
            x < 0 ||
            y < 0 ||
            x > canvasBounds.width - nodeDim.width ||
            y > canvasBounds.height - nodeDim.height
        ) {
            notifications.error("Impossible de placer ici : Hors limites");
            return;
        }

        const success = await placeNode(
            placingSelection.type,
            placingSelection.id,
            x,
            y,
        );

        if (success) {
            placingSelection = null;
            await loadData();
        }
    }

    // Delete handling
    function handleDeleteSelection() {
        if (readOnly) {
            notifications.warning("Suppression interdite en mode visite");
            return;
        }

        if (selectedNodeId) {
            const node = nodes.find((n) => n.id === selectedNodeId);
            if (node && (node.type === "machine" || node.type === "storage")) {
                pendingDeleteType = "node";
                pendingDeleteId = selectedNodeId;
                showDeleteConfirm = true;
            }
        } else if (selectedEdgeId) {
            pendingDeleteType = "edge";
            pendingDeleteId = selectedEdgeId;
            showDeleteConfirm = true;
        }
    }

    async function confirmDelete() {
        if (!pendingDeleteId || !pendingDeleteType) return;

        if (pendingDeleteType === "node") {
            const success = await unplaceNode("machine", pendingDeleteId);
            if (success) {
                nodes = nodes.filter((n) => n.id !== pendingDeleteId);
                unplacedMachines = (await loadUnplacedMachines(
                    company.id,
                )) as UnplacedMachine[];
            }
        } else if (pendingDeleteType === "edge") {
            await deleteEdge(pendingDeleteId);
            edges = edges.filter((e) => e.id !== pendingDeleteId);
        }

        selectedNodeId = null;
        selectedEdgeId = null;
        pendingDeleteId = null;
        pendingDeleteType = null;
    }

    // Keyboard handling
    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            selectedNodeId = null;
            selectedEdgeId = null;
            showExploration = false;
            showMarket = false;
            showInventory = false;
            showWorkshop = false;
            showMobileSidebar = false;
            placingSelection = null;

            if (isConnectionMode) {
                cancelConnectionMode();
            }
        }

        if (
            (event.key === "Delete" || event.key === "Backspace") &&
            (selectedNodeId || selectedEdgeId)
        ) {
            handleDeleteSelection();
        }
    }

    // Get edge positions from node positions
    function getEdgePositions(edge: FactoryEdge): {
        sourceX: number;
        sourceY: number;
        targetX: number;
        targetY: number;
    } | null {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);

        if (!sourceNode || !targetNode) return null;

        const sourceDim = NODE_DIMENSIONS[
            sourceNode.type as keyof typeof NODE_DIMENSIONS
        ] || { width: 100, height: 100 };
        const targetDim = NODE_DIMENSIONS[
            targetNode.type as keyof typeof NODE_DIMENSIONS
        ] || { width: 100, height: 100 };

        // Source handle is on right, target handle is on left
        return {
            sourceX: sourceNode.position.x + sourceDim.width,
            sourceY: sourceNode.position.y + sourceDim.height / 2,
            targetX: targetNode.position.x,
            targetY: targetNode.position.y + targetDim.height / 2,
        };
    }

    // Zoom controls
    function zoomIn() {
        scale = Math.min(3, scale * 1.2);
    }

    function zoomOut() {
        scale = Math.max(0.1, scale / 1.2);
    }

    function resetView() {
        scale = 1;
        centerOnCompany();
    }
</script>

{#if loading}
    <div class="loading-overlay">
        <div class="spinner"></div>
        <p>Chargement de l'usine...</p>
    </div>
{:else}
    <div class="factory-root">
        <!-- Mobile Menu Toggle -->
        {#if !readOnly}
            <button
                class="md:hidden fixed top-4 left-4 z-[110] bg-[#1e293b] text-white p-3 rounded-xl border border-[#334155] shadow-lg"
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
                        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
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
        {/if}

        <!-- Toolbar -->
        {#if !readOnly}
            <div
                class="toolbar {showMobileSidebar
                    ? 'flex fixed inset-0 w-full h-full z-[100]'
                    : 'hidden'} md:flex md:static md:w-75 md:h-auto flex-col gap-8 p-6"
            >
                <div class="toolbar-header">
                    <h2>🏭 Usine</h2>
                    <span class="bounds-info"
                        >{canvasBounds.width} × {canvasBounds.height}</span
                    >
                    <button
                        class="md:hidden text-slate-400"
                        onclick={() => (showMobileSidebar = false)}
                    >
                        <span class="sr-only">Fermer</span>✕
                    </button>
                </div>

                {#if groupedUnplacedMachines.length > 0}
                    <div class="unplaced-section">
                        <h3>Machines à placer</h3>
                        <div class="unplaced-list">
                            {#each groupedUnplacedMachines as group (group.machine_id)}
                                {@const item = getItem(group.machine_id)}
                                <div
                                    class="unplaced-item"
                                    role="button"
                                    tabindex="0"
                                    onclick={() =>
                                        handlePlacementSelect(
                                            "machine",
                                            group.ids[0],
                                            group.machine_id,
                                            item?.icon || "⚙️",
                                        )}
                                    onkeydown={(e) =>
                                        e.key === "Enter" &&
                                        handlePlacementSelect(
                                            "machine",
                                            group.ids[0],
                                            group.machine_id,
                                            item?.icon || "⚙️",
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
                                        <span class="item-name"
                                            >{item?.name || "Machine"}</span
                                        >
                                        <span class="item-id"
                                            >{group.machine_id}</span
                                        >
                                    </div>
                                    {#if group.count > 1}
                                        <span class="item-count"
                                            >×{group.count}</span
                                        >
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
                            {#each unplacedDeposits as deposit (deposit.id)}
                                {@const resourceItem = getItem(
                                    deposit.ressource_id,
                                )}
                                <div
                                    class="unplaced-item deposit-item"
                                    role="button"
                                    tabindex="0"
                                    onclick={() =>
                                        handlePlacementSelect(
                                            "deposit",
                                            deposit.id,
                                            "",
                                            resourceItem?.icon || "⛏️",
                                        )}
                                    onkeydown={(e) =>
                                        e.key === "Enter" &&
                                        handlePlacementSelect(
                                            "deposit",
                                            deposit.id,
                                            "",
                                            resourceItem?.icon || "⛏️",
                                        )}
                                >
                                    <div class="item-icon deposit-icon">
                                        <GameIcon
                                            icon={resourceItem?.icon || "⛏️"}
                                            size={24}
                                            alt={resourceItem?.name ||
                                                "Gisement"}
                                        />
                                    </div>
                                    <div class="item-info">
                                        <span class="item-name"
                                            >{resourceItem?.name ||
                                                "Gisement"}</span
                                        >
                                        <span class="item-id"
                                            >Qté: {deposit.quantity.toLocaleString()}</span
                                        >
                                    </div>
                                    <span class="item-count size-badge"
                                        >Niv.{deposit.size}</span
                                    >
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
                            class="action-btn chat full-width"
                            onclick={() => {
                                showChat = true;
                                showMobileSidebar = false;
                            }}
                        >
                            <span class="btn-icon">💬</span>
                            <span class="btn-label">Messagerie</span>
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
                        <span>{machineNodes.length}</span>
                    </div>
                    <div class="stat-row">
                        <span>Gisements</span>
                        <span>{depositNodes.length}</span>
                    </div>
                    <div class="stat-row">
                        <span>Connexions</span>
                        <span>{edges.length}</span>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Canvas Container -->
        <div class="canvas-wrapper" bind:this={containerRef}>
            {#if isKonvaReady}
                <Stage
                    width={containerWidth}
                    height={containerHeight}
                    draggable={true}
                    scaleX={scale}
                    scaleY={scale}
                    x={stageX}
                    y={stageY}
                    onwheel={handleWheel}
                    ondragend={handleStageDragEnd}
                    bind:this={stageRef}
                >
                    <Layer>
                        <!-- Zone background -->
                        <KonvaZoneNode
                            width={canvasBounds.width}
                            height={canvasBounds.height}
                            level={company?.level || 1}
                        />

                        <!-- Edges (render first, under nodes) -->
                        {#each edges as edge (edge.id)}
                            {@const positions = getEdgePositions(edge)}
                            {#if positions}
                                <KonvaEdge
                                    id={edge.id}
                                    sourceX={positions.sourceX}
                                    sourceY={positions.sourceY}
                                    targetX={positions.targetX}
                                    targetY={positions.targetY}
                                    selected={selectedEdgeId === edge.id}
                                    resourceColor="#fbbf24"
                                    animOffset={globalAnimOffset}
                                    onClick={handleEdgeClick}
                                />
                            {/if}
                        {/each}

                        <!-- Deposit Nodes -->
                        {#each depositNodes as node (node.id)}
                            <KonvaDepositNode
                                nodeData={{
                                    id: node.id,
                                    resourceId:
                                        (node.data.resourceId as string) || "",
                                    name:
                                        (node.data.name as string) ||
                                        "Gisement",
                                    icon: (node.data.icon as string) || "⛏️",
                                    quantity:
                                        (node.data.quantity as number) || 0,
                                    size: node.data.size as number,
                                }}
                                x={node.position.x}
                                y={node.position.y}
                                selected={selectedNodeId === node.id}
                                draggable={!readOnly}
                                onDragMove={handleNodeDragMove}
                                onDragEnd={handleNodeDragEnd}
                                onClick={handleNodeClick}
                            />
                        {/each}

                        <!-- Machine Nodes -->
                        {#each machineNodes as node (node.id)}
                            <KonvaMachineNode
                                nodeData={{
                                    id: node.id,
                                    name:
                                        (node.data.name as string) || "Machine",
                                    icon: (node.data.icon as string) || "⚙️",
                                    itemId: node.data.itemId as string,
                                    progress:
                                        (node.data.progress as number) || 0,
                                }}
                                x={node.position.x}
                                y={node.position.y}
                                selected={selectedNodeId === node.id}
                                draggable={!readOnly}
                                onDragMove={handleNodeDragMove}
                                onDragEnd={handleNodeDragEnd}
                                onClick={handleNodeClick}
                            />
                        {/each}

                        <!-- Storage Nodes -->
                        {#each storageNodes as node (node.id)}
                            <KonvaStorageNode
                                nodeData={{
                                    id: node.id,
                                    name:
                                        (node.data.name as string) ||
                                        "Stockage",
                                    icon: (node.data.icon as string) || "📦",
                                    capacity: node.data.capacity as number,
                                    used: node.data.used as number,
                                }}
                                x={node.position.x}
                                y={node.position.y}
                                selected={selectedNodeId === node.id}
                                draggable={!readOnly}
                                onDragMove={handleNodeDragMove}
                                onDragEnd={handleNodeDragEnd}
                                onClick={handleNodeClick}
                            />
                        {/each}

                        <!-- Company Node (render last, on top) -->
                        {#each companyNodes as node (node.id)}
                            <KonvaCompanyNode
                                nodeData={{
                                    id: node.id,
                                    name:
                                        (node.data.name as string) ||
                                        company?.name ||
                                        "SIÈGE SOCIAL",
                                    level:
                                        (node.data.level as number) ||
                                        company?.level ||
                                        1,
                                    balance: company?.balance || 0,
                                    isOwn: !readOnly,
                                }}
                                x={node.position.x}
                                y={node.position.y}
                                selected={selectedNodeId === node.id}
                                draggable={!readOnly}
                                onDragMove={handleNodeDragMove}
                                onDragEnd={handleNodeDragEnd}
                                onClick={handleNodeClick}
                            />
                        {/each}
                    </Layer>
                </Stage>
            {:else}
                <div class="konva-loading">
                    <div class="spinner"></div>
                    <p>Chargement du canvas...</p>
                </div>
            {/if}

            <!-- Zoom Controls -->
            <div class="zoom-controls">
                <button class="zoom-btn" onclick={zoomIn} title="Zoom In"
                    >+</button
                >
                <button class="zoom-btn" onclick={zoomOut} title="Zoom Out"
                    >−</button
                >
                <button class="zoom-btn" onclick={resetView} title="Reset View"
                    >⌂</button
                >
            </div>

            <!-- Stats Overlay -->
            <div class="stats-overlay">
                <div class="glass-pill balance-pill">
                    <span class="pill-icon">💰</span>
                    <span class="pill-value"
                        >{company?.balance?.toLocaleString() || 0} $</span
                    >
                </div>
            </div>
        </div>

        <!-- Connection Mode Overlay -->
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
                            Sélectionnez la <span class="text-blue-400"
                                >Source</span
                            >
                        {:else}
                            Sélectionnez la <span class="text-emerald-400"
                                >Destination</span
                            >
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

        <!-- Placement Overlay -->
        {#if placingSelection}
            <div
                class="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
            >
                <div
                    class="relative w-32 h-32 flex flex-col items-center justify-center pointer-events-none"
                >
                    <div
                        class="absolute inset-0 border-2 border-dashed border-white/30 rounded-lg animate-pulse"
                    ></div>
                    <div
                        class="text-6xl filter drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    >
                        {#if placingSelection.icon}
                            <GameIcon
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

                <div
                    class="fixed bottom-32 left-0 w-full flex items-center justify-center gap-8 pointer-events-auto"
                >
                    <button
                        onclick={cancelPlacement}
                        aria-label="Annuler le placement"
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
                            ><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
                        >
                    </button>
                    <button
                        onclick={confirmPlacement}
                        aria-label="Confirmer le placement"
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
                            stroke-linejoin="round"
                            ><path d="M20 6 9 17l-5-5" /></svg
                        >
                    </button>
                </div>

                <div
                    class="fixed top-24 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700 text-white px-6 py-3 rounded-full shadow-xl pointer-events-auto text-center text-sm font-bold animate-bounce-in"
                >
                    Déplacez la carte pour positionner
                </div>
            </div>
        {/if}

        <!-- Selection Action Bar -->
        {#if selectedNodeId || selectedEdgeId}
            {@const selectedNode = selectedNodeId
                ? nodes.find((n) => n.id === selectedNodeId)
                : null}
            <div
                class="fixed bottom-0 left-0 w-full z-40 bg-[#1e293b] border-t border-[#334155] p-4 pr-24 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] flex items-center justify-between animate-slide-up"
            >
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-lg bg-[#0f172a] border border-[#334155] flex items-center justify-center"
                    >
                        <span class="text-xl">
                            {#if selectedNode}
                                {#if selectedNode.type === "machine"}⚙️
                                {:else if selectedNode.type === "deposit"}⛏️
                                {:else if selectedNode.type === "company"}🏢
                                {:else if selectedNode.type === "storage"}📦
                                {:else}📍{/if}
                            {:else if selectedEdgeId}🔗
                            {:else}📍{/if}
                        </span>
                    </div>
                    <div>
                        <h3
                            class="font-bold text-white text-sm uppercase tracking-wider"
                        >
                            {#if selectedNode}
                                {selectedNode.data?.name || selectedNode.type}
                            {:else if selectedEdgeId}
                                Connexion
                            {/if}
                        </h3>
                        <p class="text-xs text-slate-400">
                            {#if selectedNode}
                                {Math.round(selectedNode.position.x)}, {Math.round(
                                    selectedNode.position.y,
                                )}
                            {:else if selectedEdgeId}
                                Transfert de ressources
                            {/if}
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    {#if (selectedNode && (selectedNode.type === "machine" || selectedNode.type === "storage")) || selectedEdgeId}
                        <button
                            onclick={handleDeleteSelection}
                            class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 hover:bg-red-500/20 active:scale-95 transition-all"
                            aria-label="Supprimer la sélection"
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
                                /><path
                                    d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
                                /></svg
                            >
                        </button>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
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

{#if showChat}
    <Modal
        title="<span class='text-2xl'>💬</span> Messagerie Générale"
        onClose={() => (showChat = false)}
    >
        <ChatView />
    </Modal>
{/if}

<ConfirmationModal
    bind:isOpen={showDeleteConfirm}
    title="Supprimer cet élément ?"
    message="Vous allez supprimer cet élément. Cette action est irréversible."
    confirmLabel="Supprimer"
    cancelLabel="Annuler"
    isDestructive={true}
    onConfirm={confirmDelete}
/>

<style>
    .factory-root {
        display: flex;
        flex: 1;
        width: 100%;
        height: 100%;
        min-height: 0;
        position: relative;
    }

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

    .loading-overlay p,
    .konva-loading p {
        margin-top: 16px;
        color: #94a3b8;
        font-weight: 500;
    }

    .konva-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: #0f172a;
    }

    .toolbar {
        background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
        border-right: 2px solid #334155;
        overflow-y: auto;
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
        z-index: 20;
        position: relative;
    }

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

    .unplaced-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: linear-gradient(135deg, #1e293b 0%, #172033 100%);
        border: 1px solid #334155;
        border-radius: 8px;
        cursor: pointer;
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
        background: #0f392b;
        color: #34d399;
        border-color: #059669;
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
        background: #020617;
        overflow: hidden;
    }

    .zoom-controls {
        position: absolute;
        bottom: 24px;
        left: 24px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        z-index: 10;
    }

    .zoom-btn {
        width: 36px;
        height: 36px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        color: #e2e8f0;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .zoom-btn:hover {
        background: #334155;
        border-color: #475569;
    }

    .stats-overlay {
        position: absolute;
        top: 96px;
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

    .action-btn.chat {
        background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
        box-shadow:
            0 4px 0 #312e81,
            0 8px 16px rgba(0, 0, 0, 0.4);
    }

    @keyframes animate-bounce-in {
        0% {
            transform: scale(0.9) translateX(-50%);
            opacity: 0;
        }
        50% {
            transform: scale(1.02) translateX(-50%);
        }
        100% {
            transform: scale(1) translateX(-50%);
            opacity: 1;
        }
    }

    @keyframes animate-slide-up {
        from {
            transform: translateY(100%);
        }
        to {
            transform: translateY(0);
        }
    }
</style>
