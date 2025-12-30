<script lang="ts">
    /**
     * SellConfirmation - Modal de confirmation pour la vente d'items
     */
    import { fade, scale } from "svelte/transition";

    let { itemName, quantity, unitPrice, onConfirm, onCancel } = $props<{
        itemName: string;
        quantity: number;
        unitPrice: number;
        onConfirm: () => void;
        onCancel: () => void;
    }>();

    const totalRevenue = $derived(quantity * unitPrice);

    function formatCurrency(val: number) {
        return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
        }).format(val);
    }
</script>

<!-- Backdrop -->
<div
    transition:fade={{ duration: 150 }}
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onclick={onCancel}
    onkeydown={(e) => e.key === "Escape" && onCancel()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
>
    <!-- Modal -->
    <div
        transition:scale={{ duration: 200, start: 0.95 }}
        class="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full p-6"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="document"
    >
        <!-- Header -->
        <div class="flex items-center gap-3 mb-6">
            <div class="p-3 bg-emerald-500/20 rounded-xl">
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
                    class="text-emerald-400"
                >
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path
                        d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                    />
                </svg>
            </div>
            <div>
                <h2 class="text-xl font-bold text-white">Confirmer la vente</h2>
                <p class="text-sm text-slate-400">
                    Vérifiez les détails avant de vendre
                </p>
            </div>
        </div>

        <!-- Details -->
        <div class="bg-slate-900/50 rounded-xl p-4 mb-6 space-y-3">
            <div class="flex justify-between items-center">
                <span class="text-slate-400">Item</span>
                <span class="font-semibold text-white">{itemName}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-slate-400">Quantité</span>
                <span class="font-mono text-white">{quantity}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-slate-400">Prix unitaire</span>
                <span class="font-mono text-slate-300"
                    >{formatCurrency(unitPrice)}</span
                >
            </div>
            <div
                class="border-t border-slate-700 pt-3 flex justify-between items-center"
            >
                <span class="text-slate-300 font-semibold"
                    >Total à recevoir</span
                >
                <span class="text-2xl font-black text-emerald-400"
                    >{formatCurrency(totalRevenue)}</span
                >
            </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
            <button
                onclick={onCancel}
                class="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
            >
                Annuler
            </button>
            <button
                onclick={onConfirm}
                class="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-900/30"
            >
                Vendre tout
            </button>
        </div>
    </div>
</div>
