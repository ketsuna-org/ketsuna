<script lang="ts">
  import type { Recipe, InventoryItem, Company } from "$lib/types";
  import {
    produceFromRecipe,
    checkRecipeRequirements,
  } from "$lib/services/recipe";
  import { notifications } from "$lib/notifications";
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";

  /**
   * @type {Recipe} - La recette à afficher
   */
  export let recipe: Recipe;

  /**
   * @type {InventoryItem[]} - Inventaire actuel pour afficher le stock disponible
   */
  export let inventory: InventoryItem[] = [];

  /**
   * @type {string} - ID de l'entreprise
   */
  export let companyId: string = "";

  /**
   * @type {() => void} - Callback pour rafraîchir après production
   */
  export let onProduce: (() => void) | null = null;

  let isLoading = false;
  let quantity = 1;
  let canProduce = true;
  let shortages: Array<{
    itemId: string;
    itemName: string;
    needed: number;
    available: number;
  }> = [];

  // Créer une map d'inventaire pour accès rapide
  $: inventoryMap = new Map(
    inventory.map((inv) => [
      inv.item,
      {
        quantity: inv.quantity,
        name: inv.expand?.item?.name || "Item inconnu",
      },
    ])
  );

  // Liste des inputs à partir de l'expansion ou des IDs
  $: recipeInputs = recipe.expand?.inputs_items || [];
  $: inputQty = recipe.input_quantity || 1;

  // Vérifier si on peut produire
  $: {
    checkRequirements();
  }

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
      // Refresh activeCompany store to reflect reputation/balance changes
      const updated = await pb.collection("companies").getOne(companyId);
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
  class="border border-slate-700 rounded-lg p-4 bg-slate-800 hover:border-indigo-500 hover:shadow-lg transition-all"
>
  <!-- Header with Recipe Name -->
  <div class="mb-4">
    <h2 class="text-lg font-bold text-white mb-1">
      {recipe.name || recipe.expand?.output_item?.name || "Recette inconnue"}
    </h2>
    <div class="h-1 w-12 bg-indigo-500 rounded"></div>
  </div>

  <!-- Output Item -->
  <div class="mb-4">
    <h3
      class="text-sm text-slate-400 mb-2 uppercase tracking-wider font-semibold"
    >
      Produit Final
    </h3>
    <div
      class="flex items-center gap-3 bg-slate-700/30 rounded p-3 border border-slate-600"
    >
      <div>
        <p class="font-semibold text-white">
          {recipe.expand?.output_item?.name || "Item"}
        </p>
        <p class="text-xs text-slate-400">x{quantity}</p>
      </div>
      <div class="ml-auto text-right">
        <p class="text-sm text-indigo-400 font-semibold">
          ${(recipe.expand?.output_item?.base_price || 0) * quantity}
        </p>
      </div>
    </div>
  </div>

  <!-- Inputs -->
  <div class="mb-4">
    <h3
      class="text-sm text-slate-400 mb-2 uppercase tracking-wider font-semibold"
    >
      Matériaux Requis
    </h3>
    <div class="space-y-2">
      {#each recipeInputs as inputItem (inputItem.id)}
        {@const available = getInputInventoryQuantity(inputItem.id)}
        {@const needed = inputQty * quantity}
        {@const hasEnough = available >= needed}
        <div
          class="flex items-center justify-between bg-slate-700/30 rounded p-2 border {hasEnough
            ? 'border-slate-600'
            : 'border-red-600/50'}"
        >
          <div class="flex-1">
            <p class="text-sm font-medium text-white">
              {inputItem.name}
            </p>
            <p class="text-xs text-slate-400">
              Requis: {needed}
            </p>
          </div>
          <div class="text-right">
            <p
              class={`text-sm font-semibold ${hasEnough ? "text-emerald-400" : "text-red-400"}`}
            >
              {available}/{needed}
            </p>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Production Time -->
  {#if recipe.production_time}
    <div class="mb-4 p-2 bg-slate-700/30 rounded border border-slate-600">
      <p class="text-xs text-slate-400">
        Temps de production: <span class="text-amber-400 font-semibold"
          >{recipe.production_time}s</span
        >
      </p>
    </div>
  {/if}

  <!-- Tech Requirement -->
  {#if recipe.required_tech}
    <div class="mb-4 p-2 bg-purple-500/10 rounded border border-purple-600/30">
      <p class="text-xs text-purple-300">
        📚 Technologie requise: <span class="font-semibold"
          >{recipe.expand?.required_tech?.name || "Tech"}</span
        >
      </p>
    </div>
  {/if}

  <!-- Quantity Control & Action -->
  <div class="border-t border-slate-700 pt-3 space-y-2">
    <div class="flex items-center gap-2">
      <label for="quantity-{recipe.id}" class="text-sm text-slate-400"
        >Quantité:</label
      >
      <input
        type="number"
        id="quantity-{recipe.id}"
        min="1"
        max="100"
        bind:value={quantity}
        disabled={isLoading || !canProduce}
        class="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50"
      />
    </div>

    {#if shortages.length > 0}
      <div class="text-xs text-red-400 space-y-1">
        {#each shortages as shortage}
          <div>
            ❌ {shortage.itemName}: manque {shortage.needed -
              shortage.available}
          </div>
        {/each}
      </div>
    {/if}

    <button
      on:click={handleProduce}
      disabled={!canProduce || isLoading}
      class="w-full px-3 py-2 rounded font-semibold text-sm transition-all
            {canProduce && !isLoading
        ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
        : 'bg-slate-700 text-slate-500 cursor-not-allowed'}"
    >
      {#if isLoading}
        Production en cours...
      {:else if canProduce}
        ⚙️ Produire x{quantity}
      {:else}
        Stock insuffisant
      {/if}
    </button>
  </div>
</div>
