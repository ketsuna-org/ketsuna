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
  import { logAnalyticsEvent } from "$lib/firebase";

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

      logAnalyticsEvent("workshop_produce", {
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        quantity: qty,
        produced_amount: res.produced,
      });

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

<div class="h-full overflow-y-auto pr-2 custom-scrollbar">
  {#if $isGameDataLoading || loadingInventory}
    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {#each Array(6) as _}
        <div
          class="h-72 bg-slate-900/50 rounded-lg animate-pulse border border-slate-800"
        ></div>
      {/each}
    </div>
  {:else if manualRecipes.length === 0}
    <div
      class="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20"
    >
      <span class="text-4xl mb-4 opacity-50">🔨</span>
      <h3 class="text-xl font-bold text-slate-400 mb-2 uppercase tracking-wide">
        Aucune recette
      </h3>
      <p class="text-slate-600 font-medium">
        L'atelier est vide pour le moment.
      </p>
    </div>
  {:else}
    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
    >
      {#each manualRecipes as recipe (recipe.id)}
        {@const outputItem = getItem(recipe.output_item)}
        {@const qty = quantities[recipe.id] || 1}
        {@const craftable = canCraft(recipe, qty)}
        {@const inputs = getInputs(recipe)}

        <div
          class="group relative bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden transition-all duration-300 hover:border-[#6366f1] hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] flex flex-col"
        >
          <!-- Metallic Header Bar -->
          <div
            class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-50 group-hover:opacity-100 transition-opacity"
          ></div>

          <div class="p-5 flex-1 flex flex-col gap-4">
            <!-- Header -->
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-lg bg-[#0f172a] border border-[#334155] flex items-center justify-center shadow-inner relative overflow-hidden group-hover:border-[#6366f1]/50 transition-colors"
                >
                  <div
                    class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"
                  ></div>
                  <GameIcon
                    icon={outputItem?.icon || "📦"}
                    size={26}
                    alt={outputItem?.name}
                  />
                </div>
                <div>
                  <h3
                    class="font-bold text-slate-100 text-sm uppercase tracking-wide leading-tight"
                  >
                    {recipe.name}
                  </h3>
                  <div
                    class="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/50 w-fit"
                  >
                    <span>⚡ INSTANTANÉ</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Ingredients -->
            <div
              class="bg-[#0f172a]/50 rounded-lg p-3 border border-[#334155]/50 flex-1"
            >
              <p
                class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1"
              >
                Requis
              </p>
              {#if inputs.length > 0}
                <div class="space-y-2">
                  {#each inputs as ing}
                    {@const ingId = (ing as any).item_id || ing.item}
                    {@const ingItem = getItem(ingId)}
                    {@const status = getIngredientStatus(
                      ingId,
                      ing.quantity,
                      qty
                    )}

                    <div class="flex justify-between items-center text-xs">
                      <div class="flex items-center gap-2 text-slate-300">
                        <div
                          class="w-5 h-5 rounded bg-[#1e293b] flex items-center justify-center border border-slate-700"
                        >
                          <GameIcon icon={ingItem?.icon} size={12} />
                        </div>
                        <span class="font-medium text-slate-400"
                          >{ingItem?.name}</span
                        >
                      </div>
                      <div
                        class="font-mono font-bold {status.hasEnough
                          ? 'text-emerald-400'
                          : 'text-red-400'} bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800"
                      >
                        {status.available}/{status.required}
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="text-xs text-slate-600 italic text-center py-2">
                  Aucun coût
                </p>
              {/if}
            </div>

            <!-- Controls -->
            <div class="space-y-3 mt-auto">
              <!-- Quantity Stepper -->
              <div
                class="flex items-center bg-[#0f172a] rounded-lg border border-[#334155] p-1"
              >
                <button
                  onclick={() => adjustQuantity(recipe.id, -1)}
                  class="w-8 h-8 flex items-center justify-center rounded bg-[#1e293b] hover:bg-[#334155] text-slate-400 hover:text-white transition-colors border border-[#334155]"
                  >-</button
                >
                <div
                  class="flex-1 text-center font-mono font-bold text-slate-200"
                >
                  <span class="text-slate-500 text-[10px] mr-1">x</span>{qty}
                </div>
                <button
                  onclick={() => adjustQuantity(recipe.id, 1)}
                  class="w-8 h-8 flex items-center justify-center rounded bg-[#1e293b] hover:bg-[#334155] text-slate-400 hover:text-white transition-colors border border-[#334155]"
                  >+</button
                >
              </div>

              <!-- Action Button -->
              <button
                onclick={() => handleProduce(recipe)}
                disabled={!craftable || producing[recipe.id]}
                class="w-full py-3 rounded-lg font-bold text-xs uppercase tracking-widest relative overflow-hidden transition-all duration-200 border
                  {craftable
                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-indigo-500/50 shadow-[0_4px_0_#312e81] hover:shadow-[0_2px_0_#312e81] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none'
                  : 'bg-[#1e293b] text-slate-600 border-[#334155] cursor-not-allowed opacity-75'}"
              >
                {#if producing[recipe.id]}
                  <span class="flex items-center justify-center gap-2">
                    <span
                      class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    ></span>
                    Fabrication...
                  </span>
                {:else}
                  Fabriquer
                {/if}
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
