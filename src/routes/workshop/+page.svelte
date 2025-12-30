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
        !outputName.toLowerCase().includes(recipeSearchQuery.toLowerCase())
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
    new Set(machines.flatMap((m) => m.employees || []))
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

  async function loadData(silent = false) {
    if (!silent) loading = true;
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
        (inv) => inv.expand?.item?.type === "Machine" && (inv.quantity || 0) > 0
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
    loadData(true);
  }

  function handleMachineUpdate() {
    // No need for explicit loadData call as subscription will handle it,
    // but we can call it silently to be sure
    loadData(true);
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
      // loadData(true) will be called by subscription
    } catch (err: any) {
      notifications.error(err?.message || "Erreur lors de l'assignation");
    }
  }

  let unsubscribeInventory: () => void;
  let unsubscribeMachines: () => void;

  async function subscribeToData() {
    if (unsubscribeInventory) unsubscribeInventory();
    if (unsubscribeMachines) unsubscribeMachines();

    try {
      // Inventory Subscription
      unsubscribeInventory = await pb
        .collection("inventory")
        .subscribe("*", async ({ action, record }) => {
          if (record.company !== $activeCompany?.id) return;

          if (action === "create" || action === "update") {
            const updatedRecord = await pb
              .collection("inventory")
              .getOne<InventoryItem>(record.id, {
                expand: "item",
              });

            const index = inventory.findIndex((i) => i.id === record.id);
            if (index > -1) {
              inventory[index] = updatedRecord;
            } else {
              inventory.push(updatedRecord);
            }
          } else if (action === "delete") {
            inventory = inventory.filter((i) => i.id !== record.id);
          }

          availableMachineStock = inventory.filter(
            (inv) =>
              inv.expand?.item?.type === "Machine" && (inv.quantity || 0) > 0
          );

          if (dashboardData) {
            dashboardData.resources.inventory_count = inventory.length;
          }
        });

      // Machines Subscription
      unsubscribeMachines = await pb
        .collection("machines")
        .subscribe<Machine>("*", async ({ action, record }) => {
          if (record.company !== $activeCompany?.id) return;

          if (action === "create" || action === "update") {
            // Fetch full record with expansion
            const updatedMachine = await pb
              .collection("machines")
              .getOne<Machine>(record.id, {
                expand: "machine.product,employees",
                requestKey: null,
              });

            const index = machines.findIndex((m) => m.id === record.id);
            if (index > -1) {
              machines[index] = updatedMachine;
            } else {
              machines = [...machines, updatedMachine];
            }
          } else if (action === "delete") {
            machines = machines.filter((m) => m.id !== record.id);
          }

          // Also trigger a silent dashboard data refresh if machines change
          // as it might impact stats
          fetchDashboardData(pb.authStore?.record?.id as string).then(
            (data) => {
              dashboardData = data;
            }
          );
        });
    } catch (err) {
      console.error("Failed to subscribe to data", err);
    }
  }

  onDestroy(() => {
    if (unsubscribeInventory) unsubscribeInventory();
    if (unsubscribeMachines) unsubscribeMachines();
  });

  $effect(() => {
    if ($activeCompany) {
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
                  > recette(s)
                </p>
              </div>
            </div>

            {#if recipes.length === 0}
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
                />
                <div class="mt-3 text-xs text-slate-500 font-medium text-right">
                  Affichage de {filteredRecipes.length} sur {recipes.length} recettes
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <section
          transition:fade={{ duration: 200 }}
          class="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div class="space-y-6">
            <div>
              <h2 class="text-xl font-bold text-white mb-2">
                Gestion des machines
              </h2>
              <p class="text-sm text-slate-400">
                Assignez des employés et configurez les recettes à produire
                automatiquement.
              </p>
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

            {#if machines.length === 0}
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
                class="mb-6"
              />

              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
