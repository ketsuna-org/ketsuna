<script lang="ts">
  /**
   * AutoAssignPanel - Displays employee status and auto-assign buttons
   * Shows missing employees indicator and provides auto-assign actions.
   */
  import type { Employee, Machine } from "$lib/pocketbase";
  import type { MachineStats } from "$lib/services/workshop";
  import { getItem } from "$lib/data/game-static";

  let {
    machines,
    machineStats,
    availableEmployees,
    isAutoAssigning = false,
    isAutoAssigningDeposits = false,
    onAutoAssignEmployees,
    onAutoAssignDeposits,
  }: {
    machines: Machine[];
    machineStats: MachineStats;
    availableEmployees: Employee[];
    isAutoAssigning: boolean;
    isAutoAssigningDeposits: boolean;
    onAutoAssignEmployees: () => void;
    onAutoAssignDeposits: () => void;
  } = $props();

  // Check if any machine needs a deposit assigned (machines that extract explorable resources)
  let hasMachinesNeedingDeposit = $derived(
    machines.some((m) => {
      const machineItem = getItem(m.machine_id);
      const productItem = machineItem?.product
        ? getItem(machineItem.product)
        : null;
      return productItem?.is_explorable && !m.deposit;
    })
  );
</script>

{#if machines.length > 0}
  <div class="flex flex-wrap items-center gap-3 mt-3">
    {#if machineStats.missingEmployees > 0}
      <div
        class="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg"
      >
        <span class="text-amber-400">⚠️</span>
        <span class="text-xs text-amber-300 font-medium">
          <span class="font-bold">{machineStats.missingEmployees}</span>
          employé(s) manquant(s) pour production optimale
        </span>
      </div>
    {:else}
      <div
        class="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
      >
        <span class="text-emerald-400">✅</span>
        <span class="text-xs text-emerald-300 font-medium">
          Toutes les machines sont optimales
        </span>
      </div>
    {/if}

    {#if availableEmployees.length > 0 && machineStats.missingEmployees > 0}
      <button
        onclick={onAutoAssignEmployees}
        disabled={isAutoAssigning}
        class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-wait text-white text-sm font-bold rounded-lg transition-all shadow-md hover:shadow-indigo-500/25"
      >
        {#if isAutoAssigning}
          <span
            class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
          ></span>
          <span>Assignation...</span>
        {:else}
          <span>🎯</span>
          <span
            >Auto-assigner ({Math.min(
              availableEmployees.length,
              machineStats.missingEmployees
            )})</span
          >
        {/if}
      </button>
    {/if}

    <!-- Auto-assign deposits button -->
    {#if hasMachinesNeedingDeposit}
      <button
        onclick={onAutoAssignDeposits}
        disabled={isAutoAssigningDeposits}
        class="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:cursor-wait text-white text-sm font-bold rounded-lg transition-all shadow-md hover:shadow-amber-500/25"
      >
        {#if isAutoAssigningDeposits}
          <span
            class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
          ></span>
          <span>Assignation...</span>
        {:else}
          <span>⛏️</span>
          <span>Auto-assigner Gisements</span>
        {/if}
      </button>
    {/if}

    <span class="text-[10px] text-slate-500 font-medium">
      {availableEmployees.length} employé(s) disponible(s)
    </span>
  </div>
{/if}
