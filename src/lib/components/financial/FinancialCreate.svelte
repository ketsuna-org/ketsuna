<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { onMount } from "svelte";
    import pb from "$lib/pocketbase";

    const dispatch = createEventDispatcher();

    let formData = {
        company: "",
        period_month: new Date().getMonth() + 1,
        period_year: new Date().getFullYear(),
        opening_balance: 0,
        total_revenue: 0,
        total_expenses: 0,
        closing_balance: 0,
        employee_costs: 0,
        operational_costs: 0,
        marketing_costs: 0,
        rd_costs: 0,
    };

    let loading = false;
    let error = "";
    let userCompanies: any[] = [];

    onMount(async () => {
        await loadUserCompanies();
    });

    async function loadUserCompanies() {
        try {
            userCompanies = await pb.collection("companies").getFullList({
                filter: `owner = "${pb.authStore.model?.id}"`,
            });
        } catch (err: any) {
            error = "Erreur lors du chargement des entreprises";
        }
    }

    function updateClosingBalance() {
        formData.closing_balance =
            formData.opening_balance +
            (formData.total_revenue || 0) -
            (formData.total_expenses || 0);
    }

    $: if (
        formData.opening_balance !== undefined ||
        formData.total_revenue !== undefined ||
        formData.total_expenses !== undefined
    ) {
        updateClosingBalance();
    }

    async function handleSubmit() {
        if (!formData.company) {
            error = "Veuillez sélectionner une entreprise";
            return;
        }

        if (formData.period_month < 1 || formData.period_month > 12) {
            error = "Le mois doit être entre 1 et 12";
            return;
        }

        if (formData.period_year < 2000) {
            error = "L'année doit être supérieure ou égale à 2000";
            return;
        }

        loading = true;
        error = "";

        try {
            // Calcul automatique du solde de clôture
            const closingBalance =
                formData.opening_balance +
                (formData.total_revenue || 0) -
                (formData.total_expenses || 0);

            const reportData = {
                ...formData,
                closing_balance: closingBalance,
            };

            dispatch("create", { data: reportData });
        } catch (err: any) {
            error = err.message || "Erreur lors de la création";
        } finally {
            loading = false;
        }
    }

    function cancel() {
        dispatch("cancel");
    }
</script>

<div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
    <h2 class="text-2xl font-bold mb-6">Créer un Rapport Financier</h2>

    {#if error}
        <div class="bg-red-500 text-white p-4 rounded mb-6">
            {error}
        </div>
    {/if}

    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
        <!-- Sélection de l'entreprise -->
        <div>
            <label
                for="company"
                class="block text-sm font-medium text-gray-300 mb-2"
            >
                Entreprise *
            </label>
            <select
                id="company"
                bind:value={formData.company}
                class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
            >
                <option value="">Sélectionner une entreprise</option>
                {#each userCompanies as company}
                    <option value={company.id}>{company.name}</option>
                {/each}
            </select>
        </div>

        <!-- Période -->
        <div class="grid md:grid-cols-2 gap-4">
            <div>
                <label
                    for="period_month"
                    class="block text-sm font-medium text-gray-300 mb-2"
                >
                    Mois *
                </label>
                <select
                    id="period_month"
                    bind:value={formData.period_month}
                    class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                >
                    <option value={1}>Janvier</option>
                    <option value={2}>Février</option>
                    <option value={3}>Mars</option>
                    <option value={4}>Avril</option>
                    <option value={5}>Mai</option>
                    <option value={6}>Juin</option>
                    <option value={7}>Juillet</option>
                    <option value={8}>Août</option>
                    <option value={9}>Septembre</option>
                    <option value={10}>Octobre</option>
                    <option value={11}>Novembre</option>
                    <option value={12}>Décembre</option>
                </select>
            </div>
            <div>
                <label
                    for="period_year"
                    class="block text-sm font-medium text-gray-300 mb-2"
                >
                    Année *
                </label>
                <input
                    type="number"
                    id="period_year"
                    bind:value={formData.period_year}
                    min="2000"
                    class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
            </div>
        </div>

        <!-- Soldes -->
        <div class="grid md:grid-cols-2 gap-4">
            <div>
                <label
                    for="opening_balance"
                    class="block text-sm font-medium text-gray-300 mb-2"
                >
                    Solde d'ouverture *
                </label>
                <input
                    type="number"
                    id="opening_balance"
                    bind:value={formData.opening_balance}
                    step="0.01"
                    class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
            </div>
            <div>
                <label
                    for="closing_balance"
                    class="block text-sm font-medium text-gray-300 mb-2"
                >
                    Solde de clôture (calculé)
                </label>
                <input
                    type="number"
                    id="closing_balance"
                    bind:value={formData.closing_balance}
                    step="0.01"
                    class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white"
                    readonly
                />
            </div>
        </div>

        <!-- Revenus et dépenses -->
        <div class="grid md:grid-cols-2 gap-4">
            <div>
                <label
                    for="total_revenue"
                    class="block text-sm font-medium text-gray-300 mb-2"
                >
                    Revenus totaux
                </label>
                <input
                    type="number"
                    id="total_revenue"
                    bind:value={formData.total_revenue}
                    step="0.01"
                    min="0"
                    class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div>
                <label
                    for="total_expenses"
                    class="block text-sm font-medium text-gray-300 mb-2"
                >
                    Dépenses totales
                </label>
                <input
                    type="number"
                    id="total_expenses"
                    bind:value={formData.total_expenses}
                    step="0.01"
                    min="0"
                    class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>

        <!-- Détail des coûts -->
        <div class="space-y-4">
            <h3 class="text-lg font-semibold">Détail des Coûts</h3>
            <div class="grid md:grid-cols-2 gap-4">
                <div>
                    <label
                        for="employee_costs"
                        class="block text-sm font-medium text-gray-300 mb-2"
                    >
                        Coûts employés
                    </label>
                    <input
                        type="number"
                        id="employee_costs"
                        bind:value={formData.employee_costs}
                        step="0.01"
                        min="0"
                        class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label
                        for="operational_costs"
                        class="block text-sm font-medium text-gray-300 mb-2"
                    >
                        Coûts opérationnels
                    </label>
                    <input
                        type="number"
                        id="operational_costs"
                        bind:value={formData.operational_costs}
                        step="0.01"
                        min="0"
                        class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label
                        for="marketing_costs"
                        class="block text-sm font-medium text-gray-300 mb-2"
                    >
                        Coûts marketing
                    </label>
                    <input
                        type="number"
                        id="marketing_costs"
                        bind:value={formData.marketing_costs}
                        step="0.01"
                        min="0"
                        class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label
                        for="rd_costs"
                        class="block text-sm font-medium text-gray-300 mb-2"
                    >
                        Coûts R&D
                    </label>
                    <input
                        type="number"
                        id="rd_costs"
                        bind:value={formData.rd_costs}
                        step="0.01"
                        min="0"
                        class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>
        </div>

        <!-- Boutons -->
        <div class="flex gap-4">
            <button
                type="submit"
                disabled={loading}
                class="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
            >
                {#if loading}
                    Création...
                {:else}
                    Créer le rapport
                {/if}
            </button>
            <button
                type="button"
                on:click={cancel}
                class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
            >
                Annuler
            </button>
        </div>
    </form>
</div>
