<script lang="ts">
  import type { Deposit, Employee, Item } from "$lib/pocketbase";
  import pb from "$lib/pocketbase";
  import { notifications } from "$lib/notifications";
  import { slide } from "svelte/transition";

  /**
   * @type {Deposit} - The deposit to display
   */
  export let deposit: Deposit;

  /**
   * @type {Employee[]} - Available employees (not assigned anywhere)
   */
  export let availableEmployees: Employee[] = [];

  /**
   * @type {Employee[]} - Employees currently assigned to this deposit
   */
  export let assignedEmployees: Employee[] = [];

  /**
   * @type {() => void} - Callback when assignment changes
   */
  export let onUpdate: (() => void) | null = null;

  let isLoading = false;
  let showAssignDropdown = false;
  let employeeSearchQuery = "";

  // Calculate max capacity (size * 5)
  $: maxCapacity = (deposit.size || 1) * 5;
  $: remainingSlots = maxCapacity - assignedEmployees.length;

  // Filter available employees by search
  $: filteredEmployees = availableEmployees.filter((emp) => {
    if (!employeeSearchQuery.trim()) return true;
    const query = employeeSearchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(query) ||
      (emp.poste && emp.poste.toLowerCase().includes(query))
    );
  });

  async function handleAssignEmployee(employeeId: string) {
    if (remainingSlots <= 0) {
      notifications.error("Capacité maximale atteinte");
      return;
    }

    isLoading = true;
    try {
      await pb.send("/api/deposits/assign-employee", {
        method: "POST",
        body: { depositId: deposit.id, employeeId },
      });

      notifications.success("✨ Employé assigné au gisement");
      showAssignDropdown = false;
      employeeSearchQuery = "";
      onUpdate?.();
    } catch (err: any) {
      notifications.error(err.message || "Erreur lors de l'assignation");
    } finally {
      isLoading = false;
    }
  }

  async function handleUnassignEmployee(employeeId: string) {
    isLoading = true;
    try {
      await pb.send("/api/deposits/unassign-employee", {
        method: "POST",
        body: { employeeId },
      });

      notifications.success("Employé retiré du gisement");
      onUpdate?.();
    } catch (err: any) {
      notifications.error(err.message || "Erreur lors de la désassignation");
    } finally {
      isLoading = false;
    }
  }
</script>

<div
  class="bg-slate-800 rounded-xl p-5 border border-emerald-500/30 relative overflow-hidden"
>
  <!-- Background decoration -->
  <div
    class="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-4 -mt-4"
  ></div>

  <!-- Header -->
  <div class="flex justify-between items-start mb-4 relative z-10">
    <div>
      <h3 class="text-lg font-bold text-white flex items-center gap-2">
        <span class="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400"
          >⛏️</span
        >
        {deposit.expand?.ressource?.name || "Ressource"}
      </h3>
      <div
        class="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded w-fit mt-1"
      >
        #{deposit.id.slice(0, 5)}
      </div>
    </div>
    <div class="text-2xl opacity-80">📍</div>
  </div>

  <!-- Stats -->
  <div class="space-y-3 relative z-10 mb-4">
    <div class="grid grid-cols-2 gap-2">
      <!-- Quantity -->
      <div class="bg-slate-900/50 p-2 rounded-lg">
        <div class="flex justify-between text-xs text-slate-400 mb-1">
          <span>Quantité</span>
        </div>
        <div class="text-lg font-mono text-white font-bold">
          {Math.floor(deposit.quantity).toLocaleString()}
          <span class="text-sm font-sans text-slate-500">u</span>
        </div>
      </div>

      <!-- Level -->
      <div class="bg-slate-900/50 p-2 rounded-lg">
        <div class="flex justify-between text-xs text-slate-400 mb-1">
          <span>Niveau</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-lg font-mono text-emerald-400 font-bold"
            >{deposit.size || 1}</span
          >
          <span class="text-xs text-yellow-500">
            {#if (deposit.size || 1) >= 8}★★★
            {:else if (deposit.size || 1) >= 5}★★
            {:else}★
            {/if}
          </span>
        </div>
      </div>
    </div>

    <!-- Capacity Bar -->
    <div class="bg-slate-900/50 p-3 rounded-lg">
      <div class="flex justify-between text-xs text-slate-400 mb-2">
        <span>Employés assignés</span>
        <span class="font-mono">{assignedEmployees.length} / {maxCapacity}</span
        >
      </div>
      <div class="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
        <div
          class="bg-cyan-500 h-full rounded-full transition-all duration-300"
          style="width: {(assignedEmployees.length / maxCapacity) * 100}%"
        ></div>
      </div>
    </div>
  </div>

  <!-- Assigned Employees List -->
  {#if assignedEmployees.length > 0}
    <div class="mb-4">
      <h4 class="text-xs font-bold text-slate-400 uppercase mb-2">
        Mineurs actifs
      </h4>
      <div class="space-y-1 max-h-32 overflow-y-auto">
        {#each assignedEmployees as emp (emp.id)}
          <div
            class="flex items-center justify-between bg-slate-900/50 rounded-lg p-2 border border-slate-700/50 group"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm">⛏️</span>
              <span class="text-xs text-white font-medium">{emp.name}</span>
              <span
                class="text-[10px] text-cyan-400 bg-cyan-500/10 px-1 rounded"
                >Mine: {emp.mining || 0}</span
              >
            </div>
            <button
              onclick={() => handleUnassignEmployee(emp.id)}
              disabled={isLoading}
              class="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              title="Retirer"
            >
              ❌
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Assign Button & Dropdown -->
  <div class="relative">
    <button
      onclick={() => (showAssignDropdown = !showAssignDropdown)}
      disabled={isLoading || remainingSlots <= 0}
      class="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
    >
      {#if remainingSlots <= 0}
        <span>Capacité maximale</span>
      {:else}
        <span>⛏️</span>
        <span>Assigner un Mineur ({remainingSlots} places)</span>
      {/if}
    </button>

    {#if showAssignDropdown && remainingSlots > 0}
      <div
        transition:slide
        class="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 max-h-64 overflow-hidden"
      >
        <!-- Search -->
        <div class="p-2 border-b border-slate-800">
          <input
            type="text"
            bind:value={employeeSearchQuery}
            placeholder="Rechercher un employé..."
            class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <!-- Employee List -->
        <div class="max-h-48 overflow-y-auto">
          {#if filteredEmployees.length > 0}
            {#each filteredEmployees as emp (emp.id)}
              <button
                onclick={() => handleAssignEmployee(emp.id)}
                disabled={isLoading}
                class="w-full text-left p-3 hover:bg-slate-800 border-b border-slate-800 last:border-0 flex justify-between items-center"
              >
                <div class="flex items-center gap-2">
                  <span class="text-sm">👷</span>
                  <div>
                    <p class="text-xs text-white font-medium">{emp.name}</p>
                    <p class="text-[10px] text-slate-500">
                      {emp.poste || "Employé"}
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-xs font-bold text-cyan-400">
                    ⛏️ {emp.mining || 0}
                  </div>
                  <div class="text-[10px] text-slate-500">
                    Eff: {emp.efficiency || 0}%
                  </div>
                </div>
              </button>
            {/each}
          {:else}
            <div class="p-4 text-center text-xs text-slate-500">
              Aucun employé disponible
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
