<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import type { InventoryItem } from "$lib/types";
  import { fly, fade } from "svelte/transition";
  import { sellItem } from "$lib/services/inventory";
  import { notifications } from "$lib/notifications";
  import { goto } from "$app/navigation";
  import FilterBar from "$lib/components/FilterBar.svelte";
  import SellConfirmation from "$lib/components/SellConfirmation.svelte";
  import { depositToReserve } from "$lib/services/reserve";

  let inventory = $state<InventoryItem[]>([]);
  let loading = $state(true);
  let unsubscribe: () => void;
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

  // Filtered inventory
  let filteredInventory = $derived.by(() => {
    return inventory.filter((inv) => {
      const item = inv.expand?.item;
      if (!item) return false;
      // Search filter
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      // Type filter
      if (selectedFilters.type && item.type !== selectedFilters.type) {
        return false;
      }
      return true;
    });
  });

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
    if (qty <= 0) return;

    depositingIds[invItem.id] = true;
    try {
      await depositToReserve(invItem.expand.item.id, qty);
      notifications.success(`Déposé: ${qty}x ${invItem.expand.item.name}`);
      await loadInventory();
    } catch (e: any) {
      notifications.error(e.message);
    } finally {
      depositingIds[invItem.id] = false;
    }
  }

  async function loadInventory() {
    if (!$activeCompany) return;
    loading = true;
    try {
      // Expand 'item' to get details like name, price, type
      const result = await pb
        .collection("inventory")
        .getList<InventoryItem>(1, 50, {
          filter: `company = "${$activeCompany.id}"`,
          expand: "item",
          sort: "item.name",
        });
      inventory = result.items;

      // Initialize sell quantities
      inventory.forEach((inv) => {
        if (!sellQuantities[inv.id]) {
          sellQuantities[inv.id] = 1;
        }
      });
    } catch (e) {
      console.error("Failed to load inventory", e);
    } finally {
      loading = false;
    }
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

              const index = inventory.findIndex((i) => i.id === record.id);
              if (index > -1) {
                // Proper Svelte 5 reactivity: create new array
                inventory = [
                  ...inventory.slice(0, index),
                  updatedRecord,
                  ...inventory.slice(index + 1),
                ];
              } else {
                inventory = [...inventory, updatedRecord].sort((a, b) =>
                  (a.expand?.item?.name || "").localeCompare(
                    b.expand?.item?.name || "",
                  ),
                );
              }
              // Initialize sell quantity if new
              if (!sellQuantities[record.id]) {
                sellQuantities = { ...sellQuantities, [record.id]: 1 };
              }
            } catch (fetchErr) {
              console.error(
                "[REALTIME] Failed to fetch updated record:",
                fetchErr,
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
          .getOne($activeCompany.id);
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
      loadInventory().then(() => {
        subscribeToInventory();
      });
    }
  });
</script>

<div class="min-h-screen bg-slate-950 text-slate-200 p-6">
  <div class="max-w-7xl mx-auto space-y-8">
    <!-- Header -->
    <header
      class="flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div class="flex items-center gap-4">
        <button
          onclick={() => goto("/company")}
          class="text-slate-400 hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          ← Entreprise
        </button>
        <div>
          <h1 class="text-4xl font-black text-white tracking-tight">
            Inventaire & Stockage
          </h1>
          <p class="text-slate-400 mt-1">
            Gérez votre production et vendez vos stocks.
          </p>
        </div>
      </div>
    </header>

    {#if loading}
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {#each Array(8) as _}
          <div class="h-64 bg-slate-900/50 rounded-3xl animate-pulse"></div>
        {/each}
      </div>
    {:else if inventory.length === 0}
      <div
        class="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-3xl border border-white/5"
        in:fade
      >
        <div
          class="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4"
        >
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
            class="text-slate-600"
            ><path
              d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
            /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22.08V12" /></svg
          >
        </div>
        <h3 class="text-xl font-bold text-white mb-2">Entrepôt Vide</h3>
        <p class="text-slate-500 max-w-md text-center">
          Vos entrepôts sont vides. Produisez des ressources dans l'atelier ou
          achetez-en au marché pour commencer.
        </p>
        <button
          onclick={() => goto("/workshop")}
          class="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
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
      />

      <!-- Results count -->
      <div class="text-sm text-slate-400 mb-4">
        {filteredInventory.length} item(s) sur {inventory.length}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each filteredInventory as invItem (invItem.id)}
          {@const item = invItem.expand?.item}
          {@const resalePrice = item ? item.base_price / 2 : 0}
          {@const totalValue = resalePrice * invItem.quantity}

          {#if item}
            <div
              transition:fly={{ y: 20, duration: 400 }}
              class="group bg-slate-900 border border-white/5 rounded-3xl p-6 transition-all hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between"
            >
              <div>
                <div class="flex justify-between items-start mb-4">
                  <!-- Icon -->
                  <div
                    class="p-3 rounded-2xl bg-slate-800 text-slate-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-colors"
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
                    class="text-[10px] font-black uppercase tracking-tighter bg-white/5 px-2 py-1 rounded-md text-slate-500"
                  >
                    {item.type}
                  </span>
                </div>

                <h3 class="text-xl font-bold text-white mb-2">{item.name}</h3>

                <div class="flex justify-between items-end mb-4">
                  <div>
                    <span
                      class="text-[10px] text-slate-500 uppercase font-black tracking-wider"
                      >Quantité</span
                    >
                    <div class="text-3xl font-mono font-black text-white">
                      {invItem.quantity}
                    </div>
                  </div>
                  <div class="text-right">
                    <span
                      class="text-[10px] text-slate-500 uppercase font-black tracking-wider"
                      >Valeur Totale</span
                    >
                    <div class="text-lg font-mono font-bold text-emerald-400">
                      {formatCurrency(totalValue)}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Action Section -->
              <div class="space-y-3 pt-4 border-t border-white/5">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-slate-500"
                    >Prix de revente estimé</span
                  >
                  <span class="font-mono font-bold text-white text-sm"
                    >{formatCurrency(resalePrice)}
                    <span class="text-xs text-slate-600 font-normal">/u</span
                    ></span
                  >
                </div>

                <div class="flex gap-2">
                  <!-- Qty Selector -->
                  <div
                    class="flex items-center gap-1 bg-slate-800 rounded-xl p-1 border border-white/5"
                  >
                    <button
                      onclick={() =>
                        setSellQuantity(
                          invItem.id,
                          getSellQuantity(invItem.id) - 1,
                          invItem.quantity,
                        )}
                      disabled={getSellQuantity(invItem.id) <= 1}
                      class="w-8 h-8 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                      >-</button
                    >
                    <input
                      type="number"
                      class="w-12 bg-transparent text-center font-mono font-bold text-sm text-white focus:outline-none"
                      value={getSellQuantity(invItem.id)}
                      oninput={(e) =>
                        setSellQuantity(
                          invItem.id,
                          parseInt(e.currentTarget.value) || 1,
                          invItem.quantity,
                        )}
                    />
                    <button
                      onclick={() =>
                        setSellQuantity(
                          invItem.id,
                          getSellQuantity(invItem.id) + 1,
                          invItem.quantity,
                        )}
                      disabled={getSellQuantity(invItem.id) >= invItem.quantity}
                      class="w-8 h-8 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                      >+</button
                    >
                  </div>

                  <div class="flex gap-2 flex-1">
                    <!-- Deposit Button -->
                    <button
                      onclick={() => handleDeposit(invItem)}
                      disabled={depositingIds[invItem.id] ||
                        sellingIds[invItem.id]}
                      class="w-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Déposer dans la réserve sécurisée"
                    >
                      {#if depositingIds[invItem.id]}
                        <div
                          class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                        ></div>
                      {:else}
                        🔒
                      {/if}
                    </button>

                    <!-- Sell Button -->
                    <button
                      onclick={() => handleSell(invItem)}
                      disabled={sellingIds[invItem.id] ||
                        getSellQuantity(invItem.id) <= 0}
                      class="flex-1 py-1 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {#if sellingIds[invItem.id]}
                        <div
                          class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                        ></div>
                      {:else}
                        Vendre
                      {/if}
                    </button>
                  </div>
                </div>

                <div class="text-center">
                  <button
                    onclick={() => openSellAllConfirmation(invItem)}
                    class="text-[10px] text-slate-500 hover:text-emerald-400 transition-colors uppercase font-bold tracking-wider"
                  >
                    Tout vendre
                  </button>
                </div>
              </div>
            </div>
          {/if}
        {/each}
      </div>
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
