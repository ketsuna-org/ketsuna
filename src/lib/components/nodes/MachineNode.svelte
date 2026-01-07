<script lang="ts">
  import {
    Handle,
    Position,
    type Node,
    type NodeProps,
    NodeToolbar,
  } from "@xyflow/svelte";
  import { untrack } from "svelte";
  import GameIcon from "$lib/components/GameIcon.svelte";
  import MachineEmployeePanel from "$lib/components/machine/MachineEmployeePanel.svelte";
  import pb, { type Machine, type Employee } from "$lib/pocketbase";
  import { activeCompany } from "$lib/stores";
  import { notifications } from "$lib/notifications";

  type MachineNode = Node<
    {
      itemId?: string;
      name: string;
      icon: string;
      placed: boolean;
    },
    "machine"
  >;

  let { id, data, selected }: NodeProps<MachineNode> = $props();

  let machineRecord = $state<Machine | null>(null);
  let availableEmployees = $state<Employee[]>([]);
  let loading = $state(false);
  let panelLoading = $state(false);

  // Load data when node is selected
  $effect(() => {
    // Track dependencies explicitly
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
      // 1. Fetch Machine details (with employees)
      // 1. Fetch Machine details
      const m = await pb.collection("machines").getOne<Machine>(id);

      // Fetch assigned employees
      const assignedEmps = await pb.collection("employees").getFullList({
        filter: `machine = '${id}'`,
      });

      // Manually attach for compatibility
      if (!m.expand) m.expand = {};
      m.expand.employees = assignedEmps;

      machineRecord = m;

      // 2. Fetch Available Employees from the backend endpoint
      const response = await pb.send("/api/employees/available", {
        method: "GET",
      });
      availableEmployees = response.items || [];
    } catch (e) {
      console.error("Failed to load machine data", e);
    } finally {
      loading = false;
    }
  }

  function handleMachineUpdate() {
    loadData(); // Reload to refresh list
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

<div class="machine-node" title={data.name} class:selected>
  <NodeToolbar isVisible={selected} position={Position.Top} align="center">
    <div
      class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 w-72 backdrop-blur-md"
    >
      <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <span class="text-lg">👥</span> Personnel
      </h3>
      {#if loading}
        <div class="flex justify-center py-4">
          <div
            class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"
          ></div>
        </div>
      {:else if machineRecord}
        <MachineEmployeePanel
          machine={machineRecord}
          {availableEmployees}
          busyEmployeeIds={new Set()}
          isLoading={panelLoading}
          onLoadingChange={(l) => (panelLoading = l)}
          onMachineUpdate={handleMachineUpdate}
          onRefresh={refreshAvailableEmployees}
        />
      {:else}
        <p class="text-xs text-red-400">Erreur chargement</p>
      {/if}
    </div>
  </NodeToolbar>

  <Handle type="target" position={Position.Left} />

  <div class="node-content" class:has-image={data.icon?.startsWith("/")}>
    {#if data.icon?.startsWith("/")}
      <div class="image-wrapper">
        <GameIcon icon={data.icon} size={140} alt={data.name} />
      </div>
    {:else}
      <div class="icon-wrapper">
        <GameIcon icon={data.icon} size={32} alt={data.name} />
      </div>
      <span class="name">{data.name}</span>
    {/if}
  </div>

  <Handle type="source" position={Position.Right} />
</div>

<style>
  .machine-node {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 2px solid #3b82f6;
    border-radius: 12px;
    padding: 0; /* Full bleed for images */
    width: 140px;
    height: 140px; /* Square aspect ratio */
    display: flex;
    flex-direction: column;
    justify-content: center;
    color: #e2e8f0;
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
    transition: all 0.2s ease;
    position: relative;
    overflow: visible; /* Allow toolbar to be seen if strictly inside, but NodeToolbar is portal usually */
  }

  /* .machine-node.selected {
    border-color: #f43f5e;
    box-shadow: 0 0 0 2px rgba(244, 63, 94, 0.5), 0 8px 30px rgba(244, 63, 94, 0.2);
  } */

  .machine-node:hover {
    border-color: #60a5fa;
    box-shadow: 0 6px 24px rgba(59, 130, 246, 0.4);
    transform: translateY(-2px);
  }

  .node-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    overflow: hidden; /* Keep content clipped to rounded corners */
  }

  /* Style for standard emoji icons */
  .icon-wrapper {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 8px;
    margin: 0 auto 6px auto; /* Center with margin */
  }

  /* Center content when no image */
  .node-content:not(.has-image) {
    padding: 12px;
  }

  /* Style for full-size image icons */
  .image-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .name {
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    z-index: 2;
  }
</style>
