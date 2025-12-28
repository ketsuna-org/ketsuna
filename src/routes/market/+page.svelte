<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { fade, fly, scale } from "svelte/transition";
  import { buyItem, fetchMarketItems, type Item } from "$lib/services/market";
  import { fetchDashboardData, type DashboardData } from "$lib/dashboard";
  import { notifications } from "$lib/notifications";
  import pb from "$lib/pocketbase";
  import StatCard from "$lib/components/StatCard.svelte";

  let items: Item[] = $state([]);
  let dashboardData: DashboardData | null = $state(null);
  let loading = $state(true);
  let buyingId = $state("");
  let filter = $state("All");
  let error = $state("");
  let quantities: Record<string, number> = $state({});

  onMount(async () => {
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) throw new Error("Non connecté");

      [items, dashboardData] = await Promise.all([
        fetchMarketItems(),
        fetchDashboardData(userId),
      ]);
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  });

  const filteredItems = $derived(
    filter === "All" ? items : items.filter((i) => i.type === filter),
  );

  function getQuantity(itemId: string): number {
    return quantities[itemId] || 1;
  }

  function setQuantity(itemId: string, value: number) {
    quantities[itemId] = Math.max(1, value);
  }

  async function handleBuy(item: Item) {
    if (!dashboardData) return;
    buyingId = item.id;
    error = "";

    try {
      const userId = pb.authStore.model?.id;
      const activeCompanyId = pb.authStore.model?.active_company;

      if (!userId || !activeCompanyId) {
        throw new Error("Entreprise ou utilisateur introuvable");
      }

      const quantity = getQuantity(item.id);
      await buyItem(activeCompanyId, item, quantity);
      notifications.success(
        `✨ ${quantity}x ${item.name} achetée${quantity > 1 ? "s" : ""} !`,
      );
      // Reset quantity to 1
      quantities[item.id] = 1;
      // Refresh dashboard to show new balance
      dashboardData = await fetchDashboardData(userId);
    } catch (err: any) {
      error = err.message;
      notifications.error(`Erreur: ${err.message}`);
    } finally {
      buyingId = "";
    }
  }

  function formatCurrency(val: number) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(val);
  }
</script>

<div class="min-h-screen bg-slate-950 text-slate-200 p-6">
  <div class="max-w-7xl mx-auto space-y-8">
    <!-- Header -->
    <header
      class="flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div class="flex items-center gap-4">
        <button
          onclick={() => goto("/dashboard")}
          class="text-slate-400 hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          ← Tableau de bord
        </button>
        <div>
          <h1 class="text-4xl font-black text-white tracking-tight">
            Marché Global
          </h1>
          <p class="text-slate-400 mt-1">
            Équipez votre entreprise avec les meilleurs composants.
          </p>
        </div>
      </div>

      {#if dashboardData}
        <div
          class="bg-slate-900/50 border border-white/10 p-4 rounded-2xl flex items-center gap-4 backdrop-blur-xl"
        >
          <div
            class="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              ><line x1="12" y1="1" x2="12" y2="23"></line><path
                d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
              ></path></svg
            >
          </div>
          <div>
            <p class="text-[10px] text-slate-500 uppercase font-bold">
              Solde Actuel
            </p>
            <p class="text-xl font-mono font-black text-white">
              {formatCurrency(dashboardData.financials.cash)}
            </p>
          </div>
        </div>
      {/if}
    </header>

    {#if error}
      <div
        transition:fade
        class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-sm flex items-center gap-3"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><circle cx="12" cy="12" r="10"></circle><line
            x1="12"
            y1="8"
            x2="12"
            y2="12"
          ></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg
        >
        {error}
      </div>
    {/if}

    <!-- Filters -->
    <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {#each ["All", "Ressource Brute", "Composant", "Machine"] as type}
        <button
          onclick={() => (filter = type)}
          class="px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap {filter ===
          type
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
            : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}"
        >
          {type === "All" ? "Tout" : type}
        </button>
      {/each}
    </div>

    {#if loading}
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {#each Array(8) as _}
          <div class="h-64 bg-slate-900/50 rounded-3xl animate-pulse"></div>
        {/each}
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {#each filteredItems as item (item.id)}
          <div
            transition:fly={{ y: 20, duration: 400 }}
            class="group bg-slate-900 border border-white/5 rounded-3xl p-6 transition-all hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col justify-between"
          >
            <div>
              <div class="flex justify-between items-start mb-4">
                <div
                  class="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform"
                >
                  {#if item.type === "Machine"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><path
                        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
                      ></path></svg
                    >
                  {:else if item.type === "Ressource Brute"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><path
                        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                      ></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"
                      ></polyline><line x1="12" y1="22.08" x2="12" y2="12"
                      ></line></svg
                    >
                  {:else}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><rect x="2" y="7" width="20" height="14" rx="2" ry="2"
                      ></rect><path
                        d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
                      ></path></svg
                    >
                  {/if}
                </div>
                <span
                  class="text-[10px] font-black uppercase tracking-tighter bg-white/5 px-2 py-1 rounded-md text-slate-500"
                >
                  {item.type}
                </span>
              </div>
              <h3 class="text-xl font-bold text-white mb-1">{item.name}</h3>
              <p class="text-xs text-slate-500 leading-relaxed">
                {#if item.type === "Machine"}
                  Produit <span class="text-emerald-400 font-semibold"
                    >{item.product_quantity || 1}</span
                  > unités par cycle.
                {:else}
                  Essentiel pour la production de composants avancés.
                {/if}
              </p>
              {#if item.type === "Machine" && item.volatility}
                <p class="text-xs text-amber-400 mt-2">
                  📊 Volatilité: {(item.volatility * 100).toFixed(1)}%
                </p>
              {/if}
            </div>

            <div class="mt-6 space-y-3">
              <!-- Price & Quantity Row -->
              <div class="flex items-end justify-between gap-4">
                <div class="flex-1">
                  <span
                    class="text-[10px] text-slate-500 uppercase font-black tracking-wider"
                    >Prix Unitaire</span
                  >
                  <div class="text-2xl font-mono font-black text-white mt-1">
                    {formatCurrency(item.base_price)}
                  </div>
                </div>

                <!-- Compact Quantity Selector -->
                <div
                  class="flex items-center gap-1.5 bg-slate-900/50 border border-white/10 rounded-xl p-1"
                >
                  <button
                    onclick={() =>
                      setQuantity(item.id, getQuantity(item.id) - 1)}
                    disabled={getQuantity(item.id) <= 1}
                    class="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center text-slate-300 hover:text-white font-bold transition-all text-sm"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={getQuantity(item.id)}
                    oninput={(e) =>
                      setQuantity(
                        item.id,
                        parseInt(e.currentTarget.value) || 1,
                      )}
                    min="1"
                    class="w-14 bg-transparent text-center font-mono font-bold text-white text-sm focus:outline-none"
                  />
                  <button
                    onclick={() =>
                      setQuantity(item.id, getQuantity(item.id) + 1)}
                    class="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white font-bold transition-all text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              <!-- Total Price -->
              {#if getQuantity(item.id) > 1}
                <div
                  class="flex items-center justify-between px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
                >
                  <span class="text-xs text-emerald-400 font-semibold">
                    Total ({getQuantity(item.id)} unités)
                  </span>
                  <span class="text-lg font-mono font-black text-emerald-400">
                    {formatCurrency(item.base_price * getQuantity(item.id))}
                  </span>
                </div>
              {/if}

              <!-- Buy Button -->
              <button
                onclick={() => handleBuy(item)}
                disabled={buyingId === item.id ||
                  (dashboardData?.financials.cash || 0) <
                    item.base_price * getQuantity(item.id)}
                class="w-full py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group/btn shadow-lg {buyingId ===
                item.id
                  ? 'bg-slate-800 cursor-wait'
                  : 'bg-gradient-to-r from-white to-slate-100 text-slate-900 hover:from-emerald-400 hover:to-emerald-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:from-white disabled:to-slate-100'}"
              >
                {#if buyingId === item.id}
                  <div
                    class="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"
                  ></div>
                  <span>Achat en cours...</span>
                {:else}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="group-hover/btn:scale-110 transition-transform"
                    ><circle cx="9" cy="21" r="1"></circle><circle
                      cx="20"
                      cy="21"
                      r="1"
                    ></circle><path
                      d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
                    ></path></svg
                  >
                  Acheter {getQuantity(item.id) > 1
                    ? `(×${getQuantity(item.id)})`
                    : ""}
                  <svg
                    class="w-4 h-4 group-hover/btn:translate-x-1 transition-transform"
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    ><line x1="5" y1="12" x2="19" y2="12"></line><polyline
                      points="12 5 19 12 12 19"
                    ></polyline></svg
                  >
                {/if}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-none {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
