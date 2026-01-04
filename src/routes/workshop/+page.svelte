<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import type { Machine, Employee, InventoryItem } from "$lib/pocketbase";
  import { notifications } from "$lib/notifications";

  // Components
  import RecipeCard from "$lib/components/RecipeCard.svelte";
  import MachineAssignment from "$lib/components/MachineAssignment.svelte";
  import FilterBar from "$lib/components/FilterBar.svelte";
  import Pagination from "$lib/components/Pagination.svelte";
  import WorkshopStats from "$lib/components/WorkshopStats.svelte";
  import WorkshopTabs from "$lib/components/WorkshopTabs.svelte";
  import MachineStockPanel from "$lib/components/MachineStockPanel.svelte";
  import AutoAssignPanel from "$lib/components/AutoAssignPanel.svelte";

  // Services
  import {
    loadWorkshopData,
    loadRecipes as loadRecipesService,
    loadMachines as loadMachinesService,
    loadMachineStats,
    fetchBusyEmployees,
    refreshEnergyStatus,
    refreshInventory,
    assignMachineFromStock as assignMachineService,
    autoAssignEmployees as autoAssignEmployeesService,
    autoAssignDeposits as autoAssignDepositsService,
    subscribeToWorkshopData,
    type MachineStats,
    type EnergyStatus,
  } from "$lib/services/workshop";
  import type { DashboardData } from "$lib/dashboard";

  const PER_PAGE = 12;

  // --- State ---
  let recipes: any[] = $state([]);
  let machines: Machine[] = $state([]);
  let employees: Employee[] = $state([]);
  let inventory: InventoryItem[] = $state([]);
  let dashboardData: DashboardData | null = $state(null);
  let energyStatus: EnergyStatus | null = $state(null);
  let machineStats: MachineStats = $state({
    totalMachines: 0,
    totalMaxEmployees: 0,
    currentAssigned: 0,
    missingEmployees: 0,
    availableEmployees: 0,
    totalEmployees: 0,
    machineTypeCount: 0,
    stockageTypeCount: 0,
  });

  let loading = $state(true);
  let loadingMoreRecipes = $state(false);
  let loadingMoreMachines = $state(false);
  let error = $state("");

  let activeTab = $state<"manual" | "automation">("manual");
  let machineTypeTab = $state<"machines" | "stockage">("machines");

  // Pagination
  let recipePage = $state(1);
  let hasMoreRecipes = $state(true);
  let totalRecipes = $state(0);
  let machinePage = $state(1);
  let hasMoreMachines = $state(true);
  let totalMachines = $state(0);

  // Filters
  let recipeSearchQuery = $state("");
  let recipeFilters = $state<Record<string, string>>({});
  let machineSearchQuery = $state("");

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

  // Busy employees tracking
  let busyEmployeeIds = $state(new Set<string>());

  // Auto-assign states
  let isAutoAssigning = $state(false);
  let isAutoAssigningDeposits = $state(false);

  // --- Derived State ---
  let currentTypeFilter = $derived(
    machineTypeTab === "machines" ? "Machine" : "Stockage"
  );

  let availableMachineStock = $derived(
    inventory.filter(
      (inv) =>
        inv.expand?.item?.type === currentTypeFilter && (inv.quantity || 0) > 0
    )
  );

  let filteredMachinesByType = $derived(
    machines.filter((m) => m.expand?.machine?.type === currentTypeFilter)
  );

  let machineTypeCount = $derived(machineStats.machineTypeCount);

  let stockageTypeCount = $derived(machineStats.stockageTypeCount);

  let availableEmployees = $derived(
    employees
      .filter((emp) => !busyEmployeeIds.has(emp.id))
      .sort((a, b) => (b.efficiency || 1) - (a.efficiency || 1))
  );

  // --- Data Loading ---
  async function loadRecipes(page: number = 1, append: boolean = false) {
    if (!$activeCompany) return;

    if (page === 1 && !append) {
      loading = true;
    } else {
      loadingMoreRecipes = true;
    }

    try {
      const result = await loadRecipesService(page, PER_PAGE, {
        searchQuery: recipeSearchQuery,
        time: recipeFilters.time as "fast" | "long" | undefined,
      });

      recipes = append ? [...recipes, ...result.items] : result.items;
      totalRecipes = result.totalItems;
      hasMoreRecipes = result.hasMore;
      recipePage = result.page;
    } catch (err: any) {
      console.error("Failed to load recipes", err);
    } finally {
      loading = false;
      loadingMoreRecipes = false;
    }
  }

  async function loadMachines(page: number = 1, append: boolean = false) {
    if (!$activeCompany) return;

    if (page > 1 || append) {
      loadingMoreMachines = true;
    }

    try {
      const result = await loadMachinesService(
        $activeCompany.id,
        page,
        PER_PAGE,
        {
          searchQuery: machineSearchQuery,
        }
      );

      machines = append ? [...machines, ...result.items] : result.items;
      totalMachines = result.totalItems;
      hasMoreMachines = result.hasMore;
      machinePage = result.page;
    } catch (err: any) {
      console.error("Failed to load machines", err);
    } finally {
      loadingMoreMachines = false;
    }
  }

  async function loadData(silent = false) {
    if (!silent) loading = true;
    error = "";

    try {
      const userId = pb.authStore.model?.id;
      if (!userId) throw new Error("Non connecté");
      if (!$activeCompany?.id) throw new Error("Pas d'entreprise active");

      const workshopData = await loadWorkshopData(userId, $activeCompany.id);

      employees = workshopData.employees;
      inventory = workshopData.inventory;
      dashboardData = workshopData.dashboardData;
      energyStatus = workshopData.energyStatus;
      busyEmployeeIds = workshopData.busyEmployeeIds;

      // Load paginated data and stats
      await Promise.all([
        loadRecipes(1, false),
        loadMachines(1, false),
        loadMachineStats().then((stats) => (machineStats = stats)),
      ]);
    } catch (err: any) {
      error = err.message;
      notifications.error(error);
    } finally {
      loading = false;
    }
  }

  // --- Filter Handlers ---
  function handleRecipeFilterChange(filters: {
    searchQuery: string;
    selectedFilters: Record<string, string>;
  }) {
    recipeSearchQuery = filters.searchQuery;
    recipeFilters = filters.selectedFilters;
    recipePage = 1;
    hasMoreRecipes = true;
    loadRecipes(1, false);
  }

  function handleMachineFilterChange(filters: {
    searchQuery: string;
    selectedFilters: Record<string, string>;
  }) {
    machineSearchQuery = filters.searchQuery;
    machinePage = 1;
    hasMoreMachines = true;
    loadMachines(1, false);
  }

  // --- Actions ---
  async function handleAssignMachineFromStock(
    itemId: string,
    quantity: number
  ) {
    if (!itemId || !$activeCompany?.id || quantity <= 0) return;
    try {
      await assignMachineService($activeCompany.id, itemId, quantity);
      notifications.success(
        `${quantity} machine(s) assignée(s) depuis le stock`
      );
    } catch (err: any) {
      notifications.error(err?.message || "Erreur lors de l'assignation");
    }
  }

  async function handleAutoAssignEmployees() {
    if (isAutoAssigning || availableEmployees.length === 0) return;

    isAutoAssigning = true;
    try {
      const response = await autoAssignEmployeesService();
      if (response.assignedCount > 0) {
        notifications.success(
          `✨ ${response.assignedCount} employé(s) assigné(s) automatiquement`
        );
        busyEmployeeIds = await fetchBusyEmployees($activeCompany!.id);
      } else {
        notifications.info(
          response.message || "Aucun employé disponible à assigner"
        );
      }
    } catch (err: any) {
      notifications.error(`Erreur: ${err.message}`);
    } finally {
      isAutoAssigning = false;
    }
  }

  async function handleAutoAssignDeposits() {
    if (isAutoAssigningDeposits) return;

    isAutoAssigningDeposits = true;
    try {
      const response = await autoAssignDepositsService();
      if (response.assignedCount > 0) {
        notifications.success(
          `✨ ${response.assignedCount} gisement(s) assigné(s) automatiquement`
        );
        await loadMachines(1, false);
      } else {
        notifications.info(
          "Aucun gisement compatible trouvé pour vos machines"
        );
      }
    } catch (err: any) {
      notifications.error(`Erreur: ${err.message}`);
    } finally {
      isAutoAssigningDeposits = false;
    }
  }

  function handleMachineDelete(machineId: string) {
    machines = machines.filter((m) => m.id !== machineId);
    refreshInventory($activeCompany!.id).then((inv) => (inventory = inv));
  }

  // --- Realtime Subscriptions ---
  let unsubscribeInventory: (() => void) | null = null;
  let unsubscribeMachines: (() => void) | null = null;
  let refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const DEBOUNCE_MS = 500; // Reduced for better responsiveness

  // Debounced refresh for stats, busy employees, and energy
  function debouncedStatsRefresh() {
    if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer);
    refreshDebounceTimer = setTimeout(async () => {
      if (!$activeCompany?.id) return;
      // Run in parallel to minimize wait time
      const [newBusy, newStats, newEnergy] = await Promise.all([
        fetchBusyEmployees($activeCompany.id),
        loadMachineStats(),
        refreshEnergyStatus($activeCompany.id),
      ]);
      busyEmployeeIds = newBusy;
      machineStats = newStats;
      if (newEnergy) energyStatus = newEnergy;
    }, DEBOUNCE_MS);
  }

  async function subscribeToData() {
    if (unsubscribeInventory) unsubscribeInventory();
    if (unsubscribeMachines) unsubscribeMachines();

    try {
      // Inventory Subscription
      unsubscribeInventory = await pb
        .collection("inventory")
        .subscribe("*", async ({ action, record }) => {
          if (record.company !== $activeCompany?.id) return;

          if (action === "update") {
            const index = inventory.findIndex((i) => i.id === record.id);
            if (index > -1) {
              inventory[index] = {
                ...inventory[index],
                quantity: record.quantity,
              };
              inventory = [...inventory];
            }
          } else if (action === "create") {
            const newItem = await pb
              .collection("inventory")
              .getOne<InventoryItem>(record.id, {
                expand: "item",
                requestKey: null,
              });
            inventory = [...inventory, newItem];
          } else if (action === "delete") {
            inventory = inventory.filter((i) => i.id !== record.id);
          }
        });

      // Machines Subscription
      unsubscribeMachines = await pb
        .collection("machines")
        .subscribe<Machine>("*", async ({ action, record }) => {
          if (record.company !== $activeCompany?.id) return;

          if (action === "update") {
            const index = machines.findIndex((m) => m.id === record.id);
            if (index > -1) {
              machines[index] = {
                ...machines[index],
                stored_energy: record.stored_energy,
                production_started_at: record.production_started_at,
                employees: record.employees,
                deposit: record.deposit,
                expand: { ...machines[index].expand },
              };
              machines = [...machines];
            }
            // Debounced refresh - non-blocking
            debouncedStatsRefresh();
          } else if (action === "create") {
            const newMachine = await pb
              .collection("machines")
              .getOne<Machine>(record.id, {
                expand: "machine.product,machine.can_consume,employees,deposit",
                requestKey: null,
              });
            machines = [...machines, newMachine];
            debouncedStatsRefresh();
          } else if (action === "delete") {
            machines = machines.filter((m) => m.id !== record.id);
            debouncedStatsRefresh();
          }
        });
    } catch (err) {
      console.error("Failed to subscribe to data", err);
    }
  }

  function unsubscribeAll() {
    if (unsubscribeInventory) unsubscribeInventory();
    if (unsubscribeMachines) unsubscribeMachines();
    if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer);
  }

  // --- Lifecycle ---
  let lastCompanyId: string | null = null;

  onMount(() => {
    if ($activeCompany) {
      lastCompanyId = $activeCompany.id;
      loadData().then(() => subscribeToData());
    }
  });

  onDestroy(() => unsubscribeAll());

  $effect(() => {
    const currentId = $activeCompany?.id ?? null;
    if (currentId && currentId !== lastCompanyId) {
      lastCompanyId = currentId;
      unsubscribeAll();
      loadData().then(() => subscribeToData());
    }
  });
</script>

<svelte:head>
  <title>Workshop | Ketsuna: Iron Symphony</title>
</svelte:head>

<div
  class="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30"
>
  <div class="max-w-7xl mx-auto space-y-8 p-6">
    <!-- Header -->
    <header
      class="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/50"
    >
      <div class="flex items-center gap-4">
        <div>
          <h1
            class="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3"
          >
            <span class="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><path
                  d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
                ></path><circle cx="12" cy="12" r="3"></circle></svg
              >
            </span>
            Atelier de Production
          </h1>
          <p class="text-slate-400 mt-2 text-sm ml-1">
            Produisez des items en masse et automatisez vos opérations.
          </p>
        </div>
      </div>

      <WorkshopStats
        {dashboardData}
        machineCount={machineStats.totalMachines}
      />
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
      <WorkshopTabs bind:activeTab machineCount={machineStats.totalMachines} />

      <!-- Manual Production Tab -->
      {#if activeTab === "manual"}
        <section
          transition:fade={{ duration: 200 }}
          class="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div class="space-y-6">
            <div class="flex justify-between items-start">
              <div>
                <h2 class="text-xl font-bold text-white mb-2">
                  Recettes disponibles
                </h2>
                <p class="text-sm text-slate-400">
                  Vous avez accès à <span class="text-white font-bold"
                    >{recipes.length}</span
                  >
                  / {totalRecipes} recette(s)
                </p>
              </div>
            </div>

            {#if recipes.length === 0 && !recipeSearchQuery && !recipeFilters.time}
              <div
                class="text-center py-16 bg-slate-950/50 rounded-xl border-2 border-dashed border-slate-800"
              >
                <div class="inline-block p-4 rounded-full bg-slate-900 mb-4">
                  <span class="text-3xl">📜</span>
                </div>
                <p class="text-slate-300 font-medium">
                  Aucune recette disponible
                </p>
                <p class="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
                  Débloquez des technologies au laboratoire pour accéder à plus
                  de recettes.
                </p>
              </div>
            {:else}
              <!-- Filter Bar -->
              <div
                class="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50"
              >
                <FilterBar
                  bind:searchQuery={recipeSearchQuery}
                  placeholder="Rechercher une recette..."
                  filters={recipeFilterOptions}
                  bind:selectedFilters={recipeFilters}
                  onFilterChange={handleRecipeFilterChange}
                />
              </div>

              {#if recipes.length === 0}
                <div
                  class="text-center py-12 bg-slate-950/50 rounded-xl border border-slate-800"
                >
                  <span class="text-3xl block mb-3">🔍</span>
                  <p class="text-lg font-bold text-white mb-1">
                    Aucun résultat
                  </p>
                  <p class="text-sm text-slate-400">
                    Aucune recette ne correspond à vos critères.
                  </p>
                </div>
              {:else}
                <div
                  class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {#each recipes as recipe (recipe.id)}
                    <RecipeCard
                      {recipe}
                      {inventory}
                      companyId={$activeCompany?.id || ""}
                      onProduce={() => {}}
                    />
                  {/each}
                </div>

                <Pagination
                  currentPage={recipePage}
                  totalPages={Math.ceil(totalRecipes / PER_PAGE)}
                  onPageChange={(page) => loadRecipes(page, false)}
                />
              {/if}
            {/if}
          </div>
        </section>
      {/if}

      <!-- Automation Tab -->
      {#if activeTab === "automation"}
        <section
          transition:fade={{ duration: 200 }}
          class="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div class="space-y-6">
            <div
              class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div>
                <h2 class="text-xl font-bold text-white mb-2">
                  Gestion des infrastructures
                </h2>
                <p class="text-sm text-slate-400">
                  Assignez des employés et configurez vos machines et stockage.
                </p>

                <AutoAssignPanel
                  {machines}
                  {machineStats}
                  {availableEmployees}
                  {isAutoAssigning}
                  {isAutoAssigningDeposits}
                  onAutoAssignEmployees={handleAutoAssignEmployees}
                  onAutoAssignDeposits={handleAutoAssignDeposits}
                />
              </div>

              <!-- Sub-tabs for Machine Types -->
              <div
                class="flex gap-2 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50"
              >
                <button
                  onclick={() => (machineTypeTab = "machines")}
                  class="px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all {machineTypeTab ===
                  'machines'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}"
                >
                  <span>🤖</span> Machines
                  {#if machineTypeCount > 0}
                    <span
                      class="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full"
                      >{machineTypeCount}</span
                    >
                  {/if}
                </button>
                <button
                  onclick={() => (machineTypeTab = "stockage")}
                  class="px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all {machineTypeTab ===
                  'stockage'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}"
                >
                  <span>🔋</span> Stockage
                  {#if stockageTypeCount > 0}
                    <span
                      class="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full"
                      >{stockageTypeCount}</span
                    >
                  {/if}
                </button>
              </div>
            </div>

            <MachineStockPanel
              availableStock={availableMachineStock}
              onAssign={handleAssignMachineFromStock}
            />

            {#if filteredMachinesByType.length === 0 && !machineSearchQuery}
              <div
                class="text-center py-16 bg-slate-950/50 rounded-xl border-2 border-dashed border-slate-800"
              >
                <div class="inline-block p-4 rounded-full bg-slate-900 mb-4">
                  <span class="text-3xl">🔧</span>
                </div>
                <p class="text-slate-300 font-medium">
                  Aucune machine installée
                </p>
                <p class="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
                  Achetez des machines au marché ou installez-en depuis votre
                  stock ci-dessus.
                </p>
              </div>
            {:else}
              <FilterBar
                bind:searchQuery={machineSearchQuery}
                placeholder="Rechercher une machine installée..."
                onFilterChange={handleMachineFilterChange}
              />

              <div class="text-sm text-slate-500 font-medium px-1">
                Affichage de <span class="text-white font-bold"
                  >{filteredMachinesByType.length}</span
                >
                {machineTypeTab === "machines" ? "machine(s)" : "stockage(s)"}
              </div>

              {#if filteredMachinesByType.length === 0}
                <div
                  class="text-center py-12 bg-slate-950/50 rounded-xl border border-slate-800"
                >
                  <span class="text-3xl block mb-3">🔍</span>
                  <p class="text-lg font-bold text-white mb-1">
                    Aucun résultat
                  </p>
                  <p class="text-sm text-slate-400">
                    Aucune machine ne correspond à vos critères.
                  </p>
                </div>
              {:else}
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {#each filteredMachinesByType as machine (machine.id)}
                    <MachineAssignment
                      {machine}
                      {availableEmployees}
                      {busyEmployeeIds}
                      {energyStatus}
                      onDelete={handleMachineDelete}
                    />
                  {/each}
                </div>

                <Pagination
                  currentPage={machinePage}
                  totalPages={Math.ceil(totalMachines / PER_PAGE)}
                  onPageChange={(page) => loadMachines(page, false)}
                />
              {/if}
            {/if}

            {#if employees.length === 0}
              <div
                class="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3"
              >
                <div
                  class="p-2 bg-amber-500/10 rounded-lg text-amber-500 shrink-0"
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
                      d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
                    /><line x1="12" y1="9" x2="12" y2="13" /><line
                      x1="12"
                      y1="17"
                      x2="12.01"
                      y2="17"
                    /></svg
                  >
                </div>
                <div>
                  <h4 class="text-amber-400 font-bold text-sm">
                    Personnel manquant
                  </h4>
                  <p class="text-xs text-amber-200/70 mt-1 leading-relaxed">
                    L'automatisation nécessite des employés qualifiés.
                    Rendez-vous dans la section RH pour recruter du personnel
                    afin d'opérer vos machines.
                  </p>
                </div>
              </div>
            {/if}
          </div>
        </section>
      {/if}

      <!-- Inventory Overview -->
      {#if dashboardData && dashboardData.resources.top_items.length > 0}
        <section
          class="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm"
        >
          <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span class="p-1.5 bg-slate-800 rounded-lg text-slate-400">
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
                  d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
                /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22.08V12" /></svg
              >
            </span>
            Top 5 items en inventaire
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {#each dashboardData.resources.top_items as item}
              <div
                class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:bg-slate-800/80 transition-colors group"
              >
                <div class="flex items-center gap-3 mb-2">
                  <div
                    class="w-8 h-8 rounded-full bg-slate-900/50 flex items-center justify-center text-lg"
                  >
                    📦
                  </div>
                  <p class="font-bold text-white text-sm truncate flex-1">
                    {item.name}
                  </p>
                </div>
                <div
                  class="flex justify-between items-end border-t border-slate-700/50 pt-2"
                >
                  <p
                    class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider"
                  >
                    x{item.qty}
                  </p>
                  <p
                    class="text-xs text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded"
                  >
                    ${item.value.toFixed(2)}
                  </p>
                </div>
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
