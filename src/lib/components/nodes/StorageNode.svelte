<script lang="ts">
  import {
    Handle,
    Position,
    type Node,
    type NodeProps,
    NodeToolbar,
  } from "@xyflow/svelte";
  import GameIcon from "$lib/components/GameIcon.svelte";
  import { gamedataStore } from "$lib/stores/gamedataStore";
  import pb from "$lib/pocketbase";
  import type { InventoryItem } from "$lib/pocketbase";

  type StorageNode = Node<
    {
      itemId?: string;
      name: string;
      icon: string;
      placed: boolean;
    },
    "storage"
  >;

  let { id, data, selected }: NodeProps<StorageNode> = $props();

  let storageRecord = $state<any>(null);
  let loading = $state(false);
  let capacity = $state(0);
  let usedCapacity = $state(0);
  let unsubscribe: () => void;

  async function loadStorageInventory() {
    try {
      const records = await pb
        .collection("inventory")
        .getList<InventoryItem>(1, 1, {
          filter: `linked_storage = "${id}"`,
        });
      if (records.items.length > 0) {
        usedCapacity = Math.floor(records.items[0].quantity);
      } else {
        usedCapacity = 0;
      }
    } catch (err) {
      console.error("Failed to load storage inventory", err);
    }
  }

  // Load storage data when selected or mounted
  $effect(() => {
    if (data.itemId) {
      const machineData = gamedataStore.getItem(data.itemId);
      capacity = machineData?.metadata?.storage_capacity || 1000;

      loadStorageInventory();

      // Subscribe to changes
      pb.collection("inventory")
        .subscribe("*", (e) => {
          if (e.record.linked_storage === id) {
            if (e.action === "delete") {
              usedCapacity = 0;
            } else {
              // Ensure we're reading quantity correctly even if record structure varies
              usedCapacity = Math.floor((e.record as any).quantity || 0);
            }
          }
        })
        .then((unsub) => (unsubscribe = unsub));

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  });
</script>

<div class="storage-node" title={data.name} class:selected>
  <NodeToolbar isVisible={selected} position={Position.Top} align="center">
    <div
      class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 w-72 backdrop-blur-md"
    >
      <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <span class="text-lg">📦</span> Stockage
      </h3>

      <!-- Storage Stats -->
      <div class="space-y-2">
        <!-- Capacity -->
        <div
          class="bg-slate-800/50 border border-slate-600/30 rounded-lg p-2 space-y-1"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-300">📊 Capacité:</span>
            <span class="text-xs font-bold text-cyan-400">
              {usedCapacity} / {capacity}
            </span>
          </div>
          <div class="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              class="h-full transition-all duration-300 bg-cyan-500"
              style="width: {capacity > 0
                ? (usedCapacity / capacity) * 100
                : 0}%"
            ></div>
          </div>
        </div>

        <!-- Storage Type Info -->
        <div class="bg-slate-800/50 border border-slate-600/30 rounded-lg p-2">
          <div class="text-xs text-slate-300">
            <p class="font-medium mb-1">ℹ️ Information:</p>
            <p class="text-slate-400 text-[10px]">
              Les entrepôts ne nécessitent pas de durabilité ou d'énergie. Ils
              stockent automatiquement les items.
            </p>
          </div>
        </div>
      </div>
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
          <div class="status-light active"></div>
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

          <div class="capacity-display">
            <span class="cap-label">STOCKAGE</span>
            <div class="cap-bar">
              <div
                class="cap-fill"
                style="width: {capacity > 0
                  ? (usedCapacity / capacity) * 100
                  : 0}%"
              ></div>
            </div>
            <span class="cap-value">{usedCapacity} / {capacity}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <Handle type="source" position={Position.Right} class="handle source" />
</div>

<style>
  .storage-node {
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
    background: #0e7490; /* Cyan 700 */
    border: 1px solid #164e63;
    transform: skewY(-10deg);
  }

  .face-right {
    position: absolute;
    top: 10px;
    right: -12px;
    width: 14px;
    height: 180px;
    background: #155e75;
    border: 1px solid #083344;
    transform: skewY(10deg);
  }

  .face-top {
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 160px;
    height: 16px;
    background: #22d3ee;
    border: 2px solid #06b6d4;
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
    background: #06b6d4;
    box-shadow: 0 0 8px #06b6d4;
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

  .capacity-display {
    width: 100%;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 4px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .cap-label {
    font-size: 9px;
    color: #94a3b8;
    font-weight: 600;
  }

  .cap-bar {
    width: 100%;
    height: 4px;
    background: #0f172a;
    border-radius: 2px;
    overflow: hidden;
  }

  .cap-fill {
    height: 100%;
    background: #22d3ee;
    box-shadow: 0 0 4px #22d3ee;
    transition: width 0.3s ease;
  }

  .cap-value {
    font-size: 10px;
    color: #22d3ee;
    text-align: right;
    font-family: monospace;
  }

  :global(.handle) {
    background: #06b6d4;
    border: 2px solid #164e63;
    width: 10px;
    height: 10px;
  }

  :global(.handle.source) {
    right: -15px !important;
  }

  :global(.handle.target) {
    left: -15px !important;
  }
</style>
