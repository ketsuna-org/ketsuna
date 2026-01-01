<script lang="ts">
  /**
   * REUSABLE DELETE CONFIRMATION COMPONENT (Svelte 5)
   * This component follows the project's code conduct rule for CRUD actions.
   */
  import { fade, scale } from "svelte/transition";
  import { portal } from "$lib/actions/portal";

  interface Props {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => Promise<void> | void;
    onCancel: () => void;
  }

  let {
    title,
    message,
    confirmText = "Confirmer",
    cancelText = "Annuler",
    onConfirm,
    onCancel,
  }: Props = $props();

  let loading = $state(false);
  let error = $state("");

  async function handleConfirm() {
    loading = true;
    error = "";

    try {
      await onConfirm();
    } catch (e: any) {
      console.error("Confirmation error details:", e);
      error = e.message || "Une erreur est survenue lors de l'opération.";

      // Heuristics for common PocketBase errors related to companies/employees
      const errMsg = error.toLowerCase();
      if (errMsg.includes("employees")) {
        error =
          "Action impossible : Vous devez d'abord licencier tous vos employés.";
      } else if (errMsg.includes("stock") || errMsg.includes("inventory")) {
        error =
          "Action impossible : Vous devez vider votre inventaire avant cette action.";
      } else if (
        errMsg.includes("shareholders") ||
        errMsg.includes("actions") ||
        errMsg.includes("stocks")
      ) {
        error =
          "Action impossible : Des liens boursiers empêchent cette suppression.";
      }
    } finally {
      loading = false;
    }
  }
</script>

<div
  use:portal
  class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
  transition:fade={{ duration: 200 }}
>
  <div
    class="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
    transition:scale={{ duration: 300, start: 0.9, opacity: 0 }}
  >
    <!-- Background glow for drama -->
    <div
      class="absolute -top-24 -left-24 w-64 h-64 bg-red-500/10 blur-3xl rounded-full pointer-events-none"
    ></div>

    <div class="flex items-center gap-5 mb-8 relative z-10">
      <div
        class="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 shadow-inner border border-red-500/20"
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
          ><path
            d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          ></path><line x1="12" y1="9" x2="12" y2="13"></line><line
            x1="12"
            y1="17"
            x2="12.01"
            y2="17"
          ></line></svg
        >
      </div>
      <div>
        <h2 class="text-2xl font-black text-white tracking-tight">{title}</h2>
        <p class="text-sm text-red-400 font-bold mt-1">Action irréversible</p>
      </div>
    </div>

    {#if error}
      <div
        class="bg-red-950/30 border border-red-500/20 text-red-200 p-4 rounded-xl mb-6 text-sm flex gap-3 animate-pulse relative z-10"
      >
        <span class="shrink-0 text-lg">🚫</span>
        <p class="font-medium">{error}</p>
      </div>
    {/if}

    <div
      class="text-slate-300 mb-10 leading-relaxed text-base font-medium relative z-10"
    >
      {@html message}
    </div>

    <div class="flex flex-col sm:flex-row gap-4 relative z-10">
      <button
        onclick={onCancel}
        disabled={loading}
        class="flex-1 px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all border border-slate-700 hover:border-slate-600 active:scale-95 disabled:opacity-50"
      >
        {cancelText}
      </button>
      <button
        onclick={handleConfirm}
        disabled={loading}
        class="flex-1 px-6 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-xl shadow-red-900/20 transition-all border border-red-500/20 flex justify-center items-center gap-3 active:scale-95 disabled:opacity-50"
      >
        {#if loading}
          <div
            class="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"
          ></div>
          <span>Traitement...</span>
        {:else}
          {confirmText}
        {/if}
      </button>
    </div>
  </div>
</div>
