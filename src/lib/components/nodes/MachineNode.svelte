<script lang="ts">
  import {
    Handle,
    Position,
    type Node,
    type NodeProps,
    NodeToolbar,
  } from "@xyflow/svelte";
  import GameIcon from "$lib/components/GameIcon.svelte";
  import pb, { type Machine } from "$lib/pocketbase";
  import { gamedataStore } from "$lib/stores/gamedataStore";
  import { calculateProductionProgress } from "$lib/graph/lazyCalculator";
  import { getRecipe, getItem, getAllRecipes } from "$lib/data/game-static";
  import { sellMachine } from "$lib/services/factory";
  import ConfirmationModal from "$lib/components/ConfirmationModal.svelte";
  import { factoryReloadStore } from "$lib/stores/factoryReloadStore";
  import { getContext } from "svelte";

  // Get factory settings from context (readOnly mode)
  const factorySettings = getContext<{ readOnly: boolean }>(
    "factorySettings"
  ) || { readOnly: false };

  type MachineNode = Node<
    {
      itemId?: string;
      name: string;
      icon: string;
      placed: boolean;
    },
    "machine"
  >;

  interface Props extends NodeProps<MachineNode> {
    onSold?: (id: string) => void;
  }

  let { id, data, selected, onSold }: Props = $props();

  let machineRecord = $state<Machine | null>(null);
  let loading = $state(false);
  let productionProgress = $state(0);
  let savingRecipe = $state(false);
  let selling = $state(false);
  let showSellConfirm = $state(false);

  // Get machine definition from static data
  let machineDef = $derived.by(() => {
    if (!machineRecord?.machine_id) return null;
    return gamedataStore.getItem(machineRecord.machine_id);
  });

  // Is this an extractor (no recipe, has product)?
  let isExtractor = $derived(machineDef?.product && !machineDef?.use_recipe);

  // Get compatible recipes for this machine type
  let compatibleRecipes = $derived.by(() => {
    if (!machineRecord?.machine_id) return [];
    const machineId = machineRecord.machine_id;
    return getAllRecipes().filter((r) => r.machine_type === machineId);
  });

  // Current active recipe (from machine record or default)
  let activeRecipe = $derived.by(() => {
    if (!machineRecord) return null;
    const recipeId = machineRecord.active_recipe || machineDef?.use_recipe;
    return recipeId ? getRecipe(recipeId) : null;
  });

  import { onMount, untrack } from "svelte";

  // Load data ONCE on mount
  onMount(() => {
    // We use untrack just to be absolutely safe, though onMount shouldn't track anyway
    untrack(() => {
      loadData();
    });
  });

  async function loadData() {
    if (loading) return;
    loading = true;
    try {
      const m = await pb.collection("machines").getOne<Machine>(id);
      machineRecord = m;
    } catch (e) {
      console.error("Failed to load machine data", e);
    } finally {
      loading = false;
    }
  }

  async function changeRecipe(recipeId: string) {
    if (!machineRecord || savingRecipe) return;
    savingRecipe = true;
    try {
      await pb.collection("machines").update(machineRecord.id, {
        active_recipe: recipeId,
      });
      await loadData();
    } catch (e) {
      console.error("Failed to change recipe", e);
    } finally {
      savingRecipe = false;
    }
  }

  function handleSellClick() {
    if (selling) return;
    showSellConfirm = true;
  }

  async function confirmSell() {
    selling = true;
    try {
      const success = await sellMachine(id);
      if (success) {
        onSold?.(id);
        factoryReloadStore.triggerReload("machine_sold");
      }
    } catch (e) {
      console.error("Failed to sell machine", e);
    } finally {
      selling = false;
    }
  }

  // Client-side Simulation Only:
  // We do NOT reload data from server automatically to avoid infinite loops.
  // The progress bar is calculated mathematically based on start time.
  // Data is only refreshed if the user interacts (e.g. changing recipe).

  // Visual Animation Loop (runs continuously for smooth progress bar)
  $effect(() => {
    const animationInterval = setInterval(() => {
      // Calculate progress using existing data (no fetch here)
      if (!machineRecord?.production_started_at || !machineDef) {
        productionProgress = 0;
        return;
      }

      const result = calculateProductionProgress(
        machineRecord as unknown as Parameters<
          typeof calculateProductionProgress
        >[0],
        machineDef as unknown as Parameters<
          typeof calculateProductionProgress
        >[1],
        [],
        new Date(machineRecord.production_started_at)
      );

      productionProgress = result.progressPercent;
    }, 100);

    return () => clearInterval(animationInterval);
  });
</script>

<div class="machine-node" title={data.name} class:selected>
  <NodeToolbar isVisible={selected} position={Position.Top} align="center">
    <div
      class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 w-72 backdrop-blur-md"
    >
      <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <span class="text-lg">⚙️</span> Production
      </h3>

      {#if loading}
        <div class="flex justify-center py-4">
          <div
            class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"
          ></div>
        </div>
      {:else if machineRecord && machineDef}
        <div
          class="text-xs text-slate-300 space-y-2 bg-slate-800/50 p-3 rounded-lg"
        >
          {#if isExtractor}
            <!-- Extractor Stats -->
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Type:</span>
              <span class="font-medium text-amber-400">Extracteur</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Produit:</span>
              <span class="font-medium text-white">
                {getItem(machineDef.product)?.name || machineDef.product}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Quantité/cycle:</span>
              <span class="font-mono text-emerald-400"
                >{machineDef.product_quantity ||
                  machineDef.ProductQuantity ||
                  1}</span
              >
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Temps de cycle:</span>
              <span class="font-mono text-emerald-400"
                >{machineDef.production_time ||
                  machineDef.ProductionTime ||
                  60}s</span
              >
            </div>
          {:else}
            <!-- Recipe Machine -->
            {#if compatibleRecipes.length > 1}
              <div class="space-y-1">
                <span class="text-slate-400 text-[10px] uppercase"
                  >Recette Active:</span
                >
                <select
                  class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                  value={machineRecord.active_recipe ||
                    machineDef?.use_recipe ||
                    ""}
                  disabled={savingRecipe}
                  onchange={(e) => changeRecipe(e.currentTarget.value)}
                >
                  {#each compatibleRecipes as r (r.id)}
                    <option value={r.id}>{r.name}</option>
                  {/each}
                </select>
              </div>
            {:else if activeRecipe}
              <div class="flex justify-between items-center">
                <span class="text-slate-400">Recette:</span>
                <span class="font-medium text-white">{activeRecipe.name}</span>
              </div>
            {/if}

            {#if activeRecipe}
              <div class="flex justify-between items-center">
                <span class="text-slate-400">Cycle:</span>
                <span class="font-mono text-emerald-400"
                  >{activeRecipe.production_time}s</span
                >
              </div>

              {#if activeRecipe.inputs?.length}
                <div class="pt-1">
                  <span class="text-slate-500 block mb-1 text-[10px] uppercase"
                    >Entrées:</span
                  >
                  <div class="flex flex-wrap gap-1">
                    {#each activeRecipe.inputs as input, i (i)}
                      {@const inputItem = getItem(input.item || input.item_id)}
                      <span
                        class="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-[10px]"
                      >
                        {input.quantity}x {inputItem?.name || input.item}
                      </span>
                    {/each}
                  </div>
                </div>
              {/if}

              <div class="pt-1 border-t border-slate-700/50 mt-1">
                <span class="text-slate-500 block mb-1 text-[10px] uppercase"
                  >Sorties:</span
                >
                <div class="flex flex-wrap gap-1">
                  <span
                    class="bg-emerald-950/30 border border-emerald-900/50 text-emerald-300 px-1.5 py-0.5 rounded text-[10px]"
                  >
                    {activeRecipe.output_quantity}x {getItem(
                      activeRecipe.output_item
                    )?.name || activeRecipe.output_item}
                  </span>
                </div>
              </div>
            {:else}
              <p class="text-slate-500 text-center py-2">Aucune recette</p>
            {/if}
          {/if}
        </div>
      {:else}
        <p class="text-xs text-red-400">Erreur chargement</p>
      {/if}

      <!-- Sell Button (hidden in read-only mode) -->
      {#if !factorySettings.readOnly}
        <div class="pt-2 border-t border-slate-700/50 mt-2">
          <button
            class="w-full bg-red-900/50 hover:bg-red-800/70 border border-red-700/50 text-red-300 text-xs font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            onclick={handleSellClick}
            disabled={selling}
          >
            {#if selling}
              <span class="animate-spin">⏳</span> Vente...
            {:else}
              <span>💰</span> Vendre pour 1 ₭
            {/if}
          </button>
        </div>
      {/if}
    </div>
  </NodeToolbar>

  <Handle type="target" position={Position.Left} class="handle target" />

  <!-- Industrial Structure -->
  <div class="structure-container">
    <div class="platform"></div>
    <div class="block-body">
      <div class="face-left"></div>
      <div class="face-right"></div>
      <div class="face-top"></div>

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

<ConfirmationModal
  bind:isOpen={showSellConfirm}
  title="Vendre cette machine ?"
  message="Vous allez vendre cette machine pour <strong>1 ₭</strong>. Cette action est irréversible."
  confirmLabel="Vendre"
  cancelLabel="Annuler"
  isDestructive={true}
  onConfirm={confirmSell}
/>

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

  .block-body {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    width: 160px;
    height: 180px;
  }

  .face-left {
    position: absolute;
    top: 10px;
    left: -12px;
    width: 14px;
    height: 180px;
    background: #1e3a8a;
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
    background: #3b82f6;
    border: 2px solid #1e3a8a;
    right: -15px !important;
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
  }

  :global(.handle.target) {
    background: #ef4444;
    border: 2px solid #991b1b;
    left: -15px !important;
    box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
  }
</style>
