<script lang="ts">
  import type { Employee } from "$lib/pocketbase";
  import pb from "$lib/pocketbase";
  import { notifications } from "$lib/notifications";

  // Using specific Deposit type interface or generic Record
  interface Deposit {
    id: string;
    employees?: string[];
    expand?: {
      employees?: Employee[];
    };
    // Other fields can be optional
  }

  interface Props {
    deposit: Deposit;
    availableEmployees: Employee[];
    isLoading: boolean;
    onLoadingChange: (loading: boolean) => void;
    onDepositUpdate?: (() => void) | null;
    onRefresh?: (() => Promise<void>) | null;
  }

  let {
    deposit,
    availableEmployees,
    isLoading,
    onLoadingChange,
    onDepositUpdate = null,
    onRefresh = null,
  }: Props = $props();

  let showEmployeeDropdown = $state(false);
  let showAssignedEmployees = $state(false);
  let employeeSearchQuery = $state("");

  async function toggleDropdown() {
    showEmployeeDropdown = !showEmployeeDropdown;
    // Refresh the employee list when opening the dropdown
    if (showEmployeeDropdown && onRefresh) {
      await onRefresh();
    }
  }

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

  async function handleAssignEmployee(employeeId: string) {
    onLoadingChange(true);
    try {
      // Use the specific custom endpoint for assignment validation logic
      await pb.send("/api/deposits/assign-employee", {
        method: "POST",
        body: {
          depositId: deposit.id,
          employeeId: employeeId,
        },
      });

      notifications.success("✨ Employé assigné");
      employeeSearchQuery = "";
      onDepositUpdate?.();
    } catch (error: any) {
      notifications.error(`Erreur: ${error.message}`);
    } finally {
      onLoadingChange(false);
    }
  }

  async function handleRemoveEmployee(employeeId: string) {
    onLoadingChange(true);
    try {
      // Use the specific custom endpoint
      await pb.send("/api/deposits/unassign-employee", {
        method: "POST",
        body: {
          employeeId: employeeId,
        },
      });
      notifications.success("✨ Employé désassigné");
      onDepositUpdate?.();
    } catch (error: any) {
      notifications.error(`Erreur: ${error.message}`);
    } finally {
      onLoadingChange(false);
    }
  }

  async function handleUnassignAll() {
    if (!deposit.expand?.employees || deposit.expand.employees.length === 0)
      return;

    onLoadingChange(true);
    try {
      // Sequentially unassign all (optimally backend should have bulk unassign but manual loop is safe for now)
      // Or updated deposit update logic? No, Employees have the relation.
      // Let's loop for now or just trust manual removal.
      // Better: Backend endpoints handle single ops.
      // For 'Unassign All', we might want to just call unassign for each.
      const promises = deposit.expand.employees.map((emp) =>
        pb.send("/api/deposits/unassign-employee", {
          method: "POST",
          body: { employeeId: emp.id },
        })
      );
      await Promise.all(promises);

      notifications.success("Employés désassignés");
      onDepositUpdate?.();
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
        onfocus={toggleDropdown}
        placeholder="🔍 Rechercher un mineur..."
        class="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
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
        class="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-emerald-500/30 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
      >
        <div class="p-2 space-y-1">
          {#each filteredAvailableEmployees as employee (employee.id)}
            <button
              onclick={() => handleAssignEmployee(employee.id)}
              disabled={isLoading}
              class="w-full text-left px-3 py-2 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-white transition-all disabled:opacity-50 flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-emerald-500/20 text-emerald-400"
                >
                  {employee.name.charAt(0)}
                </div>
                <span class="font-medium">{employee.name}</span>
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300"
                >
                  {employee.poste || "Employé"}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded"
                >
                  ⛏️{employee.mining ?? 0}
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

  <!-- 2. Collapsible Header (Mineur count) -->
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
        class="w-1.5 h-1.5 rounded-full {deposit.expand?.employees &&
        deposit.expand.employees.length > 0
          ? 'bg-emerald-500'
          : 'bg-slate-500'}"
      ></span>
      <span
        class="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors"
      >
        Mineurs ({deposit.expand?.employees?.length || 0})
      </span>
    </button>

    {#if deposit.expand?.employees && deposit.expand.employees.length > 0}
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
    {#if deposit.expand?.employees && deposit.expand.employees.length > 0}
      <div class="flex flex-wrap gap-2">
        {#each deposit.expand.employees as employee (employee.id)}
          <div
            class="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/50 group hover:bg-slate-800 transition-colors"
          >
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-emerald-500/20 text-emerald-400"
            >
              {employee.name.charAt(0)}
            </div>
            <span class="text-xs font-medium text-white">{employee.name}</span>
            <span class="text-[10px] font-mono text-cyan-400"
              >⛏️{employee.mining ?? 0}</span
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
        <p class="text-xs text-slate-500">Aucun mineur assigné</p>
      </div>
    {/if}
  {/if}
</div>
