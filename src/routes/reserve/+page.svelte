<script lang="ts">
  import { onMount } from "svelte";
  import { activeCompany } from "$lib/stores";
  import { fade, slide } from "svelte/transition";
  import {
    withdrawFromReserve,
    getReserveOverview,
    type ReserveItem,
    type ReserveOverview,
  } from "$lib/services/reserve";
  import { notifications } from "$lib/notifications";
  import { goto } from "$app/navigation";
  import FilterBar from "$lib/components/FilterBar.svelte";
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import pb from "$lib/pocketbase";

  const PER_PAGE = 16;

  let reserveItems = $state<ReserveItem[]>([]);
  let overview = $state<ReserveOverview>({ used: 0, max: 0 });
  let loading = $state(true);
  let loadingMore = $state(false);
  let withdrawingIds = $state<Record<string, boolean>>({});
  let withdrawQuantities = $state<Record<string, number>>({});
  let currentPage = $state(1);
  let hasMore = $state(true);
  let totalItems = $state(0);

  // Filtering
  let searchQuery = $state("");
  let selectedFilters = $state<Record<string, string>>({});

  // Build PocketBase filter string
  function buildFilterString(): string {
    if (!$activeCompany) return "";

    const parts: string[] = [`company = "${$activeCompany.id}"`];

    if (searchQuery.trim()) {
      parts.push(`item.name ~ "${searchQuery.trim()}"`);
    }

    return parts.join(" && ");
  }

  async function loadReserve(page: number = 1, append: boolean = false) {
    if (!$activeCompany) return;

    if (page === 1) {
      loading = true;
    } else {
      loadingMore = true;
    }

    try {
      const filter = buildFilterString();

      const [result, ov] = await Promise.all([
        pb.collection("reserve").getList<ReserveItem>(page, PER_PAGE, {
          filter,
          sort: "-quantity",
          expand: "item",
          requestKey: null,
        }),
        page === 1 ? getReserveOverview() : Promise.resolve(null),
      ]);

      if (append) {
        reserveItems = [...reserveItems, ...result.items];
      } else {
        reserveItems = result.items;
      }

      if (ov) {
        overview = ov;
      }

      // Init quantities
      result.items.forEach((item) => {
        if (!withdrawQuantities[item.id]) {
          withdrawQuantities[item.id] = 1;
        }
      });

      totalItems = result.totalItems;
      hasMore = result.page < result.totalPages;
      currentPage = result.page;
    } catch (error) {
      console.error(error);
      notifications.error("Impossible de charger la réserve");
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
    loadReserve(1, false);
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    await loadReserve(currentPage + 1, true);
  }

  onMount(async () => {
    if (!$activeCompany) return;
    await loadReserve(1, false);
  });

  async function handleWithdraw(resItem: ReserveItem) {
    const qty = withdrawQuantities[resItem.id] || 1;
    if (qty <= 0 || qty > resItem.quantity) {
      notifications.error("Quantité invalide");
      return;
    }

    withdrawingIds[resItem.id] = true;
    try {
      const result = await withdrawFromReserve(resItem.expand.item.id, qty);
      if (result.success) {
        notifications.success(`Retiré: ${qty}x ${resItem.expand.item.name}`);
        await loadReserve(1, false); // Reload to refresh grid and capacity
      }
    } catch (error: any) {
      notifications.error(error.message);
    } finally {
      withdrawingIds[resItem.id] = false;
    }
  }

  function setMaxWithdraw(resItem: ReserveItem) {
    withdrawQuantities[resItem.id] = resItem.quantity;
  }

  // Capacity Color
  let capacityPercent = $derived((overview.used / overview.max) * 100);
  let capacityColor = $derived(
    capacityPercent >= 90
      ? "bg-red-500"
      : capacityPercent >= 60
        ? "bg-amber-500"
        : "bg-emerald-500"
  );
</script>

<svelte:head>
  <title>Réserve | Ketsuna: Iron Symphony</title>
</svelte:head>

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
                ><rect x="3" y="11" width="18" height="11" rx="2" ry="2"
                ></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg
              >
            </span>
            Réserve Sécurisée
          </h1>
          <p class="text-slate-400 mt-2 max-w-xl">
            Stockez vos ressources précieuses à l'abri des fluctuations du
            marché et sécurisez vos actifs.
          </p>
        </div>
      </div>

      <button
        onclick={() => goto("/inventory")}
        class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 hover:border-slate-600 transition-all font-bold text-sm flex items-center gap-2 group shadow-lg shadow-black/20"
      >
        <span>Inventaire Classique</span>
        <svg
          class="w-4 h-4 group-hover:translate-x-1 transition-transform"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
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
      </button>
    </header>

    <!-- Capacity Bar -->
    <div
      class="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 shadow-xl backdrop-blur-sm relative overflow-hidden"
    >
      <!-- Background mesh/glow -->
      <div
        class="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"
      ></div>

      <div
        class="flex flex-col md:flex-row justify-between items-end mb-4 gap-4 relative z-10"
      >
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
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
              class="text-slate-500"
              ><path
                d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
              ></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"
              ></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg
            >
            Capacité de Stockage
          </h2>
          <p class="text-sm text-slate-400 mt-1">
            Limite basée sur le niveau de l'entreprise (<span
              class="text-white font-mono font-bold"
              >{$activeCompany?.level || 1}</span
            >
            x 300)
          </p>
        </div>
        <div class="text-right">
          <div class="text-3xl font-black text-white tracking-tight">
            {overview.used.toLocaleString()}
            <span class="text-lg text-slate-600 font-medium"
              >/ {overview.max.toLocaleString()}</span
            >
          </div>
        </div>
      </div>

      <div
        class="h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800/50"
      >
        <div
          class="h-full {capacityColor} transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,0,0,0.3)] relative"
          style="width: {Math.min(capacityPercent, 100)}%"
        >
          <div
            class="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]"
          ></div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <FilterBar
      bind:searchQuery
      placeholder="Rechercher dans la réserve..."
      onFilterChange={handleFilterChange}
    />

    <!-- Results count -->
    <div class="text-sm text-slate-500 font-medium px-1">
      Affichage de <span class="text-white font-bold"
        >{reserveItems.length}</span
      >
      item(s) sur {totalItems}
    </div>

    <!-- Grid -->
    {#if loading}
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {#each Array(4) as _}
          <div
            class="h-64 bg-slate-900/50 rounded-2xl animate-pulse border border-slate-800"
          ></div>
        {/each}
      </div>
    {:else if reserveItems.length === 0 && !searchQuery}
      <div
        class="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800 border-dashed backdrop-blur-sm"
      >
        <div
          class="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl"
        >
          📦
        </div>
        <h3 class="text-2xl font-black text-white mb-2">La réserve est vide</h3>
        <p class="text-slate-400 mb-8 max-w-md mx-auto">
          Déposez des items depuis votre inventaire principal pour les protéger
          et gérer votre espace de stockage efficacement.
        </p>
        <button
          onclick={() => goto("/inventory")}
          class="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
        >
          Aller à l'Inventaire
        </button>
      </div>
    {:else if reserveItems.length === 0}
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
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {#each reserveItems as res (res.id)}
          <div
            transition:slide={{ duration: 300 }}
            class="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/30 hover:bg-slate-900/60 transition-all group flex flex-col justify-between relative overflow-hidden backdrop-blur-sm"
          >
            <!-- Hover gradient -->
            <div
              class="absolute top-0 right-0 w-32 h-32 bg-indigo-500/0 group-hover:bg-indigo-500/5 rounded-full blur-2xl transition-all duration-500 -translate-y-1/2 translate-x-1/2 pointer-events-none"
            ></div>

            <!-- Top -->
            <div class="relative z-10">
              <div class="flex justify-between items-start mb-4">
                <div class="flex-1 pr-3">
                  <span
                    class="inline-block text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 mb-2"
                  >
                    {res.expand.item.type}
                  </span>
                  <h3 class="font-bold text-white text-lg leading-tight">
                    {res.expand.item.name}
                  </h3>
                </div>
                <div
                  class="bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl text-right min-w-20"
                >
                  <div class="text-[10px] text-slate-500 font-bold mb-0.5">
                    Quantité
                  </div>
                  <div
                    class="text-emerald-400 font-mono font-black text-lg leading-none"
                  >
                    {res.quantity.toLocaleString()}
                  </div>
                </div>
              </div>

              <!-- Action Area -->
              <div class="pt-4 mt-2 border-t border-slate-800/50">
                <label
                  for="withdraw-{res.id}"
                  class="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide"
                >
                  Retirer vers inventaire
                </label>
                <div class="flex gap-2">
                  <div class="relative flex-1">
                    <input
                      id="withdraw-{res.id}"
                      type="number"
                      bind:value={withdrawQuantities[res.id]}
                      min="1"
                      max={res.quantity}
                      class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none font-mono font-bold transition-colors"
                    />
                    <button
                      onclick={() => setMaxWithdraw(res)}
                      class="absolute right-1.5 top-1.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg uppercase font-bold border border-slate-700 transition-colors"
                    >
                      Max
                    </button>
                  </div>
                  <button
                    onclick={() => handleWithdraw(res)}
                    disabled={withdrawingIds[res.id]}
                    class="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 rounded-xl shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all active:scale-95 flex items-center justify-center min-w-10"
                  >
                    {#if withdrawingIds[res.id]}
                      <div
                        class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                      ></div>
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
                        ><polyline points="9 10 4 15 9 20"></polyline><path
                          d="M20 4v7a4 4 0 0 1-4 4H4"
                        ></path></svg
                      >
                    {/if}
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <InfiniteScroll onLoadMore={loadMore} loading={loadingMore} {hasMore} />
    {/if}
  </div>
</div>
