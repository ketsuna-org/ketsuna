<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import type { InventoryItem, Company } from "$lib/pocketbase";
  import { fade } from "svelte/transition";
  import { sellItem } from "$lib/services/inventory";
  import { notifications } from "$lib/notifications";
  import { goto } from "$app/navigation";
  import FilterBar from "$lib/components/FilterBar.svelte";
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import SellConfirmation from "$lib/components/SellConfirmation.svelte";
  import { depositToReserve } from "$lib/services/reserve";
  import { getItem } from "$lib/data/game-static";

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
      parts.push(`item_id ~ "${searchQuery.trim()}"`);
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
    const item = getItem(invItem.item_id);
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
      try {
        await pb.send("/api/inventory/refresh", { method: "POST" });
      } catch (e) {
        console.warn("Failed to refresh inventory production", e);
      }
    } else {
      loadingMore = true;
    }

    try {
      const filter = buildFilterString();

      const result = await pb
        .collection("inventory")
        .getList<InventoryItem>(page, PER_PAGE, {
          filter,
          sort: "linked_storage,item_id", // Sort by storage first, then item
          expand: "linked_storage",
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

  async function subscribeToInventory() {
    if (unsubscribe) unsubscribe();

    try {
      unsubscribe = await pb
        .collection("inventory")
        .subscribe("*", async (e) => {
          const { action, record } = e;

          if (record.company !== $activeCompany?.id) return;

          if (action === "create" || action === "update") {
            try {
              const updatedRecord = await pb
                .collection("inventory")
                .getOne<InventoryItem>(record.id, { expand: "linked_storage" });

              const index = inventory.findIndex((i) => i.id === record.id);
              if (index > -1) {
                inventory[index] = updatedRecord;
              } else {
                if (action === "create") {
                  loadInventory(1, false);
                } else {
                  inventory.push(updatedRecord);
                }
              }

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
    const item = getItem(invItem.item_id);
    if (!item || qty <= 0 || qty > invItem.quantity) return;

    sellingIds[invItem.id] = true;
    try {
      const res = await sellItem(invItem.item_id, qty);
      notifications.success(`Vente réussie: +${formatCurrency(res.revenue)}`);

      const index = inventory.findIndex((i) => i.id === invItem.id);
      if (index !== -1) {
        const newQty = inventory[index].quantity - qty;
        if (newQty <= 0) {
          inventory = inventory.filter((i) => i.id !== invItem.id);
          delete sellQuantities[invItem.id];
        } else {
          inventory[index].quantity = newQty;
          sellQuantities[invItem.id] = 1;
        }
      }

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

  // Helper to get display name for storage
  function getStorageName(invItem: InventoryItem): string {
    if (!invItem.linked_storage || !invItem.expand?.linked_storage) {
      return "Inventaire Général";
    }
    const machine = invItem.expand.linked_storage;
    const itemDef = getItem(machine.machine_id);
    return itemDef ? itemDef.name : "Entrepôt";
  }

  type InventoryGroup = {
    name: string;
    isGeneral: boolean;
    items: InventoryItem[];
  };

  let inventoryGroups = $derived.by(() => {
    const groups: InventoryGroup[] = [];
    let currentGroup: InventoryGroup | null = null;

    for (const item of inventory) {
      const name = getStorageName(item);
      if (!currentGroup || currentGroup.name !== name) {
        currentGroup = {
          name,
          isGeneral: name === "Inventaire Général",
          items: [],
        };
        groups.push(currentGroup);
      }
      currentGroup.items.push(item);
    }
    return groups;
  });
</script>

<div class="space-y-8">
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
        Vos entrepôts sont vides. Produisez des ressources dans l'usine ou
        achetez-en au marché pour commencer.
      </p>
      <button
        onclick={() => goto("/factory")}
        class="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
      >
        Aller à l'usine
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
      Affichage de <span class="text-white font-bold">{inventory.length}</span>
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
      <div class="space-y-12">
        {#each inventoryGroups as group}
          <div class="space-y-6">
            <!-- Group Header -->
            <div
              class="flex items-center gap-4 pb-3 border-b border-slate-800/50 relative overflow-hidden group/header"
            >
              <div
                class="absolute bottom-0 left-0 w-32 h-px bg-linear-to-r from-indigo-500 to-transparent"
              ></div>

              <div
                class="w-12 h-12 rounded-2xl bg-slate-900/80 flex items-center justify-center border border-slate-800 shadow-xl shadow-black/20 group-hover/header:border-indigo-500/30 group-hover/header:shadow-indigo-500/10 transition-all duration-500 relative overflow-hidden"
              >
                <div
                  class="absolute inset-0 bg-linear-to-br from-indigo-500/10 to-transparent opacity-0 group-hover/header:opacity-100 transition-opacity"
                ></div>
                <div class="relative z-10 text-indigo-400">
                  {#if group.isGeneral}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><rect width="20" height="14" x="2" y="3" rx="2" /><line
                        x1="8"
                        x2="16"
                        y1="21"
                        y2="21"
                      /><line x1="12" x2="12" y1="17" y2="21" /></svg
                    >
                  {:else}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><path
                        d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
                      /><path d="m3.3 7 8.7 5 8.7-5" /><path
                        d="M12 22.08V12"
                      /></svg
                    >
                  {/if}
                </div>
              </div>

              <div>
                <h2
                  class="text-2xl font-bold text-white tracking-tight flex items-center gap-3"
                >
                  {group.name}
                  {#if !group.isGeneral}
                    <span
                      class="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest"
                      >Stockage</span
                    >
                  {/if}
                </h2>
                <p class="text-slate-400 text-sm font-medium">
                  {group.items.length} item{group.items.length > 1 ? "s" : ""} dans
                  cette section
                </p>
              </div>
            </div>

            <!-- Items Grid -->
            <div
              class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {#each group.items as invItem (invItem.id)}
                {@const item = getItem(invItem.item_id)}
                {@const resalePrice = item ? item.base_price / 2 : 0}

                {#if item}
                  {@const typeColor =
                    item.type === "Machine"
                      ? "amber"
                      : item.type === "Ressource Brute"
                        ? "emerald"
                        : "cyan"}

                  <div
                    class="group relative bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800 hover:border-{typeColor}-500/30 rounded-3xl p-1 transition-all duration-300 hover:shadow-2xl hover:shadow-{typeColor}-500/10 hover:-translate-y-1 backdrop-blur-md"
                  >
                    <!-- Glossy overlay -->
                    <div
                      class="absolute inset-0 rounded-3xl bg-linear-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    ></div>

                    <div
                      class="relative h-full flex flex-col p-5 rounded-[20px] overflow-hidden"
                    >
                      <!-- Background Glow Blob -->
                      <div
                        class="absolute -right-12 -top-12 w-48 h-48 bg-{typeColor}-500/10 rounded-full blur-3xl group-hover:bg-{typeColor}-500/20 transition-all duration-500"
                      ></div>

                      <!-- Header: Icon & Qty -->
                      <div
                        class="flex justify-between items-start mb-6 relative z-10"
                      >
                        <div class="relative">
                          <div
                            class="w-14 h-14 rounded-2xl bg-slate-950/80 border border-slate-800 group-hover:border-{typeColor}-500/40 flex items-center justify-center p-2 shadow-lg transition-colors duration-300"
                          >
                            <!-- Item Icon Component or Fallback SVG -->
                            {#if item.icon && item.icon.startsWith("/")}
                              <img
                                src={item.icon}
                                alt={item.name}
                                class="w-full h-full object-contain"
                              />
                            {:else}
                              <span class="text-2xl">
                                {#if item.type === "Machine"}🏭{:else if item.type === "Ressource Brute"}🪨{:else}📦{/if}
                              </span>
                            {/if}
                          </div>
                          <!-- Rarity/Type Dot -->
                          <div
                            class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center"
                          >
                            <div
                              class="w-2.5 h-2.5 rounded-full bg-{typeColor}-500 shadow-[0_0_8px_rgba(var(--{typeColor}-500),0.8)] animate-pulse"
                            ></div>
                          </div>
                        </div>

                        <div class="text-right">
                          <div
                            class="text-3xl font-black text-white tracking-tight tabular-nums drop-shadow-lg"
                          >
                            {Math.floor(invItem.quantity)}
                          </div>
                          <div
                            class="text-[10px] font-bold uppercase tracking-wider text-{typeColor}-400/80"
                          >
                            En Stock
                          </div>
                        </div>
                      </div>

                      <!-- Content -->
                      <div class="relative z-10 mb-6 flex-1">
                        <h3
                          class="text-lg font-bold text-slate-200 group-hover:text-white transition-colors line-clamp-1"
                          title={item.name}
                        >
                          {item.name}
                        </h3>
                        <div class="flex items-center gap-2 mt-1">
                          <span
                            class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50 group-hover:border-{typeColor}-500/20 transition-colors"
                          >
                            {item.type}
                          </span>
                        </div>
                      </div>

                      <!-- Footer / Actions -->
                      <div
                        class="relative z-10 mt-auto pt-4 border-t border-slate-800/50 group-hover:border-{typeColor}-500/10 transition-colors space-y-3"
                      >
                        <!-- Price Info -->
                        <div class="flex justify-between items-center text-xs">
                          <span class="text-slate-500 font-medium"
                            >Valeur unitaire</span
                          >
                          <span class="text-slate-300 font-mono font-bold"
                            >{formatCurrency(resalePrice)}</span
                          >
                        </div>

                        <!-- Interactive Controls (Always visible for better UX, or reveal on hover) -->
                        <div class="flex flex-col gap-2">
                          <!-- Qty Input -->
                          <div
                            class="flex items-center bg-slate-950/50 rounded-lg p-1 border border-slate-800 group-hover:border-slate-700 transition-colors"
                          >
                            <button
                              onclick={() =>
                                setSellQuantity(
                                  invItem.id,
                                  getSellQuantity(invItem.id) - 1,
                                  invItem.quantity
                                )}
                              disabled={getSellQuantity(invItem.id) <= 1}
                              class="w-6 h-6 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                              >-</button
                            >
                            <input
                              type="number"
                              value={getSellQuantity(invItem.id)}
                              oninput={(e) =>
                                setSellQuantity(
                                  invItem.id,
                                  parseInt(e.currentTarget.value) || 1,
                                  invItem.quantity
                                )}
                              class="flex-1 bg-transparent text-center font-mono text-sm font-bold text-white focus:outline-none min-w-0"
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
                              class="w-6 h-6 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                              >+</button
                            >
                          </div>

                          <!-- Buttons -->
                          <div class="grid grid-cols-[auto_1fr] gap-2">
                            <button
                              onclick={() => handleDeposit(invItem)}
                              disabled={depositingIds[invItem.id] ||
                                sellingIds[invItem.id]}
                              class="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-800/50 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 text-slate-400 hover:text-white border border-slate-700 hover:border-indigo-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group/deposit"
                              title="Déposer dans la réserve"
                            >
                              {#if depositingIds[invItem.id]}
                                <div
                                  class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"
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

                            <button
                              onclick={() => handleSell(invItem)}
                              disabled={sellingIds[invItem.id] ||
                                getSellQuantity(invItem.id) <= 0}
                              class="h-9 flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 hover:border-emerald-400 font-bold text-xs uppercase tracking-wide transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {#if sellingIds[invItem.id]}
                                <div
                                  class="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"
                                ></div>
                              {:else}
                                Vendre
                              {/if}
                            </button>
                          </div>
                        </div>

                        <!-- "Sell All" Link -->
                        <div class="text-center">
                          <button
                            onclick={() => openSellAllConfirmation(invItem)}
                            class="text-[9px] font-bold text-slate-600 hover:text-white transition-colors uppercase tracking-widest hover:underline decoration-white/30"
                          >
                            Tout Vendre
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if hasMore}
      <InfiniteScroll
        loading={loadingMore}
        onLoadMore={() => loadInventory(currentPage + 1, true)}
      />
    {/if}
  {/if}
</div>

<!-- Sell Confirmation Modal -->
{#if sellConfirmItem}
  {@const item = getItem(sellConfirmItem.item_id)}
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
