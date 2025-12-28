<script lang="ts">
  import { activeCompany, currentUser } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import type { Company, Employee } from "$lib/types";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { hireRandomEmployee } from "$lib/services/employee";
  import EmployeeCard from "$lib/components/EmployeeCard.svelte";
  import DeleteConfirmation from "$lib/components/DeleteConfirmation.svelte";
  import HireSuccessModal from "$lib/components/HireSuccessModal.svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  let employees = $state<Employee[]>([]);
  let loading = $state(true);
  let hiring = $state(false);
  let newlyHired = $state<Employee | null>(null);

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
      const newEmp = await hireRandomEmployee($activeCompany);
      employees = [newEmp, ...employees];
      // Refresh active company to show new balance
      const updated = await pb
        .collection("companies")
        .getOne<Company>($activeCompany.id);
      activeCompany.set(updated);
      newlyHired = newEmp;
    } catch (e: any) {
      alert(e.message);
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
    } catch (e: any) {
      alert("Erreur lors du licenciement: " + e.message);
    }
  }

  async function loadEmployees() {
    if (!$activeCompany) return;
    loading = true;
    try {
      const result = await pb.collection("employees").getList<Employee>(1, 50, {
        filter: `employer = "${$activeCompany.id}"`,
        sort: "-efficiency",
      });
      employees = result.items;
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
  <div class="flex justify-between items-center mb-8">
    <h1 class="text-3xl font-bold text-white">Ressources Humaines</h1>
    <button
      onclick={handleHire}
      disabled={hiring}
      class="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-wait text-white font-bold py-2 px-4 rounded transition-colors"
    >
      {hiring ? "Recrutement..." : "Recruter"}
    </button>
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
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each employees as emp}
        <EmployeeCard employee={emp} onfire={requestFire} />
      {/each}
    </div>
  {/if}
</div>

{#if newlyHired}
  <HireSuccessModal employee={newlyHired} onclose={() => (newlyHired = null)} />
{/if}

{#if showDeleteModal && employeeToDelete}
  <DeleteConfirmation
    title="Licenciement"
    message={`Voulez-vous vraiment licencier ${employeeToDelete.name} ? Cette action est irréversible.`}
    confirmText="Licencier"
    onconfirm={confirmFire}
    oncancel={cancelFire}
  />
{/if}
