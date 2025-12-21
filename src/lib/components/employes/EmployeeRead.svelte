<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let employee: any = null;
    export let loading = false;
    export let error = "";

    const dispatch = createEventDispatcher();

    function updateEmployee() {
        dispatch("update", { employeeId: employee.id });
    }

    function deleteEmployee() {
        dispatch("delete", { employeeId: employee.id });
    }

    function promoteEmployee() {
        dispatch("promote", { employeeId: employee.id });
    }

    function fireEmployee() {
        dispatch("fire", { employeeId: employee.id });
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
{:else if employee}
    <div class="bg-white/10 backdrop-blur-sm rounded-lg p-8">
        <div class="flex justify-between items-start mb-6">
            <div>
                <h2 class="text-3xl font-bold mb-2">{employee.name}</h2>
                <p class="text-xl text-gray-300 mb-2">{employee.position}</p>
                <span
                    class="px-3 py-1 text-sm rounded-full
                    {employee.status === 'active'
                        ? 'bg-green-500'
                        : employee.status === 'on_leave'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'}"
                >
                    {getStatusLabel(employee.status || "active")}
                </span>
            </div>
            <div class="text-right">
                <div class="text-sm text-gray-400">ID Employé</div>
                <div class="font-mono text-sm">{employee.id}</div>
            </div>
        </div>

        {#if employee.department}
            <div class="mb-8">
                <h3 class="text-xl font-semibold mb-3">Département</h3>
                <p class="text-gray-300">
                    📂 {getDepartmentLabel(employee.department)}
                </p>
            </div>
        {/if}

        <!-- Entreprise -->
        <div class="mb-8">
            <h3 class="text-xl font-semibold mb-3">Entreprise</h3>
            <p class="text-gray-300">
                🏢 {employee.expand.company?.name || "Entreprise inconnue"}
            </p>
        </div>

        <div class="grid md:grid-cols-2 gap-8 mb-8">
            <!-- Informations Financières -->
            <div class="bg-white/5 rounded-lg p-6">
                <h4 class="text-xl font-semibold mb-4">💰 Compensation</h4>
                <div class="space-y-3">
                    {#if employee.salary}
                        <div class="flex justify-between">
                            <span class="text-gray-400">Salaire mensuel:</span>
                            <span class="font-semibold text-xl"
                                >${employee.salary.toLocaleString()}</span
                            >
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Statistiques -->
            <div class="bg-white/5 rounded-lg p-6">
                <h4 class="text-xl font-semibold mb-4">📊 Performance</h4>
                <div class="space-y-3">
                    {#if employee.performance !== undefined}
                        <div class="flex justify-between">
                            <span class="text-gray-400">Performance:</span>
                            <span class="font-semibold"
                                >{employee.performance}/100</span
                            >
                        </div>
                    {/if}
                    {#if employee.skill_level !== undefined}
                        <div class="flex justify-between">
                            <span class="text-gray-400"
                                >Niveau de compétence:</span
                            >
                            <span class="font-semibold"
                                >{employee.skill_level}/100</span
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
                    {#if employee.experience_years !== undefined}
                        <div class="flex justify-between">
                            <span class="text-gray-400"
                                >Années d'expérience:</span
                            >
                            <span class="font-semibold"
                                >{employee.experience_years}</span
                            >
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Actions -->
        <div class="border-t border-white/20 pt-6">
            <h4 class="text-xl font-semibold mb-4">Actions</h4>
            <div class="flex flex-wrap gap-4">
                <button
                    on:click={updateEmployee}
                    class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                >
                    Modifier
                </button>
                {#if employee.status === "active"}
                    <button
                        on:click={promoteEmployee}
                        class="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                    >
                        Promouvoir
                    </button>
                {/if}
                {#if employee.status === "active"}
                    <button
                        on:click={fireEmployee}
                        class="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                    >
                        Licencier
                    </button>
                {/if}
                <button
                    on:click={deleteEmployee}
                    class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                >
                    Supprimer
                </button>
            </div>
        </div>
    </div>
{/if}
