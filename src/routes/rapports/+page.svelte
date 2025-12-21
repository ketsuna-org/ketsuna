<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import pb from "$lib/pocketbase";
    import Footer from "$lib/components/Footer.svelte";
    import Navigation from "$lib/components/Navigation.svelte";
    import FinancialList from "$lib/components/financial/FinancialList.svelte";
    import FinancialRead from "$lib/components/financial/FinancialRead.svelte";
    import FinancialCreate from "$lib/components/financial/FinancialCreate.svelte";
    import FinancialUpdate from "$lib/components/financial/FinancialUpdate.svelte";

    let reports: any[] = [];
    let selectedReport: any = null;
    let loading = true;
    let error = "";

    $: state = $page.url.searchParams.get("state") || "list";
    $: companyId = $page.url.searchParams.get("company");
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
            if ((state === "read" || state === "update") && reportId) {
                await loadReportDetail(reportId);
            } else {
                // Charger les rapports financiers de toutes les compagnies de l'utilisateur
                const userCompanies = await pb
                    .collection("companies")
                    .getFullList({
                        filter: `owner = "${pb.authStore.model?.id}"`,
                    });

                if (userCompanies.length === 0) {
                    reports = [];
                } else {
                    const companyIds = userCompanies.map((c) => c.id);
                    const records = await pb
                        .collection("financial_reports")
                        .getFullList({
                            filter: companyIds
                                .map((id) => `company = "${id}"`)
                                .join(" || "),
                            sort: "-period_year,-period_month",
                            expand: "company",
                        });
                    reports = records;
                }
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
                .getOne(id, {
                    expand: "company",
                });

            // Vérifier que l'utilisateur possède la compagnie de ce rapport
            if (selectedReport.company?.owner !== pb.authStore.model?.id) {
                error = "Vous n'avez pas accès à ce rapport";
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
                goto(`/rapports?state=read&id=${detail.reportId}`);
                break;
            case "delete":
                deleteReport(detail.reportId);
                break;
            case "create":
                goto("/rapports?state=create");
                break;
        }
    }

    function handleReadEvents(event: any) {
        const { type, detail } = event;

        switch (type) {
            case "update":
                goto(`/rapports?state=update&id=${detail.reportId}`);
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
                goto("/rapports");
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
                goto(`/rapports?state=read&id=${reportId}`);
                break;
        }
    }

    async function createReport(data: any) {
        try {
            const newReport = await pb
                .collection("financial_reports")
                .create(data);
            goto(`/rapports?state=read&id=${newReport.id}`);
        } catch (err: any) {
            error = err.message || "Erreur lors de la création";
        }
    }

    async function updateReport(reportId: string, data: any) {
        try {
            await pb.collection("financial_reports").update(reportId, data);
            // Recharger les données
            await loadReportDetail(reportId);
            goto(`/rapports?state=read&id=${reportId}`);
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
                goto("/rapports");
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
            goto("/rapports");
        } else {
            goto("/rapports");
        }
    }

    function createNewReport() {
        goto("/rapports?state=create");
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
                        Nouveau Rapport Financier
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

    <Navigation currentPage="financial" />

    <!-- Main Content -->
    <main class="px-4 pb-20">
        <div class="max-w-6xl mx-auto">
            {#if state === "list"}
                <FinancialList
                    {reports}
                    {loading}
                    {error}
                    on:view={handleListEvents}
                    on:delete={handleListEvents}
                    on:create={handleListEvents}
                />
            {:else if state === "read"}
                <FinancialRead
                    report={selectedReport}
                    {loading}
                    {error}
                    on:update={handleReadEvents}
                    on:delete={handleReadEvents}
                />
            {:else if state === "create"}
                <FinancialCreate
                    on:create={handleCreateEvents}
                    on:cancel={handleCreateEvents}
                />
            {:else if state === "update"}
                <FinancialUpdate
                    report={selectedReport}
                    on:update={handleUpdateEvents}
                    on:cancel={handleUpdateEvents}
                />
            {/if}
        </div>
    </main>

    <Footer />
</div>
