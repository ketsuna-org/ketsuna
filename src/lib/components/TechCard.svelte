<script lang="ts">
  import type { Technology, Company } from "$lib/pocketbase";
  import { unlockTechnology } from "$lib/services/tech";
  import { notifications } from "$lib/notifications";
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";

  let {
    technology,
    availableBalance = 0,
    companyLevel = 1,
    companyId = "",
    isOwned = false,
    onUnlock = null,
  } = $props<{
    technology: Technology;
    availableBalance?: number;
    companyLevel?: number;
    companyId?: string;
    isOwned?: boolean;
    onUnlock?: (() => void) | null;
  }>();

  let isLoading = $state(false);

  let canUnlock = $derived(
    !isOwned &&
      companyLevel >= technology.required_level &&
      availableBalance >= technology.cost
  );

  async function handleUnlock() {
    if (!canUnlock || !companyId) return;

    isLoading = true;
    try {
      await unlockTechnology(companyId, technology);
      // Refresh activeCompany store to reflect tech_points and balance changes
      const updated = await pb.collection("companies").getOne(companyId); // Removed generic type as it might conflict if not imported
      activeCompany.set(updated as unknown as Company);
      notifications.success(`${technology.name} débloquée !`);
      onUnlock?.();
    } catch (error: any) {
      notifications.error(`Erreur: ${error.message}`);
    } finally {
      isLoading = false;
    }
  }
</script>

<div
  class="relative border rounded-2xl p-6 transition-all duration-300 group
    {isOwned
    ? 'bg-slate-900/40 border-slate-800 opacity-75 grayscale-20 hover:grayscale-0 hover:opacity-100 hover:border-emerald-500/30'
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
          : canUnlock
            ? 'bg-indigo-500/10 text-indigo-400'
            : 'bg-slate-800 text-slate-600'}"
      >
        {#if isOwned}✨{:else if canUnlock}🔓{:else}🔒{/if}
      </div>
      {#if isOwned}
        <span
          class="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20 uppercase tracking-wide"
        >
          Débloquée
        </span>
      {:else if !canUnlock}
        <span
          class="text-[10px] font-bold bg-slate-800 text-slate-500 px-2 py-1 rounded-full border border-slate-700 uppercase tracking-wide"
        >
          Verrouillée
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

  <!-- Requirements Grid -->
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
    {#if !isOwned}
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
          <span class="relative">Débloquer</span>
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
          {/if}
        </p>
      {/if}
    {/if}
  </div>
</div>
