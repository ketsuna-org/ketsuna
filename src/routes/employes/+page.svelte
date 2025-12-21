<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import pb from "$lib/pocketbase";
    import Footer from "$lib/components/Footer.svelte";
    import Navigation from "$lib/components/Navigation.svelte";
    import EmployeeList from "$lib/components/employes/EmployeeList.svelte";
    import EmployeeRead from "$lib/components/employes/EmployeeRead.svelte";
    import EmployeeCreate from "$lib/components/employes/EmployeeCreate.svelte";
    import EmployeeUpdate from "$lib/components/employes/EmployeeUpdate.svelte";

    let employees: any[] = [];
    let selectedEmployee: any = null;
    let loading = true;
    let error = "";

    $: state = $page.url.searchParams.get("state") || "list";
    $: companyId = $page.url.searchParams.get("company");
    $: employeeId = $page.url.searchParams.get("id");

    onMount(async () => {
        if (!pb.authStore.isValid) {
            goto("/login");
            return;
        }

        await loadData();
    });

    // Réagir aux changements de state et employeeId
    $: if (state === "read" && employeeId) {
        loadEmployeeDetail(employeeId);
    } else if (state === "update" && employeeId) {
        loadEmployeeDetail(employeeId);
    } else {
        selectedEmployee = null;
    }

    async function loadData() {
        loading = true;
        error = "";

        try {
            if ((state === "read" || state === "update") && employeeId) {
                await loadEmployeeDetail(employeeId);
            } else {
                // Charger les employés de toutes les compagnies de l'utilisateur
                const userCompanies = await pb
                    .collection("companies")
                    .getFullList({
                        filter: `owner = "${pb.authStore.model?.id}"`,
                    });

                if (userCompanies.length === 0) {
                    employees = [];
                } else {
                    const companyIds = userCompanies.map((c) => c.id);
                    const records = await pb
                        .collection("employees")
                        .getFullList({
                            filter: companyIds
                                .map((id) => `company = "${id}"`)
                                .join(" || "),
                            sort: "-created",
                            expand: "company",
                        });
                    employees = records;
                }
            }
        } catch (err: any) {
            error = err.message || "Erreur lors du chargement";
        } finally {
            loading = false;
        }
    }

    async function loadEmployeeDetail(id: string) {
        if (!id) return;

        try {
            selectedEmployee = await pb.collection("employees").getOne(id, {
                expand: "company",
            });
            // Vérifier que l'utilisateur possède la compagnie de cet employé
            if (
                selectedEmployee.expand.company?.owner !==
                pb.authStore.record?.id
            ) {
                error = "Vous n'avez pas accès à cet employé";
                selectedEmployee = null;
                return;
            }
        } catch (err: any) {
            error = err.message || "Erreur lors du chargement de l'employé";
            selectedEmployee = null;
        }
    }

    // Gestionnaires d'événements des composants
    function handleListEvents(event: any) {
        const { type, detail } = event;

        switch (type) {
            case "view":
                goto(`/employes?state=read&id=${detail.employeeId}`);
                break;
            case "delete":
                deleteEmployee(detail.employeeId);
                break;
            case "create":
                goto("/employes?state=create");
                break;
        }
    }

    function handleReadEvents(event: any) {
        const { type, detail } = event;

        switch (type) {
            case "update":
                goto(`/employes?state=update&id=${detail.employeeId}`);
                break;
            case "delete":
                deleteEmployee(detail.employeeId);
                break;
            case "promote":
                // TODO: Implémenter la promotion
                console.log("Promouvoir l'employé", detail.employeeId);
                break;
            case "fire":
                fireEmployee(detail.employeeId);
                break;
        }
    }

    function handleCreateEvents(event: any) {
        const { type, detail } = event;

        switch (type) {
            case "create":
                createEmployee(detail);
                break;
            case "cancel":
                goto("/employes");
                break;
        }
    }

    function handleUpdateEvents(event: any) {
        const { type, detail } = event;

        switch (type) {
            case "update":
                updateEmployee(detail.employeeId, detail.data);
                break;
            case "cancel":
                goto(`/employes?state=read&id=${employeeId}`);
                break;
        }
    }

    async function createEmployee(data: any) {
        try {
            const newEmployee = await pb.collection("employees").create({
                ...data,
                performance: 50, // Performance initiale
                skill_level: 50, // Niveau de compétence initial
                morale: 70, // Morale initiale
                experience_years: 0, // Années d'expérience initiales
                status: "active",
            });

            goto(`/employes?state=read&id=${newEmployee.id}`);
        } catch (err: any) {
            error = err.message || "Erreur lors de l'embauche";
        }
    }

    async function updateEmployee(employeeId: string, data: any) {
        try {
            await pb.collection("employees").update(employeeId, data);
            // Recharger les données
            await loadEmployeeDetail(employeeId);
            goto(`/employes?state=read&id=${employeeId}`);
        } catch (err: any) {
            error = err.message || "Erreur lors de la mise à jour";
        }
    }

    async function deleteEmployee(employeeId: string) {
        if (
            !confirm(
                "Êtes-vous sûr de vouloir supprimer cet employé ? Cette action est irréversible.",
            )
        )
            return;

        try {
            await pb.collection("employees").delete(employeeId);
            if (selectedEmployee && selectedEmployee.id === employeeId) {
                // Si on était sur le détail de cet employé, revenir à la liste
                goto("/employes");
            } else {
                // Recharger la liste
                await loadData();
            }
        } catch (err: any) {
            error = err.message || "Erreur lors de la suppression";
        }
    }

    async function fireEmployee(employeeId: string) {
        if (!confirm("Êtes-vous sûr de vouloir licencier cet employé ?"))
            return;

        try {
            await pb
                .collection("employees")
                .update(employeeId, { status: "fired" });
            if (selectedEmployee && selectedEmployee.id === employeeId) {
                await loadEmployeeDetail(employeeId);
            }
        } catch (err: any) {
            error = err.message || "Erreur lors du licenciement";
        }
    }

    function goBack() {
        if (state === "read" || state === "update") {
            goto("/employes");
        } else {
            goto("/employes");
        }
    }

    function createNewEmployee() {
        goto("/employes?state=create");
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
                        Embaucher un Employé
                    {:else if state === "update"}
                        Modifier l'Employé
                    {:else if state === "read" && selectedEmployee}
                        {selectedEmployee.name}
                    {:else}
                        Mes Employés
                    {/if}
                </h1>
            </div>
            <div class="flex gap-4">
                {#if state === "list"}
                    <button
                        on:click={createNewEmployee}
                        class="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition duration-300"
                    >
                        Embaucher
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

    <Navigation currentPage="employees" />

    <!-- Main Content -->
    <main class="px-4 pb-20">
        <div class="max-w-6xl mx-auto">
            {#if state === "list"}
                <EmployeeList
                    {employees}
                    {loading}
                    {error}
                    on:view={handleListEvents}
                    on:delete={handleListEvents}
                    on:create={handleListEvents}
                />
            {:else if state === "read"}
                <EmployeeRead
                    employee={selectedEmployee}
                    {loading}
                    {error}
                    on:update={handleReadEvents}
                    on:delete={handleReadEvents}
                    on:promote={handleReadEvents}
                    on:fire={handleReadEvents}
                />
            {:else if state === "create"}
                <EmployeeCreate
                    on:create={handleCreateEvents}
                    on:cancel={handleCreateEvents}
                />
            {:else if state === "update"}
                <EmployeeUpdate
                    employee={selectedEmployee}
                    on:update={handleUpdateEvents}
                    on:cancel={handleUpdateEvents}
                />
            {/if}
        </div>
    </main>

    <Footer />
</div>
