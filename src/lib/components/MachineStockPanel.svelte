<script lang="ts">
  /**
   * MachineStockPanel - Displays available machines in stock that can be installed
   * Allows clicking to assign a machine from inventory to active production.
   */
  import type { InventoryItem } from "$lib/pocketbase";

  let {
    availableStock,
    onAssign,
  }: {
    availableStock: InventoryItem[];
    onAssign: (itemId: string) => void;
  } = $props();
</script>

{#if availableStock.length > 0}
  <div
    class="mb-6 p-5 bg-linear-to-r from-slate-900 to-slate-800 border border-indigo-500/20 rounded-xl shadow-lg relative overflow-hidden"
  >
    <div class="absolute top-0 right-0 p-3 opacity-10">
      <span class="text-6xl">🏭</span>
    </div>
    <div class="flex items-center justify-between mb-4 relative z-10">
      <div class="text-base text-white font-bold flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        Machines en stock ({availableStock.length})
      </div>
      <div
        class="text-xs text-slate-400 font-medium bg-slate-950/50 px-3 py-1 rounded-full border border-slate-700"
      >
        Cliquez pour installer
      </div>
    </div>
    <div class="flex flex-wrap gap-2 relative z-10">
      {#each availableStock as inv (inv.id)}
        <button
          class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold rounded-lg border border-indigo-400/30 transition-all shadow-md hover:shadow-indigo-500/20 flex items-center gap-2"
          onclick={() => onAssign(inv.item)}
        >
          <span>🏗️</span>
          {inv.expand?.item?.name || "Machine"}
          <span class="bg-black/20 px-1.5 py-0.5 rounded text-xs ml-1"
            >x{inv.quantity}</span
          >
        </button>
      {/each}
    </div>
  </div>
{/if}
