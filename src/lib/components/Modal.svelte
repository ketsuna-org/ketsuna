<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade, scale } from "svelte/transition";

  let { onClose, title, children } = $props<{
    onClose: () => void;
    title: string;
    children: any;
  }>();

  // Close on Escape key
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
  transition:fade={{ duration: 200 }}
>
  <div
    class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col"
    transition:scale={{ duration: 200, start: 0.95 }}
  >
    <!-- Header -->
    <div
      class="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0"
    >
      <h2 class="text-xl font-bold text-white flex items-center gap-2">
        {@html title}
      </h2>
      <button
        onclick={onClose}
        aria-label="Fermer"
        class="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
      >
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
          class="lucide lucide-x"
          ><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
        >
      </button>
    </div>

    <!-- Body - Scrollable -->
    <div class="flex-1 overflow-y-auto p-6 bg-slate-950/30">
      {@render children()}
    </div>
  </div>
</div>
