<script lang="ts">
  import { fade, scale } from 'svelte/transition';

  let { title, message, confirmText = "Confirmer", cancelText = "Annuler", onconfirm, oncancel } = $props<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onconfirm: () => void;
    oncancel: () => void;
  }>();
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" transition:fade>
  <div 
    class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 max-w-md w-full overflow-hidden"
    transition:scale
  >
    <div class="p-6">
      <h3 class="text-xl font-bold text-white mb-2">{title}</h3>
      <p class="text-slate-300">{message}</p>
    </div>
    
    <div class="bg-slate-900/50 px-6 py-4 flex justify-end gap-3">
      <button 
        onclick={oncancel}
        class="px-4 py-2 rounded text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
      >
        {cancelText}
      </button>
      <button 
        onclick={onconfirm}
        class="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-900/20 transition-all"
      >
        {confirmText}
      </button>
    </div>
  </div>
</div>
