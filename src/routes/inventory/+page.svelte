<script lang="ts">
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import type { InventoryItem } from "$lib/types";
  import ItemCard from "$lib/components/ItemCard.svelte";
  import { fade } from "svelte/transition";

  let inventory = $state<InventoryItem[]>([]);
  let loading = $state(true);

  async function loadInventory() {
    if (!$activeCompany) return;
    loading = true;
    try {
      // Expand 'item' to get details like name, price, type
      const result = await pb
        .collection("inventory")
        .getList<InventoryItem>(1, 50, {
          filter: `company = "${$activeCompany.id}"`,
          expand: "item",
          sort: "item.name",
        });
      inventory = result.items;
    } catch (e) {
      console.error("Failed to load inventory", e);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if ($activeCompany) {
      loadInventory();
    }
  });
</script>

<div class="container mx-auto p-4 max-w-6xl">
  <div class="flex justify-between items-center mb-8">
    <div class="flex items-center gap-4">
        <a href="/company" class="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </a>
        <h1 class="text-3xl font-bold text-white">Inventaire & Stockage</h1>
    </div>
  </div>

  {#if loading}
    <div class="text-center text-slate-400 py-10">
      Chargement de l'inventaire...
    </div>
  {:else if inventory.length === 0}
    <div
      class="text-center text-slate-500 py-10 bg-slate-800/50 rounded-lg border border-slate-700"
      in:fade
    >
      <p class="text-xl mb-2">Entrepôt Vide</p>
      <p class="text-sm">
        Vos entrepôts sont vides. Produisez ou achetez des ressources pour les
        remplir.
      </p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" in:fade>
      {#each inventory as invItem}
        <ItemCard inventoryItem={invItem} />
      {/each}
    </div>
  {/if}
</div>
