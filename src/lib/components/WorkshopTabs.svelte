<script lang="ts">
  /**
   * WorkshopTabs - Tab navigation component for workshop page
   * Handles switching between Manual Production and Automation tabs.
   */

  type TabValue = "manual" | "automation";

  let {
    activeTab = $bindable<TabValue>("manual"),
    machineCount = 0,
  }: {
    activeTab: TabValue;
    machineCount: number;
  } = $props();
</script>

<div class="flex gap-2 border-b border-slate-800">
  <button
    onclick={() => (activeTab = "manual")}
    class="px-6 py-3 font-semibold transition-all flex items-center gap-2 text-sm rounded-t-xl {activeTab ===
    'manual'
      ? 'bg-slate-900 text-indigo-400 border-t border-x border-slate-800'
      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'}"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      ><path
        d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"
      /><path d="M17.64 15 22 10.64" /><path
        d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25V7.86c0-.55-.45-1-1-1H14c-.55 0-1 .45-1 1v3.38c0 .85-.33 1.66-.93 2.26l-1.25 1.25a2.83 2.83 0 0 0 0 4 .19.19 0 0 0 .28 0l7.8-7.8a.19.19 0 0 0 0-.28 2.83 2.83 0 0 0 0-4z"
      /></svg
    >
    Production Manuelle
  </button>
  <button
    onclick={() => (activeTab = "automation")}
    class="px-6 py-3 font-semibold transition-all flex items-center gap-2 text-sm rounded-t-xl {activeTab ===
    'automation'
      ? 'bg-slate-900 text-indigo-400 border-t border-x border-slate-800'
      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'}"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      ><rect width="18" height="10" x="3" y="11" rx="2" /><circle
        cx="12"
        cy="5"
        r="2"
      /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line
        x1="16"
        y1="16"
        x2="16"
        y2="16"
      /></svg
    >
    Automatisation
    {#if machineCount > 0}
      <span
        class="ml-1 text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30"
      >
        {machineCount}
      </span>
    {/if}
  </button>
</div>
