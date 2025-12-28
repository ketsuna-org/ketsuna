<script lang="ts">
  import type { Machine, Employee, Recipe } from "$lib/types";
  import pb from "$lib/pocketbase";
  import { notifications } from "$lib/notifications";

  /**
   * @type {Machine} - La machine à configurer
   */
  export let machine: Machine;

  /**
   * @type {Employee[]} - Tous les employés disponibles
   */
  export let allEmployees: Employee[] = [];

  /**
   * @type {string} - ID de l'entreprise
   */
  export let companyId: string = "";

  /**
   * @type {() => void} - Callback pour rafraîchir après changement
   */
  export let onUpdate: (() => void) | null = null;

  let isLoading = false;
  let showEmployeeModal = false;

  // Recette de la machine (définie dans l'item)
  $: machineItem = machine.expand?.machine;
  $: recipeId = machineItem?.use_recipe;
  let machineRecipe: Recipe | null = null;
  let progress = 0;
  let timeRemaining = 0;

  $: if (recipeId) {
    loadMachineRecipe(recipeId);
  }

  async function loadMachineRecipe(id: string) {
    try {
      const r = await pb.collection("recipes").getOne<Recipe>(id, {
        expand: "output_item",
        requestKey: null,
      });
      machineRecipe = r;
    } catch (error) {
      console.error("Erreur chargement recette machine", error);
    }
  }

  // Calcul du progrès pour les productions timées
  $: {
    if (
      machine.production_started_at &&
      machineRecipe &&
      machineRecipe.production_time > 60
    ) {
      const start = new Date(machine.production_started_at).getTime();
      const now = new Date().getTime();
      const elapsed = (now - start) / 1000;
      const total = machineRecipe.production_time;

      progress = Math.min(100, (elapsed / total) * 100);
      timeRemaining = Math.max(0, total - elapsed);
    } else {
      progress = 0;
      timeRemaining = 0;
    }
  }

  // Employés actuellement assignés
  $: assignedEmployeeIds = new Set(machine.employees || []);

  // Employés disponibles pour assignation
  $: availableEmployees = allEmployees.filter(
    (emp) => !assignedEmployeeIds.has(emp.id)
  );

  async function handleAssignEmployee(employeeId: string) {
    isLoading = true;
    try {
      // Ajouter l'employé à la liste
      const updatedEmployees = [...(machine.employees || []), employeeId];

      await pb.collection("machines").update(machine.id, {
        employees: updatedEmployees,
      });

      notifications.success("✨ Employé assigné");
      onUpdate?.();
    } catch (error: any) {
      notifications.error(`Erreur: ${error.message}`);
    } finally {
      isLoading = false;
    }
  }

  async function handleRemoveEmployee(employeeId: string) {
    isLoading = true;
    try {
      const updatedEmployees = (machine.employees || []).filter(
        (id) => id !== employeeId
      );

      await pb.collection("machines").update(machine.id, {
        employees: updatedEmployees,
      });

      notifications.success("✨ Employé désassigné");
      onUpdate?.();
    } catch (error: any) {
      notifications.error(`Erreur: ${error.message}`);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="border border-slate-700 rounded-lg p-4 bg-slate-800">
  <!-- Machine Header -->
  <div class="mb-4">
    <h3 class="text-lg font-semibold text-white">
      🤖 {machine.expand?.machine?.name || "Machine"}
    </h3>
    <p class="text-xs text-slate-400">Configuration machine</p>
  </div>

  <!-- Recipe Status -->
  <div class="mb-4">
    <h4 class="block text-sm font-medium text-slate-300 mb-2">
      Production en cours
    </h4>

    {#if machineRecipe}
      <div class="p-3 bg-slate-700/50 rounded border border-slate-600">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-semibold text-white">
            {machineRecipe.name ||
              machineRecipe.expand?.output_item?.name ||
              "Item"}
          </span>
          <span class="text-xs text-indigo-400">
            {machineRecipe.production_time}s
          </span>
        </div>

        {#if machine.production_started_at && machineRecipe.production_time > 60}
          <div class="space-y-1">
            <div class="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div
                class="bg-indigo-500 h-full transition-all duration-1000"
                style="width: {progress}%"
              ></div>
            </div>
            <div class="flex justify-between text-[10px] text-slate-500">
              <span>{Math.round(progress)}% terminé</span>
              <span>~{Math.round(timeRemaining)}s restantes</span>
            </div>
          </div>
        {:else if machine.employees && machine.employees.length > 0}
          <p class="text-xs text-emerald-400 flex items-center gap-1">
            <span class="relative flex h-2 w-2">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
              ></span>
              <span
                class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"
              ></span>
            </span>
            Production active (chaque minute)
          </p>
        {:else}
          <p class="text-xs text-amber-400">⚠️ En attente d'employés</p>
        {/if}
      </div>
    {:else if machineItem?.product}
      <div class="p-3 bg-slate-700/50 rounded border border-slate-600">
        <p class="text-sm text-white font-medium">Production Passive</p>
        <p class="text-xs text-slate-400 mt-1">
          Génère {machineItem.product_quantity || 1} unité(s) par minute.
        </p>
      </div>
    {:else}
      <p class="text-xs text-slate-500 italic">Aucune production configurée.</p>
    {/if}
  </div>

  <!-- Assigned Employees -->
  <div class="mb-4">
    <div class="flex items-center justify-between mb-2">
      <div class="block text-sm font-medium text-slate-300">
        Employés assignés ({machine.employees?.length || 0})
      </div>
      <button
        on:click={() => (showEmployeeModal = !showEmployeeModal)}
        disabled={availableEmployees.length === 0 || isLoading}
        class="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        + Ajouter
      </button>
    </div>

    {#if machine.expand?.employees && machine.expand.employees.length > 0}
      <div class="space-y-2">
        {#each machine.expand.employees as employee (employee.id)}
          <div
            class="flex items-center justify-between bg-slate-700/30 rounded p-2 border border-slate-600"
          >
            <div class="flex-1">
              <p class="text-sm font-medium text-white">
                {employee.name}
              </p>
              <p class="text-xs text-slate-400">
                Efficacité: {(employee.efficiency || 1.0).toFixed(1)}x |
                Salaire: ${employee.salary}
              </p>
            </div>
            <button
              on:click={() => handleRemoveEmployee(employee.id)}
              disabled={isLoading}
              class="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded disabled:opacity-50 transition-all"
            >
              Retirer
            </button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-sm text-slate-400">Aucun employé assigné</p>
    {/if}
  </div>

  <!-- Employee Selection Modal -->
  {#if showEmployeeModal}
    <div class="mb-4 p-3 bg-slate-700/50 rounded border border-slate-600">
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-semibold text-white">Choisir un employé</h4>
        <button
          on:click={() => (showEmployeeModal = false)}
          class="text-xs text-slate-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {#if availableEmployees.length > 0}
        <div class="space-y-1 max-h-40 overflow-y-auto">
          {#each availableEmployees as employee (employee.id)}
            <button
              on:click={() => handleAssignEmployee(employee.id)}
              disabled={isLoading}
              class="w-full text-left px-2 py-1 text-sm rounded bg-slate-600 hover:bg-slate-500 text-white transition-all disabled:opacity-50"
            >
              {employee.name}
              <span class="text-xs text-slate-400 float-right">
                {(employee.efficiency || 1.0).toFixed(1)}x | ${employee.salary}
              </span>
            </button>
          {/each}
        </div>
      {:else}
        <p class="text-xs text-slate-400">Aucun employé disponible</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(71, 85, 105, 0.3);
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.5);
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.7);
  }
</style>
