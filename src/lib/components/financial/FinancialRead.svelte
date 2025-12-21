<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let report: any = null;
    export let loading = false;
    export let error = "";

    const dispatch = createEventDispatcher();

    function updateReport() {
        dispatch("update", { reportId: report.id });
    }

    function deleteReport() {
        dispatch("delete", { reportId: report.id });
    }

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
        }).format(amount);
    }

    function formatPeriod(month: number, year: number) {
        const monthNames = [
            "Janvier",
            "Février",
            "Mars",
            "Avril",
            "Mai",
            "Juin",
            "Juillet",
            "Août",
            "Septembre",
            "Octobre",
            "Novembre",
            "Décembre",
        ];
        return `${monthNames[month - 1]} ${year}`;
    }

    function getProfitLoss() {
        if (!report) return 0;
        const revenue = report.total_revenue || 0;
        const expenses = report.total_expenses || 0;
        return revenue - expenses;
    }

    function getNetChange() {
        if (!report) return 0;
        return report.closing_balance - report.opening_balance;
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
{:else if !report}
    <div class="text-center py-20">
        <div class="text-6xl mb-4">📊</div>
        <h2 class="text-2xl font-semibold mb-4">Rapport non trouvé</h2>
        <p class="text-gray-300">
            Le rapport financier demandé n'existe pas ou vous n'y avez pas
            accès.
        </p>
    </div>
{:else}
    <div class="space-y-6">
        <!-- En-tête -->
        <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h2 class="text-2xl font-bold">
                        Rapport Financier - {formatPeriod(
                            report.period_month,
                            report.period_year,
                        )}
                    </h2>
                    <p class="text-gray-300 text-lg">
                        {report.company?.name || "Entreprise inconnue"}
                    </p>
                </div>
                <div class="text-right">
                    <div class="text-sm text-gray-400">Statut</div>
                    <div class="text-lg font-semibold text-green-400">
                        Finalisé
                    </div>
                </div>
            </div>

            <div class="flex gap-4">
                <button
                    on:click={updateReport}
                    class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                >
                    Modifier
                </button>
                <button
                    on:click={deleteReport}
                    class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                >
                    Supprimer
                </button>
            </div>
        </div>

        <!-- Résumé -->
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
                class="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg p-6 text-center"
            >
                <div class="text-3xl mb-2">💰</div>
                <div class="text-2xl font-bold">
                    {formatCurrency(report.opening_balance)}
                </div>
                <div class="text-gray-300">Solde d'ouverture</div>
            </div>
            <div
                class="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg p-6 text-center"
            >
                <div class="text-3xl mb-2">📈</div>
                <div class="text-2xl font-bold text-green-400">
                    {formatCurrency(report.total_revenue || 0)}
                </div>
                <div class="text-gray-300">Revenus totaux</div>
            </div>
            <div
                class="bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-lg p-6 text-center"
            >
                <div class="text-3xl mb-2">📉</div>
                <div class="text-2xl font-bold text-red-400">
                    {formatCurrency(report.total_expenses || 0)}
                </div>
                <div class="text-gray-300">Dépenses totales</div>
            </div>
            <div
                class="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg p-6 text-center"
            >
                <div class="text-3xl mb-2">🏦</div>
                <div class="text-2xl font-bold">
                    {formatCurrency(report.closing_balance)}
                </div>
                <div class="text-gray-300">Solde de clôture</div>
            </div>
        </div>

        <!-- Résultat net -->
        <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h3 class="text-xl font-semibold mb-4">Résultat Net</h3>
            <div class="flex items-center justify-between">
                <div class="text-lg">
                    <span class="text-gray-300">Revenus - Dépenses = </span>
                    <span
                        class="font-bold {getProfitLoss() >= 0
                            ? 'text-green-400'
                            : 'text-red-400'}"
                    >
                        {getProfitLoss() >= 0 ? "Profit de " : "Perte de "}
                        {formatCurrency(Math.abs(getProfitLoss()))}
                    </span>
                </div>
                <div class="text-lg">
                    <span class="text-gray-300">Variation nette: </span>
                    <span
                        class="font-bold {getNetChange() >= 0
                            ? 'text-green-400'
                            : 'text-red-400'}"
                    >
                        {getNetChange() >= 0 ? "+" : ""}{formatCurrency(
                            getNetChange(),
                        )}
                    </span>
                </div>
            </div>
        </div>

        <!-- Détail des coûts -->
        <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h3 class="text-xl font-semibold mb-4">Détail des Coûts</h3>
            <div class="grid md:grid-cols-2 gap-6">
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-300">Coûts employés:</span>
                        <span class="font-semibold"
                            >{formatCurrency(report.employee_costs || 0)}</span
                        >
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-300">Coûts opérationnels:</span>
                        <span class="font-semibold"
                            >{formatCurrency(
                                report.operational_costs || 0,
                            )}</span
                        >
                    </div>
                </div>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-300">Coûts marketing:</span>
                        <span class="font-semibold"
                            >{formatCurrency(report.marketing_costs || 0)}</span
                        >
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-300">Coûts R&D:</span>
                        <span class="font-semibold"
                            >{formatCurrency(report.rd_costs || 0)}</span
                        >
                    </div>
                </div>
            </div>
        </div>

        <!-- Informations supplémentaires -->
        <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h3 class="text-xl font-semibold mb-4">Informations</h3>
            <div class="grid md:grid-cols-2 gap-6">
                <div>
                    <div class="text-sm text-gray-400">Période</div>
                    <div class="font-semibold">
                        {formatPeriod(report.period_month, report.period_year)}
                    </div>
                </div>
                <div>
                    <div class="text-sm text-gray-400">Entreprise</div>
                    <div class="font-semibold">
                        {report.company?.name || "N/A"}
                    </div>
                </div>
                <div>
                    <div class="text-sm text-gray-400">Créé le</div>
                    <div class="font-semibold">
                        {new Date(report.created).toLocaleDateString("fr-FR")}
                    </div>
                </div>
                <div>
                    <div class="text-sm text-gray-400">
                        Dernière modification
                    </div>
                    <div class="font-semibold">
                        {new Date(report.updated).toLocaleDateString("fr-FR")}
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}
