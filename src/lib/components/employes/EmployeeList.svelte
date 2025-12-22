<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let employees: any[] = [];
    export let loading = false;
    export let error = "";

    const dispatch = createEventDispatcher();

    function viewEmployee(employeeId: string) {
        dispatch("view", { employeeId });
    }

    function deleteEmployee(employeeId: string) {
        dispatch("delete", { employeeId });
    }

    function createEmployee() {
        dispatch("create");
    }

    function getDepartmentLabel(dept: string) {
        const labels: Record<string, string> = {
            management: "Management",
            operations: "Opérations",
            marketing: "Marketing",
            sales: "Ventes",
            rd: "R&D",
        };
        return labels[dept] || dept;
    }

    function getStatusLabel(status: string) {
        const labels: Record<string, string> = {
            active: "Actif",
            on_leave: "En congé",
            fired: "Licencié",
        };
        return labels[status] || status;
    }
</script>

{#if loading}
    <div class="text-center py-20">
        <div class="text-xl">Chargement...</div>
    </div>
{:else if error}
    <div class="bg-red-500 text-white p-4 rounded mb-6">
        {error}
    </div>
{:else if employees.length === 0}
    <div class="text-center py-20">
        <div class="text-6xl mb-4">👥</div>
        <h2 class="text-2xl font-semibold mb-4">Aucun employé</h2>
        <p class="text-gray-300 mb-6">
            Embauchez votre premier employé pour développer votre entreprise !
        </p>
        <button
            on:click={createEmployee}
            class="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
        >
            Embaucher un employé
        </button>
    </div>
{:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {#each employees as employee}
            <div
                class="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-6 hover:bg-white/20 transition duration-300"
            >
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-lg md:text-xl font-semibold">
                            {employee.name}
                        </h3>
                        <p class="text-sm md:text-base text-gray-300">
                            {employee.position}
                        </p>
                    </div>
                    <span
                        class="px-2 py-1 text-xs rounded-full
                        {employee.status === 'active'
                            ? 'bg-green-500'
                            : employee.status === 'on_leave'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'}"
                    >
                        {getStatusLabel(employee.status || "active")}
                    </span>
                </div>

                {#if employee.department}
                    <p class="text-sm text-gray-400 mb-3">
                        📂 {getDepartmentLabel(employee.department)}
                    </p>
                {/if}

                {#if employee.company}
                    <p class="text-sm text-gray-400 mb-3">
                        🏢 {employee.company.name || "Entreprise inconnue"}
                    </p>
                {/if}

                <div class="space-y-2 mb-4">
                    {#if employee.salary}
                        <div class="flex justify-between">
                            <span class="text-gray-400">Salaire:</span>
                            <span class="font-semibold"
                                >${employee.salary.toLocaleString()}/mois</span
                            >
                        </div>
                    {/if}
                    {#if employee.performance !== undefined}
                        <div class="flex justify-between">
                            <span class="text-gray-400">Performance:</span>
                            <span class="font-semibold"
                                >{employee.performance}/100</span
                            >
                        </div>
                    {/if}
                    {#if employee.morale !== undefined}
                        <div class="flex justify-between">
                            <span class="text-gray-400">Morale:</span>
                            <span class="font-semibold"
                                >{employee.morale}/100</span
                            >
                        </div>
                    {/if}
                </div>

                <div class="flex gap-2">
                    <button
                        on:click={() => viewEmployee(employee.id)}
                        class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                    >
                        Voir
                    </button>
                    <button
                        on:click={() => deleteEmployee(employee.id)}
                        class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        {/each}
    </div>
{/if}
