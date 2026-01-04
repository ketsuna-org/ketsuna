<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade, slide, scale } from "svelte/transition";
  import pb from "$lib/pocketbase";
  import { notifications } from "$lib/notifications";
  import { activeCompany } from "$lib/stores";
  import type { Item, Company, Employee } from "$lib/pocketbase";
  import FilterBar from "$lib/components/FilterBar.svelte";
  import DepositCard from "$lib/components/DepositCard.svelte";
  import {
    type Exploration,
    type Deposit,
    startExploration,
    getExplorations,
    getDeposits,
  } from "$lib/services/exploration";

  let loading = $state(true);
  let explorableItems = $state<Item[]>([]);
  let activeExplorations = $state<Exploration[]>([]);
  let myDeposits = $state<Deposit[]>([]);
  let availableEmployees = $state<Employee[]>([]);
  let depositEmployees = $state<Record<string, Employee[]>>({}); // employeesById[depositId]
  let selectedTab = $state<"explore" | "deposits">("explore");

  // Filter states
  let searchQuery = $state("");
  let selectedFilters = $state<Record<string, string>>({});

  // Confirm Modal State
  let confirmItem = $state<Item | null>(null);

  // Timer for countdowns
  let now = $state(new Date());
  let timerInterval: any;

  // Constants
  const EXPLORATION_COST = 5000;

  async function loadData() {
    if (!$activeCompany) return;
    loading = true;
    try {
      // 1. Load explorable items (Catalog)
      // Note: User must add 'is_explorable' (bool) to items collection
      const itemsResult = await pb.collection("items").getList<Item>(1, 50, {
        filter: `is_explorable = true`,
        sort: "name",
      });
      // Client-side search because list is small (max 50 explorables usually)
      explorableItems = itemsResult.items;

      // 2. Load active explorations
      activeExplorations = await getExplorations();

      // 3. Load deposits
      myDeposits = await getDeposits($activeCompany.id);

      // 4. Load all employees for assignment
      const allEmployees = await pb
        .collection("employees")
        .getFullList<Employee>({
          filter: `employer = "${$activeCompany.id}"`,
        });

      // 5. Load all machines to check employee assignments (single query instead of N queries)
      const allMachines = await pb.collection("machines").getFullList({
        filter: `company = "${$activeCompany.id}"`,
      });

      // Build set of busy employee IDs (assigned to machines)
      const busyEmployeeIds = new Set<string>();
      for (const machine of allMachines) {
        const empIds = (machine.employees as string[]) || [];
        for (const id of empIds) {
          busyEmployeeIds.add(id);
        }
      }

      // Group employees by deposit
      const byDeposit: Record<string, Employee[]> = {};
      const available: Employee[] = [];

      for (const emp of allEmployees) {
        if (emp.deposit) {
          if (!byDeposit[emp.deposit]) byDeposit[emp.deposit] = [];
          byDeposit[emp.deposit].push(emp);
        } else if (!emp.exploration && !busyEmployeeIds.has(emp.id)) {
          // Not assigned to deposit, exploration, or machine
          available.push(emp);
        }
      }

      depositEmployees = byDeposit;
      availableEmployees = available;
    } catch (err) {
      console.error("Failed to load exploration data", err);
      notifications.error("Erreur de chargement des données");
    } finally {
      loading = false;
    }
  }

  /* Filter Logic handled in template or derived state */
  let filteredItems = $derived(
    explorableItems.filter((item) => {
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    })
  );

  async function handleStartExploration() {
    if (!confirmItem || !$activeCompany) return;

    const item = confirmItem;
    confirmItem = null; // Close modal immediately

    if ($activeCompany.balance < EXPLORATION_COST) {
      notifications.error("Fonds insuffisants pour lancer l'exploration");
      return;
    }

    try {
      await startExploration(item.id);
      notifications.success(`Exploration pour ${item.name} lancée !`);
      // Refresh data
      activeExplorations = await getExplorations();
      // Force reload balance?
      const updatedCompany = await pb
        .collection("companies")
        .getOne($activeCompany.id);
      activeCompany.set(updatedCompany as unknown as Company);
    } catch (err: any) {
      notifications.error(err.message || "Echec du lancement");
    }
  }

  function getTimeRemaining(endTimeStr: string): string {
    const end = new Date(endTimeStr).getTime();
    const current = now.getTime();
    const diff = end - current;

    if (diff <= 0) return "Terminé";

    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  onMount(() => {
    loadData();
    timerInterval = setInterval(() => {
      now = new Date();

      // Check if any exploration is finished locally but still in list
      const hasFinishedLooking = activeExplorations.some(
        (exp) => new Date(exp.end_time).getTime() - now.getTime() <= 0
      );
      if (hasFinishedLooking) {
        // Poll faster to get result (every ~3s on average)
        if (Math.random() > 0.7) loadData();
      }
    }, 1000);
  });

  onDestroy(() => {
    if (timerInterval) clearInterval(timerInterval);
  });
</script>

<svelte:head>
  <title>Exploration | Ketsuna: Iron Symphony</title>
</svelte:head>

<div
  class="container mx-auto px-4 py-6 max-w-7xl animate-in fade-in duration-500"
>
  <!-- Top Bar with Filter -->
  <div
    class="mb-8 flex flex-col md:flex-row gap-6 justify-between items-end md:items-center"
  >
    <div>
      <h1 class="text-3xl font-bold text-white flex items-center gap-3">
        <span class="p-2 bg-amber-500/10 rounded-xl text-amber-500">🔭</span>
        Exploration
      </h1>
      <p class="text-slate-400 mt-1 ml-14">
        Découvrez de nouveaux gisements de ressources
      </p>
    </div>

    <div
      class="flex items-center gap-4 bg-slate-900/50 p-2 rounded-xl border border-slate-700/50"
    >
      <div class="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700">
        <span class="text-xs text-slate-400 uppercase font-bold block mb-0.5"
          >Coût Mission</span
        >
        <span class="text-lg font-mono font-bold text-amber-400"
          >{EXPLORATION_COST.toLocaleString()} €</span
        >
      </div>
      <div class="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700">
        <span class="text-xs text-slate-400 uppercase font-bold block mb-0.5"
          >Budget Actuel</span
        >
        <span class="text-lg font-mono font-bold text-white"
          >{$activeCompany?.balance?.toLocaleString() ?? 0} €</span
        >
      </div>
    </div>
  </div>

  <!-- Tab Navigation -->
  <div class="mb-6 border-b border-slate-800">
    <div class="flex gap-6">
      <button
        onclick={() => (selectedTab = "explore")}
        class="pb-4 px-2 text-sm font-bold border-b-2 transition-colors relative {selectedTab ===
        'explore'
          ? 'text-amber-400 border-amber-400'
          : 'text-slate-400 border-transparent hover:text-white'}"
      >
        Missions
        {#if activeExplorations.length > 0}
          <span
            class="absolute -top-1 -right-3 w-5 h-5 bg-amber-500 text-black text-[10px] flex items-center justify-center rounded-full animate-pulse"
            >{activeExplorations.length}</span
          >
        {/if}
      </button>

      <button
        onclick={() => (selectedTab = "deposits")}
        class="pb-4 px-2 text-sm font-bold border-b-2 transition-colors {selectedTab ===
        'deposits'
          ? 'text-emerald-400 border-emerald-400'
          : 'text-slate-400 border-transparent hover:text-white'}"
      >
        Mes Gisements
        <span
          class="ml-2 px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-xs"
          >{myDeposits.length}</span
        >
      </button>
    </div>
  </div>

  {#if loading}
    <div class="flex justify-center py-20">
      <div
        class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"
      ></div>
    </div>
  {:else if selectedTab === "explore"}
    <!-- Active Explorations Section -->
    {#if activeExplorations.length > 0}
      <div class="mb-8">
        <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span class="w-1.5 h-6 bg-amber-500 rounded-full"></span>
          En cours
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each activeExplorations as exp (exp.id)}
            {@const timeLeft = getTimeRemaining(exp.end_time)}
            <div
              class="bg-slate-800 rounded-xl p-4 border border-slate-700 relative overflow-hidden group"
            >
              <!-- Progress Bar Background (Optional) -->
              <div class="absolute bottom-0 left-0 h-1 bg-amber-500/20 w-full">
                <!-- Can simulate progress if we had start_time -->
                <div
                  class="h-full bg-amber-500 animate-pulse w-full origin-left"
                ></div>
              </div>

              <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-3">
                  <div
                    class="p-2 bg-slate-900 rounded-lg text-amber-400 border border-slate-800"
                  >
                    🚀
                  </div>
                  <h3 class="font-bold text-white">
                    {exp.expand?.target_resource.name}
                  </h3>
                </div>
                <span
                  class="text-xs font-mono font-bold {timeLeft === 'Terminé'
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-amber-400 bg-amber-500/10'} px-2 py-1 rounded"
                >
                  {timeLeft}
                </span>
              </div>
              <p class="text-xs text-slate-400 pl-14">
                {timeLeft === "Terminé"
                  ? "Analyse des données en cours..."
                  : "Recherche de gisement en cours..."}
              </p>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Search/Filter -->
    <FilterBar
      bind:searchQuery
      filters={[]}
      bind:selectedFilters
      onFilterChange={() => {}}
      placeholder="Rechercher une ressource..."
    />

    <!-- Mission Catalog -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
      {#each filteredItems as item (item.id)}
        <div
          class="bg-slate-800 hover:bg-slate-750 transition-colors p-5 rounded-xl border border-slate-700 flex flex-col group relative overflow-hidden"
        >
          <div
            class="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-10 transition-opacity"
          >
            <span class="text-6xl">🔭</span>
          </div>

          <div class="flex-1">
            <div
              class="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-2xl mb-4 border border-slate-800 shadow-sm group-hover:scale-110 transition-transform"
            >
              💎
            </div>
            <h3 class="text-lg font-bold text-white mb-1">{item.name}</h3>
            <p
              class="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-4"
            >
              Ressource Brute
            </p>
          </div>

          <button
            onclick={() => (confirmItem = item)}
            class="w-full py-3 bg-slate-900 hover:bg-amber-500 hover:text-black text-slate-300 font-bold rounded-lg border border-slate-700 hover:border-amber-400 transition-all flex items-center justify-center gap-2"
          >
            <span>Lancer Mission</span>
          </button>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Deposits List -->
    {#if myDeposits.length === 0}
      <div
        class="flex flex-col items-center justify-center py-20 text-center opacity-70"
      >
        <span class="text-6xl mb-4">🗺️</span>
        <h3 class="text-xl font-bold text-white">Aucun gisement découvert</h3>
        <p class="text-slate-400 mt-2 max-w-sm">
          Les gisements vous permettent d'extraire des ressources brutes
          massivement.
        </p>
        <button
          class="mt-6 text-amber-400 hover:underline"
          onclick={() => (selectedTab = "explore")}>Explorer des zones</button
        >
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each myDeposits as deposit (deposit.id)}
          <DepositCard
            {deposit}
            {availableEmployees}
            assignedEmployees={depositEmployees[deposit.id] || []}
            onUpdate={loadData}
          />
        {/each}
      </div>
    {/if}
  {/if}

  <!-- MODAL DE CONFIRMATION -->
  {#if confirmItem}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      transition:fade={{ duration: 150 }}
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/80 backdrop-blur-sm focus:outline-none"
        role="button"
        tabindex="0"
        onclick={() => (confirmItem = null)}
        onkeydown={(e) => {
          if (e.key === "Escape" || e.key === "Enter" || e.key === " ")
            confirmItem = null;
        }}
        aria-label="Fermer la modale"
      ></div>

      <!-- Modal Content -->
      <div
        class="relative bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md p-6"
        transition:scale={{ start: 0.95, duration: 200 }}
      >
        <h2 class="text-xl font-bold text-white mb-2">
          Confirmer l'exploration
        </h2>
        <p class="text-slate-400 text-sm mb-6">
          Voulez-vous envoyer une équipe explorer le secteur pour trouver du <strong
            class="text-white">{confirmItem.name}</strong
          > ?
        </p>

        <div
          class="bg-slate-900/50 rounded-xl p-4 mb-8 border border-slate-700/50"
        >
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-slate-400">Coût estimé</span>
            <span class="text-amber-400 font-mono font-bold"
              >{EXPLORATION_COST.toLocaleString()} €</span
            >
          </div>
          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-500">Solde après opération</span>
            <span
              class="font-mono {($activeCompany?.balance ?? 0) -
                EXPLORATION_COST <
              0
                ? 'text-red-400'
                : 'text-slate-300'}"
            >
              {Math.max(
                0,
                ($activeCompany?.balance ?? 0) - EXPLORATION_COST
              ).toLocaleString()} €
            </span>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            onclick={() => (confirmItem = null)}
            class="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onclick={handleStartExploration}
            class="flex-1 py-2.5 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
          >
            Lancer Mission
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
