<script lang="ts">
  import {
    Handle,
    Position,
    type Node,
    type NodeProps,
    NodeToolbar,
  } from "@xyflow/svelte";
  import pb from "$lib/pocketbase";
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

  let depositRecord = $state<any>(null);
  let loading = $state(false);
  let currentQuantity = $state(0);

  // Initialize from data on mount
  $effect(() => {
    currentQuantity = data.quantity || 0;
  });

  const quantityPercent = $derived(
    currentQuantity ? Math.min(100, (currentQuantity / 10000) * 100) : 0
  );

  // Track if initial load is done
  let initialLoadDone = false;

  // Load data ONCE on mount
  $effect(() => {
    if (initialLoadDone) return;
    initialLoadDone = true;
    loadData();
  });

  import { lastProductionTick } from "$lib/services/productionHeartbeat";

  // Periodic refresh via Heartbeat
  $effect(() => {
    if ($lastProductionTick > 0) {
      // Reload only quantity when heartbeats
      pb.collection("deposits")
        .getOne(id, { fields: "quantity,ressource_id" })
        .then((rec) => {
          currentQuantity = rec.quantity;
          if (depositRecord) {
            depositRecord.quantity = rec.quantity;
          }
        })
        .catch(() => {});
    }
  });

  async function loadData() {
    if (loading) return;
    loading = true;
    try {
      const dep = await pb.collection("deposits").getOne(id);
      depositRecord = dep;
      currentQuantity = dep.quantity;
    } catch (e) {
      console.error("Failed to load deposit data", e);
    } finally {
      loading = false;
    }
  }
</script>

<div class="deposit-node" class:selected>
  <NodeToolbar isVisible={selected} position={Position.Top} align="center">
    <div
      class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 w-64 backdrop-blur-md"
    >
      <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <span class="text-lg">⛏️</span> Gisement
      </h3>
      {#if loading}
        <div class="flex justify-center py-4">
          <div
            class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"
          ></div>
        </div>
      {:else if depositRecord}
        <div
          class="text-xs text-slate-300 space-y-2 bg-slate-800/50 p-3 rounded-lg"
        >
          <div class="flex justify-between items-center">
            <span class="text-slate-400">Ressource:</span>
            <span class="font-medium text-white">{data.name}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-400">Quantité:</span>
            <span class="font-mono text-emerald-400"
              >{Math.floor(currentQuantity).toLocaleString()}</span
            >
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-400">Taille:</span>
            <span class="font-mono text-amber-400"
              >Niv. {depositRecord.size || 1}</span
            >
          </div>

          <!-- Quantity gauge -->
          <div class="pt-2">
            <div class="gauge-full">
              <div class="gauge-bar" style="width: {quantityPercent}%"></div>
            </div>
          </div>
        </div>
      {:else}
        <p class="text-xs text-red-400">Erreur chargement</p>
      {/if}
    </div>
  </NodeToolbar>

  <!-- Industrial Structure -->
  <div class="structure-container">
    <div class="platform"></div>
    <div class="block-body">
      <div class="face-left"></div>
      <div class="face-right"></div>
      <div class="face-top"></div>

      <div class="face-front">
        <div class="face-header">
          <div class="status-light" class:active={currentQuantity > 0}></div>
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
    background: #064e3b;
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

  .gauge-full {
    width: 100%;
    height: 6px;
    background: #1f2937;
    border-radius: 3px;
    overflow: hidden;
  }

  .gauge-bar {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #34d399);
    border-radius: 3px;
  }

  :global(.handle) {
    background: #3b82f6;
    border: 2px solid #1e3a8a;
    width: 10px;
    height: 10px;
    right: -15px !important;
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
  }
</style>
