<script lang="ts">
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { fetchAvailableRecipes } from "$lib/services/recipe";
    import { fetchDashboardData, type DashboardData } from "$lib/dashboard";
    import { activeCompany } from "$lib/stores";
    import pb from "$lib/pocketbase";
    import type { Machine, Employee, InventoryItem } from "$lib/types";
    import RecipeCard from "$lib/components/RecipeCard.svelte";
    import MachineAssignment from "$lib/components/MachineAssignment.svelte";
    import StatCard from "$lib/components/StatCard.svelte";
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
                    expand: "machine,employees",
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

    function handleRecipeProduce() {
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
            notifications.error(err?.message || "Erreur lors de l'assignation");
        }
    }
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
                    <h1 class="text-4xl font-black text-white tracking-tight">
                        ⚙️ Atelier de Production
                    </h1>
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
                    class="px-4 py-2 font-semibold transition-all {activeTab ===
                    'manual'
                        ? 'text-indigo-400 border-b-2 border-indigo-400'
                        : 'text-slate-400 hover:text-white'}"
                >
                    🔨 Production Manuelle
                </button>
                <button
                    onclick={() => (activeTab = "automation")}
                    class="px-4 py-2 font-semibold transition-all {activeTab ===
                    'automation'
                        ? 'text-indigo-400 border-b-2 border-indigo-400'
                        : 'text-slate-400 hover:text-white'}"
                >
                    🤖 Automatisation
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
                            <div
                                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            >
                                {#each recipes as recipe (recipe.id)}
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
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {#each machines as machine (machine.id)}
                                    <MachineAssignment
                                        {machine}
                                        allEmployees={employees}
                                        companyId={$activeCompany?.id || ""}
                                        onUpdate={handleMachineUpdate}
                                    />
                                {/each}
                            </div>
                        {/if}

                        {#if employees.length === 0}
                            <div
                                class="mt-6 p-4 bg-amber-500/10 border border-amber-600/30 rounded-lg"
                            >
                                <p class="text-sm text-amber-400">
                                    ⚠️ Vous n'avez aucun employé. Embauchez du
                                    personnel pour opérer les machines !
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
                    <h3 class="text-xl font-bold text-white mb-4">
                        📦 Top 5 items en inventaire
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
