<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import pb from "$lib/pocketbase";
    import Footer from "$lib/components/Footer.svelte";
    import Navigation from "$lib/components/Navigation.svelte";
    import FinancialReportList from "$lib/components/financial-reports/FinancialReportList.svelte";
    import FinancialReportRead from "$lib/components/financial-reports/FinancialReportRead.svelte";
    import FinancialReportCreate from "$lib/components/financial-reports/FinancialReportCreate.svelte";
    import FinancialReportUpdate from "$lib/components/financial-reports/FinancialReportUpdate.svelte";

    let reports: any[] = [];
    let companies: any[] = [];
    let selectedReport: any = null;
    let loading = true;
    let error = "";

    $: state = $page.url.searchParams.get("state") || "list";
    $: reportId = $page.url.searchParams.get("id");

    onMount(async () => {
        if (!pb.authStore.isValid) {
            goto("/login");
            return;
        }

        await loadData();
    });

    // Réagir aux changements de state et reportId
    $: if (state === "read" && reportId) {
        loadReportDetail(reportId);
    } else if (state === "update" && reportId) {
        loadReportDetail(reportId);
    } else {
        selectedReport = null;
    }

    async function loadData() {
        loading = true;
        error = "";

        try {
            // Charger les entreprises de l'utilisateur
            companies = await pb.collection("companies").getFullList({
                filter: `owner = "${pb.authStore.model?.id}"`,
            });

            // Charger les rapports financiers de toutes les entreprises de l'utilisateur
            if (companies.length === 0) {
                reports = [];
            } else {
                const companyIds = companies.map((c) => c.id);
                const records = await pb
                    .collection("financial_reports")
                    .getFullList({
                        filter: companyIds
                            .map((id) => `company = "${id}"`)
                            .join(" || "),
                        sort: "-period_year,-period_month",
                    });
                reports = records;
            }
        } catch (err: any) {
            error = err.message || "Erreur lors du chargement";
        } finally {
            loading = false;
        }
    }

    async function loadReportDetail(id: string) {
        if (!id) return;

        try {
            selectedReport = await pb
                .collection("financial_reports")
                .getOne(id);

            // Vérifier que l'utilisateur possède l'entreprise associée
            if (selectedReport.company?.owner !== pb.authStore.model?.id) {
                error = "Vous n'avez pas accès à ce rapport financier";
                selectedReport = null;
                return;
            }
        } catch (err: any) {
            error = err.message || "Erreur lors du chargement du rapport";
            selectedReport = null;
        }
    }

    // Gestionnaires d'événements des composants
    function handleListEvents(event: any) {
        const { type, detail } = event;

        switch (type) {
            case "view":
                goto(`/rapports-financiers?state=read&id=${detail.reportId}`);
                break;
            case "delete":
                deleteReport(detail.reportId);
                break;
            case "create":
                goto("/rapports-financiers?state=create");
                break;
        }
    }

    function handleReadEvents(event: any) {
        const { type, detail } = event;

        switch (type) {
            case "update":
                goto(`/rapports-financiers?state=update&id=${detail.reportId}`);
                break;
            case "delete":
                deleteReport(detail.reportId);
                break;
        }
    }

    function handleCreateEvents(event: any) {
        const { type, detail } = event;

        switch (type) {
            case "create":
                createReport(detail.data);
                break;
            case "cancel":
                goto("/rapports-financiers");
                break;
        }
    }

    function handleUpdateEvents(event: any) {
        const { type, detail } = event;

        switch (type) {
            case "update":
                updateReport(detail.reportId, detail.data);
                break;
            case "cancel":
                goto(`/rapports-financiers?state=read&id=${reportId}`);
                break;
        }
    }

    async function createReport(data: any) {
        try {
            const newReport = await pb
                .collection("financial_reports")
                .create(data);
            goto(`/rapports-financiers?state=read&id=${newReport.id}`);
        } catch (err: any) {
            error = err.message || "Erreur lors de la création du rapport";
        }
    }

    async function updateReport(reportId: string, data: any) {
        try {
            await pb.collection("financial_reports").update(reportId, data);
            // Recharger les données
            await loadReportDetail(reportId);
            goto(`/rapports-financiers?state=read&id=${reportId}`);
        } catch (err: any) {
            error = err.message || "Erreur lors de la mise à jour";
        }
    }

    async function deleteReport(reportId: string) {
        if (
            !confirm(
                "Êtes-vous sûr de vouloir supprimer ce rapport financier ? Cette action est irréversible.",
            )
        )
            return;

        try {
            await pb.collection("financial_reports").delete(reportId);
            if (selectedReport && selectedReport.id === reportId) {
                // Si on était sur le détail de ce rapport, revenir à la liste
                goto("/rapports-financiers");
            } else {
                // Recharger la liste
                await loadData();
            }
        } catch (err: any) {
            error = err.message || "Erreur lors de la suppression";
        }
    }

    function goBack() {
        if (state === "read" || state === "update") {
            goto("/rapports-financiers");
        } else {
            goto("/rapports-financiers");
        }
    }

    function createNewReport() {
        goto("/rapports-financiers?state=create");
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
    <header class="py-6 px-4">
        <div class="max-w-6xl mx-auto flex justify-between items-center">
            <div class="flex items-center gap-4">
                {#if state !== "list"}
                    <button
                        on:click={goBack}
                        class="text-white hover:text-gray-300 transition duration-300 flex items-center gap-2"
                    >
                        ← Retour à la liste
                    </button>
                {/if}
                <h1 class="text-3xl font-bold">
                    {#if state === "create"}
                        Créer un Rapport Financier
                    {:else if state === "update"}
                        Modifier le Rapport
                    {:else if state === "read" && selectedReport}
                        Rapport {selectedReport.period_month}/{selectedReport.period_year}
                    {:else}
                        Rapports Financiers
                    {/if}
                </h1>
            </div>
            <div class="flex gap-4">
                {#if state === "list"}
                    <button
                        on:click={createNewReport}
                        class="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                    >
                        Nouveau Rapport
                    </button>
                {/if}
                <button
                    on:click={logout}
                    class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                >
                    Déconnexion
                </button>
            </div>
        </div>
    </header>

    <Navigation currentPage="financial-reports" />

    <!-- Main Content -->
    <main class="px-4 pb-20">
        <div class="max-w-6xl mx-auto">
            {#if state === "list"}
                <FinancialReportList
                    {reports}
                    {loading}
                    {error}
                    on:view={handleListEvents}
                    on:delete={handleListEvents}
                    on:create={handleListEvents}
                />
            {:else if state === "read"}
                <FinancialReportRead
                    report={selectedReport}
                    {loading}
                    {error}
                    on:update={handleReadEvents}
                    on:delete={handleReadEvents}
                />
            {:else if state === "create"}
                <FinancialReportCreate
                    {companies}
                    on:create={handleCreateEvents}
                    on:cancel={handleCreateEvents}
                />
            {:else if state === "update"}
                <FinancialReportUpdate
                    report={selectedReport}
                    {companies}
                    on:update={handleUpdateEvents}
                    on:cancel={handleUpdateEvents}
                />
            {/if}
        </div>
    </main>

    <Footer />
</div>
