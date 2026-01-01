<script lang="ts">
  import { activeCompany, currentUser } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import type { Company, Employee, Machine } from "$lib/pocketbase";
  import { onMount } from "svelte";
  import { fade, slide } from "svelte/transition";
  import {
    hireRandomEmployee,
    getHireCostPreview,
    type HireCostPreview,
  } from "$lib/services/employee";
  import EmployeeCard from "$lib/components/EmployeeCard.svelte";
  import DeleteConfirmation from "$lib/components/DeleteConfirmation.svelte";
  import FilterBar from "$lib/components/FilterBar.svelte";
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { notifications } from "$lib/notifications";

  const PER_PAGE = 20;

  let employees = $state<Employee[]>([]);
  let machines = $state<Machine[]>([]);
  let loading = $state(true);
  let loadingMore = $state(false);
  let hiring = $state(false);
  let hireQuantity = $state(1);
  let costPreview = $state<HireCostPreview | null>(null);
  let currentPage = $state(1);
  let hasMore = $state(true);
  let totalItems = $state(0);

  // Real rarity counts from database (not just loaded employees)
  let rarityCounts = $state<Record<string, number>>({
    "0": 0,
    "1": 0,
    "2": 0,
    "3": 0,
  });

  // Collapsible state (collapsed by default)
  let isListExpanded = $state(false);

  // Bulk fire state
  let bulkFireRarity = $state<string>("");
  let showBulkFireConfirm = $state(false);
  let bulkFiring = $state(false);

  // Filter states
  let searchQuery = $state("");
  let selectedFilters = $state<Record<string, string>>({});

  const employeeFilters = [
    {
      label: "Tous les postes",
      value: "poste",
      options: [
        { label: "Ouvrier", value: "Ouvrier" },
        { label: "Technicien", value: "Technicien" },
        { label: "Ingénieur", value: "Ingénieur" },
        { label: "Superviseur", value: "Superviseur" },
        { label: "Manutentionnaire", value: "Manutentionnaire" },
        { label: "Opérateur", value: "Opérateur" },
        { label: "Analyste", value: "Analyste" },
        { label: "Logisticien", value: "Logisticien" },
        { label: "Contremaître", value: "Contremaître" },
        { label: "Directeur", value: "Directeur" },
      ],
    },
    {
      label: "Toutes raretés",
      value: "rarity",
      options: [
        { label: "Common", value: "0" },
        { label: "Rare", value: "1" },
        { label: "Epic", value: "2" },
        { label: "Legendary", value: "3" },
      ],
    },
  ];

  const rarityLabels: Record<string, { label: string; color: string }> = {
    "0": { label: "Common", color: "text-slate-400" },
    "1": { label: "Rare", color: "text-blue-400" },
    "2": { label: "Epic", color: "text-purple-400" },
    "3": { label: "Legendary", color: "text-amber-400" },
  };

  // Stats derived from loaded employees
  let employeeStats = $derived.by(() => {
    const stats = {
      totalSalary: 0,
      avgEfficiency: 0,
      byRarity: { "0": 0, "1": 0, "2": 0, "3": 0 } as Record<string, number>,
    };
    if (employees.length === 0) return stats;

    let totalEff = 0;
    for (const emp of employees) {
      stats.totalSalary += emp.salary || 0;
      totalEff += emp.efficiency || 1;
      stats.byRarity[String(emp.rarity)] =
        (stats.byRarity[String(emp.rarity)] || 0) + 1;
    }
    stats.avgEfficiency = totalEff / employees.length;
    return stats;
  });

  // Count employees to bulk fire (use real DB counts, not just loaded employees)
  let bulkFireCount = $derived(
    bulkFireRarity ? rarityCounts[bulkFireRarity] || 0 : 0
  );

  // Build PocketBase filter string from current filters
  function buildFilterString(): string {
    if (!$activeCompany) return "";

    const parts: string[] = [`employer = "${$activeCompany.id}"`];

    if (searchQuery.trim()) {
      parts.push(`name ~ "${searchQuery.trim()}"`);
    }
    if (selectedFilters.poste) {
      parts.push(`poste = "${selectedFilters.poste}"`);
    }
    if (selectedFilters.rarity) {
      parts.push(`rarity = ${selectedFilters.rarity}`);
    }

    return parts.join(" && ");
  }

  // Map employeeId -> machineName
  let employeeToMachine = $derived.by(() => {
    const map = new Map<string, string>();
    for (const machine of machines) {
      const machineName = machine.expand?.machine?.name || "Machine";
      for (const empId of machine.employees || []) {
        map.set(empId, machineName);
      }
    }
    return map;
  });

  // Derived state from URL
  let showDeleteModal = $derived(
    $page.url.searchParams.get("state") === "delete"
  );
  let deleteId = $derived($page.url.searchParams.get("id"));
  let employeeToDelete = $derived(employees.find((e) => e.id === deleteId));

  async function handleHire() {
    if (!$activeCompany) return;
    hiring = true;
    try {
      const result = await hireRandomEmployee($activeCompany, hireQuantity);
      employees = [...result.records, ...employees];
      totalItems += result.hiredCount;
      const updated = await pb
        .collection("companies")
        .getOne<Company>($activeCompany.id);
      activeCompany.set(updated);

      notifications.success(
        `${result.hiredCount} employé(s) recruté(s) pour ${result.totalCost}€`
      );
    } catch (e: any) {
      notifications.error(e.message);
    } finally {
      hiring = false;
    }
  }

  function requestFire(id: string) {
    goto(`?state=delete&id=${id}`);
  }

  function cancelFire() {
    goto("/employees");
  }

  async function confirmFire() {
    if (!employeeToDelete || !$activeCompany) return;

    try {
      await pb.collection("employees").delete(employeeToDelete.id);
      employees = employees.filter((e) => e.id !== employeeToDelete?.id);
      totalItems = Math.max(0, totalItems - 1);

      const updated = await pb
        .collection("companies")
        .getOne<Company>($activeCompany.id);
      activeCompany.set(updated);

      goto("/employees");
      notifications.success("Contrat résilié avec succès.");
    } catch (e: any) {
      notifications.error("Erreur lors du licenciement: " + e.message);
    }
  }

  async function handleBulkFire() {
    if (!bulkFireRarity || !$activeCompany || bulkFireCount === 0) return;

    bulkFiring = true;
    try {
      // Get all employees of this rarity
      const toFire = await pb.collection("employees").getFullList<Employee>({
        filter: `employer = "${$activeCompany.id}" && rarity = ${bulkFireRarity}`,
        requestKey: null,
      });

      // Delete them one by one
      let deleted = 0;
      for (const emp of toFire) {
        try {
          await pb.collection("employees").delete(emp.id);
          deleted++;
        } catch (e) {
          console.error("Failed to delete", emp.id, e);
        }
      }

      // Update local state
      employees = employees.filter((e) => String(e.rarity) !== bulkFireRarity);
      totalItems = Math.max(0, totalItems - deleted);

      const updated = await pb
        .collection("companies")
        .getOne<Company>($activeCompany.id);
      activeCompany.set(updated);

      notifications.success(`${deleted} employé(s) licencié(s)`);
      showBulkFireConfirm = false;
      bulkFireRarity = "";
    } catch (e: any) {
      notifications.error("Erreur: " + e.message);
    } finally {
      bulkFiring = false;
    }
  }

  async function loadEmployees(page: number = 1, append: boolean = false) {
    if (!$activeCompany) return;

    if (page === 1) {
      loading = true;
    } else {
      loadingMore = true;
    }

    try {
      const filter = buildFilterString();

      // On first page, also fetch total counts per rarity for accurate bulk fire counts
      const rarityCountPromises =
        page === 1
          ? ["0", "1", "2", "3"].map((rarity) =>
              pb
                .collection("employees")
                .getList<Employee>(1, 1, {
                  filter: `employer = "${$activeCompany!.id}" && rarity = ${rarity}`,
                  requestKey: null,
                })
                .then((res) => ({ rarity, count: res.totalItems }))
            )
          : [];

      const [empResult, machineResult, preview, ...rarityResults] =
        await Promise.all([
          pb.collection("employees").getList<Employee>(page, PER_PAGE, {
            filter,
            sort: "-efficiency",
            requestKey: null,
          }),
          page === 1
            ? pb.collection("machines").getList<Machine>(1, 100, {
                filter: `company = "${$activeCompany.id}"`,
                expand: "machine",
                requestKey: null,
              })
            : Promise.resolve(null),
          page === 1 ? getHireCostPreview() : Promise.resolve(null),
          ...rarityCountPromises,
        ]);

      if (append) {
        employees = [...employees, ...empResult.items];
      } else {
        employees = empResult.items;
      }

      if (machineResult) {
        machines = machineResult.items;
      }
      if (preview) {
        costPreview = preview;
      }

      // Update rarity counts from DB results
      if (rarityResults.length > 0) {
        const newCounts: Record<string, number> = {
          "0": 0,
          "1": 0,
          "2": 0,
          "3": 0,
        };
        for (const res of rarityResults) {
          newCounts[res.rarity] = res.count;
        }
        rarityCounts = newCounts;
      }

      totalItems = empResult.totalItems;
      hasMore = empResult.page < empResult.totalPages;
      currentPage = empResult.page;
    } catch (e) {
      console.error("Failed to load employees", e);
    } finally {
      loading = false;
      loadingMore = false;
    }
  }

  function handleFilterChange(filters: {
    searchQuery: string;
    selectedFilters: Record<string, string>;
  }) {
    searchQuery = filters.searchQuery;
    selectedFilters = filters.selectedFilters;
    currentPage = 1;
    hasMore = true;
    loadEmployees(1, false);
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    await loadEmployees(currentPage + 1, true);
  }

  // Reload when company changes
  $effect(() => {
    if ($activeCompany) {
      currentPage = 1;
      hasMore = true;
      loadEmployees(1, false);
    }
  });
</script>

<div class="min-h-screen bg-slate-950 text-slate-200 p-6">
  <div class="max-w-7xl mx-auto space-y-8">
    <!-- Header with Bulk Hire Controls -->
    <div
      class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
    >
      <div class="flex items-center gap-4">
        <h1
          class="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3"
        >
          <span class="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
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
              ><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
              ></path><circle cx="9" cy="7" r="4"></circle><path
                d="M23 21v-2a4 4 0 0 0-3-3.87"
              ></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg
            >
          </span>
          Ressources Humaines
        </h1>
      </div>

      <div
        class="flex items-center gap-4 bg-slate-900/80 p-2 rounded-2xl border border-slate-800 shadow-lg backdrop-blur-sm"
      >
        {#if costPreview}
          <div
            class="text-xs text-slate-400 text-right hidden lg:block px-2 border-r border-slate-700/50 mr-2"
          >
            <div class="font-medium text-slate-300">
              Coût moyen: ~{costPreview.averageHiringFee}€
            </div>
            <div class="text-[10px] text-slate-500">
              Réserve: ~{costPreview.averageReserveNeeded}€
            </div>
          </div>
        {/if}

        <div
          class="flex items-center gap-1 bg-slate-950 rounded-xl p-1 border border-slate-800"
        >
          {#each [1, 5, 10, 25] as qty}
            <button
              onclick={() => (hireQuantity = qty)}
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all {hireQuantity ===
              qty
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'}"
            >
              {qty}
            </button>
          {/each}
        </div>

        <button
          onclick={handleHire}
          disabled={hiring}
          class="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-wait text-white font-bold py-2 px-5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 flex items-center gap-2"
        >
          {#if hiring}
            <span
              class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
            ></span>
            <span>Recrutement...</span>
          {:else}
            <span>🤝</span>
            <span>Recruter {hireQuantity}</span>
          {/if}
        </button>
      </div>
    </div>

    {#if loading}
      <div class="flex flex-col items-center justify-center py-20">
        <div class="relative w-16 h-16">
          <div
            class="absolute top-0 left-0 w-full h-full border-4 border-slate-700 rounded-full"
          ></div>
          <div
            class="absolute top-0 left-0 w-full h-full border-4 border-indigo-500 rounded-full animate-spin border-t-transparent"
          ></div>
        </div>
        <p class="mt-6 text-slate-400 font-medium animate-pulse">
          Chargement du personnel...
        </p>
      </div>
    {:else if totalItems === 0 && !searchQuery && Object.keys(selectedFilters).filter((k) => selectedFilters[k]).length === 0}
      <div
        class="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800 border-dashed"
      >
        <span class="text-4xl block mb-4">👥</span>
        <p class="text-xl font-bold text-white mb-2">Aucun employé</p>
        <p class="text-sm text-slate-400 max-w-md mx-auto">
          Votre entreprise tourne à vide. Recrutez du personnel pour commencer
          la production et faire grandir votre empire.
        </p>
      </div>
    {:else}
      <!-- Stats Summary Card -->
      <div class="bg-slate-900/50 rounded-2xl border border-slate-800 p-5">
        <div class="flex flex-col lg:flex-row justify-between gap-6">
          <!-- Stats -->
          <div class="flex flex-wrap gap-6">
            <div>
              <p class="text-[10px] text-slate-500 font-bold uppercase mb-1">
                Effectif total
              </p>
              <p class="text-2xl font-black text-white">{totalItems}</p>
            </div>
            <div>
              <p class="text-[10px] text-slate-500 font-bold uppercase mb-1">
                Salaires / jour
              </p>
              <p class="text-2xl font-black text-red-400">
                {employeeStats.totalSalary.toLocaleString()}€
              </p>
            </div>
            <div>
              <p class="text-[10px] text-slate-500 font-bold uppercase mb-1">
                Efficacité moy.
              </p>
              <p class="text-2xl font-black text-emerald-400">
                {employeeStats.avgEfficiency.toFixed(1)}%
              </p>
            </div>
            <div class="flex gap-3 items-end">
              {#each Object.entries(rarityCounts) as [rarity, count]}
                {#if count > 0}
                  <div class="text-center">
                    <p
                      class="text-lg font-black {rarityLabels[rarity]?.color ||
                        'text-slate-400'}"
                    >
                      {count}
                    </p>
                    <p class="text-[10px] text-slate-500">
                      {rarityLabels[rarity]?.label}
                    </p>
                  </div>
                {/if}
              {/each}
            </div>
          </div>

          <!-- Bulk Fire Section -->
          <div
            class="flex items-center gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800"
          >
            <select
              bind:value={bulkFireRarity}
              class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
            >
              <option value="">Licencier par rareté...</option>
              {#each Object.entries(rarityLabels) as [value, info]}
                {#if rarityCounts[value] > 0}
                  <option {value}>{info.label} ({rarityCounts[value]})</option>
                {/if}
              {/each}
            </select>
            <button
              onclick={() => (showBulkFireConfirm = true)}
              disabled={!bulkFireRarity || bulkFireCount === 0}
              class="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold rounded-lg border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center gap-2"
            >
              🔥 Licencier {bulkFireCount > 0 ? `(${bulkFireCount})` : ""}
            </button>
          </div>
        </div>

        <!-- Expand/Collapse Toggle -->
        <button
          onclick={() => (isListExpanded = !isListExpanded)}
          class="mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          {#if isListExpanded}
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
              ><polyline points="18 15 12 9 6 15"></polyline></svg
            >
            Masquer la liste des employés
          {:else}
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
              ><polyline points="6 9 12 15 18 9"></polyline></svg
            >
            Afficher la liste ({totalItems} employés)
          {/if}
        </button>
      </div>

      <!-- Collapsible Employee List -->
      {#if isListExpanded}
        <div transition:slide={{ duration: 300 }}>
          <!-- Filter Bar & Stats -->
          <div
            class="flex flex-col md:flex-row justify-between items-end gap-4 mb-6"
          >
            <div class="w-full md:w-auto flex-1">
              <FilterBar
                bind:searchQuery
                placeholder="Rechercher un employé..."
                filters={employeeFilters}
                bind:selectedFilters
                onFilterChange={handleFilterChange}
              />
            </div>
            <div
              class="text-sm font-bold text-slate-400 px-3 py-2 bg-slate-900/50 rounded-xl border border-slate-800"
            >
              <span class="text-white">{employees.length}</span>
              <span class="text-slate-500 font-normal"
                >/ {totalItems} employés</span
              >
            </div>
          </div>

          {#if employees.length === 0}
            <div
              class="text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-800"
            >
              <span class="text-3xl block mb-3">🔍</span>
              <p class="text-lg font-bold text-white mb-1">Aucun résultat</p>
              <p class="text-sm text-slate-400">
                Aucun employé ne correspond à vos critères de recherche.
              </p>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {#each employees as emp (emp.id)}
                <EmployeeCard
                  employee={emp}
                  onfire={requestFire}
                  assignedMachine={employeeToMachine.get(emp.id) || null}
                />
              {/each}
            </div>

            <InfiniteScroll
              onLoadMore={loadMore}
              loading={loadingMore}
              {hasMore}
            />
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</div>

{#if showDeleteModal && employeeToDelete}
  <DeleteConfirmation
    title="Licenciement"
    message={`Voulez-vous vraiment licencier <strong>${employeeToDelete.name}</strong> ? Cette action est irréversible.`}
    confirmText="Licencier"
    onConfirm={confirmFire}
    onCancel={cancelFire}
  />
{/if}

{#if showBulkFireConfirm && bulkFireRarity}
  <DeleteConfirmation
    title="Licenciement groupé"
    message={`Voulez-vous vraiment licencier <strong>tous les ${bulkFireCount} employés ${rarityLabels[bulkFireRarity]?.label}</strong> ? Cette action est irréversible.`}
    confirmText={bulkFiring ? "En cours..." : `Licencier ${bulkFireCount}`}
    onConfirm={handleBulkFire}
    onCancel={() => (showBulkFireConfirm = false)}
  />
{/if}
