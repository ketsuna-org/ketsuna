<script lang="ts">
    import type { Machine, Employee, Recipe } from "$lib/types";
    import pb from "$lib/pocketbase";
    import { fetchAvailableRecipes } from "$lib/services/recipe";
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
    let availableRecipes: Recipe[] = [];
    let selectedRecipeId: string = "";
    let showEmployeeModal = false;

    // Charger les recettes disponibles
    $: {
        loadRecipes();
    }

    async function loadRecipes() {
        try {
            availableRecipes = await fetchAvailableRecipes(companyId);
        } catch (error: any) {
            notifications.error("Erreur lors du chargement des recettes");
        }
    }

    // Employés actuellement assignés
    $: assignedEmployeeIds = new Set(machine.employees || []);

    // Employés disponibles pour assignation
    $: availableEmployees = allEmployees.filter(
        (emp) => !assignedEmployeeIds.has(emp.id),
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
                (id) => id !== employeeId,
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

    <!-- Recipe Selection -->
    <div class="mb-4">
        <label
            for="recipe-{machine.id}"
            class="block text-sm font-medium text-slate-300 mb-2"
        >
            Recette à produire
        </label>
        <select
            id="recipe-{machine.id}"
            bind:value={selectedRecipeId}
            disabled={availableRecipes.length === 0}
            class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50"
        >
            <option value="">-- Sélectionner une recette --</option>
            {#each availableRecipes as recipe (recipe.id)}
                <option value={recipe.id}>
                    {recipe.expand?.output_item?.name || "Item"} ({recipe.production_time}s)
                </option>
            {/each}
        </select>
        {#if availableRecipes.length === 0}
            <p class="text-xs text-slate-400 mt-1">Aucune recette disponible</p>
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
                                Efficacité: {(
                                    employee.efficiency || 1.0
                                ).toFixed(1)}x | Salaire: ${employee.salary}
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
                <h4 class="text-sm font-semibold text-white">
                    Choisir un employé
                </h4>
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

    <!-- Production Estimate -->
    {#if selectedRecipeId}
        {@const selectedRecipe = availableRecipes.find(
            (r) => r.id === selectedRecipeId,
        )}
        {#if selectedRecipe}
            <div
                class="p-3 bg-emerald-500/10 rounded border border-emerald-600/30"
            >
                <p class="text-xs text-emerald-300">
                    📊 Production estimée par cycle: <span class="font-semibold"
                        >{1}</span
                    > items
                </p>
                <p class="text-xs text-slate-400 mt-1">
                    Temps: {selectedRecipe.production_time}s
                </p>
            </div>
        {/if}
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
