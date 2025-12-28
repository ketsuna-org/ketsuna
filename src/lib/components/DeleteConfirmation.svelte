<script lang="ts">
  /**
   * REUSABLE DELETE CONFIRMATION COMPONENT (Svelte 5)
   * This component follows the project's code conduct rule for CRUD actions.
   */
  import { fade, scale } from "svelte/transition";

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
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
  transition:fade={{ duration: 200 }}
>
  <div
    class="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
    transition:scale={{ duration: 300, start: 0.9, opacity: 0 }}
  >
    <!-- Background glow for drama -->
    <div
      class="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 blur-3xl rounded-full"
    ></div>

    <div class="flex items-center gap-5 mb-6 relative">
      <div
        class="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 text-3xl shadow-inner"
      >
        ⚠️
      </div>
      <h2 class="text-2xl font-bold text-white tracking-tight">{title}</h2>
    </div>

    {#if error}
      <div
        class="bg-red-900/20 border border-red-500/30 text-red-200 p-4 rounded-xl mb-6 text-sm flex gap-3 animate-pulse"
      >
        <span class="shrink-0">🚫</span>
        <p>{error}</p>
      </div>
    {/if}

    <div class="text-slate-300 mb-10 leading-relaxed text-base">
      {@html message}
    </div>

    <div class="flex flex-col sm:flex-row gap-4">
      <button
        onclick={onCancel}
        disabled={loading}
        class="flex-1 px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all border border-slate-700 active:scale-95 disabled:opacity-50"
      >
        {cancelText}
      </button>
      <button
        onclick={handleConfirm}
        disabled={loading}
        class="flex-1 px-8 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-600/30 transition-all border border-red-500/20 flex justify-center items-center gap-3 active:scale-95 disabled:opacity-50"
      >
        {#if loading}
          <div
            class="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"
          ></div>
          Patience...
        {:else}
          {confirmText}
        {/if}
      </button>
    </div>
  </div>
</div>
