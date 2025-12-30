<script lang="ts">
    import { goto } from "$app/navigation";
    import { onMount, onDestroy } from "svelte";
    import { fade } from "svelte/transition";
    import { fetchAvailableRecipes } from "$lib/services/recipe";
    import { fetchDashboardData, type DashboardData } from "$lib/dashboard";
    import { activeCompany } from "$lib/stores";
    import pb from "$lib/pocketbase";
    import type { Machine, Employee, InventoryItem } from "$lib/types";
    import RecipeCard from "$lib/components/RecipeCard.svelte";
    import MachineAssignment from "$lib/components/MachineAssignment.svelte";
    import StatCard from "$lib/components/StatCard.svelte";
    import FilterBar from "$lib/components/FilterBar.svelte";
    import { notifications } from "$lib/notifications";

    let recipes: any[] = $state([]);
    let machines: Machine[] = $state([]);
    let employees: Employee[] = $state([]);
    let inventory: InventoryItem[] = $state([]);
    let availableMachineStock: InventoryItem[] = $state([]);
    let dashboardData: DashboardData | null = $state(null);
    let loading = $state(true);
    let error = $state("");
    let activeTab = $state<"manual" | "automation">("manual");

    // Filter states for recipes
    let recipeSearchQuery = $state("");
    let recipeFilters = $state<Record<string, string>>({});

    const recipeFilterOptions = [
        {
            label: "Tous les temps",
            value: "time",
            options: [
                { label: "Rapide (< 60s)", value: "fast" },
                { label: "Long (> 60s)", value: "long" },
            ],
        },
    ];

    // Filtered recipes
    let filteredRecipes = $derived.by(() => {
        return recipes.filter((recipe: any) => {
            // Search filter
            const outputName = recipe.expand?.output_item?.name || "";
            if (
                recipeSearchQuery &&
                !outputName
                    .toLowerCase()
                    .includes(recipeSearchQuery.toLowerCase())
            ) {
                return false;
            }
            // Time filter
            if (recipeFilters.time === "fast" && recipe.production_time > 60) {
                return false;
            }
            if (recipeFilters.time === "long" && recipe.production_time <= 60) {
                return false;
            }
            return true;
        });
    });

    let busyEmployeeIds = $derived(
        new Set(machines.flatMap((m) => m.employees || [])),
    );

    // Filter states for machines
    let machineSearchQuery = $state("");

    // Filtered machines
    let filteredMachines = $derived.by(() => {
        return machines.filter((machine: Machine) => {
            if (!machineSearchQuery) return true;
            // machine.machine is the relation ID. expand.machine is the record.
            // CAUTION: The type definition might need careful checking, casting as any or checking properties
            const machineName = (machine.expand as any)?.machine?.name || "";
            return machineName
                .toLowerCase()
                .includes(machineSearchQuery.toLowerCase());
        });
    });

    $effect(() => {
        if ($activeCompany) {
            loadData();
        }
    });

    async function loadData() {
        loading = true;
        error = "";
        try {
            const userId = pb.authStore.model?.id;
            if (!userId) throw new Error("Non connecté");
            if (!$activeCompany?.id) throw new Error("Pas d'entreprise active");

            const [
                recipesData,
                machinesData,
                employeesData,
                inventoryData,
                dashData,
            ] = await Promise.all([
                fetchAvailableRecipes($activeCompany.id),
                pb.collection("machines").getFullList<Machine>({
                    filter: `company="${$activeCompany.id}"`,
                    expand: "machine.product,employees",
                    requestKey: null,
                }),
                pb.collection("employees").getFullList<Employee>({
                    filter: `employer="${$activeCompany.id}"`,
                    requestKey: null,
                }),
                pb.collection("inventory").getFullList<InventoryItem>({
                    filter: `company="${$activeCompany.id}"`,
                    expand: "item",
                    requestKey: null,
                }),
                fetchDashboardData(userId),
            ]);

            recipes = recipesData;
            machines = machinesData;
            employees = employeesData;
            inventory = inventoryData;
            availableMachineStock = inventoryData.filter(
                (inv) =>
                    inv.expand?.item?.type === "Machine" &&
                    (inv.quantity || 0) > 0,
            );
            dashboardData = dashData;
        } catch (err: any) {
            error = err.message;
            notifications.error(error);
        } finally {
            loading = false;
        }
    }

    async function handleRecipeProduce() {
        loadData();
    }

    function handleMachineUpdate() {
        loadData();
    }

    // Création d'une assignation de machine depuis le stock
    async function assignMachineFromStock(itemId: string) {
        if (!itemId || !$activeCompany?.id) return;
        try {
            await pb.collection("machines").create({
                company: $activeCompany.id,
                machine: itemId,
                employees: [],
            });
            notifications.success("Machine assignée depuis le stock");
            await loadData();
        } catch (err: any) {
            notifications.error(err?.message || "Erreur lors du recrutement");
        }
    }

    let unsubscribe: () => void;

    async function subscribeToInventory() {
        if (unsubscribe) unsubscribe();

        try {
            unsubscribe = await pb
                .collection("inventory")
                .subscribe("*", async ({ action, record }) => {
                    if (record.company !== $activeCompany?.id) return;

                    if (action === "create" || action === "update") {
                        // Fetch updated record with expand to ensure we have item details
                        const updatedRecord = await pb
                            .collection("inventory")
                            .getOne<InventoryItem>(record.id, {
                                expand: "item",
                            });

                        const index = inventory.findIndex(
                            (i) => i.id === record.id,
                        );
                        if (index > -1) {
                            inventory[index] = updatedRecord;
                        } else {
                            inventory.push(updatedRecord);
                        }
                    } else if (action === "delete") {
                        inventory = inventory.filter((i) => i.id !== record.id);
                    }

                    // Update derived lists
                    availableMachineStock = inventory.filter(
                        (inv) =>
                            inv.expand?.item?.type === "Machine" &&
                            (inv.quantity || 0) > 0,
                    );

                    // Update dashboard data (partial update for resources)
                    if (dashboardData) {
                        dashboardData.resources.inventory_count =
                            inventory.length;
                        // Note: We can't easily update top_items without complex logic or re-fetching,
                        // but updating the total count is a good indicator.
                    }
                });
        } catch (err) {
            console.error("Failed to subscribe to inventory", err);
        }
    }

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });

    $effect(() => {
        if ($activeCompany) {
            loadData().then(() => {
                subscribeToInventory();
            });
        }
    });
</script>

<div class="min-h-screen bg-slate-950 text-slate-200 p-6">
    <div class="max-w-7xl mx-auto space-y-8">
        <!-- Header -->
        <header
            class="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
            <div class="flex items-center gap-4">
                <button
                    onclick={() => goto("/dashboard")}
                    class="text-slate-400 hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                    ← Tableau de bord
                </button>
                <div>
                    <div class="flex items-center gap-3">
                        <div class="p-3 bg-indigo-500/10 rounded-xl">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="32"
                                height="32"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                class="text-indigo-400"
                                ><path
                                    d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
                                ></path><circle cx="12" cy="12" r="3"
                                ></circle></svg
                            >
                        </div>
                        <h1
                            class="text-4xl font-black text-white tracking-tight"
                        >
                            Atelier de Production
                        </h1>
                    </div>
                    <p class="text-slate-400 mt-1">
                        Produisez des items en masse et automatisez vos
                        opérations.
                    </p>
                </div>
            </div>

            {#if dashboardData}
                <div class="flex gap-4">
                    <StatCard
                        title="ITEMS EN STOCK"
                        value={dashboardData.resources.inventory_count}
                        color="emerald"
                    />
                    <StatCard
                        title="MACHINES"
                        value={machines.length}
                        color="amber"
                    />
                </div>
            {/if}
        </header>

        {#if error}
            <div
                transition:fade={{ duration: 200 }}
                class="p-4 bg-red-500/10 border border-red-600/30 rounded-lg"
            >
                <p class="text-sm text-red-400">❌ {error}</p>
            </div>
        {/if}

        {#if loading}
            <div class="flex flex-col items-center justify-center py-12">
                <div
                    class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"
                ></div>
                <p class="mt-4 text-slate-400">Chargement de l'atelier...</p>
            </div>
        {:else}
            <!-- Tab Navigation -->
            <div class="flex gap-2 border-b border-slate-700">
                <button
                    onclick={() => (activeTab = "manual")}
                    class="px-4 py-2 font-semibold transition-all flex items-center gap-2 {activeTab ===
                    'manual'
                        ? 'text-indigo-400 border-b-2 border-indigo-400'
                        : 'text-slate-400 hover:text-white'}"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><path
                            d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"
                        /><path d="M17.64 15 22 10.64" /><path
                            d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25V7.86c0-.55-.45-1-1-1H14c-.55 0-1 .45-1 1v3.38c0 .85-.33 1.66-.93 2.26l-1.25 1.25a2.83 2.83 0 0 0 0 4 .19.19 0 0 0 .28 0l7.8-7.8a.19.19 0 0 0 0-.28 2.83 2.83 0 0 0 0-4z"
                        /></svg
                    >
                    Production Manuelle
                </button>
                <button
                    onclick={() => (activeTab = "automation")}
                    class="px-4 py-2 font-semibold transition-all flex items-center gap-2 {activeTab ===
                    'automation'
                        ? 'text-indigo-400 border-b-2 border-indigo-400'
                        : 'text-slate-400 hover:text-white'}"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><rect
                            width="18"
                            height="10"
                            x="3"
                            y="11"
                            rx="2"
                        /><circle cx="12" cy="5" r="2" /><path
                            d="M12 7v4"
                        /><line x1="8" y1="16" x2="8" y2="16" /><line
                            x1="16"
                            y1="16"
                            x2="16"
                            y2="16"
                        /></svg
                    >
                    Automatisation
                    {#if machines.length > 0}
                        <span
                            class="ml-1 text-xs bg-indigo-500 text-white px-2 py-1 rounded-full"
                        >
                            {machines.length}
                        </span>
                    {/if}
                </button>
            </div>

            <!-- Manual Production Tab -->
            {#if activeTab === "manual"}
                <section transition:fade={{ duration: 200 }}>
                    <div class="space-y-4">
                        <div>
                            <h2 class="text-2xl font-bold text-white mb-2">
                                Recettes disponibles
                            </h2>
                            <p class="text-sm text-slate-400">
                                Vous avez accès à {recipes.length} recette(s)
                            </p>
                        </div>

                        {#if recipes.length === 0}
                            <div
                                class="text-center py-12 bg-slate-800/30 rounded-lg border border-slate-700"
                            >
                                <p class="text-slate-400">
                                    Aucune recette disponible
                                </p>
                                <p class="text-xs text-slate-500 mt-1">
                                    Débloquez des technologies au laboratoire
                                    pour accéder à plus de recettes.
                                </p>
                            </div>
                        {:else}
                            <!-- Filter Bar -->
                            <FilterBar
                                bind:searchQuery={recipeSearchQuery}
                                placeholder="Rechercher une recette..."
                                filters={recipeFilterOptions}
                                bind:selectedFilters={recipeFilters}
                            />

                            <!-- Results count -->
                            <div class="text-sm text-slate-400 mb-2">
                                {filteredRecipes.length} recette(s) sur {recipes.length}
                            </div>

                            <div
                                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            >
                                {#each filteredRecipes as recipe (recipe.id)}
                                    <RecipeCard
                                        {recipe}
                                        {inventory}
                                        companyId={$activeCompany?.id || ""}
                                        onProduce={handleRecipeProduce}
                                    />
                                {/each}
                            </div>
                        {/if}
                    </div>
                </section>
            {/if}

            <!-- Automation Tab -->
            {#if activeTab === "automation"}
                <section transition:fade={{ duration: 200 }}>
                    <div class="space-y-4">
                        <div>
                            <h2 class="text-2xl font-bold text-white mb-2">
                                Gestion des machines
                            </h2>
                            <p class="text-sm text-slate-400">
                                Assignez des employés et configurez les recettes
                                à produire automatiquement.
                            </p>
                        </div>

                        {#if availableMachineStock.length > 0}
                            <div
                                class="mb-4 p-3 bg-slate-800/50 border border-slate-700 rounded-lg"
                            >
                                <div
                                    class="flex items-center justify-between mb-2"
                                >
                                    <div
                                        class="text-sm text-slate-300 font-medium"
                                    >
                                        Machines en stock ({availableMachineStock.length})
                                    </div>
                                    <div class="text-xs text-slate-400">
                                        Sélectionnez pour créer une assignation
                                    </div>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    {#each availableMachineStock as inv (inv.id)}
                                        <button
                                            class="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded border border-indigo-500/60 transition"
                                            onclick={() =>
                                                assignMachineFromStock(
                                                    inv.item,
                                                )}
                                        >
                                            {inv.expand?.item?.name ||
                                                "Machine"} × {inv.quantity}
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        {#if machines.length === 0}
                            <div
                                class="text-center py-12 bg-slate-800/30 rounded-lg border border-slate-700"
                            >
                                <p class="text-slate-400">
                                    Aucune machine possédée
                                </p>
                                <p class="text-xs text-slate-500 mt-1">
                                    Allez au marché pour acheter votre première
                                    machine !
                                </p>
                            </div>
                        {:else}
                            <FilterBar
                                bind:searchQuery={machineSearchQuery}
                                placeholder="Rechercher une machine installée..."
                                class="mb-4"
                            />

                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {#each filteredMachines as machine (machine.id)}
                                    <MachineAssignment
                                        {machine}
                                        allEmployees={employees}
                                        onUpdate={handleMachineUpdate}
                                        {busyEmployeeIds}
                                    />
                                {/each}
                            </div>
                        {/if}

                        {#if employees.length === 0}
                            <div
                                class="mt-6 p-4 bg-amber-500/10 border border-amber-600/30 rounded-lg"
                            >
                                <p
                                    class="text-sm text-amber-400 flex items-center gap-2"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        ><path
                                            d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
                                        /><line
                                            x1="12"
                                            y1="9"
                                            x2="12"
                                            y2="13"
                                        /><line
                                            x1="12"
                                            y1="17"
                                            x2="12.01"
                                            y2="17"
                                        /></svg
                                    >
                                    Vous n'avez aucun employé. Embauchez du personnel
                                    pour opérer les machines !
                                </p>
                            </div>
                        {/if}
                    </div>
                </section>
            {/if}

            <!-- Inventory Overview -->
            {#if dashboardData && dashboardData.resources.top_items.length > 0}
                <section
                    class="bg-slate-800/30 border border-slate-700 rounded-lg p-6"
                >
                    <h3
                        class="text-xl font-bold text-white mb-4 flex items-center gap-2"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            ><path
                                d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
                            /><path d="m3.3 7 8.7 5 8.7-5" /><path
                                d="M12 22.08V12"
                            /></svg
                        >
                        Top 5 items en inventaire
                    </h3>
                    <div
                        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
                    >
                        {#each dashboardData.resources.top_items as item}
                            <div
                                class="bg-slate-700/30 rounded p-3 border border-slate-600"
                            >
                                <p class="font-semibold text-white text-sm">
                                    {item.name}
                                </p>
                                <p class="text-xs text-slate-400 mt-1">
                                    Quantité: {item.qty}
                                </p>
                                <p
                                    class="text-xs text-indigo-400 font-semibold"
                                >
                                    ${item.value.toFixed(2)}
                                </p>
                            </div>
                        {/each}
                    </div>
                </section>
            {/if}
        {/if}
    </div>
</div>

<style>
    :global(body) {
        background-color: rgb(15, 23, 42);
    }
</style>
