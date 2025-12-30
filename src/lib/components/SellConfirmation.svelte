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
    class="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl max-w-md w-full p-8 relative overflow-hidden"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="document"
  >
    <!-- Glow effect -->
    <div
      class="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none"
    ></div>

    <!-- Header -->
    <div class="flex items-center gap-4 mb-8 relative z-10">
      <div
        class="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-inner"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-emerald-400"
        >
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>
      <div>
        <h2 class="text-2xl font-black text-white tracking-tight">
          Confirmer la vente
        </h2>
        <p class="text-sm text-slate-400 font-medium">
          Cette action est immédiate
        </p>
      </div>
    </div>

    <!-- Details -->
    <div
      class="bg-slate-950/50 rounded-2xl p-5 mb-8 border border-slate-800/50 space-y-3 relative z-10"
    >
      <div
        class="flex justify-between items-center pb-3 border-b border-slate-800/50"
      >
        <span class="text-slate-400 font-bold text-sm uppercase tracking-wide"
          >Item</span
        >
        <span class="font-bold text-white text-lg">{itemName}</span>
      </div>
      <div
        class="flex justify-between items-center pb-3 border-b border-slate-800/50"
      >
        <span class="text-slate-400 font-bold text-sm uppercase tracking-wide"
          >Quantité</span
        >
        <span class="font-mono text-white font-bold">{quantity}</span>
      </div>
      <div
        class="flex justify-between items-center pb-3 border-b border-slate-800/50"
      >
        <span class="text-slate-400 font-bold text-sm uppercase tracking-wide"
          >Prix/u</span
        >
        <span class="font-mono text-slate-300">{formatCurrency(unitPrice)}</span
        >
      </div>
      <div class="pt-2 flex justify-between items-center">
        <span class="text-slate-300 font-bold">Total à recevoir</span>
        <span
          class="text-2xl font-black text-emerald-400 tracking-tight drop-shadow-sm"
          >{formatCurrency(totalRevenue)}</span
        >
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-4 relative z-10">
      <button
        onclick={onCancel}
        class="flex-1 px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-all border border-slate-700 hover:border-slate-600 active:scale-95"
      >
        Annuler
      </button>
      <button
        onclick={onConfirm}
        class="flex-1 px-4 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95 border border-emerald-500/50"
      >
        Vendre tout
      </button>
    </div>
  </div>
</div>
