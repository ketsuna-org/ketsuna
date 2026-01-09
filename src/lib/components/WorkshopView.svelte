<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import { fade } from "svelte/transition";
  import { notifications } from "$lib/notifications";
  import {
    recipes,
    getItem,
    getItemName,
    isLoading as isGameDataLoading,
  } from "$lib/data/game-static";
  import type { Recipe } from "$lib/types/game";
  import GameIcon from "$lib/components/GameIcon.svelte";

  // State
  let inventory = $state<Record<string, number>>({});
  let producing = $state<Record<string, boolean>>({});
  let loadingInventory = $state(true);
  let quantities = $state<Record<string, number>>({}); // Quantity to craft per recipe

  // Calculate manual recipes based on store using derived state
  let manualRecipes = $derived(
    $recipes?.filter((r) => r.manual_craftable) || []
  );

  // Initialize quantities safely without causing loops
  $effect(() => {
    manualRecipes.forEach((r) => {
      if (!quantities[r.id]) {
        quantities[r.id] = 1;
      }
    });
  });

  // Load inventory to check ingredients
  async function loadInventory() {
    if (!$activeCompany) return;
    loadingInventory = true;
    try {
      const records = await pb.collection("inventory").getFullList({
        filter: `company = "${$activeCompany.id}"`,
      });

      const invMap: Record<string, number> = {};
      records.forEach((r) => {
        invMap[r.item_id] = (invMap[r.item_id] || 0) + r.quantity;
      });

      // Also fetch unplaced machines (as they can be ingredients)
      try {
        const machines = await pb.collection("machines").getFullList({
          filter: `company = "${$activeCompany.id}" && placed = false`,
        });
        machines.forEach((m) => {
          invMap[m.machine_id] = (invMap[m.machine_id] || 0) + 1;
        });
      } catch (err) {
        console.warn("Failed to load machines for workshop:", err);
      }

      inventory = invMap;
    } catch (e) {
      console.error("Failed to load inventory:", e);
    } finally {
      loadingInventory = false;
    }
  }

  onMount(() => {
    if ($activeCompany) {
      loadInventory();
    }
  });

  function getIngredientStatus(
    itemId: string,
    required: number,
    craftQty: number
  ) {
    const totalRequired = required * craftQty;
    const available = inventory[itemId] || 0;
    return {
      available,
      required: totalRequired,
      hasEnough: available >= totalRequired,
    };
  }

  function getInputs(recipe: Recipe) {
    // Backend sends "inputs", old TS defined "ingredients"
    // Use whatever is available
    return recipe.inputs || recipe.ingredients || [];
  }

  function canCraft(recipe: Recipe, qty: number): boolean {
    const inputs = getInputs(recipe);
    if (inputs.length === 0) return true;

    for (const ing of inputs) {
      // Logic supports both item_id (backend) and item (frontend type)
      const itemId = (ing as any).item_id || ing.item;
      if ((inventory[itemId] || 0) < ing.quantity * qty) {
        return false;
      }
    }
    return true;
  }

  async function handleProduce(recipe: Recipe) {
    const qty = quantities[recipe.id] || 1;
    if (qty <= 0) return;
    if (!canCraft(recipe, qty)) {
      notifications.error("Ressources insuffisantes");
      return;
    }

    producing[recipe.id] = true;
    try {
      const res = await pb.send("/api/workshop/produce", {
        method: "POST",
        body: {
          recipeId: recipe.id,
          quantity: qty,
        },
      });

      notifications.success(
        `Production terminée: ${res.produced}x ${res.itemName}`
      );

      // Refresh inventory
      await loadInventory();
    } catch (e: any) {
      console.error("Production failed:", e);
      notifications.error(e.message || "Erreur de production");
    } finally {
      producing[recipe.id] = false;
    }
  }

  function adjustQuantity(recipeId: string, delta: number) {
    const current = quantities[recipeId] || 1;
    quantities[recipeId] = Math.max(1, current + delta);
  }
</script>

<div class="space-y-6">
  {#if $isGameDataLoading || loadingInventory}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each Array(6) as _}
        <div
          class="h-64 bg-slate-900/50 rounded-2xl animate-pulse border border-slate-800"
        ></div>
      {/each}
    </div>
  {:else if manualRecipes.length === 0}
    <div
      class="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/50"
    >
      <span class="text-4xl block mb-4">🤷‍♂️</span>
      <h3 class="text-xl font-bold text-white mb-2">
        Aucune recette disponible
      </h3>
      <p class="text-slate-500">
        Aucune recette manuelle n'est disponible pour le moment.
      </p>
    </div>
  {:else}
    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {#each manualRecipes as recipe (recipe.id)}
        {@const outputItem = getItem(recipe.output_item)}
        {@const qty = quantities[recipe.id] || 1}
        {@const craftable = canCraft(recipe, qty)}
        {@const inputs = getInputs(recipe)}

        <div
          class="relative bg-slate-900/40 border border-slate-800 hover:border-indigo-500/30 rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 group"
        >
          <!-- Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-lg group-hover:border-indigo-500/40 transition-colors"
              >
                <GameIcon
                  icon={outputItem?.icon || "📦"}
                  size={24}
                  alt={outputItem?.name}
                />
              </div>
              <div>
                <h3 class="font-bold text-white leading-tight">
                  {recipe.name}
                </h3>
                <span
                  class="text-xs text-emerald-400 font-bold flex items-center gap-1"
                >
                  ⚡ Instantané (vs {recipe.production_time}s auto)
                </span>
              </div>
            </div>
          </div>

          <!-- Ingredients -->
          <div class="space-y-2 mb-6 min-h-[80px]">
            <p
              class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
            >
              Ingrédients requis
            </p>
            {#if inputs.length > 0}
              {#each inputs as ing}
                <!-- Support dynamic property access for different JSON structures -->
                {@const ingId = (ing as any).item_id || ing.item}
                {@const ingItem = getItem(ingId)}
                {@const status = getIngredientStatus(ingId, ing.quantity, qty)}

                <div class="flex justify-between items-center text-xs">
                  <div class="flex items-center gap-2 text-slate-300">
                    <GameIcon icon={ingItem?.icon} size={16} />
                    <span>{ingItem?.name}</span>
                  </div>
                  <div
                    class="{status.hasEnough
                      ? 'text-emerald-400'
                      : 'text-red-400'} font-mono font-bold"
                  >
                    {status.available} / {status.required}
                  </div>
                </div>
              {/each}
            {:else}
              <p class="text-xs text-slate-600 italic">
                Aucun ingrédient requis
              </p>
            {/if}
          </div>

          <!-- Actions -->
          <div class="mt-auto space-y-3">
            <!-- Quantity Control -->
            <div
              class="flex items-center bg-slate-950/50 rounded-lg p-1 border border-slate-800"
            >
              <button
                onclick={() => adjustQuantity(recipe.id, -1)}
                class="w-8 h-8 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >-</button
              >
              <input
                type="number"
                value={qty}
                readonly
                class="flex-1 bg-transparent text-center font-mono font-bold text-white focus:outline-none"
              />
              <button
                onclick={() => adjustQuantity(recipe.id, 1)}
                class="w-8 h-8 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >+</button
              >
            </div>

            <!-- Produce Button -->
            <button
              onclick={() => handleProduce(recipe)}
              disabled={!craftable || producing[recipe.id]}
              class="w-full py-3 rounded-xl font-bold text-sm tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-2
                {craftable
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 hover:scale-[1.02]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}"
            >
              {#if producing[recipe.id]}
                <div
                  class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                ></div>
                Production...
              {:else}
                Fabriquer
              {/if}
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
