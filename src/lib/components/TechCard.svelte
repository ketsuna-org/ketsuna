<script lang="ts">
  import type { Technology, Company } from "$lib/pocketbase";
  import { unlockTechnology } from "$lib/services/tech";
  import { notifications } from "$lib/notifications";
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import { onMount, onDestroy } from "svelte";

  let {
    technology,
    availableBalance = 0,
    companyLevel = 1,
    companyId = "",
    isOwned = false,
    isPending = false,
    completedAt = null,
    inventory = [],
    onUnlock = null,
  } = $props<{
    technology: Technology & {
      unlock_time?: number;
      required_items?: Array<{ item_id: string; quantity: number }>;
    };
    availableBalance?: number;
    companyLevel?: number;
    companyId?: string;
    isOwned?: boolean;
    isPending?: boolean;
    completedAt?: string | null;
    inventory?: Array<{ item_id: string; quantity: number }>;
    onUnlock?: (() => void) | null;
  }>();

  let isLoading = $state(false);
  let timeRemaining = $state(0);
  let progressPercent = $state(0);
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  // Check if required items are satisfied
  let hasRequiredItems = $derived.by(() => {
    if (!technology.required_items?.length) return true;
    return technology.required_items.every((req) => {
      const inv = inventory.find((i) => i.item_id === req.item_id);
      return inv && inv.quantity >= req.quantity;
    });
  });

  let canUnlock = $derived(
    !isOwned &&
      !isPending &&
      companyLevel >= technology.required_level &&
      availableBalance >= technology.cost &&
      hasRequiredItems
  );

  // Format time as HH:MM:SS or MM:SS
  function formatTime(seconds: number): string {
    if (seconds <= 0) return "Terminé!";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}h ${m.toString().padStart(2, "0")}m`;
    }
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  }

  function updateTimer() {
    if (!completedAt) return;
    const end = new Date(completedAt).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((end - now) / 1000));
    timeRemaining = remaining;

    // Calculate progress
    const unlockTime = technology.unlock_time || 0;
    if (unlockTime > 0) {
      progressPercent = Math.min(
        100,
        ((unlockTime - remaining) / unlockTime) * 100
      );
    }

    if (remaining <= 0 && timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      // Refresh to show completed state
      onUnlock?.();
    }
  }

  onMount(() => {
    if (isPending && completedAt) {
      updateTimer();
      timerInterval = setInterval(updateTimer, 1000);
    }
  });

  onDestroy(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  });

  async function handleUnlock() {
    if (!canUnlock || !companyId) return;

    isLoading = true;
    try {
      await unlockTechnology(companyId, technology);
      const updated = await pb.collection("companies").getOne(companyId);
      activeCompany.set(updated as unknown as Company);
      notifications.success(`${technology.name} débloquée !`);
      onUnlock?.();
    } catch (error: any) {
      notifications.error(`Erreur: ${error.message}`);
    } finally {
      isLoading = false;
    }
  }

  // Get item name from ID (simple lookup)
  function getItemName(itemId: string): string {
    const names: Record<string, string> = {
      petrol_pumpjack: "Pompe à Pétrole",
      steel: "Acier",
      iron_ingot: "Lingot de Fer",
      copper_ingot: "Lingot de Cuivre",
      wood: "Bois",
      plastic: "Plastique",
    };
    return names[itemId] || itemId;
  }

  function getInventoryQuantity(itemId: string): number {
    const item = inventory.find((i) => i.item_id === itemId);
    return item?.quantity || 0;
  }

  const categoryStyles: Record<string, { name: string; color: string }> = {
    general: {
      name: "Général",
      color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    },
    resource: {
      name: "Ressources",
      color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
    industry: {
      name: "Industrie",
      color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    },
    tech: {
      name: "High-Tech",
      color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    },
  };
</script>

<div
  class="relative border rounded-2xl p-6 transition-all duration-300 group
    {isOwned
    ? 'bg-slate-900/40 border-slate-800 opacity-75 grayscale-20 hover:grayscale-0 hover:opacity-100 hover:border-emerald-500/30'
    : isPending
      ? 'bg-slate-900/80 border-amber-500/50 shadow-lg shadow-amber-500/10'
      : canUnlock
        ? 'bg-slate-900/80 border-indigo-500/50 shadow-lg shadow-indigo-500/10 hover:border-indigo-400 hover:shadow-indigo-500/20 hover:-translate-y-1'
        : 'bg-slate-950/50 border-slate-800/50 opacity-60 hover:opacity-100 hover:border-slate-700'}"
>
  <!-- Card Header -->
  <div class="flex flex-col gap-3 mb-4">
    <div class="flex justify-between items-start">
      <div
        class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                {isOwned
          ? 'bg-emerald-500/10 text-emerald-500'
          : isPending
            ? 'bg-amber-500/10 text-amber-400'
            : canUnlock
              ? 'bg-indigo-500/10 text-indigo-400'
              : 'bg-slate-800 text-slate-600'}"
      >
        {#if isOwned}✨{:else if isPending}⏳{:else if canUnlock}🔓{:else}🔒{/if}
      </div>
      {#if isOwned}
        <span
          class="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20 uppercase tracking-wide"
        >
          Débloquée
        </span>
      {:else if isPending}
        <span
          class="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full border border-amber-500/20 uppercase tracking-wide animate-pulse"
        >
          En cours
        </span>
      {:else if !canUnlock}
        <span
          class="text-[10px] font-bold bg-slate-800 text-slate-500 px-2 py-1 rounded-full border border-slate-700 uppercase tracking-wide"
        >
          Verrouillée
        </span>
      {/if}
      <!-- Category Badge -->
      {#if technology.category && categoryStyles[technology.category]}
        <span
          class="text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-wide {categoryStyles[
            technology.category
          ].color}"
        >
          {categoryStyles[technology.category].name}
        </span>
      {/if}
    </div>

    <div>
      <h3
        class="text-lg font-bold text-white mb-1 leading-tight group-hover:text-indigo-400 transition-colors"
      >
        {technology.name}
      </h3>
      <p
        class="text-xs text-slate-400 leading-relaxed font-medium line-clamp-2"
        title={technology.description}
      >
        {technology.description}
      </p>
    </div>
  </div>

  <!-- Progress Bar for Pending -->
  {#if isPending}
    <div class="mb-4">
      <div class="flex justify-between items-center mb-1">
        <span class="text-xs text-amber-400 font-medium">⏳ Recherche...</span>
        <span class="text-xs text-amber-300 font-bold"
          >{formatTime(timeRemaining)}</span
        >
      </div>
      <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000"
          style="width: {progressPercent}%"
        ></div>
      </div>
    </div>
  {/if}

  <!-- Requirements Grid -->
  <div class="grid grid-cols-2 gap-2 mb-4">
    <!-- Cost -->
    <div class="bg-slate-950/50 rounded-lg p-2 border border-slate-800/50">
      <p class="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Coût</p>
      <div class="flex items-center gap-1.5">
        <span class="text-xs">💰</span>
        <span
          class="text-sm font-black {availableBalance >= technology.cost
            ? 'text-white'
            : 'text-red-400'}"
        >
          {new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          }).format(technology.cost)}
        </span>
      </div>
    </div>

    <!-- Level Req -->
    {#if technology.required_level > 0}
      <div class="bg-slate-950/50 rounded-lg p-2 border border-slate-800/50">
        <p class="text-[10px] text-slate-500 font-bold uppercase mb-0.5">
          Niveau
        </p>
        <div class="flex items-center gap-1.5">
          <span
            class="w-1.5 h-1.5 rounded-full {companyLevel >=
            technology.required_level
              ? 'bg-emerald-500'
              : 'bg-red-500'}"
          ></span>
          <span
            class="text-sm font-black {companyLevel >= technology.required_level
              ? 'text-white'
              : 'text-red-400'}"
          >
            {companyLevel}/{technology.required_level}
          </span>
        </div>
      </div>
    {/if}

    <!-- Unlock Time -->
    {#if technology.unlock_time && technology.unlock_time > 0 && !isOwned && !isPending}
      <div class="bg-slate-950/50 rounded-lg p-2 border border-slate-800/50">
        <p class="text-[10px] text-slate-500 font-bold uppercase mb-0.5">
          Temps
        </p>
        <div class="flex items-center gap-1.5">
          <span class="text-xs">⏱️</span>
          <span class="text-sm font-black text-white">
            {formatTime(technology.unlock_time)}
          </span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Required Items -->
  {#if technology.required_items && technology.required_items.length > 0 && !isOwned}
    <div class="mb-4">
      <p
        class="text-[10px] text-slate-500 font-bold uppercase mb-2 flex items-center gap-1"
      >
        <span class="text-orange-400">📦</span> Items Requis
      </p>
      <div class="flex flex-wrap gap-1.5">
        {#each technology.required_items as reqItem}
          {@const hasEnough =
            getInventoryQuantity(reqItem.item_id) >= reqItem.quantity}
          <div
            class="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md border
                        {hasEnough
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-red-500/10 text-red-300 border-red-500/30'}"
          >
            <span>{hasEnough ? "✓" : "✗"}</span>
            <span class="font-bold">{reqItem.quantity}x</span>
            <span class="font-medium truncate max-w-20"
              >{getItemName(reqItem.item_id)}</span
            >
            <span class="text-slate-500"
              >({getInventoryQuantity(reqItem.item_id)})</span
            >
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Unlocked Items Preview -->
  {#if technology.expand?.item_unlocked && technology.expand.item_unlocked.length > 0}
    <div class="mb-5">
      <p
        class="text-[10px] text-slate-500 font-bold uppercase mb-2 flex items-center gap-1"
      >
        <span class="text-purple-400">✦</span> Débloque
      </p>
      <div class="flex flex-wrap gap-1.5">
        {#each technology.expand.item_unlocked as item}
          <div
            class="flex items-center gap-1.5 text-[10px] bg-slate-800/80 text-slate-300 px-2 py-1 rounded-md border border-slate-700/50"
          >
            {#if isOwned}
              <span class="text-emerald-400">✓</span>
            {/if}
            <span class="font-medium truncate max-w-30">{item.name}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Action Button -->
  <div class="mt-auto">
    {#if !isOwned && !isPending}
      <button
        onclick={handleUnlock}
        disabled={!canUnlock || isLoading}
        class="w-full px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 relative overflow-hidden group/btn
                {canUnlock && !isLoading
          ? 'bg-indigo-600 text-white cursor-pointer hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'
          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}"
      >
        {#if isLoading}
          <span
            class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
          ></span>
        {:else if canUnlock}
          <div
            class="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"
          ></div>
          <span class="relative"
            >{technology.unlock_time
              ? "Lancer la recherche"
              : "Débloquer"}</span
          >
        {:else}
          <span>🔒 Verrouillé</span>
        {/if}
      </button>
      {#if !canUnlock && !isLoading}
        <p class="text-[10px] text-center text-red-400/80 mt-2 font-medium">
          {#if companyLevel < technology.required_level}
            Niveau {technology.required_level} requis
          {:else if availableBalance < technology.cost}
            Fonds insuffisants
          {:else if !hasRequiredItems}
            Items manquants
          {/if}
        </p>
      {/if}
    {/if}
  </div>
</div>
