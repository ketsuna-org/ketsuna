<script lang="ts">
  import { fade, scale } from "svelte/transition";

  let {
    isOpen = $bindable(false),
    title = "Confirmation",
    message = "Êtes-vous sûr ?",
    confirmLabel = "Confirmer",
    cancelLabel = "Annuler",
    isDestructive = false,
    onConfirm,
    onCancel,
  } = $props<{
    isOpen: boolean;
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }>();

  function handleConfirm() {
    onConfirm();
    isOpen = false;
  }

  function handleCancel() {
    if (onCancel) onCancel();
    isOpen = false;
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      onclick={handleCancel}
      onkeydown={(e) => e.key === "Escape" && handleCancel()}
      transition:fade={{ duration: 150 }}
      role="button"
      tabindex="-1"
      aria-label="Fermer"
    ></div>

    <!-- Modal -->
    <div
      class="relative bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md p-6 overflow-hidden"
      transition:scale={{ start: 0.95, duration: 200 }}
    >
      <!-- Glow effect -->
      <div
        class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent {isDestructive
          ? 'via-red-500'
          : 'via-amber-500'} to-transparent opacity-50"
      ></div>

      <h2 class="text-xl font-bold text-white mb-2">{title}</h2>
      <p class="text-slate-400 text-sm mb-6 leading-relaxed">
        {@html message}
      </p>

      <div class="flex gap-3">
        <button
          onclick={handleCancel}
          class="flex-1 py-2.5 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onclick={handleConfirm}
          class="flex-1 py-2.5 rounded-lg font-bold shadow-lg transition-transform active:scale-95
                   {isDestructive
            ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'
            : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20'}"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}
