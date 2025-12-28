<script lang="ts">
  import type { InventoryItem } from "$lib/types";

  let { inventoryItem } = $props<{ inventoryItem: InventoryItem }>();

  // Determine item details from expanded relation
  let item = $derived(inventoryItem.expand?.item);

  function getTypeColor(type: string | undefined) {
    switch (type) {
      case "Ressource Brute":
        return "text-amber-400";
      case "Composant":
        return "text-blue-400";
      case "Produit Fini":
        return "text-purple-400";
      default:
        return "text-slate-400";
    }
  }
</script>

<div
  class="bg-slate-800 p-4 rounded-lg shadow border border-slate-700 hover:border-slate-600 transition-all"
>
  {#if item}
    <div class="flex justify-between items-start mb-2">
      <h3 class="font-bold text-white text-lg">{item.name}</h3>
      <span
        class="text-xs uppercase font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 {getTypeColor(
          item.type
        )}"
      >
        {item.type}
      </span>
    </div>

    <div class="flex justify-between items-end mt-4">
      <div>
        <p class="text-slate-500 text-xs">Quantité</p>
        <p class="text-2xl font-mono text-white">{inventoryItem.quantity}</p>
      </div>
      <div class="text-right">
        <p class="text-slate-500 text-xs text-right">Valeur Estimée</p>
        <p class="text-emerald-400 font-mono">
          ${(inventoryItem.quantity * item.base_price).toLocaleString()}
        </p>
      </div>
    </div>
  {:else}
    <div class="text-red-500">Item data missing</div>
  {/if}
</div>
