<script lang="ts">
  import {
    Handle,
    Position,
    type Node,
    type NodeProps,
    NodeToolbar,
  } from "@xyflow/svelte";
  import { untrack } from "svelte";
  import DepositEmployeePanel from "$lib/components/machine/DepositEmployeePanel.svelte";
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
  let unsubscribe: () => void;

  // Initialize from data on mount
  $effect(() => {
    currentQuantity = data.quantity || 0;
  });

  const quantityPercent = $derived(
    currentQuantity ? Math.min(100, (currentQuantity / 10000) * 100) : 0
  );

  $effect(() => {
    // Initial data load for quantity even if not selected
    loadRealtimeData();

    // Subscribe to deposit updates
    pb.collection("deposits")
      .subscribe(id, (e) => {
        if (e.action === "update") {
          const newQty = e.record.quantity;
          if (typeof newQty === "number") {
            currentQuantity = newQty;
            // Update internal record if loaded
            if (depositRecord) {
              depositRecord.quantity = newQty;
              depositRecord.last_harvest_at = e.record.last_harvest_at;
              depositRecord.harvested = e.record.harvested;
            }
          }
        }
      })
      .then((unsub) => (unsubscribe = unsub));

    return () => {
      if (unsubscribe) unsubscribe();
    };
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

          <DepositEmployeePanel
            deposit={depositRecord}
            {availableEmployees}
            isLoading={panelLoading}
            onLoadingChange={(l) => (panelLoading = l)}
            onDepositUpdate={handleDepositUpdate}
            onRefresh={refreshAvailableEmployees}
          />
        </div>
      {:else}
        <p class="text-xs text-red-400">Erreur chargement</p>
      {/if}
    </div>
  </NodeToolbar>

  <div class="node-content">
    <span class="icon">{data.icon}</span>
    <span class="name">{data.name}</span>

    {#if currentQuantity !== undefined}
      <div class="quantity-bar">
        <div class="quantity-fill" style="width: {quantityPercent}%"></div>
      </div>
      <span class="quantity-text">{currentQuantity?.toLocaleString()}</span>
    {/if}
  </div>

  <!-- Mining Progress Bar -->
  {#if depositRecord?.last_harvest_at && miningProgress > 0}
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" style="width: {miningProgress}%"></div>
      </div>
    </div>
  {/if}

  <Handle type="source" position={Position.Right} />
</div>

<style>
  .deposit-node {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 2px solid #10b981;
    border-radius: 12px;
    padding: 12px 16px;
    width: 140px;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    color: #e2e8f0;
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
    transition: all 0.2s ease;
    position: relative;
    overflow: visible;
  }

  /* .deposit-node.selected {
    border-color: #34d399;
    box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.5), 0 8px 30px rgba(52, 211, 153, 0.2);
  } */

  .deposit-node:hover {
    border-color: #34d399;
    box-shadow: 0 6px 24px rgba(16, 185, 129, 0.4);
    transform: translateY(-2px);
  }

  .node-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .icon {
    font-size: 24px;
  }

  .name {
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    max-width: 100px;
  }

  .quantity-bar {
    width: 80px;
    height: 4px;
    background: #334155;
    border-radius: 2px;
    overflow: hidden;
  }

  .quantity-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #34d399);
    transition: width 0.3s ease;
  }

  .quantity-text {
    font-size: 9px;
    color: #94a3b8;
  }

  .progress-container {
    position: absolute;
    bottom: 4px;
    left: 4px;
    right: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
    z-index: 3;
  }

  .progress-bar {
    flex: 1;
    height: 3px;
    background: rgba(30, 41, 59, 0.8);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #34d399);
    transition: width 0.1s linear;
  }
</style>
