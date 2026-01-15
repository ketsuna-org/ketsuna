<script lang="ts">
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import type { InventoryItem, Company } from "$lib/pocketbase";
  import { fade } from "svelte/transition";
  import {
    sellItem,
    sellInventoryBulk,
    fetchInventoryState,
  } from "$lib/services/inventory";
  import { notifications } from "$lib/notifications";
  import { goto } from "$app/navigation";
  import FilterBar from "$lib/components/FilterBar.svelte";
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import SellConfirmation from "$lib/components/SellConfirmation.svelte";
  import { getItem } from "$lib/data/game-static";

  const PER_PAGE = 20;

  let inventory = $state<InventoryItem[]>([]);
  let loading = $state(true);
  let loadingMore = $state(false);
  let currentPage = $state(1);
  let hasMore = $state(true);
  let totalItems = $state(0);

  // Track quantity to sell per item
  let sellQuantities = $state<Record<string, number>>({});
  let sellingIds = $state<Record<string, boolean>>({});
  let depositingIds = $state<Record<string, boolean>>({});

  // Bulk sell state
  let bulkSellGroup = $state<InventoryGroup | null>(null);
  let bulkSelling = $state(false);

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

  async function loadInventory(page: number = 1, append: boolean = false) {
    if (!$activeCompany) return;

    if (page === 1) {
      loading = true;
    } else {
      loadingMore = true;
    }

    try {
      const filter = buildFilterString();

      const result = await fetchInventoryState({
        page,
        perPage: PER_PAGE,
        filter,
        sort: "linked_storage,item_id",
        expand: "linked_storage",
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
      // Pass linked_storage so backend sells from the correct inventory (general vs storage unit)
      const res = await sellItem(
        invItem.item_id,
        qty,
        invItem.linked_storage || "",
      );
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

  function openBulkSell(group: InventoryGroup) {
    bulkSellGroup = group;
  }

  function closeBulkSell() {
    bulkSellGroup = null;
  }

  function getGroupSummary(group: InventoryGroup) {
    return group.items.reduce(
      (acc, inv) => {
        const item = getItem(inv.item_id);
        const price = item ? item.base_price / 2 : 0;
        acc.itemCount += 1;
        acc.totalQuantity += inv.quantity;
        acc.estimatedRevenue += inv.quantity * price;
        return acc;
      },
      { itemCount: 0, totalQuantity: 0, estimatedRevenue: 0 },
    );
  }

  async function handleBulkSell() {
    if (!bulkSellGroup) return;

    const payloadItems = bulkSellGroup.items
      .filter((inv) => inv.quantity > 0)
      .map((inv) => ({ itemId: inv.item_id, quantity: inv.quantity }));

    if (payloadItems.length === 0) {
      notifications.error("Aucun item à vendre dans ce stockage");
      return;
    }

    bulkSelling = true;
    try {
      const res = await sellInventoryBulk(
        bulkSellGroup.storageId,
        payloadItems,
      );
      notifications.success(
        `Vente groupée réussie: +${formatCurrency(res.totalRevenue)}`,
      );

      if (res.failures?.length) {
        notifications.error(
          `${res.failures.length} échec(s) lors de la vente groupée`,
        );
      }

      // Apply optimistic update without full refresh
      const soldMap = new Map<string, number>();
      res.itemsSold?.forEach((s) => {
        soldMap.set(s.itemId, (soldMap.get(s.itemId) || 0) + s.quantity);
      });

      let removedCount = 0;
      const nextInventory: InventoryItem[] = [];

      for (const inv of inventory) {
        const sameStorage =
          (inv.linked_storage || "") === bulkSellGroup.storageId;
        if (sameStorage) {
          const soldQty = soldMap.get(inv.item_id) || 0;
          if (soldQty > 0) {
            const remaining = inv.quantity - soldQty;
            if (remaining > 0) {
              inv.quantity = remaining;
              sellQuantities[inv.id] = Math.min(
                sellQuantities[inv.id] || 1,
                Math.floor(remaining),
              );
              nextInventory.push(inv);
            } else {
              removedCount += 1;
              delete sellQuantities[inv.id];
            }
            soldMap.set(inv.item_id, 0);
            continue;
          }
        }
        nextInventory.push(inv);
      }

      inventory = nextInventory;
      totalItems = Math.max(0, totalItems - removedCount);

      if ($activeCompany) {
        const updatedCompany = await pb
          .collection("companies")
          .getOne<Company>($activeCompany.id);
        activeCompany.set(updatedCompany);
      }

      closeBulkSell();
    } catch (err: any) {
      notifications.error(err?.message || "Erreur lors de la vente groupée");
    } finally {
      bulkSelling = false;
    }
  }

  function formatCurrency(val: number) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(val);
  }

  // Load inventory when company changes (track by ID, not object reference)
  let lastInventoryCompanyId: string | null = null;
  $effect(() => {
    const companyId = $activeCompany?.id;
    if (companyId && companyId !== lastInventoryCompanyId) {
      lastInventoryCompanyId = companyId;
      currentPage = 1;
      hasMore = true;
      loadInventory(1, false);
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
    storageId: string;
    items: InventoryItem[];
  };

  let inventoryGroups = $derived.by(() => {
    const groups: InventoryGroup[] = [];
    let currentGroup: InventoryGroup | null = null;

    for (const item of inventory) {
      const storageId = item.linked_storage || "";
      const name = getStorageName(item);
      if (!currentGroup || currentGroup.storageId !== storageId) {
        currentGroup = {
          name,
          isGeneral: name === "Inventaire Général",
          storageId,
          items: [],
        };
        groups.push(currentGroup);
      }
      currentGroup.items.push(item);
    }
    return groups;
  });
</script>

<div class="h-full overflow-y-auto pr-2 custom-scrollbar space-y-8">
  {#if loading}
    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {#each Array(8) as _}
        <div
          class="h-80 bg-[#1e293b] rounded-xl animate-pulse border border-[#334155]"
        ></div>
      {/each}
    </div>
  {:else if inventory.length === 0 && !searchQuery && Object.keys(selectedFilters).filter((k) => selectedFilters[k]).length === 0}
    <div
      class="flex flex-col items-center justify-center py-20 bg-[#1e293b]/50 rounded-xl border-2 border-dashed border-[#334155]"
      in:fade
    >
      <div
        class="w-20 h-20 bg-[#0f172a] rounded-full flex items-center justify-center mb-6 text-slate-600 border border-[#334155]"
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
      <h3
        class="text-2xl font-black text-slate-200 mb-2 uppercase tracking-wide"
      >
        Entrepôt Vide
      </h3>
      <p class="text-slate-500 max-w-md text-center mb-8">
        Vos entrepôts sont vides. Produisez des ressources ou achetez-en pour
        commencer.
      </p>
      <button
        onclick={() => goto("/factory")}
        class="px-8 py-3 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white font-bold rounded-lg shadow-[0_4px_0_#312e81] hover:shadow-[0_2px_0_#312e81] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all uppercase tracking-widest text-xs border border-indigo-500/50"
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
    <div
      class="text-xs text-slate-500 font-bold uppercase tracking-widest px-1 py-2 border-b border-[#334155]/50 flex justify-between items-center"
    >
      <span>Contenu de l'entrepôt</span>
      <span>{inventory.length} / {totalItems}</span>
    </div>

    {#if inventory.length === 0}
      <div
        class="text-center py-12 bg-[#1e293b]/50 rounded-xl border border-[#334155]"
      >
        <span class="text-3xl block mb-3 opacity-50">🔍</span>
        <p
          class="text-lg font-bold text-slate-300 mb-1 uppercase tracking-wide"
        >
          Aucun résultat
        </p>
        <p class="text-xs text-slate-500">
          Aucun item ne correspond à vos critères.
        </p>
      </div>
    {:else}
      <div class="space-y-12">
        {#each inventoryGroups as group}
          <div class="space-y-6">
            <!-- Group Header -->
            <div
              class="flex items-center justify-between gap-4 pb-3 border-b border-[#334155] relative overflow-hidden group/header"
            >
              <div
                class="absolute bottom-0 left-0 w-32 h-px bg-gradient-to-r from-indigo-500 to-transparent"
              ></div>

              <div class="flex items-center gap-4">
                <div
                  class="w-12 h-12 rounded-lg bg-[#0f172a] flex items-center justify-center border border-[#334155] group-hover/header:border-indigo-500/50 transition-all duration-300 relative overflow-hidden shadow-inner"
                >
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
                    class="text-xl font-bold text-slate-200 tracking-wide flex items-center gap-3 uppercase"
                  >
                    {group.name}
                    {#if !group.isGeneral}
                      <span
                        class="px-2 py-0.5 rounded bg-indigo-950/30 border border-indigo-900/50 text-[10px] font-bold text-indigo-400 uppercase tracking-widest"
                        >Stockage</span
                      >
                    {/if}
                  </h2>
                  <p
                    class="text-slate-500 text-xs font-medium uppercase tracking-wider"
                  >
                    {group.items.length} item{group.items.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <button
                onclick={() => openBulkSell(group)}
                class="px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-indigo-900/60 bg-indigo-950/30 text-indigo-200 hover:bg-indigo-800/40 hover:border-indigo-500/60 transition-colors flex items-center gap-2"
                disabled={bulkSelling}
              >
                {#if bulkSelling && bulkSellGroup?.storageId === group.storageId}
                  <span
                    class="w-3 h-3 border-2 border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin"
                  ></span>
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
                    ><path d="M21 15V6" /><path d="M18 10.5 21 6l3 4.5" /><path
                      d="M21 19v2"
                    /><path d="M3 6h8" /><path d="M3 12h6" /><path
                      d="M3 18h4"
                    /></svg
                  >
                {/if}
                Vendre l'inventaire
              </button>
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
                    class="group relative bg-[#1e293b] border border-[#334155] rounded-xl hover:border-{typeColor}-500/50 p-5 transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/50 flex flex-col overflow-hidden"
                  >
                    <!-- Top accent -->
                    <div
                      class="absolute top-0 left-0 w-full h-1 bg-{typeColor}-500/0 group-hover:bg-{typeColor}-500/100 transition-colors duration-300"
                    ></div>

                    <!-- Header -->
                    <div
                      class="flex justify-between items-start mb-5 relative z-10"
                    >
                      <div class="relative">
                        <div
                          class="w-14 h-14 rounded-lg bg-[#0f172a] border border-[#334155] group-hover:border-{typeColor}-500/40 flex items-center justify-center p-2 shadow-inner transition-colors duration-300"
                        >
                          {#if item.icon && item.icon.startsWith("/")}
                            <img
                              src={`https://api.ketsuna.com${item.icon}`}
                              alt={item.name}
                              class="w-full h-full object-contain"
                            />
                          {:else}
                            <span class="text-2xl">
                              {#if item.type === "Machine"}🏭{:else if item.type === "Ressource Brute"}🪨{:else}📦{/if}
                            </span>
                          {/if}
                        </div>
                      </div>

                      <div class="text-right">
                        <div
                          class="text-2xl font-black text-white tracking-tight tabular-nums drop-shadow-sm font-mono"
                        >
                          {Math.floor(invItem.quantity)}
                        </div>
                        <div
                          class="text-[9px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-{typeColor}-400 transition-colors"
                        >
                          En Stock
                        </div>
                      </div>
                    </div>

                    <!-- Content -->
                    <div class="relative z-10 mb-4 flex-1">
                      <h3
                        class="text-base font-bold text-slate-200 group-hover:text-white transition-colors line-clamp-1 uppercase tracking-tight"
                        title={item.name}
                      >
                        {item.name}
                      </h3>
                      <div class="flex items-center gap-2 mt-2">
                        <span
                          class="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0f172a] text-slate-400 border border-[#334155] uppercase tracking-wider"
                        >
                          {item.type}
                        </span>
                      </div>
                    </div>

                    <!-- Footer / Actions -->
                    <div
                      class="relative z-10 mt-auto pt-4 border-t border-[#334155]/50 space-y-3"
                    >
                      <!-- Price Info -->
                      <div class="flex justify-between items-center text-xs">
                        <span
                          class="text-slate-500 font-bold uppercase tracking-wider"
                          >Valeur unit.</span
                        >
                        <span class="text-slate-300 font-mono font-bold"
                          >{formatCurrency(resalePrice)}</span
                        >
                      </div>

                      <!-- Controls -->
                      <div class="space-y-2">
                        <!-- Qty Input -->
                        <div
                          class="flex items-center bg-[#0f172a] rounded-lg p-1 border border-[#334155]"
                        >
                          <button
                            onclick={() =>
                              setSellQuantity(
                                invItem.id,
                                getSellQuantity(invItem.id) - 1,
                                invItem.quantity,
                              )}
                            disabled={getSellQuantity(invItem.id) <= 1}
                            class="w-7 h-7 flex items-center justify-center rounded bg-[#1e293b] hover:bg-[#334155] text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                            >-</button
                          >
                          <input
                            type="number"
                            value={getSellQuantity(invItem.id)}
                            oninput={(e) =>
                              setSellQuantity(
                                invItem.id,
                                parseInt(e.currentTarget.value) || 1,
                                invItem.quantity,
                              )}
                            class="flex-1 bg-transparent text-center font-mono text-sm font-bold text-white focus:outline-none min-w-0"
                          />
                          <button
                            onclick={() =>
                              setSellQuantity(
                                invItem.id,
                                getSellQuantity(invItem.id) + 1,
                                invItem.quantity,
                              )}
                            disabled={getSellQuantity(invItem.id) >=
                              invItem.quantity}
                            class="w-7 h-7 flex items-center justify-center rounded bg-[#1e293b] hover:bg-[#334155] text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                            >+</button
                          >
                        </div>

                        <!-- Action Buttons -->
                        <div class="grid grid-cols-[auto_1fr] gap-2">
                          <button
                            onclick={() => handleSell(invItem)}
                            disabled={sellingIds[invItem.id] ||
                              getSellQuantity(invItem.id) <= 0}
                            class="h-9 w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-950/30 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-900/50 hover:border-emerald-500 font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm hover:shadow-lg hover:shadow-emerald-900/20 disabled:opacity-50"
                          >
                            {#if sellingIds[invItem.id]}
                              <div
                                class="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"
                              ></div>
                            {:else}
                              VENDRE
                            {/if}
                          </button>
                        </div>
                      </div>

                      <!-- Sell All Link -->
                      <div class="text-center pt-1">
                        <button
                          onclick={() => openSellAllConfirmation(invItem)}
                          class="text-[9px] font-bold text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-widest hover:underline decoration-slate-500/30"
                        >
                          Tout Vendre
                        </button>
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

  {#if bulkSellGroup}
    {@const summary = getGroupSummary(bulkSellGroup)}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      transition:fade={{ duration: 150 }}
      class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onclick={(e) => {
        if (e.target === e.currentTarget && !bulkSelling) closeBulkSell();
      }}
      onkeydown={(e) => {
        if (e.key === "Escape" && !bulkSelling) closeBulkSell();
      }}
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <div
        transition:fade={{ duration: 150 }}
        class="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl max-w-2xl w-full p-8 relative overflow-hidden"
        role="document"
      >
        <div
          class="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 blur-[100px] translate-x-1/4 -translate-y-1/4 pointer-events-none"
        ></div>

        <div class="flex items-center justify-between gap-4 mb-6 relative z-10">
          <div class="space-y-1">
            <p
              class="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold"
            >
              Vente groupée
            </p>
            <h2 class="text-2xl font-black text-white tracking-tight">
              {bulkSellGroup.name}
            </h2>
            <p class="text-slate-500 text-sm">
              Stockage ciblé: {bulkSellGroup.isGeneral
                ? "Inventaire Général"
                : "Unité de stockage"}
            </p>
          </div>
          <button
            onclick={() => !bulkSelling && closeBulkSell()}
            class="w-10 h-10 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700 hover:border-slate-600 transition-colors"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 relative z-10">
          <div class="p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
            <p
              class="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1"
            >
              Items
            </p>
            <p class="text-xl font-black text-white">{summary.itemCount}</p>
          </div>
          <div class="p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
            <p
              class="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1"
            >
              Quantité totale
            </p>
            <p class="text-xl font-black text-white">
              {Math.floor(summary.totalQuantity)}
            </p>
          </div>
          <div class="p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
            <p
              class="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1"
            >
              Revenu estimé
            </p>
            <p class="text-xl font-black text-emerald-400">
              {formatCurrency(summary.estimatedRevenue)}
            </p>
          </div>
        </div>

        <div
          class="max-h-64 overflow-auto mb-6 relative z-10 rounded-2xl border border-slate-800 bg-slate-950/50"
        >
          <table class="w-full text-sm">
            <thead
              class="text-[11px] uppercase tracking-widest text-slate-500 border-b border-slate-800"
            >
              <tr>
                <th class="text-left px-4 py-2">Item</th>
                <th class="text-left px-4 py-2">Type</th>
                <th class="text-right px-4 py-2">Quantité</th>
                <th class="text-right px-4 py-2">Valeur estimée</th>
              </tr>
            </thead>
            <tbody>
              {#each bulkSellGroup.items as inv}
                {@const item = getItem(inv.item_id)}
                {@const price = item ? item.base_price / 2 : 0}
                <tr class="border-b border-slate-800/80 last:border-b-0">
                  <td class="px-4 py-2 text-white font-semibold"
                    >{item?.name || inv.item_id}</td
                  >
                  <td
                    class="px-4 py-2 text-slate-400 text-xs uppercase tracking-widest"
                    >{item?.type || ""}</td
                  >
                  <td class="px-4 py-2 text-right text-slate-200 font-mono"
                    >{Math.floor(inv.quantity)}</td
                  >
                  <td class="px-4 py-2 text-right text-emerald-300 font-mono"
                    >{formatCurrency(inv.quantity * price)}</td
                  >
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <div class="flex gap-4 relative z-10">
          <button
            onclick={() => !bulkSelling && closeBulkSell()}
            class="flex-1 px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-all border border-slate-700 hover:border-slate-600 active:scale-95 disabled:opacity-50"
            disabled={bulkSelling}
          >
            Annuler
          </button>
          <button
            onclick={handleBulkSell}
            class="flex-1 px-4 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95 border border-emerald-500/50 disabled:opacity-60 flex items-center justify-center gap-2"
            disabled={bulkSelling}
          >
            {#if bulkSelling}
              <span
                class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
              ></span>
              Vente en cours
            {:else}
              Confirmer la vente
            {/if}
          </button>
        </div>
      </div>
    </div>
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
