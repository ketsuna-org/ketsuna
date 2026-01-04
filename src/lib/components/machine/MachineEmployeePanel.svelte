<script lang="ts">
  import type { Machine, Employee } from "$lib/pocketbase";
  import pb from "$lib/pocketbase";
  import { notifications } from "$lib/notifications";
  import { slide } from "svelte/transition";

  interface Props {
    machine: Machine;
    availableEmployees: Employee[];
    busyEmployeeIds: Set<string>;
    isLoading: boolean;
    onLoadingChange: (loading: boolean) => void;
  }

  let {
    machine,
    availableEmployees,
    busyEmployeeIds,
    isLoading,
    onLoadingChange,
  }: Props = $props();

  let showEmployeeDropdown = $state(false);
  let showAssignedEmployees = $state(false);
  let employeeSearchQuery = $state("");

  let filteredAvailableEmployees = $derived(
    availableEmployees.filter((emp) => {
      if (!employeeSearchQuery.trim()) return true;
      const query = employeeSearchQuery.toLowerCase();
      return (
        emp.name.toLowerCase().includes(query) ||
        (emp.poste && emp.poste.toLowerCase().includes(query))
      );
    })
  );

  function getRarityInfo(rarity: number) {
    switch (rarity) {
      case 3:
        return {
          label: "Legendary",
          color: "text-amber-400",
          bg: "bg-amber-500/20",
          border: "border-amber-500/50",
        };
      case 2:
        return {
          label: "Epic",
          color: "text-purple-400",
          bg: "bg-purple-500/20",
          border: "border-purple-500/50",
        };
      case 1:
        return {
          label: "Rare",
          color: "text-blue-400",
          bg: "bg-blue-500/20",
          border: "border-blue-500/50",
        };
      default:
        return {
          label: "Common",
          color: "text-slate-400",
          bg: "bg-slate-600/20",
          border: "border-slate-600/50",
        };
    }
  }

  async function handleAssignEmployee(employeeId: string) {
    onLoadingChange(true);
    try {
      const updatedEmployees = [...(machine.employees || []), employeeId];
      await pb.collection("machines").update(machine.id, {
        employees: updatedEmployees,
      });
      notifications.success("✨ Employé assigné");
      employeeSearchQuery = "";
    } catch (error: any) {
      notifications.error(`Erreur: ${error.message}`);
    } finally {
      onLoadingChange(false);
    }
  }

  async function handleRemoveEmployee(employeeId: string) {
    onLoadingChange(true);
    try {
      const updatedEmployees = (machine.employees || []).filter(
        (id) => id !== employeeId
      );
      await pb.collection("machines").update(machine.id, {
        employees: updatedEmployees,
      });
      notifications.success("✨ Employé désassigné");
    } catch (error: any) {
      notifications.error(`Erreur: ${error.message}`);
    } finally {
      onLoadingChange(false);
    }
  }

  async function handleUnassignAll() {
    if (!machine.employees || machine.employees.length === 0) return;

    onLoadingChange(true);
    try {
      await pb.collection("machines").update(machine.id, {
        employees: [],
      });
      notifications.success(
        `${machine.employees.length} employé(s) désassigné(s)`
      );
    } catch (error: any) {
      notifications.error(`Erreur: ${error.message}`);
    } finally {
      onLoadingChange(false);
    }
  }
</script>

<div class="relative flex flex-col gap-4">
  <!-- 1. Search bar to assign employees -->
  <div class="relative z-20">
    <div class="relative">
      <input
        type="text"
        bind:value={employeeSearchQuery}
        onfocus={() => (showEmployeeDropdown = true)}
        placeholder="🔍 Rechercher un employé à assigner..."
        class="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
      />
      {#if employeeSearchQuery}
        <button
          onclick={() => {
            employeeSearchQuery = "";
            showEmployeeDropdown = false;
          }}
          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
        >
          ✕
        </button>
      {/if}
    </div>

    <!-- Dropdown with filtered results -->
    {#if showEmployeeDropdown && filteredAvailableEmployees.length > 0}
      <div
        class="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-indigo-500/30 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
      >
        <div class="p-2 space-y-1">
          {#each filteredAvailableEmployees as employee (employee.id)}
            {@const rarity = getRarityInfo(employee.rarity)}
            <button
              onclick={() => handleAssignEmployee(employee.id)}
              disabled={isLoading}
              class="w-full text-left px-3 py-2 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-white transition-all disabled:opacity-50 flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold {rarity.bg} {rarity.color}"
                >
                  {employee.name.charAt(0)}
                </div>
                <span class="font-medium">{employee.name}</span>
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded {rarity.bg} {rarity.color} {rarity.border} border"
                >
                  {rarity.label}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500">{employee.poste}</span>
                <span
                  class="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded"
                >
                  ⚡{(employee.efficiency || 1.0).toFixed(1)}x
                </span>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {:else if showEmployeeDropdown && employeeSearchQuery && filteredAvailableEmployees.length === 0}
      <div
        class="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 text-center"
      >
        <p class="text-xs text-slate-500">
          Aucun employé disponible pour "{employeeSearchQuery}"
        </p>
      </div>
    {/if}
  </div>

  <!-- Close dropdown when clicking elsewhere -->
  {#if showEmployeeDropdown}
    <button
      onclick={() => (showEmployeeDropdown = false)}
      class="fixed inset-0 z-10 cursor-default"
      aria-label="Fermer"
    ></button>
  {/if}

  <!-- 2. Collapsible Header (Operator count) -->
  <div class="flex items-center justify-between">
    <button
      onclick={() => (showAssignedEmployees = !showAssignedEmployees)}
      class="flex items-center gap-2 group"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-slate-500 transition-transform duration-200 {showAssignedEmployees
          ? 'rotate-180'
          : ''}"><polyline points="6 9 12 15 18 9"></polyline></svg
      >
      <span
        class="w-1.5 h-1.5 rounded-full {machine.employees &&
        machine.employees.length > 0
          ? 'bg-emerald-500'
          : 'bg-slate-500'}"
      ></span>
      <span
        class="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors"
      >
        Opérateurs ({machine.employees?.length || 0})
      </span>
    </button>

    {#if machine.employees && machine.employees.length > 0}
      <button
        onclick={handleUnassignAll}
        disabled={isLoading}
        class="text-[10px] px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg disabled:opacity-50 transition-all font-semibold"
      >
        ❌ Tout retirer
      </button>
    {/if}
  </div>

  <!-- 3. Assigned employees list (Compact badges) -->
  {#if showAssignedEmployees}
    {#if machine.expand?.employees && machine.expand.employees.length > 0}
      <div class="flex flex-wrap gap-2">
        {#each machine.expand.employees as employee (employee.id)}
          {@const rarity = getRarityInfo(employee.rarity)}
          <div
            class="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800/80 rounded-lg border {rarity.border} group hover:bg-slate-800 transition-colors"
          >
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold {rarity.bg} {rarity.color}"
            >
              {employee.name.charAt(0)}
            </div>
            <span class="text-xs font-medium text-white">{employee.name}</span>
            <span class="text-[10px] font-mono text-emerald-400"
              >⚡{(employee.efficiency || 1.0).toFixed(1)}x</span
            >
            <button
              onclick={() => handleRemoveEmployee(employee.id)}
              disabled={isLoading}
              class="text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50 ml-1"
            >
              ✕
            </button>
          </div>
        {/each}
      </div>
    {:else}
      <div
        class="p-3 border border-dashed border-slate-800 rounded-lg text-center"
      >
        <p class="text-xs text-slate-500">Aucun opérateur assigné</p>
      </div>
    {/if}
  {/if}
</div>
