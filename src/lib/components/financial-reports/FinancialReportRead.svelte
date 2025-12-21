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
            currency: "EUR",
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

    function calculateProfit() {
        if (!report) return 0;
        const revenue = report.total_revenue || 0;
        const expenses = report.total_expenses || 0;
        return revenue - expenses;
    }

    function calculateNetChange() {
        if (!report) return 0;
        return report.closing_balance - report.opening_balance;
    }
</script>

{#if loading}
    <div class="text-center py-20">
        <div class="text-xl">Chargement du rapport...</div>
    </div>
{:else if error}
    <div class="bg-red-500 text-white p-4 rounded mb-6">
        {error}
    </div>
{:else if report}
    <div class="space-y-6">
        <!-- En-tête -->
        <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h2 class="text-2xl font-bold mb-2">
                        Rapport Financier - {formatPeriod(
                            report.period_month,
                            report.period_year,
                        )}
                    </h2>
                    <p class="text-gray-300">
                        {report.company?.name || "Entreprise inconnue"}
                    </p>
                </div>
                <div class="flex gap-2">
                    <button
                        on:click={updateReport}
                        class="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                    >
                        ✏️ Modifier
                    </button>
                    <button
                        on:click={deleteReport}
                        class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                    >
                        🗑️ Supprimer
                    </button>
                </div>
            </div>

            <!-- Résumé -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-blue-500/20 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-blue-400">
                        {formatCurrency(calculateProfit())}
                    </div>
                    <div class="text-sm text-gray-300">Bénéfice net</div>
                </div>
                <div class="bg-green-500/20 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-green-400">
                        {formatCurrency(calculateNetChange())}
                    </div>
                    <div class="text-sm text-gray-300">Variation du solde</div>
                </div>
                <div class="bg-purple-500/20 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-purple-400">
                        {formatCurrency(report.closing_balance)}
                    </div>
                    <div class="text-sm text-gray-300">Solde final</div>
                </div>
            </div>
        </div>

        <!-- Détails financiers -->
        <div class="grid md:grid-cols-2 gap-6">
            <!-- Revenus et dépenses -->
            <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <h3 class="text-xl font-semibold mb-4">
                    💰 Revenus & Dépenses
                </h3>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Solde d'ouverture:</span>
                        <span class="font-semibold"
                            >{formatCurrency(report.opening_balance)}</span
                        >
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Revenus totaux:</span>
                        <span class="font-semibold text-green-400"
                            >+{formatCurrency(report.total_revenue || 0)}</span
                        >
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Dépenses totales:</span>
                        <span class="font-semibold text-red-400"
                            >-{formatCurrency(report.total_expenses || 0)}</span
                        >
                    </div>
                    <hr class="border-gray-600" />
                    <div class="flex justify-between text-lg">
                        <span class="font-semibold">Bénéfice net:</span>
                        <span
                            class="font-bold {calculateProfit() >= 0
                                ? 'text-green-400'
                                : 'text-red-400'}"
                        >
                            {calculateProfit() >= 0 ? "+" : ""}{formatCurrency(
                                calculateProfit(),
                            )}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Répartition des coûts -->
            <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <h3 class="text-xl font-semibold mb-4">
                    📊 Répartition des Coûts
                </h3>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Coûts employés:</span>
                        <span class="font-semibold"
                            >{formatCurrency(report.employee_costs || 0)}</span
                        >
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Coûts opérationnels:</span>
                        <span class="font-semibold"
                            >{formatCurrency(
                                report.operational_costs || 0,
                            )}</span
                        >
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Coûts marketing:</span>
                        <span class="font-semibold"
                            >{formatCurrency(report.marketing_costs || 0)}</span
                        >
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Coûts R&D:</span>
                        <span class="font-semibold"
                            >{formatCurrency(report.rd_costs || 0)}</span
                        >
                    </div>
                    <hr class="border-gray-600" />
                    <div class="flex justify-between text-lg">
                        <span class="font-semibold">Total coûts:</span>
                        <span class="font-bold text-red-400">
                            {formatCurrency(
                                (report.employee_costs || 0) +
                                    (report.operational_costs || 0) +
                                    (report.marketing_costs || 0) +
                                    (report.rd_costs || 0),
                            )}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
{:else}
    <div class="text-center py-20">
        <div class="text-xl text-gray-400">Rapport non trouvé</div>
    </div>
{/if}
