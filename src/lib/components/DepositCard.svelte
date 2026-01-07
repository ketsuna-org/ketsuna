<script lang="ts">
  import type { Deposit, Employee, Item } from "$lib/pocketbase";
  import pb from "$lib/pocketbase";
  import { notifications } from "$lib/notifications";
  import { slide } from "svelte/transition";
  import ConfirmationModal from "$lib/components/ConfirmationModal.svelte";
  import GameIcon from "$lib/components/GameIcon.svelte";
  import { getItem } from "$lib/data/game-static";

  interface Props {
    deposit: Deposit;
    availableEmployees?: Employee[];
    assignedEmployees?: Employee[];
    assignedMachines?: any[];
    onUpdate?: (() => void) | null;
  }

  let {
    deposit,
    availableEmployees = [],
    assignedEmployees = [],
    assignedMachines = [],
    onUpdate = null,
  }: Props = $props();

  let isLoading = $state(false);
  let showAssignDropdown = $state(false);
  let employeeSearchQuery = $state("");
  let showUnassignMachineModal = $state(false);
  let targetMachineId = $state<string | null>(null);

  // Calculate max capacity (size * 5)
  let maxCapacity = $derived((deposit.size || 1) * 5);
  let machineOccupancy = $derived(assignedMachines.length * 5);
  let remainingSlots = $derived(
    maxCapacity - assignedEmployees.length - machineOccupancy
  );

  // Filter available employees by search
  let filteredEmployees = $derived(
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

  async function confirmUnassignMachine(machineId: string) {
    targetMachineId = machineId;
    showUnassignMachineModal = true;
  }

  async function executeUnassignMachine() {
    if (!targetMachineId) return;
    isLoading = true;
    try {
      await pb.send("/api/machines/assign-deposit", {
        method: "POST",
        body: { machineId: targetMachineId, depositId: "" },
      });
      notifications.success("Machine retirée du gisement");
      onUpdate?.();
    } catch (err: any) {
      notifications.error(
        err.message || "Erreur lors du retrait de la machine"
      );
    } finally {
      isLoading = false;
      targetMachineId = null;
    }
  }
</script>

<div
  class="bg-slate-800 rounded-xl p-5 border border-emerald-500/30 relative overflow-visible z-10"
>
  <!-- Background decoration -->
  <div
    class="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-4 -mt-4"
  ></div>

  <!-- Header -->
  <div class="flex justify-between items-start mb-4 relative z-10">
    <div>
      <h3 class="text-lg font-bold text-white flex items-center gap-2">
        <span class="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
          <GameIcon
            icon={getItem(deposit.ressource_id)?.icon || "⛏️"}
            size={20}
            alt={getItem(deposit.ressource_id)?.name || "Ressource"}
          />
        </span>
        {getItem(deposit.ressource_id)?.name || "Ressource"}
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
        <span>Occupation</span>
        <span class="font-mono"
          >{assignedEmployees.length + machineOccupancy} / {maxCapacity}</span
        >
      </div>
      <div class="w-full bg-slate-700 rounded-full h-2 overflow-hidden flex">
        <!-- Machine Part -->
        <div
          class="bg-amber-500 h-full transition-all duration-300"
          style="width: {(machineOccupancy / maxCapacity) * 100}%"
          title="Machines"
        ></div>
        <!-- Employee Part -->
        <div
          class="bg-cyan-500 h-full transition-all duration-300"
          style="width: {(assignedEmployees.length / maxCapacity) * 100}%"
          title="Employés"
        ></div>
      </div>
    </div>
  </div>

  <!-- Assigned Machines List -->
  {#if assignedMachines.length > 0}
    <div class="mb-4">
      <h4 class="text-xs font-bold text-slate-400 uppercase mb-2">Machines</h4>
      <div class="space-y-1">
        {#each assignedMachines as mach (mach.id)}
          <div
            class="flex items-center justify-between bg-amber-900/20 rounded-lg p-2 border border-amber-500/20 group"
          >
            <div class="flex items-center gap-2">
              <GameIcon
                icon={getItem(mach.machine_id)?.icon || "🏭"}
                size={16}
                alt={getItem(mach.machine_id)?.name || "Machine"}
              />
              <div>
                <span class="text-xs text-white font-medium block"
                  >{getItem(mach.machine_id)?.name || "Machine"}</span
                >
                <span class="text-[10px] text-amber-500">Occupe {5} places</span
                >
              </div>
            </div>
            <button
              onclick={() => confirmUnassignMachine(mach.id)}
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
  </div>
</div>

<ConfirmationModal
  bind:isOpen={showUnassignMachineModal}
  title="Retirer la machine ?"
  message="La machine retournera dans votre inventaire et cessera de produire."
  confirmLabel="Retirer"
  isDestructive={true}
  onConfirm={executeUnassignMachine}
/>

<!-- Modal Overlay for Employee Selection -->
{#if showAssignDropdown && remainingSlots > 0}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/50 z-9998"
    onclick={() => {
      showAssignDropdown = false;
      employeeSearchQuery = "";
    }}
    role="button"
    tabindex="-1"
    onkeydown={(e) => {
      if (e.key === "Escape") {
        showAssignDropdown = false;
        employeeSearchQuery = "";
      }
    }}
  ></div>

  <!-- Modal Content -->
  <div
    class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-9999 overflow-hidden"
  >
    <!-- Header -->
    <div
      class="p-4 border-b border-slate-800 flex justify-between items-center"
    >
      <h3 class="text-white font-bold">⛏️ Assigner un Mineur</h3>
      <button
        onclick={() => {
          showAssignDropdown = false;
          employeeSearchQuery = "";
        }}
        class="text-slate-400 hover:text-white text-xl"
      >
        ×
      </button>
    </div>

    <!-- Search -->
    <div class="p-3 border-b border-slate-800">
      <input
        type="text"
        bind:value={employeeSearchQuery}
        placeholder="Rechercher un employé..."
        class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
      />
    </div>

    <!-- Employee List -->
    <div class="max-h-64 overflow-y-auto">
      {#if filteredEmployees.length > 0}
        {#each filteredEmployees as emp (emp.id)}
          <button
            onclick={() => handleAssignEmployee(emp.id)}
            disabled={isLoading}
            class="w-full text-left p-4 hover:bg-slate-800 border-b border-slate-800 last:border-0 flex justify-between items-center"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl">👷</span>
              <div>
                <p class="text-sm text-white font-medium">{emp.name}</p>
                <p class="text-xs text-slate-500">
                  {emp.poste || "Employé"}
                </p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold text-cyan-400">
                ⛏️ {emp.mining || 0}
              </div>
              <div class="text-xs text-slate-500">
                Eff: {emp.efficiency || 0}%
              </div>
            </div>
          </button>
        {/each}
      {:else}
        <div class="p-6 text-center text-sm text-slate-500">
          {#if employeeSearchQuery}
            Aucun employé trouvé pour "{employeeSearchQuery}"
          {:else}
            Aucun employé disponible
          {/if}
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <div class="p-3 border-t border-slate-800 bg-slate-950">
      <p class="text-xs text-slate-500 text-center">
        {filteredEmployees.length} employé(s) disponible(s) • {remainingSlots} place(s)
        restante(s)
      </p>
    </div>
  </div>
{/if}
