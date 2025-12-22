<script lang="ts">
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import pb from "$lib/pocketbase";
    import Footer from "$lib/components/Footer.svelte";
    import Navigation from "$lib/components/Navigation.svelte";

    let stats = {
        companies: 0,
        employees: 0,
        totalCash: 0,
        totalRevenue: 0,
        financialReports: 0,
        totalProfit: 0,
    };
    let loading = true;
    let error = "";

    onMount(async () => {
        if (!pb.authStore.isValid) {
            goto("/login");
            return;
        }

        await loadStats();
    });

    async function loadStats() {
        loading = true;
        error = "";

        try {
            // Charger les compagnies
            const companies = await pb.collection("companies").getFullList({
                filter: `owner = "${pb.authStore.model?.id}"`,
            });

            stats.companies = companies.length;
            stats.totalCash = companies.reduce(
                (sum, company) => sum + (company.cash || 0),
                0,
            );

            // Charger les employés
            if (companies.length > 0) {
                const companyIds = companies.map((c) => c.id);
                const employees = await pb.collection("employees").getFullList({
                    filter: companyIds
                        .map((id) => `company = "${id}"`)
                        .join(" || "),
                });

                stats.employees = employees.length;
                // Pour l'instant, pas de calcul de revenu total car pas encore implémenté
                stats.totalRevenue = 0;

                // Charger les rapports financiers
                const reports = await pb
                    .collection("financial_reports")
                    .getFullList({
                        filter: companyIds
                            .map((id) => `company = "${id}"`)
                            .join(" || "),
                    });

                stats.financialReports = reports.length;
                stats.totalProfit = reports.reduce(
                    (sum, report) =>
                        sum +
                        ((report.total_revenue || 0) -
                            (report.total_expenses || 0)),
                    0,
                );
            }
        } catch (err: any) {
            error = err.message || "Erreur lors du chargement des statistiques";
        } finally {
            loading = false;
        }
    }

    function logout() {
        pb.authStore.clear();
        goto("/");
    }
</script>

<div
    class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white"
>
    <!-- Header -->
    <header class="py-4 md:py-6 px-4">
        <div
            class="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4"
        >
            <h1 class="text-2xl md:text-3xl font-bold">Tableau de Bord</h1>
            <button
                on:click={logout}
                class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition duration-300 w-full sm:w-auto"
            >
                Déconnexion
            </button>
        </div>
    </header>

    <Navigation currentPage="dashboard" />

    <!-- Main Content -->
    <main class="px-4 pb-20">
        <div class="max-w-6xl mx-auto">
            {#if loading}
                <div class="text-center py-20">
                    <div
                        class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"
                    ></div>
                    <p class="mt-4">Chargement des statistiques...</p>
                </div>
            {:else if error}
                <div
                    class="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6"
                >
                    <p class="text-red-300">{error}</p>
                </div>
            {:else}
                <!-- Statistiques principales -->
                <div
                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8"
                >
                    <div
                        class="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-6 text-center"
                    >
                        <div class="text-3xl md:text-4xl mb-2">🏢</div>
                        <div class="text-2xl md:text-3xl font-bold">
                            {stats.companies}
                        </div>
                        <div class="text-sm md:text-base text-gray-300">
                            Compagnies
                        </div>
                    </div>
                    <div
                        class="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-6 text-center"
                    >
                        <div class="text-3xl md:text-4xl mb-2">👥</div>
                        <div class="text-2xl md:text-3xl font-bold">
                            {stats.employees}
                        </div>
                        <div class="text-sm md:text-base text-gray-300">
                            Employés
                        </div>
                    </div>
                    <div
                        class="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-6 text-center"
                    >
                        <div class="text-3xl md:text-4xl mb-2">💰</div>
                        <div class="text-2xl md:text-3xl font-bold">
                            ${stats.totalCash.toLocaleString()}
                        </div>
                        <div class="text-sm md:text-base text-gray-300">
                            Trésorerie Totale
                        </div>
                    </div>
                    <div
                        class="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-6 text-center"
                    >
                        <div class="text-3xl md:text-4xl mb-2">📊</div>
                        <div class="text-2xl md:text-3xl font-bold">
                            {stats.financialReports}
                        </div>
                        <div class="text-sm md:text-base text-gray-300">
                            Rapports Financiers
                        </div>
                    </div>
                    <div
                        class="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-6 text-center"
                    >
                        <div class="text-3xl md:text-4xl mb-2">📈</div>
                        <div
                            class="text-2xl md:text-3xl font-bold text-green-400"
                        >
                            ${stats.totalProfit.toLocaleString()}
                        </div>
                        <div class="text-sm md:text-base text-gray-300">
                            Profit Total
                        </div>
                    </div>
                    <div
                        class="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-6 text-center"
                    >
                        <div class="text-3xl md:text-4xl mb-2">📊</div>
                        <div class="text-2xl md:text-3xl font-bold">
                            ${stats.totalRevenue.toLocaleString()}
                        </div>
                        <div class="text-sm md:text-base text-gray-300">
                            Revenus Totaux
                        </div>
                    </div>
                </div>

                <!-- Actions rapides -->
                <div class="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:p-6">
                    <h2 class="text-xl md:text-2xl font-bold mb-4">
                        Actions Rapides
                    </h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            on:click={() => goto("/compagnies?state=create")}
                            class="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 md:px-6 rounded transition duration-300 text-left text-sm md:text-base"
                        >
                            🏢 Créer une Nouvelle Compagnie
                        </button>
                        <button
                            on:click={() => goto("/employes?state=create")}
                            class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 md:px-6 rounded transition duration-300 text-left text-sm md:text-base"
                        >
                            👥 Embaucher un Nouvel Employé
                        </button>
                        <button
                            on:click={() => goto("/rapports?state=create")}
                            class="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-4 md:px-6 rounded transition duration-300 text-left text-sm md:text-base"
                        >
                            📊 Créer un Rapport Financier
                        </button>
                    </div>
                </div>

                <!-- Message de bienvenue -->
                <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6 mt-6">
                    <h2 class="text-2xl font-bold mb-4">
                        Bienvenue dans Ketsuna Business !
                    </h2>
                    <p class="text-gray-300 mb-4">
                        Gérez votre empire économique depuis ce tableau de bord
                        centralisé. Créez des entreprises, embauchez des
                        employés talentueux et dominez le marché !
                    </p>
                    <div class="grid md:grid-cols-3 gap-4 text-sm">
                        <div class="bg-blue-500/20 rounded p-3">
                            <h3 class="font-semibold mb-2">
                                💡 Prochaines Fonctionnalités
                            </h3>
                            <ul class="text-gray-300 space-y-1">
                                <li>• Marché boursier</li>
                                <li>• Acquisitions</li>
                                <li>• Économie dynamique</li>
                            </ul>
                        </div>
                        <div class="bg-green-500/20 rounded p-3">
                            <h3 class="font-semibold mb-2">🎯 Objectifs</h3>
                            <ul class="text-gray-300 space-y-1">
                                <li>• Atteindre 1M$</li>
                                <li>• 10 employés</li>
                                <li>• 5 compagnies</li>
                            </ul>
                        </div>
                        <div class="bg-purple-500/20 rounded p-3">
                            <h3 class="font-semibold mb-2">🏆 Récompenses</h3>
                            <ul class="text-gray-300 space-y-1">
                                <li>• Badges spéciaux</li>
                                <li>• Titres exclusifs</li>
                                <li>• Avantages en jeu</li>
                            </ul>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </main>

    <Footer />
</div>
