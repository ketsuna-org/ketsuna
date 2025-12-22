<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let companies: any[] = [];
    export let loading = false;
    export let error = "";

    const dispatch = createEventDispatcher();

    function viewCompany(companyId: string) {
        dispatch("view", { companyId });
    }

    function deleteCompany(companyId: string) {
        dispatch("delete", { companyId });
    }

    function createCompany() {
        dispatch("create");
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
{:else if companies.length === 0}
    <div class="text-center py-20">
        <div class="text-6xl mb-4">🏢</div>
        <h2 class="text-2xl font-semibold mb-4">Aucune compagnie</h2>
        <p class="text-gray-300 mb-6">
            Créez votre première entreprise pour commencer votre aventure !
        </p>
        <button
            on:click={createCompany}
            class="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
        >
            Créer ma première compagnie
        </button>
    </div>
{:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {#each companies as company}
            <div
                class="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-6 hover:bg-white/20 transition duration-300"
            >
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-lg md:text-xl font-semibold">
                        {company.name}
                    </h3>
                    <span
                        class="px-2 py-1 text-xs rounded-full
                        {company.status === 'active'
                            ? 'bg-green-500'
                            : company.status === 'bankruptcy'
                              ? 'bg-red-500'
                              : 'bg-gray-500'}"
                    >
                        {company.status || "active"}
                    </span>
                </div>

                {#if company.description}
                    <p class="text-gray-300 text-sm mb-4 line-clamp-2">
                        {company.description}
                    </p>
                {/if}

                <div class="space-y-2 mb-4">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Trésorerie:</span>
                        <span class="font-semibold"
                            >${company.cash?.toLocaleString() || 0}</span
                        >
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Réputation:</span>
                        <span class="font-semibold"
                            >{company.reputation || 0}/100</span
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
                </div>

                <div class="flex gap-2">
                    <button
                        on:click={() => viewCompany(company.id)}
                        class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                    >
                        Voir
                    </button>
                    <button
                        on:click={() => deleteCompany(company.id)}
                        class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        {/each}
    </div>
{/if}

<style>
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-clamp: 2;
    }
</style>
