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
      <div class="capacity-badge">
        {usedCapacity}/{capacity}
      </div>
    {/if}
  </div>

  <Handle type="source" position={Position.Right} />
</div>

<style>
  .storage-node {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 2px solid #06b6d4;
    border-radius: 12px;
    padding: 0;
    width: 140px;
    height: 140px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    color: #e2e8f0;
    box-shadow: 0 4px 20px rgba(6, 182, 212, 0.3);
    transition: all 0.2s ease;
    position: relative;
    overflow: visible;
  }

  .storage-node:hover {
    border-color: #22d3ee;
    box-shadow: 0 6px 24px rgba(6, 182, 212, 0.4);
    transform: translateY(-2px);
  }

  .node-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .icon-wrapper {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(6, 182, 212, 0.1);
    border-radius: 8px;
    margin: 0 auto 6px auto;
  }

  .node-content:not(.has-image) {
    padding: 12px;
  }

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
    margin-bottom: 4px;
  }

  .capacity-badge {
    font-size: 10px;
    color: #22d3ee;
    font-weight: 700;
    background: rgba(6, 182, 212, 0.2);
    padding: 2px 8px;
    border-radius: 8px;
    border: 1px solid rgba(6, 182, 212, 0.3);
  }
</style>
