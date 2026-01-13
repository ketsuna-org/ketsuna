<script lang="ts">
  import {
    Handle,
    Position,
    type Node,
    type NodeProps,
    NodeToolbar,
  } from "@xyflow/svelte";
  import { untrack } from "svelte";
  import pb, { type Employee } from "$lib/pocketbase";
  import { activeCompany } from "$lib/stores";
  import { calculateMiningProgress } from "$lib/graph/lazyCalculator";

  type DepositNode = Node<
    {
      resourceId?: string;
      name: string;
      icon: string;
      quantity?: number;
      placed: boolean;
    },
    "deposit"
  >;

  let { id, data, selected }: NodeProps<DepositNode> = $props();

  // State for assignments
  let depositRecord = $state<any>(null);
  let availableEmployees = $state<Employee[]>([]);
  let loading = $state(false);
  let panelLoading = $state(false);
  let miningProgress = $state(0);
  let estimatedHarvested = $state(0);
  let currentQuantity = $state(0); // Local state for realtime updates

  // Initialize from data on mount
  $effect(() => {
    currentQuantity = data.quantity || 0;
  });

  const quantityPercent = $derived(
    currentQuantity ? Math.min(100, (currentQuantity / 10000) * 100) : 0
  );

  $effect(() => {
    // Initial data load for quantity
    loadRealtimeData();
  });

  $effect(() => {
    if (selected) {
      $activeCompany; // Depend on company changes
      id; // Depend on ID changes
      untrack(() => loadData());
    }
  });

  async function loadRealtimeData() {
    try {
      const rec = await pb
        .collection("deposits")
        .getOne(id, { fields: "quantity,last_harvest_at,harvested" });
      currentQuantity = rec.quantity;
      if (depositRecord) {
        depositRecord.last_harvest_at = rec.last_harvest_at;
        depositRecord.harvested = rec.harvested;
      }
    } catch (e) {
      console.error("Failed to load deposit realtime", e);
    }
  }

  async function loadData() {
    if (loading) return;
    loading = true;
    try {
      // Fetch deposit details with employees
      // Fetch deposit details
      const dep = await pb.collection("deposits").getOne(id);

      // Fetch assigned employees
      const assignedEmps = await pb.collection("employees").getFullList({
        filter: `deposit = '${id}'`,
      });

      // Manually attach to expand for compatibility
      if (!dep.expand) dep.expand = {};
      (dep.expand as any).employees = assignedEmps;

      depositRecord = dep;

      // Fetch available employees from the backend endpoint
      const response = await pb.send("/api/employees/available", {
        method: "GET",
      });
      availableEmployees = response.items || [];
    } catch (e) {
      console.error("Failed to load deposit data", e);
    } finally {
      loading = false;
    }
  }

  function handleDepositUpdate() {
    loadData();
  }

  async function refreshAvailableEmployees() {
    try {
      const response = await pb.send("/api/employees/available", {
        method: "GET",
      });
      availableEmployees = response.items || [];
    } catch (e) {
      console.error("Failed to refresh employees", e);
    }
  }

  async function handleHarvest() {
    if (!depositRecord || !depositRecord.id) return;
    panelLoading = true;
    try {
      await pb.send("/api/deposits/harvest", {
        method: "POST",
        body: { depositId: depositRecord.id },
      });
      await loadData(); // Refresh to show 0 harvested
    } catch (e: any) {
      console.error("Failed to harvest", e);
      alert(e.message || "Erreur lors de la récolte");
    } finally {
      panelLoading = false;
    }
  }

  // Real-time mining progress using Graph Economy calculations
  $effect(() => {
    const interval = setInterval(() => {
      if (!depositRecord?.last_harvest_at) {
        miningProgress = 0;
        estimatedHarvested = 0;
        return;
      }

      const assignedEmployees = depositRecord.expand?.employees || [];
      if (assignedEmployees.length === 0) {
        miningProgress = 0;
        estimatedHarvested = 0;
        return;
      }

      // Use lazy calculator for accurate calculations
      const result = calculateMiningProgress(
        depositRecord,
        assignedEmployees,
        new Date(depositRecord.last_harvest_at)
      );

      miningProgress = result.progressPercent;
      estimatedHarvested = result.estimatedYield;
    }, 100); // Update 10 times per second

    return () => clearInterval(interval);
  });
</script>

<div class="deposit-node" class:selected>
  <NodeToolbar isVisible={selected} position={Position.Top} align="center">
    <div
      class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 w-72 backdrop-blur-md"
    >
      <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <span class="text-lg">⛏️</span> Personnel
      </h3>
      {#if loading}
        <div class="flex justify-center py-4">
          <div
            class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"
          ></div>
        </div>
      {:else if depositRecord}
        <div class="space-y-3">
          {#if depositRecord.harvested && depositRecord.harvested > 0}
            <div
              class="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 space-y-2"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-amber-200"
                  >⛏️ Récolté:</span
                >
                <span class="text-sm font-bold text-amber-400"
                  >{depositRecord.harvested.toLocaleString()}</span
                >
              </div>
              <button
                onclick={handleHarvest}
                disabled={panelLoading}
                class="w-full py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
              >
                🫣 Récolter
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <p class="text-xs text-red-400">Erreur chargement</p>
      {/if}
    </div>
  </NodeToolbar>

  <!-- Industrial Structure -->
  <div class="structure-container">
    <!-- Base Platform -->
    <div class="platform"></div>

    <!-- Main Block -->
    <div class="block-body">
      <!-- Faces -->
      <div class="face-left"></div>
      <div class="face-right"></div>
      <div class="face-top"></div>

      <!-- Front Content -->
      <div class="face-front">
        <div class="face-header">
          <div class="status-light" class:active={miningProgress > 0}></div>
          <div class="rivet-row">
            <div class="rivet"></div>
            <div class="rivet"></div>
          </div>
        </div>

        <div class="content-wrapper">
          <div class="icon-display">
            <span class="icon">{data.icon}</span>
          </div>

          <div class="info-panel">
            <span class="name">{data.name}</span>
            {#if currentQuantity !== undefined}
              <div class="gauge-container">
                <div class="gauge-fill" style="width: {quantityPercent}%"></div>
              </div>
              <span class="qty-text">{currentQuantity?.toLocaleString()}</span>
            {/if}
          </div>
        </div>

        <!-- Progress Bar (Mining) -->
        {#if depositRecord?.last_harvest_at && miningProgress > 0}
          <div class="operation-bar">
            <div class="op-fill" style="width: {miningProgress}%"></div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <Handle type="source" position={Position.Right} class="handle" />
</div>

<style>
  .deposit-node {
    position: relative;
    width: 200px;
    height: 240px;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4));
  }

  .structure-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  /* Platform */
  .platform {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 180px;
    height: 16px;
    background: #1a1b1f;
    border: 2px solid #2a2b2f;
    border-radius: 4px;
  }

  /* Block Body */
  .block-body {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    width: 160px;
    height: 180px;
  }

  /* Faces */
  .face-left {
    position: absolute;
    top: 10px;
    left: -12px;
    width: 14px;
    height: 180px;
    background: #064e3b; /* Dark emerald */
    border: 1px solid #022c22;
    transform: skewY(-10deg);
  }

  .face-right {
    position: absolute;
    top: 10px;
    right: -12px;
    width: 14px;
    height: 180px;
    background: #022c22;
    border: 1px solid #011c16;
    transform: skewY(10deg);
  }

  .face-top {
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 160px;
    height: 16px;
    background: #34d399;
    border: 2px solid #10b981;
    z-index: 2;
    border-radius: 2px;
  }

  .face-front {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
    border: 2px solid #374151;
    border-radius: 4px;
    z-index: 3;
    display: flex;
    flex-direction: column;
    padding: 12px;
    gap: 8px;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
  }

  /* Details */
  .face-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .status-light {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #374151;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  .status-light.active {
    background: #10b981;
    box-shadow: 0 0 8px #10b981;
  }

  .rivet-row {
    display: flex;
    gap: 4px;
  }

  .rivet {
    width: 4px;
    height: 4px;
    background: #4b5563;
    border-radius: 50%;
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, 1);
  }

  .content-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .icon-display {
    width: 48px;
    height: 48px;
    background: radial-gradient(circle, #374151, #1f2937);
    border: 2px solid #4b5563;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .icon {
    font-size: 24px;
    filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.5));
  }

  .info-panel {
    width: 100%;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 4px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .name {
    font-size: 10px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
  }

  .qty-text {
    font-family: monospace;
    font-size: 12px;
    color: #10b981;
    font-weight: 700;
  }

  .gauge-container {
    width: 100%;
    height: 4px;
    background: #1f2937;
    border-radius: 2px;
    overflow: hidden;
  }

  .gauge-fill {
    height: 100%;
    background: #10b981;
    box-shadow: 0 0 4px rgba(16, 185, 129, 0.5);
  }

  .operation-bar {
    margin-top: auto;
    width: 100%;
    height: 3px;
    background: #374151;
    overflow: hidden;
  }

  .op-fill {
    height: 100%;
    background: #fbbf24;
    box-shadow: 0 0 4px #fbbf24;
  }

  :global(.handle) {
    background: #3b82f6; /* Blue for output */
    border: 2px solid #1e3a8a;
    width: 10px;
    height: 10px;
    right: -15px !important;
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
  }
</style>
