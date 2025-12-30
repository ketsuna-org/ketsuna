<script lang="ts">
  import { activeCompany, currentUser } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import type { Company, Employee, Machine } from "$lib/types";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import {
    hireRandomEmployee,
    getHireCostPreview,
    type HireCostPreview,
  } from "$lib/services/employee";
  import EmployeeCard from "$lib/components/EmployeeCard.svelte";
  import DeleteConfirmation from "$lib/components/DeleteConfirmation.svelte";
  import FilterBar from "$lib/components/FilterBar.svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { notifications } from "$lib/notifications";

  let employees = $state<Employee[]>([]);
  let machines = $state<Machine[]>([]);
  let loading = $state(true);
  let hiring = $state(false);
  let hireQuantity = $state(1);
  let costPreview = $state<HireCostPreview | null>(null);

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

  // Filtered employees based on search and filters
  let filteredEmployees = $derived.by(() => {
    return employees.filter((emp) => {
      // Search filter
      if (
        searchQuery &&
        !emp.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      // Poste filter
      if (selectedFilters.poste && emp.poste !== selectedFilters.poste) {
        return false;
      }
      // Rarity filter
      if (
        selectedFilters.rarity &&
        emp.rarity.toString() !== selectedFilters.rarity
      ) {
        return false;
      }
      return true;
    });
  });

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
      // Refresh active company to show new balance
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

      // Decrease payroll in company (reload to be safe)
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

  async function loadEmployees() {
    if (!$activeCompany) return;
    loading = true;
    try {
      const [empResult, machineResult, preview] = await Promise.all([
        pb.collection("employees").getList<Employee>(1, 50, {
          filter: `employer = "${$activeCompany.id}"`,
          sort: "-efficiency",
        }),
        pb.collection("machines").getList<Machine>(1, 100, {
          filter: `company = "${$activeCompany.id}"`,
          expand: "machine",
        }),
        getHireCostPreview(),
      ]);
      employees = empResult.items;
      machines = machineResult.items;
      costPreview = preview;
    } catch (e) {
      console.error("Failed to load employees", e);
    } finally {
      loading = false;
    }
  }

  // Reload when company changes (e.g. init)
  $effect(() => {
    if ($activeCompany) {
      loadEmployees();
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
        <!-- Cost Preview Info -->
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

        <!-- Quantity Selector -->
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

        <!-- Hire Button -->
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
    {:else if employees.length === 0}
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
      <!-- Filter Bar & Stats -->
      <div class="flex flex-col md:flex-row justify-between items-end gap-4">
        <div class="w-full md:w-auto flex-1">
          <FilterBar
            bind:searchQuery
            placeholder="Rechercher un employé..."
            filters={employeeFilters}
            bind:selectedFilters
          />
        </div>
        <div
          class="text-sm font-bold text-slate-400 px-3 py-2 bg-slate-900/50 rounded-xl border border-slate-800"
        >
          <span class="text-white">{filteredEmployees.length}</span>
          <span class="text-slate-500 font-normal">employés affichés</span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each filteredEmployees as emp (emp.id)}
          <EmployeeCard
            employee={emp}
            onfire={requestFire}
            assignedMachine={employeeToMachine.get(emp.id) || null}
          />
        {/each}
      </div>
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
