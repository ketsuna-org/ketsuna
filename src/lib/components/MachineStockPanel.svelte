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
    onAssign: (itemId: string, quantity: number) => Promise<void>;
  } = $props();

  let quantities = $state<Record<string, number>>({});
  let installing = $state<Record<string, boolean>>({});
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
    <div
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 relative z-10"
    >
      {#each availableStock as inv (inv.id)}
        {@const maxQty = inv.quantity || 1}
        <div
          class="bg-slate-950/50 border border-indigo-500/30 rounded-lg p-3 flex flex-col gap-2 shadow-sm hover:border-indigo-400 transition-colors"
        >
          <div class="flex justify-between items-start">
            <span class="font-semibold text-sm text-indigo-100 truncate"
              >{inv.expand?.item?.name || "Machine"}</span
            >
            <span
              class="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded border border-indigo-500/10"
              >Stock: {maxQty}</span
            >
          </div>

          <div class="flex items-center gap-2 mt-auto">
            <input
              type="number"
              min="1"
              max={maxQty}
              disabled={installing[inv.id]}
              class="w-16 bg-slate-900 border border-slate-700 rounded text-center text-sm py-1 focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50"
              bind:value={quantities[inv.id]}
              placeholder="1"
            />
            <button
              disabled={installing[inv.id]}
              class="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-1.5 rounded transition-colors flex justify-center items-center gap-1"
              onclick={async () => {
                const qty = quantities[inv.id] || 1;
                if (qty > 0 && qty <= maxQty && !installing[inv.id]) {
                  installing[inv.id] = true;
                  try {
                    await onAssign(inv.item, qty);
                    quantities[inv.id] = 1;
                  } finally {
                    installing[inv.id] = false;
                  }
                }
              }}
            >
              {#if installing[inv.id]}
                <span
                  class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"
                ></span>
              {:else}
                Installer
              {/if}
            </button>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
