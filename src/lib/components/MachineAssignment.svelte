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
  let showEmployeeDropdown = false;
  let showAssignedEmployees = false;
  let employeeSearchQuery = "";

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
        expand: "output_item,inputs_items,ingredients.item",
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
      total = machineItem.production_time || 0;
    }

    if (total > 0 && machine.production_started_at) {
      const start = new Date(machine.production_started_at).getTime();
      const elapsed = (now - start) / 1000;

      const newProgress = Math.min(100, (elapsed / total) * 100);
      progress = newProgress;
      timeRemaining = Math.max(0, total - elapsed);

      if (newProgress >= 100) {
        setTimeout(() => {
          progress = 0;
          // Note: on ne call pas onUpdate() ici pour éviter les refresh en boucle.
          // Les mises à jour de données sont gérées par les subscriptions PocketBase.
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

  // Employés disponibles pour assignation (exclut tous les employés occupés globalement)
  // Triés par efficacité décroissante
  $: availableEmployees = allEmployees
    .filter((emp) => {
      // Exclure les employés déjà assignés à n'importe quelle machine
      return !busyEmployeeIds.has(emp.id);
    })
    .sort((a, b) => (b.efficiency || 1) - (a.efficiency || 1));

  // Employés filtrés par la recherche
  $: filteredAvailableEmployees = availableEmployees.filter((emp) => {
    if (!employeeSearchQuery.trim()) return true;
    const query = employeeSearchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(query) ||
      (emp.poste && emp.poste.toLowerCase().includes(query))
    );
  });

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
    isLoading = true;
    try {
      const updatedEmployees = [...(machine.employees || []), employeeId];

      await pb.collection("machines").update(machine.id, {
        employees: updatedEmployees,
      });

      notifications.success("✨ Employé assigné");
      // onUpdate?.(); - Removed to prevent refresh, let realtime sub handle it
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
      // onUpdate?.(); - Removed to prevent refresh, let realtime sub handle it
    } catch (error: any) {
      notifications.error(`Erreur: ${error.message}`);
    } finally {
      isLoading = false;
    }
  }

  async function handleUnassignAll() {
    if (!machine.employees || machine.employees.length === 0) return;

    isLoading = true;
    try {
      await pb.collection("machines").update(machine.id, {
        employees: [],
      });

      notifications.success(
        `${machine.employees.length} employé(s) désassigné(s)`
      );
      // onUpdate?.(); - Removed to prevent refresh, let realtime sub handle it
    } catch (error: any) {
      notifications.error(`Erreur: ${error.message}`);
    } finally {
      isLoading = false;
    }
  }
</script>

<div
  class="border border-slate-700/50 rounded-2xl p-6 bg-slate-900/50 backdrop-blur-sm hover:border-slate-600/50 transition-colors {showEmployeeDropdown
    ? 'relative z-50'
    : ''}"
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

          <!-- Complex Ingredients (with specific quantity) -->
          {#if machineRecipe.expand?.ingredients && machineRecipe.expand.ingredients.length > 0}
            <div class="space-y-2 mt-2">
              {#if !machineRecipe.expand?.inputs_items?.length}
                <span class="text-xs text-slate-500 font-semibold uppercase"
                  >Requis</span
                >
              {/if}
              <div class="flex flex-wrap gap-2">
                {#each machineRecipe.expand.ingredients as ing}
                  <div
                    class="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg text-xs border border-slate-800"
                  >
                    <span class="text-slate-300 font-medium"
                      >{ing.expand?.item?.name || "???"}</span
                    >
                    <span class="text-amber-400 font-mono font-bold"
                      >x{ing.quantity}</span
                    >
                  </div>
                {/each}
              </div>
            </div>

            <!-- Arrow Separator if not displayed above -->
            {#if !machineRecipe.expand?.inputs_items?.length}
              <div class="flex justify-center text-slate-600 mt-2">
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
          {/if}

          <!-- Output -->
          <div>
            <span
              class="text-xs text-slate-500 font-semibold uppercase block mb-2"
              >Produit</span
            >

            {#if machineItem?.produce_energy && machineItem.produce_energy > 0}
              <div
                class="flex items-center gap-2 text-emerald-400 font-bold bg-slate-900/80 p-3 rounded-xl border border-emerald-500/20 shadow-sm mb-2 w-full"
              >
                <span>⚡</span>
                <span>{machineItem.produce_energy} kWh</span>
              </div>
            {/if}
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
    {:else if machineItem?.expand?.can_consume}
      <!-- Fuel Consumption Display (Simple Generator) -->
      <div class="p-4 bg-slate-950/30 rounded-xl border border-slate-800/50">
        <div class="flex flex-col gap-4">
          <!-- Fuel Input -->
          <div class="space-y-2">
            <div class="flex justify-between items-baseline">
              <span class="text-xs text-slate-500 font-semibold uppercase"
                >Carburants acceptés</span
              >
              <span class="text-[10px] text-amber-400 font-mono font-bold"
                >1 / cycle (Auto)</span
              >
            </div>

            <div class="flex flex-wrap gap-2">
              {#if Array.isArray(machineItem.expand?.can_consume)}
                {#each machineItem.expand.can_consume as fuel}
                  <div
                    class="px-3 py-1.5 bg-slate-900 rounded-lg text-xs border border-slate-800 text-slate-300 font-medium"
                  >
                    {fuel.name}
                  </div>
                {/each}
              {:else if machineItem.expand?.can_consume}
                <div
                  class="px-3 py-1.5 bg-slate-900 rounded-lg text-xs border border-slate-800 text-slate-300 font-medium"
                >
                  {machineItem.expand.can_consume.name}
                </div>
              {:else}
                <div
                  class="px-3 py-1.5 bg-slate-900 rounded-lg text-xs border border-slate-800 text-slate-500 italic"
                >
                  Nom inconnu
                </div>
              {/if}
            </div>

            {#if Array.isArray(machineItem.expand?.can_consume) && machineItem.expand.can_consume.length > 1}
              <p class="text-[10px] text-slate-500">
                Utilise le premier disponible.
              </p>
            {/if}
          </div>

          <!-- Arrow -->
          <div class="flex justify-center text-slate-600">
            <svg
              class="w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
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

          <!-- Output (Energy) -->
          <div>
            <span
              class="text-xs text-slate-500 font-semibold uppercase block mb-2"
              >Production</span
            >
            <div
              class="flex items-center gap-2 text-emerald-400 font-bold bg-slate-900/80 p-3 rounded-xl border border-emerald-500/20 shadow-sm w-full"
            >
              <span>⚡</span>
              <span>{machineItem.produce_energy || 0} kWh</span>
            </div>
          </div>

          <!-- Efficiency Status -->
          {#if machine.employees && machine.employees.length > 0}
            <div
              class="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2"
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
                >Générateur Actif</span
              >
            </div>
          {:else}
            <div
              class="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2"
            >
              <span class="text-amber-400 text-xs font-bold"
                >⚠️ Pas d'employés (Efficacité réduite)</span
              >
            </div>
          {/if}
        </div>
      </div>
    {:else if machineItem?.produce_energy && machineItem.produce_energy > 0}
      <!-- Pure Energy Producer (Solar/Wind) -->
      <div class="p-4 bg-slate-950/30 rounded-xl border border-slate-800/50">
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-2 mb-1">
            <span
              class="p-1.5 bg-slate-900 rounded-lg text-amber-400 border border-slate-800"
              >☀️</span
            >
            <div>
              <p class="text-sm text-white font-bold">Générateur Autonome</p>
              <p class="text-[10px] text-slate-400">
                Production d'énergie sans carburant
              </p>
            </div>
          </div>

          <div
            class="p-3 bg-slate-900/50 rounded-lg border border-slate-800 flex justify-between items-center"
          >
            <span class="text-xs text-slate-400 font-medium uppercase"
              >Production</span
            >
            <div class="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span>⚡</span>
              <span>{machineItem.produce_energy} kWh</span>
            </div>
          </div>

          <!-- Status indicator -->
          <div
            class="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg border border-slate-800"
          >
            <div
              class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
            ></div>
            <span class="text-xs text-slate-300">Opérationnel</span>
          </div>
        </div>
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

  <!-- Assigned Employees - Compact Display -->
  <!-- Assigned Employees - Compact Display -->
  <div class="relative flex flex-col gap-4">
    <!-- 1. Barre de recherche pour assigner des employés (EN HAUT) -->
    <div class="relative z-20">
      <div class="relative">
        <input
          type="text"
          bind:value={employeeSearchQuery}
          on:focus={() => (showEmployeeDropdown = true)}
          placeholder="🔍 Rechercher un employé à assigner..."
          class="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
        />
        {#if employeeSearchQuery}
          <button
            on:click={() => {
              employeeSearchQuery = "";
              showEmployeeDropdown = false;
            }}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            ✕
          </button>
        {/if}
      </div>

      <!-- Dropdown avec résultats filtrés -->
      {#if showEmployeeDropdown && filteredAvailableEmployees.length > 0}
        <div
          class="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-indigo-500/30 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
        >
          <div class="p-2 space-y-1">
            {#each filteredAvailableEmployees as employee (employee.id)}
              {@const rarity = getRarityInfo(employee.rarity)}
              <button
                on:click={() => {
                  handleAssignEmployee(employee.id);
                  employeeSearchQuery = "";
                }}
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
                  <span class="text-[10px] text-slate-500"
                    >{employee.poste}</span
                  >
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

    <!-- Fermer le dropdown en cliquant ailleurs -->
    {#if showEmployeeDropdown}
      <button
        on:click={() => (showEmployeeDropdown = false)}
        class="fixed inset-0 z-10 cursor-default"
        aria-label="Fermer"
      ></button>
    {/if}

    <!-- 2. Header Collapsible (Nombre d'opérateurs) -->
    <div class="flex items-center justify-between">
      <button
        on:click={() => (showAssignedEmployees = !showAssignedEmployees)}
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
          on:click={handleUnassignAll}
          disabled={isLoading}
          class="text-[10px] px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg disabled:opacity-50 transition-all font-semibold"
        >
          ❌ Tout retirer
        </button>
      {/if}
    </div>

    <!-- 3. Liste des employés assignés (Badge compact) - CONDITIONNELLE -->
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
              <span class="text-xs font-medium text-white">{employee.name}</span
              >
              <span class="text-[10px] font-mono text-emerald-400"
                >⚡{(employee.efficiency || 1.0).toFixed(1)}x</span
              >
              <button
                on:click={() => handleRemoveEmployee(employee.id)}
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
