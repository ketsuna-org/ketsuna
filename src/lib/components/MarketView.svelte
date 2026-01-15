<script lang="ts">
  import { onMount } from "svelte";
  import { fly, fade } from "svelte/transition";
  import { buyItem, type MarketItem } from "$lib/services/market";
  import { fetchDashboardData, type DashboardData } from "$lib/dashboard";
  import { getItem, getRecipe } from "$lib/data/game-static";
  import { notifications } from "$lib/notifications";
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import type { Company } from "$lib/pocketbase";
  import FilterBar from "$lib/components/FilterBar.svelte";
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import { machineRefreshStore } from "$lib/stores/machineRefreshStore";

  const PER_PAGE = 16;

  let items: MarketItem[] = $state([]);
  let dashboardData: DashboardData | null = $state(null);
  let loading = $state(true);
  let loadingMore = $state(false);
  let buyingId = $state("");
  let error = $state("");
  let quantities: Record<string, number> = $state({});
  let currentPage = $state(1);
  let hasMore = $state(true);
  let totalItems = $state(0);

  // Filter states
  let searchQuery = $state("");
  let selectedFilters = $state<Record<string, string>>({});

  const marketFilters = [
    {
      label: "Type",
      value: "type",
      options: [
        { label: "Machine", value: "Machine" },
        { label: "Stockage", value: "Stockage" },
      ],
    },
  ];

  async function loadMarketItems(page: number = 1, append: boolean = false) {
    if (page === 1) {
      loading = true;
    } else {
      loadingMore = true;
    }

    try {
      const result = await pb.send("/api/market/list", {
        method: "POST",
        body: {
          page,
          perPage: PER_PAGE,
          sort: "name",
          search: searchQuery,
          type: selectedFilters.type || "",
        },
      });

      if (append) {
        items = [...items, ...(result.items || [])];
      } else {
        items = result.items || [];
      }

      totalItems = result.totalItems || 0;
      hasMore = page < (result.totalPages || 0);
      currentPage = page;
    } catch (err: any) {
      error = err.message;
      console.error("Market load error:", err);
    } finally {
      loading = false;
      loadingMore = false;
    }
  }

  function handleFilterChange(filters: {
    searchQuery: string;
    selectedFilters: Record<string, string>;
  }) {
    searchQuery = filters.searchQuery;
    selectedFilters = filters.selectedFilters;
    currentPage = 1;
    hasMore = true;
    loadMarketItems(1, false);
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    await loadMarketItems(currentPage + 1, true);
  }

  onMount(async () => {
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return; // Silent return if not auth, handled by layout/hooks

      const [_, dashData] = await Promise.all([
        loadMarketItems(1, false),
        fetchDashboardData(userId),
      ]);
      dashboardData = dashData;
    } catch (err: any) {
      error = err.message;
    }
  });

  function getQuantity(itemId: string): number {
    return quantities[itemId] || 1;
  }

  function setQuantity(itemId: string, value: number) {
    quantities[itemId] = Math.max(1, value);
  }

  async function handleBuy(item: MarketItem) {
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
        `${quantity}x ${item.name} achetée${quantity > 1 ? "s" : ""} !`,
      );
      quantities[item.id] = 1;
      await loadMarketItems(1, false);
      dashboardData = await fetchDashboardData(userId);
      const updated = await pb
        .collection("companies")
        .getOne<Company>(activeCompanyId, { requestKey: null });
      activeCompany.set(updated);
      // Trigger machines list refresh for FactoryInner
      machineRefreshStore.refresh("purchase");
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

<div class="h-full overflow-y-auto pr-2 custom-scrollbar space-y-8">
  {#if dashboardData}
    <div
      class="bg-gradient-to-r from-[#1e293b] to-[#0f172a] border-l-4 border-l-emerald-500 border-y border-r border-[#334155] p-5 rounded-lg flex items-center gap-5 shadow-lg relative overflow-hidden"
    >
      <!-- Background pattern -->
      <div
        class="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none"
      ></div>

      <div
        class="w-14 h-14 rounded-lg bg-[#0f172a] border border-[#334155] flex items-center justify-center text-emerald-400 shadow-inner z-10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
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
      <div class="z-10">
        <p
          class="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1"
        >
          Solde Disponible
        </p>
        <p
          class="text-3xl font-mono font-bold text-white tracking-tight drop-shadow-md"
        >
          {formatCurrency(dashboardData.financials.cash)}
        </p>
      </div>
    </div>
  {/if}

  {#if error}
    <div
      transition:fade
      class="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-red-400 text-sm flex items-center gap-3 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
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

  <FilterBar
    bind:searchQuery
    placeholder="Rechercher un item..."
    filters={marketFilters}
    bind:selectedFilters
    onFilterChange={handleFilterChange}
  />

  <div
    class="text-xs text-slate-500 font-bold uppercase tracking-widest px-1 py-2 border-b border-[#334155]/50 flex justify-between items-center"
  >
    <span>Résultats du marché</span>
    <span>{items.length} / {totalItems}</span>
  </div>

  {#if loading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each Array(8) as _}
        <div
          class="h-96 bg-[#1e293b] rounded-xl animate-pulse border border-[#334155]"
        ></div>
      {/each}
    </div>
  {:else if items.length === 0}
    <div
      class="flex flex-col items-center justify-center py-20 bg-[#1e293b]/50 rounded-xl border-2 border-dashed border-[#334155]"
    >
      <span class="text-4xl block mb-4 opacity-50">🔍</span>
      <p class="text-lg font-bold text-slate-300 mb-1 uppercase tracking-wide">
        Aucun résultat
      </p>
      <p class="text-xs text-slate-500">
        Vos critères ne correspondent à aucun article.
      </p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
      {#each items as item (item.id)}
        <div
          class="group bg-[#1e293b] border border-[#334155] rounded-xl p-5 transition-all duration-300 hover:border-[#6366f1] hover:shadow-[0_0_25px_rgba(99,102,241,0.15)] flex flex-col justify-between relative overflow-hidden"
        >
          <!-- Decorative accent bar -->
          <div
            class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
          ></div>

          <div class="relative z-10 flex flex-col h-full">
            <!-- Header Section -->
            <div class="flex justify-between items-start mb-5">
              <div
                class="p-3.5 rounded-lg bg-[#0f172a] border border-[#334155] text-slate-400 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all shadow-inner"
              >
                {#if item.type === "Machine"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    ><path
                      d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
                    ></path></svg
                  >
                {:else if item.type === "Ressource Brute"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
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
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    ><rect x="2" y="7" width="20" height="14" rx="2" ry="2"
                    ></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
                    ></path></svg
                  >
                {/if}
              </div>
              <div class="flex flex-col items-end gap-1.5">
                <span
                  class="text-[10px] font-bold uppercase tracking-wider bg-[#0f172a] border border-[#334155] px-2 py-1 rounded text-slate-400"
                >
                  {item.type}
                </span>
                {#if item.minable}
                  <span
                    class="text-[10px] font-bold px-2 py-1 rounded bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 flex items-center gap-1"
                  >
                    <span>♾️</span> ILLIMITÉ
                  </span>
                {/if}
              </div>
            </div>

            <h3
              class="text-base font-bold text-slate-100 mb-3 leading-tight min-h-[3rem] uppercase tracking-wide"
            >
              {item.name}
            </h3>

            <!-- Details Section -->
            <div
              class="text-xs text-slate-400 leading-relaxed bg-[#0f172a]/50 p-3 rounded-lg border border-[#334155]/50 flex-1 mb-4"
            >
              {#if item.type === "Machine"}
                {@const recipe = item.use_recipe
                  ? getRecipe(item.use_recipe)
                  : null}
                {#if recipe}
                  <div class="space-y-3">
                    {#if recipe.inputs_items && recipe.inputs_items.length > 0}
                      <div class="flex flex-col gap-1.5">
                        <span
                          class="text-[9px] font-bold text-slate-500 uppercase tracking-widest"
                          >Consomme:</span
                        >
                        <div class="flex flex-wrap gap-1">
                          {#each recipe.inputs_items as inputId}
                            {@const input = getItem(inputId)}
                            <span
                              class="bg-[#1e293b] text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-700 flex items-center gap-1"
                            >
                              {input?.name || inputId}
                              <span class="text-amber-400 font-mono text-[9px]"
                                >x{recipe.input_quantity}</span
                              >
                            </span>
                          {/each}
                        </div>
                      </div>
                    {/if}

                    <div
                      class="pt-2 border-t border-slate-800 flex flex-col gap-1.5"
                    >
                      <span
                        class="text-[9px] font-bold text-slate-500 uppercase tracking-widest"
                        >Produit:</span
                      >
                      <div class="flex items-center justify-between">
                        <span class="text-emerald-400 font-bold text-sm">
                          {getItem(recipe.output_item)?.name ||
                            recipe.name ||
                            "Item"}
                        </span>
                        <span
                          class="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-mono"
                        >
                          {recipe.production_time}s
                        </span>
                      </div>
                    </div>
                  </div>
                {:else if item.product}
                  <div class="flex items-center gap-2">
                    <span>Produit</span>
                    <span class="text-emerald-400 font-bold"
                      >{item.product_quantity || 1}x</span
                    >
                    <span
                      class="text-emerald-400 font-bold border-b border-emerald-500/20"
                      >{getItem(item.product)?.name || "Produit"}</span
                    >
                  </div>
                {/if}
              {:else}
                <p class="italic opacity-80">
                  Élément essentiel pour l'infrastructure et la production de
                  votre usine.
                </p>
              {/if}
            </div>

            <!-- Stats Grid -->
            {#if item.type === "Machine" || item.type === "Stockage"}
              <div class="grid grid-cols-2 gap-2 mb-4">
                {#if item.energy_type === "Soleil" || item.metadata?.energy_type === "Soleil"}
                  <div
                    class="col-span-2 flex items-center gap-2 text-[10px] bg-amber-500/10 text-amber-400 px-2 py-1.5 rounded border border-amber-500/20 font-medium"
                  >
                    <span>☀️</span>
                    <span class="uppercase">Solaire (8h-18h)</span>
                  </div>
                {/if}

                {#if item.need_energy && item.need_energy > 0 && item.energy_type !== "Soleil"}
                  <div
                    class="flex items-center gap-2 text-[10px] bg-red-500/5 text-red-400 px-2 py-1.5 rounded border border-red-500/10 font-mono"
                  >
                    <span>⚡</span> -{item.metadata?.need_energy ||
                      item.need_energy} kW
                  </div>
                {/if}

                {#if item.produce_energy && item.produce_energy > 0}
                  <div
                    class="flex items-center gap-2 text-[10px] bg-emerald-500/5 text-emerald-400 px-2 py-1.5 rounded border border-emerald-500/10 font-mono"
                  >
                    <span>🔋</span> +{item.metadata?.produce_energy ||
                      item.produce_energy} kW
                  </div>
                {/if}

                {#if item.can_store_energy && item.can_store_energy > 0}
                  <div
                    class="flex items-center gap-2 text-[10px] bg-cyan-500/5 text-cyan-400 px-2 py-1.5 rounded border border-cyan-500/10 font-mono"
                  >
                    <span>🔌</span>
                    {item.can_store_energy} kWh
                  </div>
                {/if}

                {#if item.metadata?.storage_capacity && item.metadata.storage_capacity > 0}
                  <div
                    class="flex items-center gap-2 text-[10px] bg-blue-500/5 text-blue-400 px-2 py-1.5 rounded border border-blue-500/10 font-mono col-span-2"
                  >
                    <span>📦</span> Capacité: {item.metadata.storage_capacity}
                    {item.metadata.supported_storage_types?.[0] || "u"}
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Footer: Price & Buy -->
            <div class="pt-4 border-t border-slate-800/50 mt-auto space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-[10px] font-bold text-slate-500 uppercase"
                  >Prix Unitaire</span
                >
                <span class="font-mono font-bold text-white text-lg"
                  >{formatCurrency(item.base_price)}</span
                >
              </div>

              <!-- Quantity Selector -->
              <div
                class="flex items-center bg-[#0f172a] rounded-lg border border-[#334155] p-1"
              >
                <button
                  onclick={() => setQuantity(item.id, getQuantity(item.id) - 1)}
                  disabled={getQuantity(item.id) <= 1}
                  class="w-8 h-8 flex items-center justify-center rounded bg-[#1e293b] hover:bg-[#334155] text-slate-400 hover:text-white transition-colors disabled:opacity-30 border border-[#334155]"
                  >−</button
                >
                <input
                  type="number"
                  value={getQuantity(item.id)}
                  class="flex-1 bg-transparent text-center font-mono font-bold text-white text-sm focus:outline-none"
                  oninput={(e) =>
                    setQuantity(item.id, parseInt(e.currentTarget.value) || 1)}
                />
                <button
                  onclick={() => setQuantity(item.id, getQuantity(item.id) + 1)}
                  class="w-8 h-8 flex items-center justify-center rounded bg-[#1e293b] hover:bg-[#334155] text-slate-400 hover:text-white transition-colors border border-[#334155]"
                  >+</button
                >
              </div>

              <div class="flex justify-between items-center px-1">
                <span class="text-xs text-indigo-400 font-medium">Total</span>
                <span class="text-sm font-mono font-bold text-indigo-300"
                  >{formatCurrency(
                    item.base_price * getQuantity(item.id),
                  )}</span
                >
              </div>

              <button
                onclick={() => handleBuy(item)}
                disabled={buyingId === item.id ||
                  (dashboardData?.financials.cash || 0) <
                    item.base_price * getQuantity(item.id)}
                class="w-full py-3 rounded-lg font-bold text-xs uppercase tracking-widest relative overflow-hidden transition-all duration-200 border
                  {buyingId === item.id
                  ? 'bg-slate-700 border-slate-600 cursor-wait'
                  : (dashboardData?.financials.cash || 0) >=
                      item.base_price * getQuantity(item.id)
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-indigo-500/50 shadow-[0_4px_0_#312e81] hover:shadow-[0_2px_0_#312e81] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none'
                    : 'bg-[#1e293b] text-slate-600 border-[#334155] cursor-not-allowed opacity-50'}"
              >
                {#if buyingId === item.id}
                  <span
                    class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"
                  ></span>
                {:else}
                  ACHETER
                {/if}
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <InfiniteScroll onLoadMore={loadMore} loading={loadingMore} {hasMore} />
  {/if}
</div>
