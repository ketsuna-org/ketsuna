<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import pb from "$lib/pocketbase";
    import Footer from "$lib/components/Footer.svelte";
    import Navigation from "$lib/components/Navigation.svelte";
    import CompanyList from "$lib/components/companies/CompanyList.svelte";
    import CompanyRead from "$lib/components/companies/CompanyRead.svelte";
    import CompanyCreate from "$lib/components/companies/CompanyCreate.svelte";
    import CompanyUpdate from "$lib/components/companies/CompanyUpdate.svelte";

    let companies: any[] = [];
    let selectedCompany: any = null;
    let loading = true;
    let error = "";

    $: state = $page.url.searchParams.get("state") || "list";
    $: companyId = $page.url.searchParams.get("id");

    onMount(async () => {
        if (!pb.authStore.isValid) {
            goto("/login");
            return;
        }

        await loadData();
    });

    // Réagir aux changements de state et companyId
    $: if (state === "read" && companyId) {
        loadCompanyDetail(companyId);
    } else if (state === "update" && companyId) {
        loadCompanyDetail(companyId);
    } else {
        selectedCompany = null;
    }

    async function loadData() {
        loading = true;
        error = "";

        try {
            const records = await pb.collection("companies").getFullList({
                filter: `owner = "${pb.authStore.model?.id}"`,
                sort: "-created",
            });
            companies = records;
        } catch (err: any) {
            error = err.message || "Erreur lors du chargement";
        } finally {
            loading = false;
        }
    }

    async function loadCompanyDetail(id: string) {
        if (!id) return;

        try {
            selectedCompany = await pb.collection("companies").getOne(id);

            // Vérifier que l'utilisateur est propriétaire
            if (selectedCompany.owner !== pb.authStore.model?.id) {
                error = "Vous n'avez pas accès à cette compagnie";
                selectedCompany = null;
                return;
            }
        } catch (err: any) {
            error = err.message || "Erreur lors du chargement de la compagnie";
            selectedCompany = null;
        }
    }

    // Gestionnaires d'événements des composants
    function handleListEvents(event: any) {
        const { type, detail } = event;

        switch (type) {
            case "view":
                goto(`/compagnies?state=read&id=${detail.companyId}`);
                break;
            case "delete":
                deleteCompany(detail.companyId);
                break;
            case "create":
                goto("/compagnies?state=create");
                break;
        }
    }

    function handleReadEvents(event: any) {
        const { type, detail } = event;

        switch (type) {
            case "update":
                goto(`/compagnies?state=update&id=${detail.companyId}`);
                break;
            case "delete":
                deleteCompany(detail.companyId);
                break;
            case "manageEmployees":
                // TODO: Implémenter la gestion des employés
                console.log("Gérer les employés pour", detail.companyId);
                break;
            case "investInStock":
                // TODO: Implémenter l'investissement en bourse
                console.log("Investir en bourse pour", detail.companyId);
                break;
            case "acquireCompany":
                // TODO: Implémenter l'acquisition d'entreprise
                console.log("Acquérir une entreprise depuis", detail.companyId);
                break;
        }
    }

    function handleCreateEvents(event: any) {
        const { type, detail } = event;

        switch (type) {
            case "create":
                createCompany(detail);
                break;
            case "cancel":
                goto("/compagnies");
                break;
        }
    }

    function handleUpdateEvents(event: any) {
        const { type, detail } = event;

        switch (type) {
            case "update":
                updateCompany(detail.companyId, detail.data);
                break;
            case "cancel":
                goto(`/compagnies?state=read&id=${companyId}`);
                break;
        }
    }

    async function createCompany(data: any) {
        try {
            const newCompany = await pb.collection("companies").create({
                ...data,
                owner: pb.authStore.model?.id,
                cash: 10000, // Capital de départ
                reputation: 50, // Réputation initiale
                status: "active",
            });

            goto(`/compagnies?state=read&id=${newCompany.id}`);
        } catch (err: any) {
            error = err.message || "Erreur lors de la création de la compagnie";
        }
    }

    async function updateCompany(companyId: string, data: any) {
        try {
            await pb.collection("companies").update(companyId, data);
            // Recharger les données
            await loadCompanyDetail(companyId);
            goto(`/compagnies?state=read&id=${companyId}`);
        } catch (err: any) {
            error = err.message || "Erreur lors de la mise à jour";
        }
    }

    async function deleteCompany(companyId: string) {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette compagnie ?"))
            return;

        try {
            await pb.collection("companies").delete(companyId);
            if (selectedCompany && selectedCompany.id === companyId) {
                // Si on était sur le détail de cette compagnie, revenir à la liste
                goto("/compagnies");
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
            goto("/compagnies");
        } else {
            goto("/compagnies");
        }
    }

    function createNewCompany() {
        goto("/compagnies?state=create");
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
            <div class="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                {#if state !== "list"}
                    <button
                        on:click={goBack}
                        class="text-white hover:text-gray-300 transition duration-300 flex items-center gap-2 text-sm md:text-base"
                    >
                        ← Retour à la liste
                    </button>
                {/if}
                <h1 class="text-2xl md:text-3xl font-bold">
                    {#if state === "create"}
                        Créer une Compagnie
                    {:else if state === "update"}
                        Modifier la Compagnie
                    {:else if state === "read" && selectedCompany}
                        {selectedCompany.name}
                    {:else}
                        Mes Compagnies
                    {/if}
                </h1>
            </div>
            <div class="flex gap-4">
                {#if state === "list"}
                    <button
                        on:click={createNewCompany}
                        class="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                    >
                        Créer une Compagnie
                    </button>
                {/if}
                <button
                    on:click={logout}
                    class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition duration-300 w-full sm:w-auto"
                >
                    Déconnexion
                </button>
            </div>
        </div>
    </header>

    <Navigation currentPage="companies" />

    <!-- Main Content -->
    <main class="px-4 pb-20">
        <div class="max-w-6xl mx-auto">
            {#if state === "list"}
                <CompanyList
                    {companies}
                    {loading}
                    {error}
                    on:view={handleListEvents}
                    on:delete={handleListEvents}
                    on:create={handleListEvents}
                />
            {:else if state === "read"}
                <CompanyRead
                    company={selectedCompany}
                    {loading}
                    {error}
                    on:update={handleReadEvents}
                    on:delete={handleReadEvents}
                    on:manageEmployees={handleReadEvents}
                    on:investInStock={handleReadEvents}
                    on:acquireCompany={handleReadEvents}
                />
            {:else if state === "create"}
                <CompanyCreate
                    on:create={handleCreateEvents}
                    on:cancel={handleCreateEvents}
                />
            {:else if state === "update"}
                <CompanyUpdate
                    company={selectedCompany}
                    on:update={handleUpdateEvents}
                    on:cancel={handleUpdateEvents}
                />
            {/if}
        </div>
    </main>

    <Footer />
</div>
