<script lang="ts">
    import type { Item } from "$lib/types";
    import { buyItem } from "$lib/services/market";
    import { notifications } from "$lib/notifications";

    /**
     * @type {Item} - La machine à afficher (item de type "Machine")
     */
    export let machine: Item;

    /**
     * @type {number} - Balance actuelle de l'entreprise
     */
    export let balance: number = 0;

    /**
     * @type {string} - ID de l'entreprise
     */
    export let companyId: string = "";

    /**
     * @type {() => void} - Callback pour rafraîchir après achat
     */
    export let onPurchase: (() => void) | null = null;

    let isLoading = false;

    const canBuy = balance >= (machine.base_price || 0) && companyId;

    async function handleBuy() {
        if (!canBuy) return;

        isLoading = true;
        try {
            await buyItem(companyId, machine, 1);
            notifications.success(`✨ ${machine.name} achetée !`);
            onPurchase?.();
        } catch (error: any) {
            notifications.error(`Erreur: ${error.message}`);
        } finally {
            isLoading = false;
        }
    }
</script>

<div
    class="border border-slate-700 rounded-lg p-4 bg-slate-800 hover:border-indigo-500 hover:shadow-lg transition-all"
>
    <!-- Header -->
    <div class="mb-3">
        <h3 class="text-lg font-semibold text-white mb-1">🤖 {machine.name}</h3>
        <p class="text-xs text-slate-400">Machine de production</p>
    </div>

    <!-- Machine Specs -->
    <div class="mb-4 space-y-2">
        <!-- Price -->
        <div class="flex items-center justify-between">
            <span class="text-sm text-slate-400">Prix:</span>
            <span class="text-lg font-semibold text-indigo-400"
                >${machine.base_price || 0}</span
            >
        </div>

        <!-- Produces Item -->
        {#if machine.product}
            <div class="flex items-center justify-between">
                <span class="text-sm text-slate-400">Produit:</span>
                <span class="text-sm text-emerald-400 font-semibold">
                    {machine.product_quantity || 1} items/cycle
                </span>
            </div>
        {/if}

        <!-- Volatility -->
        {#if machine.volatility}
            <div class="flex items-center justify-between">
                <span class="text-sm text-slate-400">Volatilité:</span>
                <span class="text-sm text-amber-400"
                    >{(machine.volatility * 100).toFixed(1)}%</span
                >
            </div>
        {/if}
    </div>

    <!-- Status and Action -->
    <div class="border-t border-slate-700 pt-3">
        <div class="mb-2">
            {#if !canBuy}
                <div class="text-xs text-red-400 mb-2">
                    {#if balance < (machine.base_price || 0)}
                        💰 Argent insuffisant: ${balance}/${machine.base_price ||
                            0}
                    {/if}
                </div>
            {/if}
        </div>

        <button
            on:click={handleBuy}
            disabled={!canBuy || isLoading}
            class="w-full px-3 py-2 rounded font-semibold text-sm transition-all
            {canBuy && !isLoading
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'}"
        >
            {#if isLoading}
                Achat en cours...
            {:else}
                💳 Acheter (${machine.base_price || 0})
            {/if}
        </button>
    </div>
</div>
