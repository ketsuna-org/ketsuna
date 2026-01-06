<script lang="ts">
  interface Props {
    currentPage: number;
    totalPages: number;
    hasMore?: boolean;
    onPageChange?: (page: number) => void;
  }

  let {
    currentPage,
    totalPages,
    hasMore = false,
    onPageChange,
  }: Props = $props();

  function goToPage(page: number) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange?.(page);
  }
</script>

{#if totalPages > 1}
  <div class="flex items-center justify-center gap-2 mt-8">
    <!-- Previous -->
    <button
      type="button"
      aria-label="Previous page"
      class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      disabled={currentPage === 1}
      onclick={() => goToPage(currentPage - 1)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg
      >
    </button>

    <!-- Page Info -->
    <div class="flex items-center gap-1 font-mono text-sm">
      <span class="text-white font-bold">{currentPage}</span>
      <span class="text-slate-500">/</span>
      <span class="text-slate-400">{totalPages}</span>
    </div>

    <!-- Next -->
    <button
      type="button"
      aria-label="Next page"
      class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      disabled={currentPage === totalPages}
      onclick={() => goToPage(currentPage + 1)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg
      >
    </button>
  </div>
{/if}
