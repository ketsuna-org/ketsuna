<script lang="ts">
  import type { Machine, Employee, Recipe } from "$lib/types";
  import pb from "$lib/pocketbase";
  import { notifications } from "$lib/notifications";
  import { onMount, onDestroy } from "svelte";

  /**
   * @type {Machine} - La machine à configurer
   */
  export let machine: Machine;

  /**
   * @type {Employee[]} - Tous les employés disponibles
   */
  export let allEmployees: Employee[] = [];

  /**
   * @type {() => void} - Callback pour rafraîchir après changement
   */
  export let onUpdate: (() => void) | null = null;

  /**
   * @type {Set<string>} - Ensemble des IDs d'employés déjà assignés (globalement)
   */
  export let busyEmployeeIds: Set<string> = new Set();

  let isLoading = false;
  let showEmployeeModal = false;

  // Recette de la machine (définie dans l'item)
  $: machineItem = machine.expand?.machine;
  $: recipeId = machineItem?.use_recipe;
  let machineRecipe: Recipe | null = null;
  let progress = 0;
  let timeRemaining = 0;
  let progressInterval: ReturnType<typeof setInterval> | null = null;

  $: if (recipeId) {
    loadMachineRecipe(recipeId);
  }

  async function loadMachineRecipe(id: string) {
    try {
      const r = await pb.collection("recipes").getOne<Recipe>(id, {
        expand: "output_item,inputs_items",
        requestKey: null,
      });
      machineRecipe = r;
    } catch (error) {
      console.error("Erreur chargement recette machine", error);
    }
  }

  // Fonction pour calculer et mettre à jour le progrès
  function updateProgress() {
    const now = new Date().getTime();
    let total = 0;

    // CAS 1: Recette (Recipe)
    if (
      machine.production_started_at &&
      machineRecipe &&
      machineRecipe.production_time > 0
    ) {
      total = machineRecipe.production_time;
    }
    // CAS 2: Production Passive (Passive)
    else if (
      machine.production_started_at &&
      machineItem &&
      machineItem.product &&
      (machineItem.production_time || 0) > 0
    ) {
      total = machineItem.production_time;
    }

    if (total > 0) {
      const start = new Date(machine.production_started_at).getTime();
      const elapsed = (now - start) / 1000;

      const newProgress = Math.min(100, (elapsed / total) * 100);
      progress = newProgress;
      timeRemaining = Math.max(0, total - elapsed);

      if (newProgress >= 100) {
        setTimeout(() => {
          progress = 0;
          onUpdate?.();
        }, 1000);
      }
    } else {
      progress = 0;
      timeRemaining = 0;
    }
  }

  // Démarrer l'interval de mise à jour du progrès
  onMount(() => {
    updateProgress();
    progressInterval = setInterval(updateProgress, 1000);
  });

  onDestroy(() => {
    if (progressInterval) {
      clearInterval(progressInterval);
    }
  });

  // Employés actuellement assignés
  $: assignedEmployeeIds = new Set(machine.employees || []);

  // Employés disponibles pour assignation (exclut tous les employés occupés)
  // Si busyEmployeeIds n'est pas fourni (ex: usage isolé), on fallback sur l'exclusion locale
  $: availableEmployees = allEmployees.filter((emp) => {
    if (busyEmployeeIds.size > 0) {
      return !busyEmployeeIds.has(emp.id);
    }
    return !assignedEmployeeIds.has(emp.id);
  });

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

<div
  class="border border-slate-700/50 rounded-2xl p-6 bg-slate-900/50 backdrop-blur-sm hover:border-slate-600/50 transition-colors"
>
  <!-- Machine Header -->
  <div class="mb-6 flex items-start justify-between">
    <div>
      <h3 class="text-xl font-bold text-white flex items-center gap-2">
        <span class="p-1.5 bg-slate-800 rounded-lg text-lg">🤖</span>
        {machine.expand?.machine?.name || "Machine"}
      </h3>
      <p class="text-xs text-slate-400 font-medium ml-1 mt-1">
        Configuration & production
      </p>
    </div>
    <div
      class="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400"
    >
      ID: {machine.id.slice(0, 8)}
    </div>
  </div>

  <!-- Recipe Status -->
  <div class="mb-6">
    <h4
      class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
      Production en cours
    </h4>

    {#if machineRecipe}
      <div class="p-4 bg-slate-950/30 rounded-xl border border-slate-800/50">
        <div class="flex flex-col gap-4 mb-4">
          <!-- Inputs -->
          {#if machineRecipe.expand?.inputs_items && machineRecipe.expand.inputs_items.length > 0}
            <div class="space-y-2">
              <span class="text-xs text-slate-500 font-semibold uppercase"
                >Requis</span
              >
              <div class="flex flex-wrap gap-2">
                {#each machineRecipe.expand.inputs_items as input}
                  <div
                    class="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg text-xs border border-slate-800"
                  >
                    <span class="text-slate-300 font-medium">{input.name}</span>
                    <span class="text-amber-400 font-mono font-bold"
                      >x{machineRecipe.input_quantity}</span
                    >
                  </div>
                {/each}
              </div>
            </div>

            <!-- Arrow Separator -->
            <div class="flex justify-center text-slate-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><line x1="12" y1="5" x2="12" y2="19" /><polyline
                  points="19 12 12 19 5 12"
                /></svg
              >
            </div>
          {/if}

          <!-- Output -->
          <div>
            <span
              class="text-xs text-slate-500 font-semibold uppercase block mb-2"
              >Produit</span
            >
            <div
              class="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-indigo-500/20 shadow-sm"
            >
              <span
                class="text-sm font-bold text-white flex items-center gap-2"
              >
                <span class="text-indigo-400">📦</span>
                {machineRecipe.expand?.output_item?.name ||
                  machineRecipe.name ||
                  "Item"}
              </span>
              <span
                class="text-xs text-indigo-300 font-mono font-bold bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20"
              >
                {machineRecipe.production_time}s / cycle
              </span>
            </div>
          </div>
        </div>

        {#if machine.production_started_at && machineRecipe.production_time > 0}
          <div class="space-y-2">
            <div
              class="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50"
            >
              <div
                class="bg-indigo-500 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                style="width: {progress}%"
              ></div>
            </div>
            <div
              class="flex justify-between text-[10px] text-slate-400 font-medium"
            >
              <span>{Math.round(progress)}% terminé</span>
              <span class="font-mono">~{Math.round(timeRemaining)}s</span>
            </div>
          </div>
        {:else if machine.employees && machine.employees.length > 0}
          <div
            class="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2"
          >
            <span class="relative flex h-2 w-2">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
              ></span>
              <span
                class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"
              ></span>
            </span>
            <span class="text-xs text-emerald-400 font-bold"
              >Production active</span
            >
          </div>
        {:else}
          <div
            class="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2"
          >
            <span class="text-amber-400 text-xs font-bold"
              >⚠️ En attente d'employés</span
            >
          </div>
        {/if}
      </div>
    {:else if machineItem?.product}
      <!-- PASSIVE PRODUCTION DISPLAY -->
      <div class="p-4 bg-slate-950/30 rounded-xl border border-slate-800/50">
        <div class="flex items-center gap-2 mb-3">
          <span class="p-1 bg-slate-800 rounded text-slate-400">⚡</span>
          <p class="text-sm text-white font-bold">Production Passive</p>
        </div>

        {#if machineItem.production_time && machineItem.production_time > 0}
          <div
            class="p-3 bg-slate-900/50 rounded-lg border border-slate-800 mb-4"
          >
            <p class="text-xs text-slate-300">
              Génère <span
                class="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono"
                >{machineItem.product_quantity || 1}</span
              >
              unité(s) de
              <span class="text-emerald-400 font-bold"
                >{machineItem.expand?.product?.name || "Produit Inconnu"}</span
              >
            </p>
            <p class="text-[10px] text-slate-500 mt-1">
              Cycle: <span class="font-mono"
                >{machineItem.production_time}s</span
              >
            </p>
          </div>

          {#if machine.production_started_at}
            <div class="space-y-2">
              <div
                class="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50"
              >
                <div
                  class="bg-indigo-500 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  style="width: {progress}%"
                ></div>
              </div>
              <div
                class="flex justify-between text-[10px] text-slate-400 font-medium"
              >
                <span>{Math.round(progress)}% terminé</span>
                <span class="font-mono">~{Math.round(timeRemaining)}s</span>
              </div>
            </div>
          {:else}
            <div
              class="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 font-medium"
            >
              ⚠️ Production en pause / non démarrée
            </div>
          {/if}
        {:else}
          <!-- Legacy / Instant -->
          <div class="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
            <p class="text-xs text-slate-300">
              Génère <span class="text-white font-bold"
                >{machineItem.product_quantity || 1}</span
              >
              unité(s) de
              <span class="text-emerald-400 font-bold"
                >{machineItem.expand?.product?.name || "Produit Inconnu"}</span
              > chaque seconde.
            </p>
          </div>
        {/if}
      </div>
    {:else}
      <div
        class="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30 text-center"
      >
        <p class="text-xs text-slate-500 italic">
          Aucune production configurée.
        </p>
      </div>
    {/if}
  </div>

  <!-- Assigned Employees -->
  <div>
    <div class="flex items-center justify-between mb-3">
      <div
        class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
        Opérateurs ({machine.employees?.length || 0})
      </div>
      <button
        on:click={() => (showEmployeeModal = !showEmployeeModal)}
        disabled={availableEmployees.length === 0 || isLoading}
        class="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/20 border border-indigo-500/50"
      >
        + Assigner
      </button>
    </div>

    {#if machine.expand?.employees && machine.expand.employees.length > 0}
      <div class="space-y-2">
        {#each machine.expand.employees as employee (employee.id)}
          <div
            class="flex items-center justify-between bg-slate-800/80 rounded-xl p-3 border border-slate-700/50 group hover:border-slate-600 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300"
              >
                {employee.name.charAt(0)}
              </div>
              <div>
                <p class="text-sm font-bold text-white">
                  {employee.name}
                </p>
                <div class="flex gap-2 text-[10px] text-slate-400 font-medium">
                  <span
                    class="bg-slate-900/50 px-1.5 rounded border border-slate-800"
                    >⚡ {(employee.efficiency || 1.0).toFixed(1)}x</span
                  >
                  <span>${employee.salary}/j</span>
                </div>
              </div>
            </div>
            <button
              on:click={() => handleRemoveEmployee(employee.id)}
              disabled={isLoading}
              class="text-[10px] px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg disabled:opacity-50 transition-all opacity-0 group-hover:opacity-100"
            >
              Retirer
            </button>
          </div>
        {/each}
      </div>
    {:else}
      <div
        class="p-4 border-2 border-dashed border-slate-800 rounded-xl text-center"
      >
        <p class="text-sm text-slate-500 font-medium">
          Aucun opérateur assigné
        </p>
        <p class="text-xs text-slate-600 mt-1">
          L'efficacité de la machine est réduite.
        </p>
      </div>
    {/if}
  </div>

  <!-- Employee Selection Modal -->
  {#if showEmployeeModal}
    <div
      class="mt-4 p-4 bg-slate-900 border border-indigo-500/30 rounded-xl shadow-2xl relative overflow-hidden"
    >
      <div class="absolute top-0 bottom-0 left-0 w-1 bg-indigo-500"></div>
      <div class="flex items-center justify-between mb-3 pl-2">
        <h4 class="text-sm font-bold text-white">Choisir un employé</h4>
        <button
          on:click={() => (showEmployeeModal = false)}
          class="text-xs text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded"
        >
          ✕
        </button>
      </div>

      {#if availableEmployees.length > 0}
        <div class="space-y-1 max-h-48 overflow-y-auto pr-1">
          {#each availableEmployees as employee (employee.id)}
            <button
              on:click={() => handleAssignEmployee(employee.id)}
              disabled={isLoading}
              class="w-full text-left px-3 py-2 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-white transition-all disabled:opacity-50 flex items-center justify-between group"
            >
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span class="font-medium">{employee.name}</span>
              </div>
              <span
                class="text-xs text-slate-400 font-mono group-hover:text-white transition-colors"
              >
                {(employee.efficiency || 1.0).toFixed(1)}x
              </span>
            </button>
          {/each}
        </div>
      {:else}
        <p class="text-xs text-slate-500 pl-2">Aucun employé disponible</p>
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
