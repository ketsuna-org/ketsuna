<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let reports: any[] = [];
    export let loading = false;
    export let error = "";

    const dispatch = createEventDispatcher();

    function viewReport(reportId: string) {
        dispatch("view", { reportId });
    }

    function deleteReport(reportId: string) {
        dispatch("delete", { reportId });
    }

    function createReport() {
        dispatch("create");
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

    function calculateProfit(report: any) {
        const revenue = report.total_revenue || 0;
        const expenses = report.total_expenses || 0;
        return revenue - expenses;
    }
</script>

{#if loading}
    <div class="text-center py-20">
        <div class="text-xl">Chargement des rapports financiers...</div>
    </div>
{:else if error}
    <div class="bg-red-500 text-white p-4 rounded mb-6">
        {error}
    </div>
{:else if reports.length === 0}
    <div class="text-center py-20">
        <div class="text-6xl mb-4">📊</div>
        <h2 class="text-2xl font-semibold mb-4">Aucun rapport financier</h2>
        <p class="text-gray-300 mb-6">
            Créez votre premier rapport financier pour suivre les performances
            de votre entreprise !
        </p>
        <button
            on:click={createReport}
            class="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
        >
            Créer un rapport
        </button>
    </div>
{:else}
    <div class="space-y-4">
        {#each reports as report}
            <div
                class="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition duration-300"
            >
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-semibold">
                            Rapport {formatPeriod(
                                report.period_month,
                                report.period_year,
                            )}
                        </h3>
                        <p class="text-gray-300">
                            {report.company?.name || "Entreprise inconnue"}
                        </p>
                    </div>
                    <div class="text-right">
                        <div
                            class="text-lg font-semibold {calculateProfit(
                                report,
                            ) >= 0
                                ? 'text-green-400'
                                : 'text-red-400'}"
                        >
                            {calculateProfit(report) >= 0
                                ? "+"
                                : ""}{formatCurrency(calculateProfit(report))}
                        </div>
                        <div class="text-sm text-gray-400">Bénéfice</div>
                    </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div class="text-center">
                        <div class="text-lg font-semibold text-green-400">
                            {formatCurrency(report.total_revenue || 0)}
                        </div>
                        <div class="text-sm text-gray-400">Revenus</div>
                    </div>
                    <div class="text-center">
                        <div class="text-lg font-semibold text-red-400">
                            {formatCurrency(report.total_expenses || 0)}
                        </div>
                        <div class="text-sm text-gray-400">Dépenses</div>
                    </div>
                    <div class="text-center">
                        <div class="text-lg font-semibold">
                            {formatCurrency(report.closing_balance)}
                        </div>
                        <div class="text-sm text-gray-400">Solde final</div>
                    </div>
                    <div class="text-center">
                        <div class="text-lg font-semibold text-blue-400">
                            {formatCurrency(report.employee_costs || 0)}
                        </div>
                        <div class="text-sm text-gray-400">Coûts employés</div>
                    </div>
                </div>

                <div class="flex gap-2">
                    <button
                        on:click={() => viewReport(report.id)}
                        class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                    >
                        Voir détails
                    </button>
                    <button
                        on:click={() => deleteReport(report.id)}
                        class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        {/each}
    </div>
{/if}
