<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import type { InventoryItem, Company } from "$lib/pocketbase";
  import { fly, fade } from "svelte/transition";
  import { sellItem } from "$lib/services/inventory";
  import { notifications } from "$lib/notifications";
  import { goto } from "$app/navigation";
  import FilterBar from "$lib/components/FilterBar.svelte";
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import SellConfirmation from "$lib/components/SellConfirmation.svelte";
  import { depositToReserve } from "$lib/services/reserve";

  const PER_PAGE = 20;

  let inventory = $state<InventoryItem[]>([]);
  let loading = $state(true);
  let loadingMore = $state(false);
  let unsubscribe: () => void;
  let currentPage = $state(1);
  let hasMore = $state(true);
  let totalItems = $state(0);

  // Track quantity to sell per item
  let sellQuantities = $state<Record<string, number>>({});
  let sellingIds = $state<Record<string, boolean>>({});
  let depositingIds = $state<Record<string, boolean>>({});

  // Filter states
  let searchQuery = $state("");
  let selectedFilters = $state<Record<string, string>>({});

  const inventoryFilters = [
    {
      label: "Tous les types",
      value: "type",
      options: [
        { label: "Ressource Brute", value: "Ressource Brute" },
        { label: "Composant", value: "Composant" },
        { label: "Produit Fini", value: "Produit Fini" },
        { label: "Machine", value: "Machine" },
      ],
    },
  ];

  // Build PocketBase filter string
  function buildFilterString(): string {
    if (!$activeCompany) return "";

    const parts: string[] = [`company = "${$activeCompany.id}"`];

    if (searchQuery.trim()) {
      parts.push(`item.name ~ "${searchQuery.trim()}"`);
    }
    if (selectedFilters.type) {
      parts.push(`item.type = "${selectedFilters.type}"`);
    }

    return parts.join(" && ");
  }

  // Sell confirmation modal state
  let sellConfirmItem = $state<InventoryItem | null>(null);

  function openSellAllConfirmation(invItem: InventoryItem) {
    sellConfirmItem = invItem;
  }

  function closeSellConfirmation() {
    sellConfirmItem = null;
  }

  async function confirmSellAll() {
    if (!sellConfirmItem) return;
    const invItem = sellConfirmItem;
    closeSellConfirmation();

    // Set quantity to max and sell
    sellQuantities[invItem.id] = invItem.quantity;
    await handleSell(invItem);
  }

  async function handleDeposit(invItem: InventoryItem) {
    const qty = sellQuantities[invItem.id] || 1;
    const item = invItem.expand?.item;
    if (qty <= 0 || !item) return;

    depositingIds[invItem.id] = true;
    try {
      await depositToReserve(item.id, qty);
      notifications.success(`Déposé: ${qty}x ${item.name}`);
      await loadInventory(1, false);
    } catch (e: any) {
      notifications.error(e.message);
    } finally {
      depositingIds[invItem.id] = false;
    }
  }

  async function loadInventory(page: number = 1, append: boolean = false) {
    if (!$activeCompany) return;

    if (page === 1) {
      loading = true;
    } else {
      loadingMore = true;
    }

    try {
      const filter = buildFilterString();

      const result = await pb
        .collection("inventory")
        .getList<InventoryItem>(page, PER_PAGE, {
          filter,
          expand: "item",
          sort: "item.name",
          requestKey: null,
        });

      if (append) {
        inventory = [...inventory, ...result.items];
      } else {
        inventory = result.items;
      }

      // Initialize sell quantities
      result.items.forEach((inv) => {
        if (!sellQuantities[inv.id]) {
          sellQuantities[inv.id] = 1;
        }
      });

      totalItems = result.totalItems;
      hasMore = result.page < result.totalPages;
      currentPage = result.page;
    } catch (e) {
      console.error("Failed to load inventory", e);
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
    loadInventory(1, false);
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    await loadInventory(currentPage + 1, true);
  }

  async function subscribeToInventory() {
    if (unsubscribe) unsubscribe();

    try {
      unsubscribe = await pb
        .collection("inventory")
        .subscribe("*", async (e) => {
          const { action, record } = e;
          console.log("[REALTIME] Inventory event:", action, record.id);

          if (record.company !== $activeCompany?.id) return;

          if (action === "create" || action === "update") {
            // Fetch updated record with expand to ensure we have item details
            try {
              const updatedRecord = await pb
                .collection("inventory")
                .getOne<InventoryItem>(record.id, {
                  expand: "item",
                });

              console.log(
                "[REALTIME] Fetched update:",
                updatedRecord.id,
                "Qty:",
                updatedRecord.quantity
              );

              const index = inventory.findIndex((i) => i.id === record.id);
              if (index > -1) {
                // Update existing item
                inventory[index] = updatedRecord;
              } else {
                // Add new item and sort
                inventory.push(updatedRecord);
                inventory.sort((a, b) =>
                  (a.expand?.item?.name || "").localeCompare(
                    b.expand?.item?.name || ""
                  )
                );
              }

              // Initialize sell quantity if new
              if (!sellQuantities[record.id]) {
                sellQuantities = { ...sellQuantities, [record.id]: 1 };
              }
            } catch (fetchErr) {
              console.error(
                "[REALTIME] Failed to fetch updated record:",
                fetchErr
              );
            }
          } else if (action === "delete") {
            inventory = inventory.filter((i) => i.id !== record.id);
            const { [record.id]: _, ...rest } = sellQuantities;
            sellQuantities = rest;
          }
        });
    } catch (err) {
      console.error("Failed to subscribe to inventory", err);
    }
  }

  function getSellQuantity(invId: string): number {
    return sellQuantities[invId] || 1;
  }

  function setSellQuantity(invId: string, value: number, max: number) {
    sellQuantities[invId] = Math.max(1, Math.min(value, max));
  }

  async function handleSell(invItem: InventoryItem) {
    const qty = getSellQuantity(invItem.id);
    const item = invItem.expand?.item;
    if (!item || qty <= 0 || qty > invItem.quantity) return;

    sellingIds[invItem.id] = true;
    try {
      const res = await sellItem(invItem.item, qty);
      notifications.success(`Vente réussie: +${formatCurrency(res.revenue)}`);

      // Update local state immediately
      const index = inventory.findIndex((i) => i.id === invItem.id);
      if (index !== -1) {
        const newQty = inventory[index].quantity - qty;
        if (newQty <= 0) {
          inventory = inventory.filter((i) => i.id !== invItem.id);
          delete sellQuantities[invItem.id];
        } else {
          inventory[index].quantity = newQty;
          // Reset sell quantity to 1
          sellQuantities[invItem.id] = 1;
        }
      }

      // Refresh company balance
      if ($activeCompany) {
        const updatedCompany = await pb
          .collection("companies")
          .getOne<Company>($activeCompany.id);
        activeCompany.set(updatedCompany);
      }
    } catch (err: any) {
      notifications.error(err?.message || "Erreur lors de la vente");
    } finally {
      sellingIds[invItem.id] = false;
    }
  }

  function formatCurrency(val: number) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(val);
  }

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });

  $effect(() => {
    if ($activeCompany) {
      currentPage = 1;
      hasMore = true;
      loadInventory(1, false).then(() => {
        subscribeToInventory();
      });
    }
  });
</script>

<svelte:head>
  <title>Inventaire | Ketsuna: Iron Symphony</title>
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
                ><path
                  d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
                /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22.08V12" /></svg
              >
            </span>
            Inventaire & Stockage
          </h1>
          <p class="text-slate-400 mt-2 max-w-xl">
            Gérez votre production, vendez vos surplus et transférez vos actifs
            stratégiques vers la réserve.
          </p>
        </div>
      </div>
    </header>

    {#if loading}
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {#each Array(8) as _}
          <div
            class="h-80 bg-slate-900/50 rounded-2xl animate-pulse border border-slate-800"
          ></div>
        {/each}
      </div>
    {:else if inventory.length === 0 && !searchQuery && Object.keys(selectedFilters).filter((k) => selectedFilters[k]).length === 0}
      <div
        class="flex flex-col items-center justify-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800 border-dashed backdrop-blur-sm"
        in:fade
      >
        <div
          class="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 text-slate-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path
              d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
            /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22.08V12" /></svg
          >
        </div>
        <h3 class="text-2xl font-black text-white mb-2">Entrepôt Vide</h3>
        <p class="text-slate-500 max-w-md text-center mb-8">
          Vos entrepôts sont vides. Produisez des ressources dans l'atelier ou
          achetez-en au marché pour commencer.
        </p>
        <button
          onclick={() => goto("/workshop")}
          class="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
        >
          Aller à l'atelier
        </button>
      </div>
    {:else}
      <!-- Filter Bar -->
      <FilterBar
        bind:searchQuery
        placeholder="Rechercher un item..."
        filters={inventoryFilters}
        bind:selectedFilters
        onFilterChange={handleFilterChange}
      />

      <!-- Results count -->
      <div class="text-sm text-slate-500 font-medium px-1">
        Affichage de <span class="text-white font-bold">{inventory.length}</span
        >
        item(s) sur {totalItems}
      </div>

      {#if inventory.length === 0}
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
          {#each inventory as invItem (invItem.id)}
            {@const item = invItem.expand?.item}
            {@const resalePrice = item ? item.base_price / 2 : 0}
            {@const totalValue = resalePrice * invItem.quantity}

            {#if item}
              <div
                transition:fly={{ y: 20, duration: 400 }}
                class="group bg-slate-900/50 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/30 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between relative overflow-hidden backdrop-blur-sm transition-all"
              >
                <!-- Decorative gradient blob -->
                <div
                  class="absolute top-0 right-0 w-32 h-32 bg-indigo-500/0 group-hover:bg-indigo-500/5 rounded-full blur-2xl transition-all duration-500 -translate-y-1/2 translate-x-1/2 pointer-events-none"
                ></div>

                <div class="relative z-10">
                  <div class="flex justify-between items-start mb-4">
                    <!-- Icon -->
                    <div
                      class="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all shadow-sm"
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
                          /></svg
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
                          /><polyline
                            points="3.27 6.96 12 12.01 20.73 6.96"
                          /><line x1="12" y1="22.08" x2="12" y2="12" /></svg
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
                          ><rect
                            x="2"
                            y="7"
                            width="20"
                            height="14"
                            rx="2"
                            ry="2"
                          /><path
                            d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
                          /></svg
                        >
                      {/if}
                    </div>
                    <!-- Badge -->
                    <span
                      class="text-[10px] font-bold uppercase tracking-wider bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-slate-500"
                    >
                      {item.type}
                    </span>
                  </div>

                  <h3
                    class="text-xl font-bold text-white mb-4 leading-tight min-h-[3.5rem]"
                  >
                    {item.name}
                  </h3>

                  <div class="grid grid-cols-2 gap-2 mb-4">
                    <div
                      class="bg-slate-950/50 p-2 rounded-xl border border-slate-800/50"
                    >
                      <div
                        class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5"
                      >
                        Quantité
                      </div>
                      <div class="text-2xl font-mono font-black text-white">
                        {invItem.quantity}
                      </div>
                    </div>
                    <div
                      class="bg-emerald-950/20 p-2 rounded-xl border border-emerald-500/10 text-right"
                    >
                      <div
                        class="text-[10px] text-emerald-500/70 uppercase font-bold tracking-wider mb-0.5"
                      >
                        Valeur
                      </div>
                      <div
                        class="text-lg font-mono font-bold text-emerald-400 truncate"
                        title={formatCurrency(totalValue)}
                      >
                        {formatCurrency(totalValue)}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Action Section -->
                <div
                  class="space-y-3 pt-4 border-t border-slate-800/50 relative z-10"
                >
                  <div class="flex items-center justify-between px-1">
                    <span class="text-xs font-medium text-slate-500"
                      >Prix revente</span
                    >
                    <span class="font-mono font-bold text-slate-300 text-sm"
                      >{formatCurrency(resalePrice)}
                      <span class="text-[10px] text-slate-600 font-normal"
                        >/u</span
                      ></span
                    >
                  </div>

                  <div class="flex flex-col gap-3">
                    <!-- Qty Selector -->
                    <div
                      class="flex items-center gap-1 bg-slate-950 rounded-xl p-1 border border-slate-800 w-full"
                    >
                      <button
                        onclick={() =>
                          setSellQuantity(
                            invItem.id,
                            getSellQuantity(invItem.id) - 1,
                            invItem.quantity
                          )}
                        disabled={getSellQuantity(invItem.id) <= 1}
                        class="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-slate-900 border border-slate-800"
                        >-</button
                      >
                      <input
                        type="number"
                        class="flex-1 min-w-0 bg-transparent text-center font-mono font-bold text-sm text-white focus:outline-none"
                        value={getSellQuantity(invItem.id)}
                        oninput={(e) =>
                          setSellQuantity(
                            invItem.id,
                            parseInt(e.currentTarget.value) || 1,
                            invItem.quantity
                          )}
                      />
                      <button
                        onclick={() =>
                          setSellQuantity(
                            invItem.id,
                            getSellQuantity(invItem.id) + 1,
                            invItem.quantity
                          )}
                        disabled={getSellQuantity(invItem.id) >=
                          invItem.quantity}
                        class="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-slate-900 border border-slate-800"
                        >+</button
                      >
                      <button
                        onclick={() =>
                          setSellQuantity(
                            invItem.id,
                            invItem.quantity,
                            invItem.quantity
                          )}
                        class="px-2 h-8 text-[10px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-lg transition-colors border border-indigo-500/20 ml-1"
                      >
                        MAX
                      </button>
                    </div>

                    <div class="flex gap-2 w-full">
                      <!-- Deposit Button -->
                      <button
                        onclick={() => handleDeposit(invItem)}
                        disabled={depositingIds[invItem.id] ||
                          sellingIds[invItem.id]}
                        class="w-12 h-10 flex flex-shrink-0 items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-bold transition-all shadow-lg shadow-black/20 border border-slate-700 hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed group/lock"
                        title="Déposer dans la réserve sécurisée"
                      >
                        {#if depositingIds[invItem.id]}
                          <div
                            class="w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin"
                          ></div>
                        {:else}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="group-hover/lock:text-emerald-400 transition-colors"
                            ><rect
                              x="3"
                              y="11"
                              width="18"
                              height="11"
                              rx="2"
                              ry="2"
                            /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg
                          >
                        {/if}
                      </button>

                      <!-- Sell Button -->
                      <button
                        onclick={() => handleSell(invItem)}
                        disabled={sellingIds[invItem.id] ||
                          getSellQuantity(invItem.id) <= 0}
                        class="flex-1 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-emerald-500/50"
                      >
                        {#if sellingIds[invItem.id]}
                          <div
                            class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                          ></div>
                        {:else}
                          <span>Vendre</span>
                        {/if}
                      </button>
                    </div>
                  </div>

                  <div class="text-center pt-1">
                    <button
                      onclick={() => openSellAllConfirmation(invItem)}
                      class="text-[10px] text-slate-500 hover:text-emerald-400 transition-colors uppercase font-bold tracking-wider hover:underline decoration-emerald-500/30 underline-offset-4"
                    >
                      Tout vendre immédiatement
                    </button>
                  </div>
                </div>
              </div>
            {/if}
          {/each}
        </div>

        <InfiniteScroll onLoadMore={loadMore} loading={loadingMore} {hasMore} />
      {/if}
    {/if}
  </div>
</div>

<!-- Sell Confirmation Modal -->
{#if sellConfirmItem}
  {@const item = sellConfirmItem.expand?.item}
  {#if item}
    <SellConfirmation
      itemName={item.name}
      quantity={sellConfirmItem.quantity}
      unitPrice={item.base_price / 2}
      onConfirm={confirmSellAll}
      onCancel={closeSellConfirmation}
    />
  {/if}
{/if}
