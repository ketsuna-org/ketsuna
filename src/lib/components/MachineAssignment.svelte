<script lang="ts">
  import type { Machine, Employee, Recipe } from "$lib/pocketbase";
  import pb from "$lib/pocketbase";
  import { notifications } from "$lib/notifications";
  import { onMount, onDestroy } from "svelte";
  import DeleteConfirmation from "$lib/components/DeleteConfirmation.svelte";
  import MachineHeader from "./machine/MachineHeader.svelte";
  import MachineProduction from "./machine/MachineProduction.svelte";
  import MachineDepositSelector from "./machine/MachineDepositSelector.svelte";
  import MachineEmployeePanel from "./machine/MachineEmployeePanel.svelte";
  import { getItem, getRecipe } from "$lib/data/game-static";

  interface Props {
    machine: Machine;
    availableEmployees?: Employee[];
    onUpdate?: (() => void) | null;
    onDelete?: ((machineId: string) => void) | null;
    busyEmployeeIds?: Set<string>;
    energyStatus?: any;
  }

  let {
    machine,
    availableEmployees = [],
    onUpdate = null,
    onDelete = null,
    busyEmployeeIds = new Set<string>(),
    energyStatus = null,
  }: Props = $props();

  let isLoading = $state(false);
  let machineRecipe = $state<Recipe | null>(null);
  let progress = $state(0);
  let timeRemaining = $state(0);
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  let showDeleteModal = $state(false);

  // Cache to avoid repeated recipe loads
  const recipeCache = new Map<string, Recipe>();
  let lastLoadedRecipeId: string | null = null;

  // Derived values
  let machineItem = $derived(getItem(machine.machine_id));
  let recipeId = $derived(machineItem?.use_recipe);
  let isExtractor = $derived(
    machineItem?.product ? getItem(machineItem.product)?.is_explorable : false
  );
  let currentDeposit = $derived(machine.expand?.deposit);

  // Effect to load recipe when recipeId changes
  $effect(() => {
    if (recipeId && recipeId !== lastLoadedRecipeId) {
      loadMachineRecipe(recipeId);
    }
  });

  async function loadMachineRecipe(id: string) {
    const r = getRecipe(id);
    if (r) {
      machineRecipe = r;
      lastLoadedRecipeId = id;
    }
  }

  function updateProgress() {
    const now = new Date().getTime();
    let total = 0;

    if (
      machine.production_started_at &&
      machineRecipe &&
      machineRecipe.production_time > 0
    ) {
      total = machineRecipe.production_time;
    } else if (
      machine.production_started_at &&
      machineItem &&
      machineItem.product &&
      (machineItem.production_time || 0) > 0
    ) {
      total = machineItem.production_time || 0;
    }

    if (
      total > 0 &&
      energyStatus &&
      energyStatus.productionSpeed < 1 &&
      (machineItem?.need_energy ?? 0) > 0
    ) {
      total = total / energyStatus.productionSpeed;
    }

    if (total > 0 && machine.production_started_at) {
      const start = new Date(machine.production_started_at).getTime();
      const elapsed = (now - start) / 1000;
      const newProgress = Math.min(100, (elapsed / total) * 100);
      progress = newProgress;
      timeRemaining = Math.max(0, total - elapsed);

      if (newProgress >= 100) {
        progress = 100;
        timeRemaining = 0;
      }
    } else {
      progress = 0;
      timeRemaining = 0;
    }
  }

  onMount(() => {
    updateProgress();
    progressInterval = setInterval(updateProgress, 1000);
  });

  onDestroy(() => {
    if (progressInterval) {
      clearInterval(progressInterval);
    }
  });

  function requestDeleteMachine() {
    showDeleteModal = true;
  }

  async function confirmDeleteMachine() {
    isLoading = true;
    try {
      // Use the new API endpoint
      await pb.send("/api/machines/remove", {
        method: "POST",
        body: { machineId: machine.id },
      });
      notifications.success("Machine retirée et renvoyée au stock");
      showDeleteModal = false;
      onDelete?.(machine.id);
    } catch (e: any) {
      notifications.error(`Erreur lors de la suppression: ${e.message}`);
    } finally {
      isLoading = false;
    }
  }

  function handleLoadingChange(loading: boolean) {
    isLoading = loading;
  }
</script>

<div
  class="border border-slate-700/50 rounded-2xl p-6 bg-slate-900/50 backdrop-blur-sm hover:border-slate-600/50 transition-colors relative"
>
  <MachineHeader {machine} {isLoading} onRequestDelete={requestDeleteMachine} />

  <MachineProduction
    {machine}
    {machineRecipe}
    {energyStatus}
    {progress}
    {timeRemaining}
    {currentDeposit}
    {isExtractor}
  />

  <MachineDepositSelector
    {machine}
    isExtractor={!!isExtractor}
    {currentDeposit}
    {isLoading}
    onLoadingChange={handleLoadingChange}
    onMachineUpdate={onUpdate}
  />

  <MachineEmployeePanel
    {machine}
    {availableEmployees}
    {busyEmployeeIds}
    {isLoading}
    onLoadingChange={handleLoadingChange}
    onMachineUpdate={onUpdate}
  />
</div>

{#if showDeleteModal}
  <DeleteConfirmation
    title="Retirer la machine"
    message="Voulez-vous vraiment retirer la machine <strong>{machineItem?.name ||
      'Machine'}</strong> ?<br><br>Elle sera désassignée et retournera dans votre inventaire. Les employés seront libérés."
    confirmText="Retirer la machine"
    onConfirm={confirmDeleteMachine}
    onCancel={() => (showDeleteModal = false)}
  />
{/if}

<style>
  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(71, 85, 105, 0.3);
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.5);
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.7);
  }
</style>
