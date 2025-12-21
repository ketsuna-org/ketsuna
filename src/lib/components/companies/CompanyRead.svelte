<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let company: any = null;
    export let loading = false;
    export let error = "";

    const dispatch = createEventDispatcher();

    function updateCompany() {
        dispatch("update", { companyId: company.id });
    }

    function deleteCompany() {
        dispatch("delete", { companyId: company.id });
    }

    function manageEmployees() {
        dispatch("manageEmployees", { companyId: company.id });
    }

    function investInStock() {
        dispatch("investInStock", { companyId: company.id });
    }

    function acquireCompany() {
        dispatch("acquireCompany", { companyId: company.id });
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
{:else if company}
    <div class="bg-white/10 backdrop-blur-sm rounded-lg p-8">
        <div class="flex justify-between items-start mb-6">
            <div>
                <h2 class="text-2xl font-bold mb-2">{company.name}</h2>
                <span
                    class="px-3 py-1 text-sm rounded-full
                    {company.status === 'active'
                        ? 'bg-green-500'
                        : company.status === 'bankruptcy'
                          ? 'bg-red-500'
                          : 'bg-gray-500'}"
                >
                    {company.status || "active"}
                </span>
            </div>
            <div class="text-right">
                <div class="text-sm text-gray-400">ID Compagnie</div>
                <div class="font-mono text-sm">{company.id}</div>
            </div>
        </div>

        {#if company.description}
            <div class="mb-8">
                <h3 class="text-xl font-semibold mb-3">Description</h3>
                <p class="text-gray-300">{company.description}</p>
            </div>
        {/if}

        <div class="grid md:grid-cols-2 gap-8 mb-8">
            <!-- Informations Financières -->
            <div class="bg-white/5 rounded-lg p-6">
                <h4 class="text-xl font-semibold mb-4">💰 Finances</h4>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Trésorerie:</span>
                        <span class="font-semibold text-xl"
                            >${company.cash?.toLocaleString() || 0}</span
                        >
                    </div>
                    {#if company.monthly_revenue}
                        <div class="flex justify-between">
                            <span class="text-gray-400">Revenus mensuels:</span>
                            <span class="font-semibold text-green-400"
                                >${company.monthly_revenue.toLocaleString()}</span
                            >
                        </div>
                    {/if}
                    {#if company.monthly_expenses}
                        <div class="flex justify-between">
                            <span class="text-gray-400"
                                >Dépenses mensuelles:</span
                            >
                            <span class="font-semibold text-red-400"
                                >${company.monthly_expenses.toLocaleString()}</span
                            >
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Statistiques -->
            <div class="bg-white/5 rounded-lg p-6">
                <h4 class="text-xl font-semibold mb-4">📊 Statistiques</h4>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Réputation:</span>
                        <span class="font-semibold"
                            >{company.reputation || 0}/100</span
                        >
                    </div>
                    {#if company.total_employees}
                        <div class="flex justify-between">
                            <span class="text-gray-400">Employés:</span>
                            <span class="font-semibold"
                                >{company.total_employees.toLocaleString()}</span
                            >
                        </div>
                    {/if}
                    {#if company.headquarters_location}
                        <div class="flex justify-between">
                            <span class="text-gray-400">Siège:</span>
                            <span class="font-semibold"
                                >{company.headquarters_location}</span
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
                    on:click={updateCompany}
                    class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                >
                    Modifier
                </button>
                <button
                    on:click={manageEmployees}
                    class="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                >
                    Gérer les employés
                </button>
                <button
                    on:click={investInStock}
                    class="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                >
                    Investir en bourse
                </button>
                <button
                    on:click={acquireCompany}
                    class="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                >
                    Acquérir une entreprise
                </button>
                <button
                    on:click={deleteCompany}
                    class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                >
                    Supprimer
                </button>
            </div>
        </div>
    </div>
{/if}
