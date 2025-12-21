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

    function getProfitLoss(report: any) {
        const revenue = report.total_revenue || 0;
        const expenses = report.total_expenses || 0;
        return revenue - expenses;
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
                            class="text-lg font-bold {getProfitLoss(report) >= 0
                                ? 'text-green-400'
                                : 'text-red-400'}"
                        >
                            {getProfitLoss(report) >= 0
                                ? "+"
                                : ""}{formatCurrency(getProfitLoss(report))}
                        </div>
                        <div class="text-sm text-gray-400">Résultat net</div>
                    </div>
                </div>

                <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div class="bg-blue-500/20 rounded p-3">
                        <div class="text-sm text-gray-400">Revenus</div>
                        <div class="text-lg font-semibold text-green-400">
                            {formatCurrency(report.total_revenue || 0)}
                        </div>
                    </div>
                    <div class="bg-red-500/20 rounded p-3">
                        <div class="text-sm text-gray-400">Dépenses</div>
                        <div class="text-lg font-semibold text-red-400">
                            {formatCurrency(report.total_expenses || 0)}
                        </div>
                    </div>
                    <div class="bg-purple-500/20 rounded p-3">
                        <div class="text-sm text-gray-400">
                            Solde d'ouverture
                        </div>
                        <div class="text-lg font-semibold">
                            {formatCurrency(report.opening_balance)}
                        </div>
                    </div>
                    <div class="bg-indigo-500/20 rounded p-3">
                        <div class="text-sm text-gray-400">
                            Solde de clôture
                        </div>
                        <div class="text-lg font-semibold">
                            {formatCurrency(report.closing_balance)}
                        </div>
                    </div>
                </div>

                <div class="text-sm text-gray-400 mb-4">
                    Coûts détaillés: Employés {formatCurrency(
                        report.employee_costs || 0,
                    )} | Opérations {formatCurrency(
                        report.operational_costs || 0,
                    )} | Marketing {formatCurrency(report.marketing_costs || 0)}
                    | R&D {formatCurrency(report.rd_costs || 0)}
                </div>

                <div class="flex gap-2">
                    <button
                        on:click={() => viewReport(report.id)}
                        class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                    >
                        Voir le détail
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
