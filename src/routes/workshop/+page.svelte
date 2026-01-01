<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import { fetchAvailableRecipes } from "$lib/services/recipe";
  import { fetchDashboardData, type DashboardData } from "$lib/dashboard";
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import type { Machine, Employee, InventoryItem } from "$lib/pocketbase";
  import RecipeCard from "$lib/components/RecipeCard.svelte";
  import MachineAssignment from "$lib/components/MachineAssignment.svelte";
  import FilterBar from "$lib/components/FilterBar.svelte";
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import { notifications } from "$lib/notifications";

  const PER_PAGE = 12;

  let recipes: any[] = $state([]);
  let machines: Machine[] = $state([]);
  let employees: Employee[] = $state([]);
  let inventory: InventoryItem[] = $state([]);
  let dashboardData: DashboardData | null = $state(null);
  let energyStatus: any = $state(null);
  let loading = $state(true);
  let loadingMoreRecipes = $state(false);
  let loadingMoreMachines = $state(false);
  let error = $state("");
  let activeTab = $state<"manual" | "automation">("manual");
  let machineTypeTab = $state<"machines" | "stockage">("machines");

  // Pagination state
  let recipePage = $state(1);
  let hasMoreRecipes = $state(true);
  let totalRecipes = $state(0);
  let machinePage = $state(1);
  let hasMoreMachines = $state(true);
  let totalMachines = $state(0);

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

  // Filter states for machines
  let machineSearchQuery = $state("");

  let busyEmployeeIds = $state(new Set<string>());

  // Derived: Filter machines and stock by type
  let currentTypeFilter = $derived(
    machineTypeTab === "machines" ? "Machine" : "Stockage"
  );

  // Dynamically compute available stock based on selected type tab
  let availableMachineStock = $derived(
    inventory.filter(
      (inv) =>
        inv.expand?.item?.type === currentTypeFilter && (inv.quantity || 0) > 0
    )
  );

  // Filter displayed machines by type
  let filteredMachinesByType = $derived(
    machines.filter((m) => m.expand?.machine?.type === currentTypeFilter)
  );

  // Count machines by type for badges
  let machineTypeCount = $derived(
    machines.filter((m) => (m.expand?.machine?.type as string) === "Machine")
      .length
  );
  let stockageTypeCount = $derived(
    machines.filter((m) => (m.expand?.machine?.type as string) === "Stockage")
      .length
  );

  // Machine stats from backend API (accurate totals across ALL machines)
  let machineStats = $state({
    totalMachines: 0,
    totalMaxEmployees: 0,
    currentAssigned: 0,
    missingEmployees: 0,
    availableEmployees: 0,
    totalEmployees: 0,
  });

  // Fetch accurate machine stats from backend
  async function loadMachineStats() {
    try {
      const stats = await pb.send("/api/machines/stats", { method: "GET" });
      machineStats = stats;
    } catch (e) {
      console.error("Failed to load machine stats", e);
    }
  }

  // Available employees list (for the auto-assign button preview)
  let availableEmployees = $derived(
    employees
      .filter((emp) => !busyEmployeeIds.has(emp.id))
      .sort((a, b) => (b.efficiency || 1) - (a.efficiency || 1))
  );

  // Auto-assign state
  let isAutoAssigning = $state(false);

  // Auto-assign function: call the backend endpoint
  async function autoAssignEmployees() {
    if (isAutoAssigning || availableEmployees.length === 0) return;

    isAutoAssigning = true;

    try {
      const response = await pb.send("/api/machines/auto-assign", {
        method: "POST",
      });

      if (response.assignedCount > 0) {
        notifications.success(
          `✨ ${response.assignedCount} employé(s) assigné(s) automatiquement`
        );
        // Update busy list - the realtime subscription will handle machines update
        const busy = await fetchBusyEmployees();
        busyEmployeeIds = busy;
      } else {
        notifications.info(
          response.message || "Aucun employé disponible à assigner"
        );
      }
    } catch (error: any) {
      notifications.error(`Erreur: ${error.message}`);
    } finally {
      isAutoAssigning = false;
    }
  }

  async function fetchBusyEmployees() {
    if (!$activeCompany?.id) return new Set<string>();
    try {
      const allMachines = await pb.collection("machines").getFullList({
        filter: `company="${$activeCompany.id}"`,
        fields: "employees",
        requestKey: null,
      });
      const s = new Set<string>();
      allMachines.forEach((m) => {
        if (m.employees) m.employees.forEach((id: string) => s.add(id));
      });
      return s;
    } catch (e) {
      console.warn("Failed to fetch busy employees", e);
      return new Set<string>();
    }
  }

  // Build PocketBase filter for recipes
  function buildRecipeFilter(): string {
    if (!$activeCompany) return "";

    const parts: string[] = [];

    if (recipeSearchQuery.trim()) {
      parts.push(`output_item.name ~ "${recipeSearchQuery.trim()}"`);
    }
    if (recipeFilters.time === "fast") {
      parts.push("production_time <= 60");
    }
    if (recipeFilters.time === "long") {
      parts.push("production_time > 60");
    }

    return parts.join(" && ");
  }

  // Build PocketBase filter for machines
  function buildMachineFilter(): string {
    if (!$activeCompany) return "";

    const parts: string[] = [`company = "${$activeCompany.id}"`];

    if (machineSearchQuery.trim()) {
      parts.push(`machine.name ~ "${machineSearchQuery.trim()}"`);
    }

    return parts.join(" && ");
  }

  async function loadRecipes(page: number = 1, append: boolean = false) {
    if (!$activeCompany) return;

    if (page === 1 && !append) {
      loading = true;
    } else {
      loadingMoreRecipes = true;
    }

    try {
      const filter = buildRecipeFilter();

      const result = await pb.collection("recipes").getList(page, PER_PAGE, {
        filter: filter || undefined,
        expand: "output_item,inputs_items,required_tech",
        sort: "production_time",
        requestKey: null,
      });

      if (append) {
        recipes = [...recipes, ...result.items];
      } else {
        recipes = result.items;
      }

      totalRecipes = result.totalItems;
      hasMoreRecipes = result.page < result.totalPages;
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

    if (page === 1 && !append) {
      // Don't set loading = true, let recipes handle that
    } else {
      loadingMoreMachines = true;
    }

    try {
      const filter = buildMachineFilter();

      const result = await pb
        .collection("machines")
        .getList<Machine>(page, PER_PAGE, {
          filter,
          expand: "machine.product,machine.can_consume,employees,deposit",
          requestKey: null,
        });

      if (append) {
        machines = [...machines, ...result.items];
      } else {
        machines = result.items;
      }

      totalMachines = result.totalItems;
      hasMoreMachines = result.page < result.totalPages;
      machinePage = result.page;
    } catch (err: any) {
      console.error("Failed to load machines", err);
    } finally {
      loadingMoreMachines = false;
    }
  }

  // Data loading triggered by the $effect at the end of script

  async function loadData(silent = false) {
    if (!silent) loading = true;
    error = "";
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) throw new Error("Non connecté");
      if (!$activeCompany?.id) throw new Error("Pas d'entreprise active");

      const [employeesData, inventoryData, dashData, busySet, energyData] =
        await Promise.all([
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
          fetchBusyEmployees(),
          pb
            .send("/api/company/energy-status", {
              params: { companyId: $activeCompany.id },
            })
            .catch(() => null),
        ]);

      // Load paginated data and machine stats
      await Promise.all([
        loadRecipes(1, false),
        loadMachines(1, false),
        loadMachineStats(),
      ]);

      employees = employeesData;
      busyEmployeeIds = busySet;
      inventory = inventoryData;
      dashboardData = dashData;
      energyStatus = energyData;
    } catch (err: any) {
      error = err.message;
      notifications.error(error);
    } finally {
      loading = false;
    }
  }

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

  async function loadMoreRecipes() {
    if (loadingMoreRecipes || !hasMoreRecipes) return;
    await loadRecipes(recipePage + 1, true);
  }

  async function loadMoreMachines() {
    if (loadingMoreMachines || !hasMoreMachines) return;
    await loadMachines(machinePage + 1, true);
  }

  async function handleRecipeProduce() {
    // No need to refresh - realtime subscription will handle inventory updates
  }

  function handleMachineUpdate() {
    // No need to refresh - realtime subscription handles updates
  }

  function handleMachineDelete(machineId: string) {
    // Immediate local update (fallback if realtime fails)
    machines = machines.filter((m) => m.id !== machineId);
    // Also refresh inventory since machine was returned to stock
    refreshInventory();
  }

  async function refreshInventory() {
    if (!$activeCompany?.id) return;
    try {
      const inventoryData = await pb
        .collection("inventory")
        .getFullList<InventoryItem>({
          filter: `company="${$activeCompany.id}"`,
          expand: "item",
          requestKey: null,
        });
      inventory = inventoryData;
    } catch (e) {
      console.warn("Inventory refresh failed", e);
    }
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
    } catch (err: any) {
      notifications.error(err?.message || "Erreur lors de l'assignation");
    }
  }

  // Debounce timer for batching updates
  let refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const DEBOUNCE_MS = 2000; // 2 seconds

  function debouncedRefresh() {
    if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer);
    refreshDebounceTimer = setTimeout(async () => {
      // Only refresh energy status periodically
      if ($activeCompany?.id) {
        try {
          const energyData = await pb
            .send("/api/company/energy-status", {
              params: { companyId: $activeCompany.id },
            })
            .catch(() => null);
          if (energyData) energyStatus = energyData;
        } catch (e) {
          // Silently ignore
        }
      }
    }, DEBOUNCE_MS);
  }

  let unsubscribeInventory: () => void;
  let unsubscribeMachines: () => void;

  async function subscribeToData() {
    if (unsubscribeInventory) unsubscribeInventory();
    if (unsubscribeMachines) unsubscribeMachines();

    try {
      // Inventory Subscription - only handle create/delete, merge updates locally
      unsubscribeInventory = await pb
        .collection("inventory")
        .subscribe("*", async ({ action, record }) => {
          if (record.company !== $activeCompany?.id) return;

          if (action === "update") {
            // Local merge only - no API call
            const index = inventory.findIndex((i) => i.id === record.id);
            if (index > -1) {
              inventory[index] = {
                ...inventory[index],
                quantity: record.quantity,
              };
              inventory = [...inventory]; // Trigger reactivity
            }
          } else if (action === "create") {
            // New item - need to fetch with expand
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

      // Machines Subscription - minimal updates, no cascade
      unsubscribeMachines = await pb
        .collection("machines")
        .subscribe<Machine>("*", async ({ action, record }) => {
          if (record.company !== $activeCompany?.id) return;

          if (action === "update") {
            // Local merge only - preserve expand data (especially expand.machine for type filtering)
            const index = machines.findIndex((m) => m.id === record.id);
            if (index > -1) {
              // Preserve existing expand data while updating specific fields
              machines[index] = {
                ...machines[index],
                stored_energy: record.stored_energy,
                production_started_at: record.production_started_at,
                employees: record.employees,
                deposit: record.deposit,
                // Keep expand.machine intact, only update expand.deposit if needed
                expand: {
                  ...machines[index].expand,
                  // Note: deposit expand may be stale, but it's updated locally in MachineAssignment
                },
              };
              machines = [...machines];
            }
            // Debounce energy refresh
            debouncedRefresh();
          } else if (action === "create") {
            // New machine - fetch with full expand
            const newMachine = await pb
              .collection("machines")
              .getOne<Machine>(record.id, {
                expand: "machine.product,machine.can_consume,employees,deposit",
                requestKey: null,
              });
            machines = [...machines, newMachine];
            // Update busy employees
            const busy = await fetchBusyEmployees();
            busyEmployeeIds = busy;
          } else if (action === "delete") {
            machines = machines.filter((m) => m.id !== record.id);
            // Update busy employees
            const busy = await fetchBusyEmployees();
            busyEmployeeIds = busy;
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

  onDestroy(() => {
    unsubscribeAll();
  });

  // Track the company ID to avoid unnecessary reloads
  let lastCompanyId: string | null = null;

  onMount(() => {
    if ($activeCompany) {
      lastCompanyId = $activeCompany.id;
      loadData().then(() => {
        subscribeToData();
      });
    }
  });

  // Only reload when company actually changes (ID change)
  $effect(() => {
    const currentId = $activeCompany?.id ?? null;
    if (currentId && currentId !== lastCompanyId) {
      lastCompanyId = currentId;
      unsubscribeAll();
      loadData().then(() => {
        subscribeToData();
      });
    }
  });
</script>

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

      {#if dashboardData}
        <div class="flex flex-wrap gap-4">
          <!-- Items in Stock Card -->
          <div
            class="bg-linear-to-br from-emerald-900/50 to-emerald-800/30 border border-emerald-700/30 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group min-w-40"
          >
            <div
              class="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"
            >
              <span class="text-3xl">📦</span>
            </div>
            <p
              class="text-emerald-400/80 text-[10px] font-bold uppercase tracking-widest mb-1"
            >
              Items en Stock
            </p>
            <p class="text-white text-2xl font-black mt-1 tracking-tight">
              {dashboardData.resources.inventory_count}
            </p>
          </div>

          <!-- Machines Card -->
          <div
            class="bg-linear-to-br from-amber-900/50 to-amber-800/30 border border-amber-700/30 rounded-2xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden group min-w-40"
          >
            <div
              class="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"
            >
              <span class="text-3xl">🏭</span>
            </div>
            <p
              class="text-amber-400/80 text-[10px] font-bold uppercase tracking-widest mb-1"
            >
              Machines
            </p>
            <p class="text-white text-2xl font-black mt-1 tracking-tight">
              {machines.length}
            </p>
          </div>
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
      <div class="flex gap-2 border-b border-slate-800">
        <button
          onclick={() => (activeTab = "manual")}
          class="px-6 py-3 font-semibold transition-all flex items-center gap-2 text-sm rounded-t-xl {activeTab ===
          'manual'
            ? 'bg-slate-900 text-indigo-400 border-t border-x border-slate-800'
            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'}"
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
          class="px-6 py-3 font-semibold transition-all flex items-center gap-2 text-sm rounded-t-xl {activeTab ===
          'automation'
            ? 'bg-slate-900 text-indigo-400 border-t border-x border-slate-800'
            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'}"
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
            ><rect width="18" height="10" x="3" y="11" rx="2" /><circle
              cx="12"
              cy="5"
              r="2"
            /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line
              x1="16"
              y1="16"
              x2="16"
              y2="16"
            /></svg
          >
          Automatisation
          {#if machines.length > 0}
            <span
              class="ml-1 text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30"
            >
              {machines.length}
            </span>
          {/if}
        </button>
      </div>

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
                      onProduce={handleRecipeProduce}
                    />
                  {/each}
                </div>

                <InfiniteScroll
                  onLoadMore={loadMoreRecipes}
                  loading={loadingMoreRecipes}
                  hasMore={hasMoreRecipes}
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

                <!-- Missing employees indicator and auto-assign button -->
                {#if machines.length > 0}
                  <div class="flex flex-wrap items-center gap-3 mt-3">
                    {#if machineStats.missingEmployees > 0}
                      <div
                        class="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg"
                      >
                        <span class="text-amber-400">⚠️</span>
                        <span class="text-xs text-amber-300 font-medium">
                          <span class="font-bold"
                            >{machineStats.missingEmployees}</span
                          >
                          employé(s) manquant(s) pour production optimale
                        </span>
                      </div>
                    {:else}
                      <div
                        class="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
                      >
                        <span class="text-emerald-400">✅</span>
                        <span class="text-xs text-emerald-300 font-medium">
                          Toutes les machines sont optimales
                        </span>
                      </div>
                    {/if}

                    {#if availableEmployees.length > 0 && machineStats.missingEmployees > 0}
                      <button
                        onclick={autoAssignEmployees}
                        disabled={isAutoAssigning}
                        class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-wait text-white text-sm font-bold rounded-lg transition-all shadow-md hover:shadow-indigo-500/25"
                      >
                        {#if isAutoAssigning}
                          <span
                            class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                          ></span>
                          <span>Assignation...</span>
                        {:else}
                          <span>🎯</span>
                          <span
                            >Auto-assigner ({Math.min(
                              availableEmployees.length,
                              machineStats.missingEmployees
                            )})</span
                          >
                        {/if}
                      </button>
                    {/if}

                    <span class="text-[10px] text-slate-500 font-medium">
                      {availableEmployees.length} employé(s) disponible(s)
                    </span>
                  </div>
                {/if}
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

            {#if availableMachineStock.length > 0}
              <div
                class="mb-6 p-5 bg-linear-to-r from-slate-900 to-slate-800 border border-indigo-500/20 rounded-xl shadow-lg relative overflow-hidden"
              >
                <div class="absolute top-0 right-0 p-3 opacity-10">
                  <span class="text-6xl">🏭</span>
                </div>
                <div
                  class="flex items-center justify-between mb-4 relative z-10"
                >
                  <div
                    class="text-base text-white font-bold flex items-center gap-2"
                  >
                    <span
                      class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
                    ></span>
                    Machines en stock ({availableMachineStock.length})
                  </div>
                  <div
                    class="text-xs text-slate-400 font-medium bg-slate-950/50 px-3 py-1 rounded-full border border-slate-700"
                  >
                    Cliquez pour installer
                  </div>
                </div>
                <div class="flex flex-wrap gap-2 relative z-10">
                  {#each availableMachineStock as inv (inv.id)}
                    <button
                      class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold rounded-lg border border-indigo-400/30 transition-all shadow-md hover:shadow-indigo-500/20 flex items-center gap-2"
                      onclick={() => assignMachineFromStock(inv.item)}
                    >
                      <span>🏗️</span>
                      {inv.expand?.item?.name || "Machine"}
                      <span
                        class="bg-black/20 px-1.5 py-0.5 rounded text-xs ml-1"
                        >x{inv.quantity}</span
                      >
                    </button>
                  {/each}
                </div>
              </div>
            {/if}

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
                      allEmployees={employees}
                      {busyEmployeeIds}
                      {energyStatus}
                      onDelete={handleMachineDelete}
                    />
                  {/each}
                </div>

                <InfiniteScroll
                  onLoadMore={loadMoreMachines}
                  loading={loadingMoreMachines}
                  hasMore={hasMoreMachines}
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
