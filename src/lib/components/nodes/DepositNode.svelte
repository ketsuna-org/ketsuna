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

  const quantityPercent = $derived(
    data.quantity ? Math.min(100, (data.quantity / 10000) * 100) : 0
  );

  // State for assignments
  let depositRecord = $state<any>(null);
  let availableEmployees = $state<Employee[]>([]);
  let loading = $state(false);
  let panelLoading = $state(false);

  $effect(() => {
    if (selected) {
      $activeCompany; // Depend on company changes
      id; // Depend on ID changes
      untrack(() => loadData());
    }
  });

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
      dep.expand.employees = assignedEmps;

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
        <DepositEmployeePanel
          deposit={depositRecord}
          {availableEmployees}
          isLoading={panelLoading}
          onLoadingChange={(l) => (panelLoading = l)}
          onDepositUpdate={handleDepositUpdate}
          onRefresh={refreshAvailableEmployees}
        />
      {:else}
        <p class="text-xs text-red-400">Erreur chargement</p>
      {/if}
    </div>
  </NodeToolbar>

  <div class="node-content">
    <span class="icon">{data.icon}</span>
    <span class="name">{data.name}</span>

    {#if data.quantity !== undefined}
      <div class="quantity-bar">
        <div class="quantity-fill" style="width: {quantityPercent}%"></div>
      </div>
      <span class="quantity-text">{data.quantity?.toLocaleString()}</span>
    {/if}
  </div>

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
</style>
