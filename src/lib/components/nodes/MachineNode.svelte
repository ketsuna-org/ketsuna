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
  import { gamedataStore } from "$lib/stores/gamedataStore";
  import { calculateProductionProgress } from "$lib/graph/lazyCalculator";
  import { getRecipe, getItem, getAllRecipes } from "$lib/data/game-static";

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
  let productionProgress = $state(0);
  let estimatedProduced = $state(0);
  let savingRecipe = $state(false);

  // Get compatible recipes for this machine type
  let compatibleRecipes = $derived.by(() => {
    if (!machineRecord?.machine_id) return [];
    const machineId = machineRecord.machine_id;
    return getAllRecipes().filter((r) => r.machine_type === machineId);
  });

  // Current active recipe (from machine record or default)
  let activeRecipe = $derived.by(() => {
    if (!machineRecord) return null;
    const recipeId =
      machineRecord.active_recipe ||
      gamedataStore.getItem(machineRecord.machine_id)?.use_recipe;
    return recipeId ? getRecipe(recipeId) : null;
  });

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

  async function changeRecipe(recipeId: string) {
    if (!machineRecord || savingRecipe) return;
    savingRecipe = true;
    try {
      await pb.collection("machines").update(machineRecord.id, {
        active_recipe: recipeId,
      });
      // Reload to reflect change
      await loadData();
    } catch (e) {
      console.error("Failed to change recipe", e);
    } finally {
      savingRecipe = false;
    }
  }

  // Real-time production progress using Graph Economy calculations
  $effect(() => {
    const interval = setInterval(() => {
      if (!machineRecord?.production_started_at) {
        productionProgress = 0;
        estimatedProduced = 0;
        return;
      }

      // Get machine data from gamedata store
      const machineData = gamedataStore.getItem(machineRecord.machine_id);
      const assignedEmployees = machineRecord.expand?.employees || [];

      // Use lazy calculator for accurate calculations
      const result = calculateProductionProgress(
        machineRecord as any,
        machineData as any,
        assignedEmployees as any[],
        new Date(machineRecord.production_started_at)
      );

      productionProgress = result.progressPercent;
      estimatedProduced = result.estimatedProduced;
    }, 100); // Update 10 times per second for smooth animation

    return () => clearInterval(interval);
  });
</script>

<div class="machine-node" title={data.name} class:selected>
  <NodeToolbar isVisible={selected} position={Position.Top} align="center">
    <div
      class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 w-72 backdrop-blur-md"
    >
      <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <span class="text-lg">👥</span> Personnel
      </h3>

      <!-- Machine Stats Display -->

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

        <!-- Machine Specs / Recipe Info -->
        {#if machineRecord.machine_id}
          {#if activeRecipe || compatibleRecipes.length > 0}
            {@const recipe = activeRecipe}
            {@const outItem = recipe ? getItem(recipe.output_item) : null}
            <div class="mt-4 pt-4 border-t border-slate-700">
              <h3
                class="text-sm font-bold text-white mb-2 flex items-center gap-2"
              >
                <span class="text-lg">⚙️</span> Production
              </h3>

              <div
                class="text-xs text-slate-300 space-y-2 bg-slate-800/50 p-3 rounded-lg"
              >
                <!-- Recipe Selector (if multiple recipes available) -->
                {#if compatibleRecipes.length > 1}
                  <div class="space-y-1">
                    <span class="text-slate-400 text-[10px] uppercase"
                      >Recette Active:</span
                    >
                    <select
                      class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                      value={machineRecord.active_recipe ||
                        gamedataStore.getItem(machineRecord.machine_id)
                          ?.use_recipe ||
                        ""}
                      disabled={savingRecipe}
                      onchange={(e) => changeRecipe(e.currentTarget.value)}
                    >
                      {#each compatibleRecipes as r (r.id)}
                        <option value={r.id}>{r.name}</option>
                      {/each}
                    </select>
                  </div>
                {:else if recipe}
                  <div class="flex justify-between items-center">
                    <span class="text-slate-400">Recette:</span>
                    <span class="font-medium text-white">{recipe.name}</span>
                  </div>
                {/if}

                {#if recipe}
                  <div class="flex justify-between items-center">
                    <span class="text-slate-400">Cycle:</span>
                    <span class="font-mono text-emerald-400"
                      >{recipe.production_time}s</span
                    >
                  </div>

                  <!-- Inputs -->
                  {#if recipe.inputs?.length}
                    <div class="pt-1">
                      <span
                        class="text-slate-500 block mb-1 text-[10px] uppercase"
                        >Entrées:</span
                      >
                      <div class="flex flex-wrap gap-1">
                        {#each recipe.inputs as input}
                          {@const inputItem = getItem(
                            input.item || input.item_id
                          )}
                          <!-- item is safer, item_id from go wrapper -->
                          <span
                            class="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-[10px]"
                          >
                            {input.quantity}x {inputItem?.name || input.item}
                          </span>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  <!-- Outputs -->
                  <div class="pt-1 border-t border-slate-700/50 mt-1">
                    <span
                      class="text-slate-500 block mb-1 text-[10px] uppercase"
                      >Sorties:</span
                    >
                    <div class="flex flex-wrap gap-1">
                      <span
                        class="bg-emerald-950/30 border border-emerald-900/50 text-emerald-300 px-1.5 py-0.5 rounded text-[10px]"
                      >
                        {recipe.output_quantity}x {outItem?.name ||
                          recipe.output_item}
                      </span>
                    </div>
                  </div>
                {:else}
                  <p class="text-slate-500 text-center py-2">
                    Aucune recette sélectionnée
                  </p>
                {/if}
              </div>
            </div>
          {/if}
        {/if}
      {:else}
        <p class="text-xs text-red-400">Erreur chargement</p>
      {/if}
    </div>
  </NodeToolbar>

  <Handle type="target" position={Position.Left} class="handle target" />

  <!-- Industrial Structure -->
  <div class="structure-container">
    <div class="platform"></div>
    <div class="block-body">
      <!-- Faces -->
      <div class="face-left"></div>
      <div class="face-right"></div>
      <div class="face-top"></div>

      <!-- Front Content -->
      <div class="face-front">
        <div class="face-header">
          <div class="status-light" class:active={productionProgress > 0}></div>
          <div class="rivet-row">
            <div class="rivet"></div>
            <div class="rivet"></div>
          </div>
        </div>

        <div class="content-wrapper">
          <div class="icon-frame">
            {#if data.icon?.startsWith("/")}
              <GameIcon icon={data.icon} size={64} alt={data.name} />
            {:else}
              <GameIcon icon={data.icon} size={32} alt={data.name} />
            {/if}
          </div>
          <span class="name">{data.name}</span>
        </div>

        <!-- Production Progress Bar -->
        {#if machineRecord?.production_started_at && productionProgress > 0}
          <div class="operation-bar">
            <div class="op-fill" style="width: {productionProgress}%"></div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <Handle type="source" position={Position.Right} class="handle source" />
</div>

<style>
  .machine-node {
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
    background: #1e3a8a; /* Dark blue */
    border: 1px solid #172554;
    transform: skewY(-10deg);
  }

  .face-right {
    position: absolute;
    top: 10px;
    right: -12px;
    width: 14px;
    height: 180px;
    background: #172554;
    border: 1px solid #0f172a;
    transform: skewY(10deg);
  }

  .face-top {
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 160px;
    height: 16px;
    background: #60a5fa;
    border: 2px solid #3b82f6;
    z-index: 2;
    border-radius: 2px;
  }

  .face-front {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
    border: 2px solid #334155;
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
    background: #334155;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  .status-light.active {
    background: #3b82f6;
    box-shadow: 0 0 8px #3b82f6;
  }

  .rivet-row {
    display: flex;
    gap: 4px;
  }

  .rivet {
    width: 4px;
    height: 4px;
    background: #475569;
    border-radius: 50%;
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, 1);
  }

  .content-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  .icon-frame {
    width: 64px;
    height: 64px;
    background: radial-gradient(circle, #334155, #1e293b);
    border: 2px solid #475569;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .name {
    font-size: 11px;
    font-weight: 700;
    color: #cbd5e1;
    text-transform: uppercase;
    text-align: center;
    max-width: 140px;
    line-height: 1.2;
  }

  .operation-bar {
    margin-top: auto;
    width: 100%;
    height: 4px;
    background: #334155;
    overflow: hidden;
    border-radius: 2px;
  }

  .op-fill {
    height: 100%;
    background: #fbbf24;
    box-shadow: 0 0 4px #fbbf24;
  }

  :global(.handle) {
    width: 10px;
    height: 10px;
  }

  :global(.handle.source) {
    background: #3b82f6; /* Blue for output */
    border: 2px solid #1e3a8a;
    right: -15px !important;
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
  }

  :global(.handle.target) {
    background: #ef4444; /* Red for input */
    border: 2px solid #991b1b;
    left: -15px !important;
    box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
  }
</style>
