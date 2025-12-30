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
    $page.url.searchParams.get("state") === "delete",
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
        `${result.hiredCount} employé(s) recruté(s) pour ${result.totalCost}€`,
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

<div class="container mx-auto p-4 max-w-6xl">
  <div class="mb-6">
    <a
      href="/company"
      class="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 text-sm transition-colors"
    >
      ← Retour à l'Entreprise
    </a>
  </div>

  <!-- Header with Bulk Hire Controls -->
  <div
    class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
  >
    <h1 class="text-3xl font-bold text-white">Ressources Humaines</h1>

    <div class="flex items-center gap-3">
      <!-- Cost Preview Info -->
      {#if costPreview}
        <div class="text-xs text-slate-400 text-right hidden md:block">
          <div>Coût moyen: ~{costPreview.averageHiringFee}€/employé</div>
          <div>Réserve requise: ~{costPreview.averageReserveNeeded}€</div>
        </div>
      {/if}

      <!-- Quantity Selector -->
      <div class="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
        {#each [1, 5, 10, 25] as qty}
          <button
            onclick={() => (hireQuantity = qty)}
            class="px-3 py-1 rounded text-sm font-bold transition-colors {hireQuantity ===
            qty
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'}"
          >
            {qty}
          </button>
        {/each}
      </div>

      <!-- Hire Button -->
      <button
        onclick={handleHire}
        disabled={hiring}
        class="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-wait text-white font-bold py-2 px-4 rounded transition-colors"
      >
        {hiring ? "Recrutement..." : `Recruter ${hireQuantity}`}
      </button>
    </div>
  </div>

  {#if loading}
    <div class="text-center text-slate-400 py-10">
      Chargement du personnel...
    </div>
  {:else if employees.length === 0}
    <div
      class="text-center text-slate-500 py-10 bg-slate-800/50 rounded-lg border border-slate-700"
    >
      <p class="text-xl mb-2">Aucun employé</p>
      <p class="text-sm">
        Votre entreprise tourne à vide. Recrutez du personnel pour commencer la
        production.
      </p>
    </div>
  {:else}
    <!-- Filter Bar -->
    <FilterBar
      bind:searchQuery
      placeholder="Rechercher un employé..."
      filters={employeeFilters}
      bind:selectedFilters
    />

    <!-- Results count -->
    <div class="text-sm text-slate-400 mb-4">
      {filteredEmployees.length} employé(s) sur {employees.length}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each filteredEmployees as emp}
        <EmployeeCard
          employee={emp}
          onfire={requestFire}
          assignedMachine={employeeToMachine.get(emp.id) || null}
        />
      {/each}
    </div>
  {/if}
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
