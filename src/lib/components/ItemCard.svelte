<script lang="ts">
  import type { InventoryItem } from "$lib/pocketbase";
  import { sellItem } from "$lib/services/inventory";
  import { createEventDispatcher } from "svelte";

  let { inventoryItem } = $props<{ inventoryItem: InventoryItem }>();
  const dispatch = createEventDispatcher();

  // Determine item details from expanded relation
  let item = $derived(inventoryItem.expand?.item);

  // Vente
  let qtyToSell = $state(1);
  let selling = $state(false);
  let error = $state<string | null>(null);
  let lastSale = $state<{
    revenue: number;
    unitSellPrice: number;
    techGain: number;
  } | null>(null);

  async function onSell() {
    error = null;
    lastSale = null;
    if (!item) return;
    if (qtyToSell <= 0) return;
    if (qtyToSell > inventoryItem.quantity) {
      error = "Quantité supérieure au stock";
      return;
    }
    selling = true;
    try {
      const res = await sellItem(inventoryItem.item, qtyToSell);
      lastSale = res;
      dispatch("sold");
    } catch (e: any) {
      error = e?.message || "Erreur lors de la vente";
    } finally {
      selling = false;
    }
  }

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
          {(inventoryItem.quantity * item.base_price).toLocaleString()}€
        </p>
      </div>
    </div>

    <div class="mt-4 border-t border-slate-700 pt-3">
      <div class="flex items-center gap-2">
        <input
          type="number"
          min="1"
          max={inventoryItem.quantity}
          bind:value={qtyToSell}
          class="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
        />
        <button
          class="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm disabled:opacity-50"
          onclick={onSell}
          disabled={selling ||
            qtyToSell <= 0 ||
            qtyToSell > inventoryItem.quantity}
        >
          {selling ? "Vente..." : "Vendre"}
        </button>
        {#if item}
          <span class="text-slate-400 text-sm"
            >{Math.round((item.base_price / 2) * 100) / 100} /u</span
          >
        {/if}
      </div>
      {#if error}
        <div class="text-red-400 text-xs mt-1">{error}</div>
      {/if}
      {#if lastSale}
        <div class="text-slate-400 text-xs mt-1">
          +{lastSale.revenue.toLocaleString()}€ • +{lastSale.techGain} TP
        </div>
      {/if}
    </div>
  {:else}
    <div class="text-red-500">Item data missing</div>
  {/if}
</div>
