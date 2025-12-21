<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let companies: any[] = [];

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

    let errors: { [key: string]: string } = {};
    let submitting = false;

    function validateForm() {
        errors = {};

        if (!formData.company) {
            errors.company = "Veuillez sélectionner une entreprise";
        }

        if (formData.period_month < 1 || formData.period_month > 12) {
            errors.period_month = "Le mois doit être entre 1 et 12";
        }

        if (formData.period_year < 2000) {
            errors.period_year = "L'année doit être supérieure à 2000";
        }

        if (formData.opening_balance < 0) {
            errors.opening_balance =
                "Le solde d'ouverture ne peut pas être négatif";
        }

        if (formData.total_revenue < 0) {
            errors.total_revenue = "Les revenus ne peuvent pas être négatifs";
        }

        if (formData.total_expenses < 0) {
            errors.total_expenses =
                "Les dépenses ne peuvent pas être négatives";
        }

        if (formData.employee_costs < 0) {
            errors.employee_costs =
                "Les coûts employés ne peuvent pas être négatifs";
        }

        if (formData.operational_costs < 0) {
            errors.operational_costs =
                "Les coûts opérationnels ne peuvent pas être négatifs";
        }

        if (formData.marketing_costs < 0) {
            errors.marketing_costs =
                "Les coûts marketing ne peuvent pas être négatifs";
        }

        if (formData.rd_costs < 0) {
            errors.rd_costs = "Les coûts R&D ne peuvent pas être négatifs";
        }

        return Object.keys(errors).length === 0;
    }

    function calculateClosingBalance() {
        formData.closing_balance =
            formData.opening_balance +
            (formData.total_revenue || 0) -
            (formData.total_expenses || 0);
    }

    function handleSubmit() {
        if (!validateForm()) return;

        calculateClosingBalance();
        dispatch("create", { data: { ...formData } });
    }

    function handleCancel() {
        dispatch("cancel");
    }

    // Recalculer automatiquement le solde de clôture
    $: if (
        formData.opening_balance !== undefined &&
        formData.total_revenue !== undefined &&
        formData.total_expenses !== undefined
    ) {
        calculateClosingBalance();
    }
</script>

<div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
    <h2 class="text-2xl font-bold mb-6">Créer un Rapport Financier</h2>

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
                {#each companies as company}
                    <option value={company.id}>{company.name}</option>
                {/each}
            </select>
            {#if errors.company}
                <p class="text-red-400 text-sm mt-1">{errors.company}</p>
            {/if}
        </div>

        <!-- Période -->
        <div class="grid grid-cols-2 gap-4">
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
                {#if errors.period_month}
                    <p class="text-red-400 text-sm mt-1">
                        {errors.period_month}
                    </p>
                {/if}
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
                {#if errors.period_year}
                    <p class="text-red-400 text-sm mt-1">
                        {errors.period_year}
                    </p>
                {/if}
            </div>
        </div>

        <!-- Soldes -->
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label
                    for="opening_balance"
                    class="block text-sm font-medium text-gray-300 mb-2"
                >
                    Solde d'ouverture (€) *
                </label>
                <input
                    type="number"
                    id="opening_balance"
                    bind:value={formData.opening_balance}
                    step="0.01"
                    min="0"
                    class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
                {#if errors.opening_balance}
                    <p class="text-red-400 text-sm mt-1">
                        {errors.opening_balance}
                    </p>
                {/if}
            </div>
            <div>
                <label
                    for="closing_balance"
                    class="block text-sm font-medium text-gray-300 mb-2"
                >
                    Solde de clôture (€) *
                </label>
                <input
                    type="number"
                    id="closing_balance"
                    bind:value={formData.closing_balance}
                    step="0.01"
                    class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readonly
                    required
                />
            </div>
        </div>

        <!-- Revenus et dépenses -->
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label
                    for="total_revenue"
                    class="block text-sm font-medium text-gray-300 mb-2"
                >
                    Revenus totaux (€)
                </label>
                <input
                    type="number"
                    id="total_revenue"
                    bind:value={formData.total_revenue}
                    step="0.01"
                    min="0"
                    class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {#if errors.total_revenue}
                    <p class="text-red-400 text-sm mt-1">
                        {errors.total_revenue}
                    </p>
                {/if}
            </div>
            <div>
                <label
                    for="total_expenses"
                    class="block text-sm font-medium text-gray-300 mb-2"
                >
                    Dépenses totales (€)
                </label>
                <input
                    type="number"
                    id="total_expenses"
                    bind:value={formData.total_expenses}
                    step="0.01"
                    min="0"
                    class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {#if errors.total_expenses}
                    <p class="text-red-400 text-sm mt-1">
                        {errors.total_expenses}
                    </p>
                {/if}
            </div>
        </div>

        <!-- Répartition des coûts -->
        <div class="space-y-4">
            <h3 class="text-lg font-semibold">Répartition des Coûts</h3>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label
                        for="employee_costs"
                        class="block text-sm font-medium text-gray-300 mb-2"
                    >
                        Coûts employés (€)
                    </label>
                    <input
                        type="number"
                        id="employee_costs"
                        bind:value={formData.employee_costs}
                        step="0.01"
                        min="0"
                        class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {#if errors.employee_costs}
                        <p class="text-red-400 text-sm mt-1">
                            {errors.employee_costs}
                        </p>
                    {/if}
                </div>
                <div>
                    <label
                        for="operational_costs"
                        class="block text-sm font-medium text-gray-300 mb-2"
                    >
                        Coûts opérationnels (€)
                    </label>
                    <input
                        type="number"
                        id="operational_costs"
                        bind:value={formData.operational_costs}
                        step="0.01"
                        min="0"
                        class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {#if errors.operational_costs}
                        <p class="text-red-400 text-sm mt-1">
                            {errors.operational_costs}
                        </p>
                    {/if}
                </div>
                <div>
                    <label
                        for="marketing_costs"
                        class="block text-sm font-medium text-gray-300 mb-2"
                    >
                        Coûts marketing (€)
                    </label>
                    <input
                        type="number"
                        id="marketing_costs"
                        bind:value={formData.marketing_costs}
                        step="0.01"
                        min="0"
                        class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {#if errors.marketing_costs}
                        <p class="text-red-400 text-sm mt-1">
                            {errors.marketing_costs}
                        </p>
                    {/if}
                </div>
                <div>
                    <label
                        for="rd_costs"
                        class="block text-sm font-medium text-gray-300 mb-2"
                    >
                        Coûts R&D (€)
                    </label>
                    <input
                        type="number"
                        id="rd_costs"
                        bind:value={formData.rd_costs}
                        step="0.01"
                        min="0"
                        class="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {#if errors.rd_costs}
                        <p class="text-red-400 text-sm mt-1">
                            {errors.rd_costs}
                        </p>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Boutons -->
        <div class="flex gap-4">
            <button
                type="submit"
                disabled={submitting}
                class="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
            >
                {submitting ? "Création..." : "Créer le rapport"}
            </button>
            <button
                type="button"
                on:click={handleCancel}
                class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
            >
                Annuler
            </button>
        </div>
    </form>
</div>
