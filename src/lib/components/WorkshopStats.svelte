<script lang="ts">
  /**
   * WorkshopStats - Header stats cards for the workshop page
   * Displays inventory count and machine count in styled cards.
   */
  import type { DashboardData } from "$lib/dashboard";

  let {
    dashboardData,
    machineCount,
  }: {
    dashboardData: DashboardData | null;
    machineCount: number;
  } = $props();
</script>

{#if dashboardData}
  <div class="flex flex-wrap gap-4">
    <!-- Items in Stock Card -->
    <div
      class="bg-linear-to-br from-emerald-900/50 to-emerald-800/30 border border-emerald-700/30 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group min-w-40"
    >
      <div
        class="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"
      >
        <span class="text-3xl">📦</span>
      </div>
      <p
        class="text-emerald-400/80 text-[10px] font-bold uppercase tracking-widest mb-1"
      >
        Items en Stock
      </p>
      <p class="text-white text-2xl font-black mt-1 tracking-tight">
        {dashboardData.resources.inventory_count}
      </p>
    </div>

    <!-- Machines Card -->
    <div
      class="bg-linear-to-br from-amber-900/50 to-amber-800/30 border border-amber-700/30 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group min-w-40"
    >
      <div
        class="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"
      >
        <span class="text-3xl">🏭</span>
      </div>
      <p
        class="text-amber-400/80 text-[10px] font-bold uppercase tracking-widest mb-1"
      >
        Machines
      </p>
      <p class="text-white text-2xl font-black mt-1 tracking-tight">
        {machineCount}
      </p>
    </div>
  </div>
{/if}
