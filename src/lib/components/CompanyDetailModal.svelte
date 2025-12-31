<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import type { Company } from "$lib/types";

  /**
   * The company to display
   */
  export let company: Company;

  /**
   * Callback to close the modal
   */
  export let onClose: () => void;

  function formatMoney(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  }
</script>

<!-- Backdrop -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
  transition:fade={{ duration: 200 }}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
  on:click={onClose}
>
  <!-- Modal Content -->
  <div
    class="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden"
    transition:scale={{ duration: 250, start: 0.95 }}
    on:click|stopPropagation
  >
    <!-- Header Gradient -->
    <div class="h-24 bg-gradient-to-br from-indigo-600 to-purple-700 relative">
      <div
        class="absolute -bottom-10 left-6 w-20 h-20 rounded-2xl bg-slate-800 border-4 border-slate-900 shadow-lg flex items-center justify-center text-3xl"
      >
        🏭
      </div>
      <button
        on:click={onClose}
        class="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><line x1="18" y1="6" x2="6" y2="18" /><line
            x1="6"
            y1="6"
            x2="18"
            y2="18"
          /></svg
        >
      </button>
    </div>

    <div class="pt-12 px-6 pb-6">
      <div class="flex justify-between items-start mb-1">
        <div>
          <h2 class="text-2xl font-black text-white tracking-tight">
            {company.name}
          </h2>
          <p class="text-slate-400 text-sm font-medium">
            PDG: {company.expand?.ceo?.username || "Inconnu"}
          </p>
        </div>
        <div
          class="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
        >
          Niveau {company.level}
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 gap-4 mt-6">
        <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
          <p class="text-xs text-slate-500 uppercase font-bold mb-1">
            Trésorerie
          </p>
          <p class="text-emerald-400 font-mono font-bold text-lg">
            {formatMoney(company.balance)}
          </p>
        </div>

        <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
          <p class="text-xs text-slate-500 uppercase font-bold mb-1">
            Employés
          </p>
          <p class="text-white font-mono font-bold text-lg">???</p>
        </div>
      </div>

      {#if company.is_npc}
        <div
          class="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3"
        >
          <span class="text-2xl">🤖</span>
          <div>
            <p class="text-blue-400 font-bold text-sm">Société NPC</p>
            <p class="text-xs text-blue-300/60">Gérée par l'IA du marché.</p>
          </div>
        </div>
      {/if}

      <div class="mt-6 flex gap-3">
        <button
          class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25"
        >
          Visiter (Bientôt)
        </button>
      </div>
    </div>
  </div>
</div>
