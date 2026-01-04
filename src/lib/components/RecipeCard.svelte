<script lang="ts">
  import type { Recipe, InventoryItem, Company } from "$lib/pocketbase";
  import {
    produceFromRecipe,
    checkRecipeRequirements,
  } from "$lib/services/recipe";
  import { notifications } from "$lib/notifications";
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";

  interface Props {
    recipe: Recipe;
    inventory?: InventoryItem[];
    companyId?: string;
    onProduce?: (() => void) | null;
  }

  let {
    recipe,
    inventory = [],
    companyId = "",
    onProduce = null,
  }: Props = $props();

  let isLoading = $state(false);
  let quantity = $state(1);
  let canProduce = $state(true);
  let shortages = $state<
    Array<{
      itemId: string;
      itemName: string;
      needed: number;
      available: number;
    }>
  >([]);

  // Derived values
  let inventoryMap = $derived(
    new Map(
      inventory.map((inv) => [
        inv.item,
        {
          quantity: inv.quantity,
          name: inv.expand?.item?.name || "Item inconnu",
        },
      ])
    )
  );

  let recipeInputs = $derived(recipe.expand?.inputs_items || []);
  let inputQty = $derived(recipe.input_quantity || 1);

  // Effect to check requirements when recipe or companyId changes
  $effect(() => {
    if (companyId && recipe) {
      checkRequirements();
    }
  });

  async function checkRequirements() {
    try {
      const result = await checkRecipeRequirements(companyId, recipe);
      canProduce = result.canProduce;
      shortages = result.shortages;
    } catch (error) {
      canProduce = false;
    }
  }

  async function handleProduce() {
    if (!canProduce || !companyId) return;

    isLoading = true;
    try {
      const result = await produceFromRecipe(companyId, recipe, quantity);
      // Refresh activeCompany store to reflect balance changes
      const updated = await pb
        .collection("companies")
        .getOne(companyId, { requestKey: null });
      activeCompany.set(updated as unknown as Company);
      notifications.success(
        `✨ Production réussie: ${recipe.expand?.output_item?.name || "Item"} x${result.outputQuantity}`
      );
      onProduce?.();
      quantity = 1; // Reset quantity
    } catch (error: any) {
      notifications.error(`Erreur: ${error.message}`);
    } finally {
      isLoading = false;
    }
  }

  function getInputInventoryQuantity(itemId: string): number {
    return inventoryMap.get(itemId)?.quantity ?? 0;
  }
</script>

<div
  class="border border-slate-700/50 rounded-2xl p-6 bg-slate-900/50 backdrop-blur-sm hover:border-slate-600/50 hover:bg-slate-900/80 transition-all hover:shadow-xl group"
>
  <!-- Header with Recipe Name -->
  <div class="mb-5 flex items-start justify-between">
    <div>
      <h2 class="text-xl font-bold text-white mb-1 flex items-center gap-2">
        <span class="p-1.5 bg-slate-800 rounded-lg text-lg">📜</span>
        {recipe.name || recipe.expand?.output_item?.name || "Recette inconnue"}
      </h2>
      <div class="flex gap-2">
        {#if recipe.required_tech}
          <div
            class="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-medium"
          >
            📚 {recipe.expand?.required_tech?.name || "Tech"}
          </div>
        {/if}
        {#if recipe.production_time}
          <div
            class="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-mono"
          >
            ⏱️ {recipe.production_time}s
          </div>
        {/if}
      </div>
    </div>
  </div>

  <div class="space-y-4 mb-6">
    <!-- Output Item -->
    <div class="bg-slate-950/30 rounded-xl border border-slate-800/50 p-4">
      <h3
        class="text-xs text-slate-500 mb-2 uppercase tracking-wider font-bold flex items-center gap-2"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Produit Final
      </h3>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-lg shadow-inner"
          >
            📦
          </div>
          <div>
            <p class="font-bold text-white text-sm">
              {recipe.expand?.output_item?.name || "Item"}
            </p>
            <div class="flex items-center gap-2 mt-0.5">
              <span
                class="text-xs font-mono bg-slate-800 px-1.5 rounded text-slate-300 border border-slate-700"
                >x{quantity}</span
              >
              <span class="text-[10px] text-slate-500">unité(s)</span>
            </div>
          </div>
        </div>
        <div class="text-right">
          <p
            class="text-xs text-slate-500 mb-0.5 uppercase tracking-wider font-semibold"
          >
            Valeur
          </p>
          <p
            class="text-sm text-indigo-400 font-bold font-mono bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20 inline-block"
          >
            ${(recipe.expand?.output_item?.base_price || 0) * quantity}
          </p>
        </div>
      </div>
    </div>

    <!-- Inputs -->
    <div>
      <h3
        class="text-xs text-slate-500 mb-2 uppercase tracking-wider font-bold flex items-center gap-2 pl-1"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
        Matériaux Requis
      </h3>
      <div class="space-y-2">
        {#each recipeInputs as inputItem (inputItem.id)}
          {@const available = getInputInventoryQuantity(inputItem.id)}
          {@const needed = inputQty * quantity}
          {@const hasEnough = available >= needed}
          <div
            class="flex items-center justify-between bg-slate-800/50 rounded-lg p-2.5 border {hasEnough
              ? 'border-slate-700/50'
              : 'border-red-500/30 bg-red-500/5'}"
          >
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500">•</span>
              <p class="text-sm font-medium text-slate-200">
                {inputItem.name}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <p class="text-xs text-slate-500">
                Requis: <span class="text-white font-mono">{needed}</span>
              </p>
              <div
                class={`text-xs font-bold px-2 py-0.5 rounded border ${hasEnough ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}
              >
                {available} <span class="opacity-50">/</span>
                {needed}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Quantity Control & Action -->
  <div class="pt-4 border-t border-slate-700/50">
    <div class="flex items-end gap-3">
      <div class="w-24">
        <label
          for="quantity-{recipe.id}"
          class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5 block"
          >Quantité</label
        >
        <input
          type="number"
          id="quantity-{recipe.id}"
          min="1"
          max="100"
          bind:value={quantity}
          disabled={isLoading || !canProduce}
          class="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 transition-colors"
        />
      </div>

      <button
        onclick={handleProduce}
        disabled={!canProduce || isLoading}
        class="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2
                {canProduce && !isLoading
          ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 border border-indigo-400/20'
          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}"
      >
        {#if isLoading}
          <span
            class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
          ></span>
          Production...
        {:else if canProduce}
          <span>⚙️</span> Produire
        {:else}
          Stock insuffisant
        {/if}
      </button>
    </div>

    {#if shortages.length > 0}
      <div class="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
        {#each shortages as shortage}
          <div
            class="text-xs text-red-400 font-medium flex items-center gap-1.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="shrink-0"
              ><line x1="18" y1="6" x2="6" y2="18"></line><line
                x1="6"
                y1="6"
                x2="18"
                y2="18"
              ></line></svg
            >
            Manque {shortage.needed - shortage.available}
            {shortage.itemName}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
