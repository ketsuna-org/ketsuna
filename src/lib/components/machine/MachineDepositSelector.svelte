<script lang="ts">
  import type { Machine } from "$lib/pocketbase";
  import pb from "$lib/pocketbase";
  import { notifications } from "$lib/notifications";
  import { slide } from "svelte/transition";

  interface Props {
    machine: Machine;
    isExtractor: boolean;
    currentDeposit: any;
    isLoading: boolean;
    onLoadingChange: (loading: boolean) => void;
  }

  let {
    machine,
    isExtractor,
    currentDeposit,
    isLoading,
    onLoadingChange,
  }: Props = $props();

  let compatibleDeposits = $state<any[]>([]);
  let showDepositDropdown = $state(false);
  let lastDepositKey: string | null = null;

  async function loadDepositsIfNeeded() {
    const productItemId = machine.expand?.machine?.product;
    const key = `${machine.company}-${productItemId}`;

    if (key === lastDepositKey && compatibleDeposits.length > 0) return;

    try {
      if (!productItemId) return;

      const result = await pb.collection("deposits").getFullList({
        filter: `company = '${machine.company}' && ressource = '${productItemId}' && quantity > 0`,
        sort: "-size",
        requestKey: null,
      });
      compatibleDeposits = result;
      lastDepositKey = key;
    } catch (e) {
      console.error("Erreur chargement gisements", e);
    }
  }

  function handleDepositDropdownOpen() {
    showDepositDropdown = !showDepositDropdown;
    if (showDepositDropdown && isExtractor) {
      loadDepositsIfNeeded();
    }
  }

  async function handleAssignDeposit(depositId: string) {
    onLoadingChange(true);
    try {
      await pb.send("/api/machines/assign-deposit", {
        method: "POST",
        body: { machineId: machine.id, depositId: depositId },
      });

      if (depositId === "") {
        notifications.success("Gisement désassigné");
      } else {
        notifications.success("Gisement assigné !");
      }

      showDepositDropdown = false;
    } catch (e: any) {
      notifications.error(`Erreur: ${e.message}`);
    } finally {
      onLoadingChange(false);
    }
  }
</script>

{#if isExtractor}
  <div class="mb-6">
    <h4
      class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
      Gisement Assigné
    </h4>

    <div class="bg-slate-950/30 rounded-xl border border-slate-800/50 p-4">
      {#if currentDeposit}
        {@const isEmpty = Math.floor(currentDeposit.quantity ?? 0) <= 0}
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg {isEmpty
                ? 'bg-red-500/20 border-red-500/30'
                : 'bg-teal-500/20 border-teal-500/30'} border flex items-center justify-center text-lg"
            >
              {isEmpty ? "⚠️" : "⛏️"}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono text-slate-400"
                  >#{currentDeposit.id?.slice(0, 4)}</span
                >
                <span
                  class="text-xs font-bold {isEmpty
                    ? 'text-red-400 bg-red-500/10'
                    : 'text-teal-400 bg-teal-500/10'} px-1.5 py-0.5 rounded"
                  >Niv. {currentDeposit.size ?? 1}</span
                >
              </div>
              {#if isEmpty}
                <span class="text-red-400 font-bold text-xs"
                  >⚠️ ÉPUISÉ - Production arrêtée</span
                >
              {:else}
                <span class="text-slate-400"
                  >Restant: <span class="text-white font-mono"
                    >{Math.floor(currentDeposit.quantity)}</span
                  ></span
                >
              {/if}
            </div>
          </div>
          <button
            disabled={isLoading}
            onclick={() => handleAssignDeposit("")}
            class="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Désassigner"
          >
            ❌
          </button>
        </div>

        {#if isEmpty}
          <div
            class="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg"
          >
            <p class="text-xs text-red-300 mb-2">
              Ce gisement est épuisé. Sélectionnez un nouveau gisement pour
              reprendre la production.
            </p>
            <button
              onclick={handleDepositDropdownOpen}
              disabled={isLoading}
              class="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              {showDepositDropdown ? "Fermer" : "Changer de gisement"}
            </button>

            {#if showDepositDropdown}
              <div
                transition:slide
                class="mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto"
              >
                {#if compatibleDeposits.length > 0}
                  {#each compatibleDeposits as dep}
                    <button
                      onclick={() => handleAssignDeposit(dep.id)}
                      class="w-full text-left p-3 hover:bg-slate-800 border-b border-slate-800 last:border-0 flex justify-between items-center"
                    >
                      <span class="text-xs font-mono text-slate-300"
                        >#{dep.id.slice(0, 4)}</span
                      >
                      <div class="text-right">
                        <div class="text-xs font-bold text-emerald-400">
                          Niv. {dep.size ?? 1}
                        </div>
                        <div class="text-[10px] text-slate-500">
                          {Math.floor(dep.quantity)} u.
                        </div>
                      </div>
                    </button>
                  {/each}
                {:else}
                  <div class="p-3 text-center text-xs text-slate-500">
                    Aucun gisement compatible trouvé.<br />
                    <a
                      href="/exploration"
                      class="text-teal-400 underline mt-1 block">Explorer</a
                    >
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      {:else}
        <div class="text-center">
          <p class="text-xs text-amber-400 mb-3">
            ⚠️ Aucun gisement assigné. La production est arrêtée.
          </p>
          <div class="relative">
            <button
              onclick={handleDepositDropdownOpen}
              disabled={isLoading}
              class="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              {showDepositDropdown ? "Fermer" : "Sélectionner un gisement"}
            </button>

            {#if showDepositDropdown}
              <div
                transition:slide
                class="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto"
              >
                {#if compatibleDeposits.length > 0}
                  {#each compatibleDeposits as dep}
                    <button
                      onclick={() => handleAssignDeposit(dep.id)}
                      class="w-full text-left p-3 hover:bg-slate-800 border-b border-slate-800 last:border-0 flex justify-between items-center"
                    >
                      <span class="text-xs font-mono text-slate-300"
                        >#{dep.id.slice(0, 4)}</span
                      >
                      <div class="text-right">
                        <div class="text-xs font-bold text-emerald-400">
                          Niv. {dep.size ?? 1}
                        </div>
                        <div class="text-[10px] text-slate-500">
                          {Math.floor(dep.quantity)} u.
                        </div>
                      </div>
                    </button>
                  {/each}
                {:else}
                  <div class="p-3 text-center text-xs text-slate-500">
                    Aucun gisement compatible trouvé.<br />
                    <a
                      href="/exploration"
                      class="text-teal-400 underline mt-1 block">Explorer</a
                    >
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
