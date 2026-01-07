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
        `${quantity}x ${item.name} achetée${quantity > 1 ? "s" : ""} !`
      );
      quantities[item.id] = 1;
      await loadMarketItems(1, false);
      dashboardData = await fetchDashboardData(userId);
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

<div class="space-y-8">
  {#if dashboardData}
    <div
      class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 backdrop-blur-sm shadow-lg mb-6"
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

  <FilterBar
    bind:searchQuery
    placeholder="Rechercher un item..."
    filters={marketFilters}
    bind:selectedFilters
    onFilterChange={handleFilterChange}
  />

  <div class="text-sm text-slate-500 font-medium px-1">
    Affichage de <span class="text-white font-bold">{items.length}</span>
    item(s) sur {totalItems}
  </div>

  {#if loading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each Array(8) as _}
        <div
          class="h-80 bg-slate-900/50 rounded-3xl animate-pulse border border-slate-800"
        ></div>
      {/each}
    </div>
  {:else if items.length === 0}
    <div
      class="text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-800"
    >
      <span class="text-3xl block mb-3">🔍</span>
      <p class="text-lg font-bold text-white mb-1">Aucun résultat</p>
      <p class="text-sm text-slate-400">
        Aucun item ne correspond à vos critères de recherche.
      </p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each items as item (item.id)}
        <div
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
                    ></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
                    ></path></svg
                  >
                {/if}
              </div>
              <div class="flex flex-col items-end gap-1">
                <span
                  class="text-[10px] font-bold uppercase tracking-wider bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-slate-500"
                >
                  {item.type}
                </span>
                {#if item.minable}
                  <span
                    class="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  >
                    ♾️ Illimité
                  </span>
                {/if}
              </div>
            </div>
            <h3
              class="text-lg font-bold text-white mb-2 leading-tight min-h-12"
            >
              {item.name}
            </h3>
            <div class="text-xs text-slate-500 leading-relaxed min-h-16">
              {#if item.type === "Machine"}
                {@const recipe = item.use_recipe
                  ? getRecipe(item.use_recipe)
                  : null}
                {#if recipe}
                  <div
                    class="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 space-y-2"
                  >
                    <!-- Inputs -->
                    {#if recipe.inputs_items && recipe.inputs_items.length > 0}
                      <div class="flex flex-wrap gap-1">
                        <span
                          class="text-slate-500 font-bold mr-1 text-[10px] uppercase"
                          >Conso:</span
                        >
                        {#each recipe.inputs_items as inputId}
                          {@const input = getItem(inputId)}
                          <span
                            class="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-700"
                          >
                            {input?.name || inputId}
                            <span class="text-amber-400 font-mono"
                              >x{recipe.input_quantity}</span
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
                        {getItem(recipe.output_item)?.name ||
                          recipe.name ||
                          "Item"}
                      </span>
                      <span
                        class="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded ml-auto"
                      >
                        {recipe.production_time}s
                      </span>
                    </div>
                  </div>
                {:else if item.product}
                  Produit <span class="text-emerald-400 font-semibold"
                    >{item.product_quantity || 1}</span
                  >
                  unité(s) de
                  <span class="text-emerald-400 font-semibold"
                    >{getItem(item.product)?.name || "Produit"}</span
                  > par cycle.
                {/if}
              {:else}
                <p>
                  Essentiel pour le bon fonctionnement de votre usine et la
                  production de composants avancés.
                </p>
              {/if}
            </div>

            <!-- Volatility Badge REMOVED -->

            {#if item.type === "Machine" || item.type === "Stockage"}
              <div class="flex flex-wrap gap-2 mt-3">
                {#if item.energy_type === "Soleil" || item.metadata?.energy_type === "Soleil"}
                  <div
                    class="flex items-center gap-1.5 text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-lg border border-yellow-500/20"
                    title="Fonctionne uniquement de 8h à 18h UTC"
                  >
                    <span>☀️</span>
                    <span>Solaire (8h-18h)</span>
                  </div>
                {/if}
                {#if (item.need_energy && item.need_energy > 0 && item.energy_type !== "Soleil") || (item.metadata?.need_energy && item.metadata.need_energy > 0 && item.metadata.energy_type !== "Soleil")}
                  <div
                    class="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-lg border border-red-500/20"
                  >
                    <span>⚡</span>
                    <span
                      >Conso: {item.metadata?.need_energy || item.need_energy}
                      kW</span
                    >
                  </div>
                {/if}
                {#if (item.produce_energy && item.produce_energy > 0) || (item.metadata?.produce_energy && item.metadata.produce_energy > 0)}
                  <div
                    class="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg border border-emerald-500/20"
                  >
                    <span>🔋</span>
                    <span
                      >Prod: +{item.metadata?.produce_energy ||
                        item.produce_energy} kW</span
                    >
                  </div>
                {/if}
                {#if item.can_store_energy && item.can_store_energy > 0}
                  <div
                    class="flex items-center gap-1.5 text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-lg border border-cyan-500/20"
                  >
                    <span>🔌</span>
                    <span>Stock: {item.can_store_energy} kWh</span>
                  </div>
                {/if}
                {#if item.metadata?.storage_capacity && item.metadata.storage_capacity > 0}
                  <div
                    class="flex items-center gap-1.5 text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded-lg border border-blue-500/20"
                  >
                    <span>📦</span>
                    <span
                      >Stock: {item.metadata.storage_capacity}
                      {item.metadata.supported_storage_types?.[0] || "u"}</span
                    >
                  </div>
                {/if}
                {#if (item.max_employee && item.max_employee > 1) || (item.metadata?.max_employee && item.metadata.max_employee > 1)}
                  <div
                    class="flex items-center gap-1.5 text-xs bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-lg border border-indigo-500/20"
                  >
                    <span>👥</span>
                    <span
                      >Max: {item.metadata?.max_employee || item.max_employee}
                      emp.</span
                    >
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <div
            class="space-y-3 pt-4 border-t border-slate-800/50 relative z-10 mt-auto"
          >
            <!-- Price info row -->
            <div class="flex items-center justify-between px-1">
              <span class="text-xs font-medium text-slate-500"
                >Prix unitaire</span
              >
              <span class="font-mono font-bold text-white text-lg"
                >{formatCurrency(item.base_price)}</span
              >
            </div>

            <!-- Qty Selector - Full Width like Inventory -->
            <div
              class="flex items-center gap-1 bg-slate-950 rounded-xl p-1 border border-slate-800 w-full"
            >
              <button
                onclick={() => setQuantity(item.id, getQuantity(item.id) - 1)}
                disabled={getQuantity(item.id) <= 1}
                class="w-10 h-10 rounded-lg bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-slate-900 border border-slate-800 font-bold text-lg"
                >−</button
              >
              <input
                type="number"
                class="flex-1 min-w-0 h-10 bg-slate-900 border border-slate-700 rounded-lg text-center font-mono font-bold text-base text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={getQuantity(item.id)}
                oninput={(e) =>
                  setQuantity(item.id, parseInt(e.currentTarget.value) || 1)}
                min="1"
              />
              <button
                onclick={() => setQuantity(item.id, getQuantity(item.id) + 1)}
                class="w-10 h-10 rounded-lg bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-slate-900 border border-slate-800 font-bold text-lg"
                >+</button
              >
            </div>

            <!-- Total Price Box -->
            <div
              class="flex items-center justify-between px-3 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl"
            >
              <span class="text-xs text-indigo-400 font-semibold">
                Total ({getQuantity(item.id)} unité{getQuantity(item.id) > 1
                  ? "s"
                  : ""})
              </span>
              <span class="text-base font-mono font-bold text-indigo-300">
                {formatCurrency(item.base_price * getQuantity(item.id))}
              </span>
            </div>

            <!-- Buy Button -->
            <button
              onclick={() => handleBuy(item)}
              disabled={buyingId === item.id ||
                (dashboardData?.financials.cash || 0) <
                  item.base_price * getQuantity(item.id)}
              class="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-indigo-500/50"
            >
              {#if buyingId === item.id}
                <div
                  class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                ></div>
              {:else}
                <span>Acheter</span>
                <svg
                  class="w-4 h-4"
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

    <InfiniteScroll onLoadMore={loadMore} loading={loadingMore} {hasMore} />
  {/if}
</div>
