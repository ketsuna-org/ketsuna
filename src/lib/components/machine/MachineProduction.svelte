<script lang="ts">
  import type { Machine, Recipe } from "$lib/pocketbase";
  import { slide } from "svelte/transition";
  import { getItem } from "$lib/data/game-static";

  interface Props {
    machine: Machine;
    machineRecipe: Recipe | null;
    energyStatus: any;
    progress: number;
    timeRemaining: number;
    currentDeposit?: any;
    isExtractor?: boolean;
  }

  let {
    machine,
    machineRecipe,
    energyStatus,
    progress,
    timeRemaining,
    currentDeposit = null,
    isExtractor = false,
  }: Props = $props();

  let machineItem = $derived(getItem(machine.machine_id));
  let isDepositEmpty = $derived(
    isExtractor &&
      currentDeposit &&
      Math.floor(currentDeposit.quantity ?? 0) <= 0
  );
  let isMissingDeposit = $derived(isExtractor && !currentDeposit);
</script>

<div class="mb-6">
  <h4
    class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"
  >
    <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
    Production en cours
  </h4>

  {#if machineRecipe}
    <div class="p-4 bg-slate-950/30 rounded-xl border border-slate-800/50">
      {#if isDepositEmpty || isMissingDeposit}
        <div
          class="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
        >
          <span class="text-red-400">⛏️</span>
          <span class="text-xs text-red-300 font-bold">
            {isDepositEmpty
              ? "⚠️ Gisement épuisé - Production arrêtée"
              : "⚠️ Aucun gisement assigné"}
          </span>
        </div>
      {/if}
      {#if energyStatus && energyStatus.productionSpeed < 1 && (machineItem?.need_energy ?? 0) > 0}
        <div
          class="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 animate-pulse"
        >
          <span class="text-red-400">⚡</span>
          <span class="text-xs text-red-300 font-bold">
            Sous-tension : {Math.floor(energyStatus.productionSpeed * 100)}%
            Efficacité
          </span>
        </div>
      {/if}
      <div class="flex flex-col gap-4 mb-4">
        <!-- Inputs -->
        {#if machineRecipe.inputs_items && machineRecipe.inputs_items.length > 0}
          <div class="space-y-2">
            <span class="text-xs text-slate-500 font-semibold uppercase"
              >Requis</span
            >
            <div class="flex flex-wrap gap-2">
              {#each machineRecipe.inputs_items as inputId}
                {@const input = getItem(inputId)}
                <div
                  class="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg text-xs border border-slate-800"
                >
                  <span class="text-slate-300 font-medium"
                    >{input?.name || inputId}</span
                  >
                  <span class="text-amber-400 font-mono font-bold"
                    >x{machineRecipe.input_quantity}</span
                  >
                </div>
              {/each}
            </div>
          </div>

          <!-- Arrow Separator -->
          <div class="flex justify-center text-slate-600">
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
              ><line x1="12" y1="5" x2="12" y2="19" /><polyline
                points="19 12 12 19 5 12"
              /></svg
            >
          </div>
        {/if}

        <!-- Complex Ingredients (with specific quantity) -->
        {#if machineRecipe.ingredients && machineRecipe.ingredients.length > 0}
          <div class="space-y-2 mt-2">
            {#if !machineRecipe.inputs_items?.length}
              <span class="text-xs text-slate-500 font-semibold uppercase"
                >Requis</span
              >
            {/if}
            <div class="flex flex-wrap gap-2">
              {#each machineRecipe.ingredients as ing}
                {@const ingItem = getItem(ing.item)}
                <div
                  class="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg text-xs border border-slate-800"
                >
                  <span class="text-slate-300 font-medium"
                    >{ingItem?.name || "???"}</span
                  >
                  <span class="text-amber-400 font-mono font-bold"
                    >x{ing.quantity}</span
                  >
                </div>
              {/each}
            </div>
          </div>

          <!-- Arrow Separator if not displayed above -->
          {#if !machineRecipe.inputs_items?.length}
            <div class="flex justify-center text-slate-600 mt-2">
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
                ><line x1="12" y1="5" x2="12" y2="19" /><polyline
                  points="19 12 12 19 5 12"
                /></svg
              >
            </div>
          {/if}
        {/if}

        <!-- Output -->
        <div>
          <span
            class="text-xs text-slate-500 font-semibold uppercase block mb-2"
            >Produit</span
          >

          {#if machineItem?.produce_energy && machineItem.produce_energy > 0}
            <div
              class="flex items-center gap-2 text-emerald-400 font-bold bg-slate-900/80 p-3 rounded-xl border border-emerald-500/20 shadow-sm mb-2 w-full"
            >
              <span>⚡</span>
              <span>{machineItem.produce_energy} kWh</span>
            </div>
          {/if}
          <div
            class="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-indigo-500/20 shadow-sm"
          >
            <span class="text-sm font-bold text-white flex items-center gap-2">
              <span class="text-indigo-400">📦</span>
              {getItem(machineRecipe.output_item)?.name ||
                machineRecipe.name ||
                "Item"}
            </span>
            <div
              class="text-xs text-indigo-300 font-mono font-bold bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20 flex gap-1 items-center"
            >
              {#if energyStatus && energyStatus.productionSpeed < 1 && (machineItem?.need_energy ?? 0) > 0}
                <span class="line-through opacity-70"
                  >{machineRecipe.production_time}s</span
                >
                <span class="text-red-400 font-bold">
                  {Math.round(
                    machineRecipe.production_time / energyStatus.productionSpeed
                  )}s
                </span>
              {:else}
                {machineRecipe.production_time}s
              {/if}
              <span>/ cycle</span>
            </div>
          </div>
        </div>
      </div>

      {#if machine.production_started_at && machineRecipe.production_time > 0}
        <div class="space-y-2">
          <div
            class="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50"
          >
            <div
              class="bg-indigo-500 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
              style="width: {progress}%"
            ></div>
          </div>
          <div
            class="flex justify-between text-[10px] text-slate-400 font-medium"
          >
            <span>{Math.round(progress)}% terminé</span>
            <span class="font-mono">~{Math.round(timeRemaining)}s</span>
          </div>
        </div>
      {:else if machine.employees && machine.employees.length > 0}
        <div
          class="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2"
        >
          <span class="relative flex h-2 w-2">
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
            ></span>
            <span
              class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"
            ></span>
          </span>
          <span class="text-xs text-emerald-400 font-bold"
            >Production active</span
          >
        </div>
      {:else}
        <div
          class="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2"
        >
          <span class="text-amber-400 text-xs font-bold"
            >⚠️ En attente d'employés</span
          >
        </div>
      {/if}
    </div>
  {:else if machineItem?.product}
    <!-- Passive Production Display -->
    <div class="p-4 bg-slate-950/30 rounded-xl border border-slate-800/50">
      {#if energyStatus && energyStatus.productionSpeed < 1 && (machineItem?.need_energy ?? 0) > 0}
        <div
          class="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
        >
          <span class="text-red-400">⚡</span>
          <span class="text-xs text-red-300 font-bold">
            Sous-tension : {Math.floor(energyStatus.productionSpeed * 100)}%
            Efficacité
          </span>
        </div>
      {/if}
      <div class="flex items-center gap-2 mb-3">
        <span class="p-1 bg-slate-800 rounded text-slate-400">⚡</span>
        <p class="text-sm text-white font-bold">Production Passive</p>
      </div>

      {#if machineItem.production_time && machineItem.production_time > 0}
        <div
          class="p-3 bg-slate-900/50 rounded-lg border border-slate-800 mb-4"
        >
          <p class="text-xs text-slate-300">
            Génère <span
              class="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono"
              >{machineItem.product_quantity || 1}</span
            >
            unité(s) de
            <span class="text-emerald-400 font-bold"
              >{getItem(machineItem.product || "")?.name ||
                "Produit Inconnu"}</span
            >
          </p>
          <p class="text-[10px] text-slate-500 mt-1">
            Cycle:
            {#if energyStatus && energyStatus.productionSpeed < 1 && (machineItem?.need_energy ?? 0) > 0}
              <span class="line-through opacity-70"
                >{machineItem.production_time}s</span
              >
              <span class="text-red-400 font-bold ml-1">
                {Math.round(
                  machineItem.production_time / energyStatus.productionSpeed
                )}s
              </span>
            {:else}
              <span class="font-mono">{machineItem.production_time}s</span>
            {/if}
          </p>
        </div>

        {#if machine.production_started_at}
          <div class="space-y-2">
            <div
              class="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50"
            >
              <div
                class="bg-emerald-500 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                style="width: {progress}%"
              ></div>
            </div>
            <div
              class="flex justify-between text-[10px] text-slate-400 font-medium"
            >
              <span>{Math.round(progress)}% terminé</span>
              <span class="font-mono">~{Math.round(timeRemaining)}s</span>
            </div>
          </div>
        {:else}
          <div
            class="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2"
          >
            <span class="text-amber-400 text-xs font-bold"
              >⚠️ En attente d'activation</span
            >
          </div>
        {/if}
      {/if}
    </div>
  {:else if machineItem?.produce_energy && machineItem.produce_energy > 0}
    <!-- Electricity-only Production Display -->
    <div class="p-4 bg-slate-950/30 rounded-xl border border-slate-800/50">
      <div class="flex items-center gap-2 mb-3">
        <span class="p-1 bg-amber-500/20 rounded text-amber-400">⚡</span>
        <p class="text-sm text-white font-bold">Production Électrique</p>
      </div>

      <!-- Consumed Items -->
      {#if machineItem.can_consume && Array.isArray(machineItem.can_consume) && machineItem.can_consume.length > 0}
        <div class="space-y-2 mb-4">
          <span class="text-xs text-slate-500 font-semibold uppercase"
            >Consomme</span
          >
          <div class="flex flex-wrap gap-2">
            {#each machineItem.can_consume as consumableId}
              {@const consumable = getItem(consumableId)}
              <div
                class="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg text-xs border border-slate-800"
              >
                <span class="text-slate-300 font-medium"
                  >{consumable?.name || consumableId}</span
                >
                <span class="text-red-400 font-mono font-bold">x1</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Arrow Separator -->
        <div class="flex justify-center text-slate-600 mb-4">
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
            ><line x1="12" y1="5" x2="12" y2="19" /><polyline
              points="19 12 12 19 5 12"
            /></svg
          >
        </div>
      {/if}

      <!-- Energy Output -->
      <div class="space-y-2 mb-4">
        <span class="text-xs text-slate-500 font-semibold uppercase"
          >Produit</span
        >
        <div
          class="flex items-center gap-2 text-amber-400 font-bold bg-slate-900/80 p-3 rounded-xl border border-amber-500/20 shadow-sm w-full"
        >
          <span>⚡</span>
          <span>{machineItem.produce_energy} kWh / cycle</span>
        </div>
      </div>

      {#if machineItem.production_time && machineItem.production_time > 0}
        <p class="text-[10px] text-slate-500 mb-3">
          Cycle: <span class="font-mono">{machineItem.production_time}s</span>
        </p>

        {#if machine.production_started_at}
          <div class="space-y-2">
            <div
              class="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50"
            >
              <div
                class="bg-amber-500 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                style="width: {progress}%"
              ></div>
            </div>
            <div
              class="flex justify-between text-[10px] text-slate-400 font-medium"
            >
              <span>{Math.round(progress)}% terminé</span>
              <span class="font-mono">~{Math.round(timeRemaining)}s</span>
            </div>
          </div>
        {:else if machine.employees && machine.employees.length > 0}
          <div
            class="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2"
          >
            <span class="relative flex h-2 w-2">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
              ></span>
              <span
                class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"
              ></span>
            </span>
            <span class="text-xs text-emerald-400 font-bold"
              >Production active</span
            >
          </div>
        {:else}
          <div
            class="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2"
          >
            <span class="text-amber-400 text-xs font-bold"
              >⚠️ En attente d'employés</span
            >
          </div>
        {/if}
      {/if}
    </div>
  {:else}
    <div
      class="p-4 bg-slate-950/30 rounded-xl border border-slate-800/50 text-center"
    >
      <p class="text-sm text-slate-500">Aucune recette configurée</p>
    </div>
  {/if}
</div>
