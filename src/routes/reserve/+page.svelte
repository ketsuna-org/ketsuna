<script lang="ts">
    import { onMount } from "svelte";
    import { activeCompany } from "$lib/stores";
    import { fade, slide } from "svelte/transition";
    import {
        withdrawFromReserve,
        fetchReserveItems,
        getReserveOverview,
        type ReserveItem,
        type ReserveOverview,
    } from "$lib/services/reserve";
    import { notifications } from "$lib/notifications";
    import { goto } from "$app/navigation";
    import FilterBar from "$lib/components/FilterBar.svelte";

    let reserveItems = $state<ReserveItem[]>([]);
    let overview = $state<ReserveOverview>({ used: 0, max: 0 });
    let loading = $state(true);
    let withdrawingIds = $state<Record<string, boolean>>({});
    let withdrawQuantities = $state<Record<string, number>>({});

    // Filtering
    let searchQuery = $state("");
    let filteredItems = $derived.by(() => {
        return reserveItems.filter((res) => {
            const item = res.expand?.item;
            if (!item) return false;
            if (
                searchQuery &&
                !item.name.toLowerCase().includes(searchQuery.toLowerCase())
            ) {
                return false;
            }
            return true;
        });
    });

    onMount(async () => {
        if (!$activeCompany) return;
        loadData();
    });

    async function loadData() {
        if (!$activeCompany) return;
        loading = true;
        try {
            const [items, ov] = await Promise.all([
                fetchReserveItems($activeCompany.id),
                getReserveOverview(),
            ]);
            reserveItems = items;
            overview = ov;

            // Init quantities
            items.forEach((item) => {
                withdrawQuantities[item.id] = 1;
            });
        } catch (error) {
            console.error(error);
            notifications.error("Impossible de charger la réserve");
        } finally {
            loading = false;
        }
    }

    async function handleWithdraw(resItem: ReserveItem) {
        const qty = withdrawQuantities[resItem.id] || 1;
        if (qty <= 0 || qty > resItem.quantity) {
            notifications.error("Quantité invalide");
            return;
        }

        withdrawingIds[resItem.id] = true;
        try {
            const result = await withdrawFromReserve(
                resItem.expand.item.id,
                qty,
            );
            if (result.success) {
                notifications.success(
                    `Retiré: ${qty}x ${resItem.expand.item.name}`,
                );
                await loadData(); // Reload to refresh grid and capacity
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
              : "bg-emerald-500",
    );
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
                        🔒 Réserve Sécurisée
                    </h1>
                    <p class="text-slate-400 mt-1">
                        Stockez vos ressources précieuses à l'abri des
                        fluctuations
                    </p>
                </div>
            </div>

            <button
                onclick={() => goto("/inventory")}
                class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            >
                Aller à l'Inventaire Classique →
            </button>
        </header>

        <!-- Capacity Bar -->
        <div
            class="bg-slate-900 rounded-lg p-6 border border-slate-800 shadow-lg"
        >
            <div class="flex justify-between items-end mb-2">
                <div>
                    <h2 class="text-lg font-bold text-white">
                        Capacité de Stockage
                    </h2>
                    <p class="text-sm text-slate-400">
                        Limite basée sur le niveau de l'entreprise ({$activeCompany?.level ||
                            1} x 300)
                    </p>
                </div>
                <div class="text-right">
                    <span class="text-2xl font-bold text-white">
                        {overview.used.toLocaleString()}
                    </span>
                    <span class="text-slate-500">
                        / {overview.max.toLocaleString()}
                    </span>
                </div>
            </div>

            <div class="h-4 bg-slate-800 rounded-full overflow-hidden">
                <div
                    class="h-full {capacityColor} transition-all duration-500 ease-out"
                    style="width: {Math.min(capacityPercent, 100)}%"
                ></div>
            </div>
        </div>

        <!-- Filters -->
        <div class="flex justify-between items-center">
            <FilterBar
                bind:searchQuery
                placeholder="Rechercher dans la réserve..."
            />
        </div>

        <!-- Grid -->
        {#if loading}
            <div class="flex justify-center py-12">
                <div
                    class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"
                ></div>
            </div>
        {:else if reserveItems.length === 0}
            <div
                class="text-center py-16 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed"
            >
                <div class="text-6xl mb-4">📦</div>
                <h3 class="text-xl font-bold text-white mb-2">
                    La réserve est vide
                </h3>
                <p class="text-slate-400 mb-6">
                    Déposez des items depuis votre inventaire principal pour les
                    protéger.
                </p>
                <button
                    onclick={() => goto("/inventory")}
                    class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded shadow-lg transition"
                >
                    Aller à l'Inventaire
                </button>
            </div>
        {:else}
            <div
                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
                {#each filteredItems as res (res.id)}
                    <div
                        class="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-indigo-500/50 transition group"
                    >
                        <!-- Top -->
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <span
                                    class="text-xs font-bold text-slate-500 uppercase tracking-wider"
                                >
                                    {res.expand.item.type}
                                </span>
                                <h3
                                    class="font-bold text-white text-lg leading-tight"
                                >
                                    {res.expand.item.name}
                                </h3>
                            </div>
                            <div
                                class="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-right min-w-[60px]"
                            >
                                <div class="text-xs text-slate-500">QTÉ</div>
                                <div
                                    class="text-emerald-400 font-mono font-bold"
                                >
                                    {res.quantity.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <!-- Action Area -->
                        <div class="pt-4 border-t border-slate-700/50">
                            <label class="block text-xs text-slate-400 mb-1">
                                Retirer vers l'inventaire
                            </label>
                            <div class="flex gap-2">
                                <div class="relative flex-1">
                                    <input
                                        type="number"
                                        bind:value={withdrawQuantities[res.id]}
                                        min="1"
                                        max={res.quantity}
                                        class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                                    />
                                    <button
                                        onclick={() => setMaxWithdraw(res)}
                                        class="absolute right-1 top-1 text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded uppercase"
                                    >
                                        Max
                                    </button>
                                </div>
                                <button
                                    onclick={() => handleWithdraw(res)}
                                    disabled={withdrawingIds[res.id]}
                                    class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 rounded shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {#if withdrawingIds[res.id]}
                                        ...
                                    {:else}
                                        Retirer
                                    {/if}
                                </button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
