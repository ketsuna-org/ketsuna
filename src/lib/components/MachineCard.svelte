<script lang="ts">
  import type { Item, Company } from "$lib/pocketbase";
  import { buyItem } from "$lib/services/market";
  import { notifications } from "$lib/notifications";
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";

  interface Props {
    machine: Item;
    balance?: number;
    companyId?: string;
    onPurchase?: (() => void) | null;
  }

  let {
    machine,
    balance = 0,
    companyId = "",
    onPurchase = null,
  }: Props = $props();

  let isLoading = $state(false);

  // Use derived state for reactivity
  let canBuy = $derived(balance >= (machine.base_price || 0) && !!companyId);

  async function handleBuy() {
    if (!canBuy) return;

    isLoading = true;
    try {
      await buyItem(companyId, machine, 1);
      // Refresh activeCompany store to reflect balance changes
      const updated = await pb
        .collection("companies")
        .getOne<Company>(companyId);
      activeCompany.set(updated);
      notifications.success(`✨ ${machine.name} achetée !`);
      onPurchase?.();
    } catch (error: any) {
      notifications.error(`Erreur: ${error.message}`);
    } finally {
      isLoading = false;
    }
  }
</script>

<div
  class="border border-slate-700/50 rounded-2xl p-6 bg-slate-900/50 backdrop-blur-sm hover:border-indigo-500/50 hover:bg-slate-900/80 transition-all hover:shadow-xl hover:shadow-indigo-500/10 group"
>
  <!-- Header -->
  <div class="mb-4">
    <h3
      class="text-xl font-bold text-white mb-1 tracking-tight flex items-center gap-2"
    >
      <span class="p-2 bg-slate-800 rounded-lg text-lg">🤖</span>
      {machine.name}
    </h3>
    <p class="text-xs text-slate-400 font-medium ml-1">Machine de production</p>
  </div>

  <!-- Machine Specs -->
  <div
    class="mb-5 space-y-3 p-4 bg-slate-950/30 rounded-xl border border-slate-800/50"
  >
    <!-- Price -->
    <div class="flex items-center justify-between">
      <span
        class="text-xs text-slate-400 uppercase tracking-wider font-semibold"
        >Prix</span
      >
      <span class="text-lg font-bold text-white"
        >{machine.base_price || 0}€</span
      >
    </div>

    <!-- Produces Item -->
    {#if machine.product}
      <div class="flex items-center justify-between">
        <span
          class="text-xs text-slate-400 uppercase tracking-wider font-semibold"
          >Production</span
        >
        <span
          class="text-sm text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded"
        >
          {machine.product_quantity || 1} / cycle
        </span>
      </div>
    {/if}

    <!-- Volatility -->
    {#if machine.volatility}
      <div class="flex items-center justify-between">
        <span
          class="text-xs text-slate-400 uppercase tracking-wider font-semibold"
          >Volatilité</span
        >
        <span class="text-sm text-amber-400 font-bold"
          >{(machine.volatility * 100).toFixed(1)}%</span
        >
      </div>
    {/if}
  </div>

  <!-- Status and Action -->
  <div class="pt-2">
    <div class="mb-3">
      {#if !canBuy}
        <div
          class="text-xs text-red-400 font-medium flex items-center gap-1 bg-red-500/10 p-2 rounded-lg border border-red-500/20"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><circle cx="12" cy="12" r="10" /><line
              x1="12"
              y1="8"
              x2="12"
              y2="12"
            /><line x1="12" y1="16" x2="12.01" y2="16" /></svg
          >
          {#if balance < (machine.base_price || 0)}
            Fonds insuffisants ({balance}€ / {machine.base_price || 0}€)
          {:else}
            Action impossible
          {/if}
        </div>
      {/if}
    </div>

    <button
      onclick={handleBuy}
      disabled={!canBuy || isLoading}
      class="w-full px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg
            {canBuy && !isLoading
        ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-indigo-500/20 hover:shadow-indigo-500/30 border border-indigo-400/20'
        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}"
    >
      {#if isLoading}
        <span
          class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
        ></span>
        Traitement...
      {:else}
        <span>💳</span> Acheter pour {machine.base_price || 0}€
      {/if}
    </button>
  </div>
</div>
