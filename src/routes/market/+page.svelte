<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { fade, fly, scale } from "svelte/transition";
  import { buyItem, fetchMarketItems, type Item } from "$lib/services/market";
  import { fetchDashboardData, type DashboardData } from "$lib/dashboard";
  import { notifications } from "$lib/notifications";
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import type { Company } from "$lib/types";
  import FilterBar from "$lib/components/FilterBar.svelte";

  let items: Item[] = $state([]);
  let dashboardData: DashboardData | null = $state(null);
  let loading = $state(true);
  let buyingId = $state("");
  let error = $state("");
  let quantities: Record<string, number> = $state({});

  // Filter states
  let searchQuery = $state("");
  let selectedFilters = $state<Record<string, string>>({});

  const marketFilters = [
    {
      label: "Type",
      value: "type",
      options: [
        { label: "Machine", value: "Machine" },
        { label: "Ressource Brute", value: "Ressource Brute" },
        { label: "Composant", value: "Composant" },
      ],
    },
  ];

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

  const filteredItems = $derived.by(() => {
    return items.filter((i) => {
      // Search
      if (
        searchQuery &&
        !i.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      // Type filter
      if (selectedFilters.type && i.type !== selectedFilters.type) return false;

      return true;
    });
  });

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
        `${quantity}x ${item.name} achetée${quantity > 1 ? "s" : ""} !`
      );
      // Reset quantity to 1
      quantities[item.id] = 1;
      // Refresh dashboard to show new balance
      dashboardData = await fetchDashboardData(userId);
      // Refresh activeCompany store to reflect changes
      const updated = await pb
        .collection("companies")
        .getOne<Company>(activeCompanyId, { requestKey: null });
      activeCompany.set(updated);
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
      class="flex flex-col md:flex-row md:items-center justify-between gap-6"
    >
      <div class="flex items-center gap-4">
        <div>
          <h1
            class="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3"
          >
            <span class="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><circle cx="8" cy="21" r="1" /><circle
                  cx="19"
                  cy="21"
                  r="1"
                /><path
                  d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
                /></svg
              >
            </span>
            Marché Global
          </h1>
          <p class="text-slate-400 mt-2 max-w-xl">
            Acquérez les ressources et équipements essentiels pour faire croître
            votre empire industriel.
          </p>
        </div>
      </div>

      {#if dashboardData}
        <div
          class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 backdrop-blur-sm shadow-lg"
        >
          <div
            class="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"
          >
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
              ><line x1="12" y1="1" x2="12" y2="23"></line><path
                d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
              ></path></svg
            >
          </div>
          <div>
            <p
              class="text-[10px] text-slate-500 uppercase font-bold tracking-wider"
            >
              Solde Disponible
            </p>
            <p class="text-2xl font-mono font-black text-white tracking-tight">
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

    <!-- Filter Bar -->
    <FilterBar
      bind:searchQuery
      placeholder="Rechercher un item..."
      filters={marketFilters}
      bind:selectedFilters
    />

    {#if loading}
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {#each Array(8) as _}
          <div
            class="h-80 bg-slate-900/50 rounded-3xl animate-pulse border border-slate-800"
          ></div>
        {/each}
      </div>
    {:else}
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {#each filteredItems as item (item.id)}
          <div
            transition:fly={{ y: 20, duration: 400 }}
            class="group bg-slate-900/50 border border-slate-800 rounded-2xl p-6 transition-all hover:border-indigo-500/30 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between relative overflow-hidden"
          >
            <!-- Decorative gradient blob -->
            <div
              class="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-colors pointer-events-none"
            ></div>

            <div class="relative z-10">
              <div class="flex justify-between items-start mb-4">
                <div
                  class="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all scale-100 group-hover:scale-105"
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
                  class="text-[10px] font-bold uppercase tracking-wider bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-slate-500"
                >
                  {item.type}
                </span>
              </div>
              <h3
                class="text-lg font-bold text-white mb-2 leading-tight min-h-[3rem]"
              >
                {item.name}
              </h3>
              <div class="text-xs text-slate-500 leading-relaxed min-h-[4rem]">
                {#if item.type === "Machine"}
                  {#if item.expand?.use_recipe}
                    <div
                      class="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 space-y-2"
                    >
                      <!-- Inputs -->
                      {#if item.expand.use_recipe.expand?.inputs_items && item.expand.use_recipe.expand.inputs_items.length > 0}
                        <div class="flex flex-wrap gap-1">
                          <span
                            class="text-slate-500 font-bold mr-1 text-[10px] uppercase"
                            >Conso:</span
                          >
                          {#each item.expand.use_recipe.expand.inputs_items as input}
                            <span
                              class="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-700"
                            >
                              {input.name}
                              <span class="text-amber-400 font-mono"
                                >x{item.expand.use_recipe.input_quantity}</span
                              >
                            </span>
                          {/each}
                        </div>
                      {/if}

                      <!-- Output -->
                      <div
                        class="flex items-center gap-2 border-t border-slate-800 pt-2"
                      >
                        <span
                          class="text-slate-500 font-bold text-[10px] uppercase"
                          >Prod:</span
                        >
                        <span class="text-emerald-400 font-medium truncate">
                          {item.expand.use_recipe.expand?.output_item?.name ||
                            item.expand.use_recipe.name ||
                            "Item"}
                        </span>
                        <span
                          class="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded ml-auto"
                        >
                          {item.expand.use_recipe.production_time}s
                        </span>
                      </div>
                    </div>
                  {:else}
                    Produit <span class="text-emerald-400 font-semibold"
                      >{item.product_quantity || 1}</span
                    >
                    unité(s) de
                    <span class="text-emerald-400 font-semibold"
                      >{(item.expand as any)?.product?.name || "Produit"}</span
                    > par cycle.
                  {/if}
                {:else}
                  <p>
                    Essentiel pour le bon fonctionnement de votre usine et la
                    production de composants avancés.
                  </p>
                {/if}
              </div>
              {#if item.type === "Machine" && item.volatility}
                <div
                  class="flex items-center gap-1.5 mt-3 text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg border border-amber-500/20 w-fit"
                >
                  <span>📊</span>
                  <span>Volatilité: {(item.volatility * 100).toFixed(1)}%</span>
                </div>
              {/if}
            </div>

            <div class="mt-6 space-y-3 relative z-10">
              <!-- Price & Quantity Row -->
              <div class="flex items-end justify-between gap-4">
                <div class="flex-1">
                  <span
                    class="text-[10px] text-slate-500 uppercase font-bold tracking-wider"
                    >Prix Unitaire</span
                  >
                  <div class="text-xl font-mono font-bold text-white mt-0.5">
                    {formatCurrency(item.base_price)}
                  </div>
                </div>

                <!-- Compact Quantity Selector -->
                <div
                  class="flex items-center gap-1 bg-slate-950 rounded-xl p-1 border border-slate-800"
                >
                  <button
                    onclick={() =>
                      setQuantity(item.id, getQuantity(item.id) - 1)}
                    disabled={getQuantity(item.id) <= 1}
                    class="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-400 hover:text-white font-bold transition-all text-sm border border-slate-800 disabled:border-transparent"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={getQuantity(item.id)}
                    oninput={(e) =>
                      setQuantity(
                        item.id,
                        parseInt(e.currentTarget.value) || 1
                      )}
                    min="1"
                    class="w-10 bg-transparent text-center font-mono font-bold text-white text-sm focus:outline-none"
                  />
                  <button
                    onclick={() =>
                      setQuantity(item.id, getQuantity(item.id) + 1)}
                    class="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white font-bold transition-all text-sm border border-slate-800"
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
                    Total ({getQuantity(item.id)})
                  </span>
                  <span class="text-sm font-mono font-bold text-emerald-400">
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
                class="w-full py-2.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group/btn relative overflow-hidden text-sm {buyingId ===
                item.id
                  ? 'bg-slate-800 cursor-wait text-slate-400'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-slate-800 disabled:text-slate-500'}"
              >
                {#if buyingId === item.id}
                  <div
                    class="w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin"
                  ></div>
                {:else}
                  <span>Acheter</span>
                  <svg
                    class="w-4 h-4 group-hover/btn:translate-x-1 transition-transform"
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
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
