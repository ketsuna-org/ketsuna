<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { fetchTechTree } from "$lib/services/tech";
  import { fetchDashboardData, type DashboardData } from "$lib/dashboard";
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import type { Technology } from "$lib/pocketbase";
  import TechCard from "$lib/components/TechCard.svelte";

  import { notifications } from "$lib/notifications";

  let technologies: Array<Technology & { isOwned: boolean }> = $state([]);
  let dashboardData: DashboardData | null = $state(null);
  let loading = $state(true);
  let error = $state("");
  let filterLevel = $state(0);

  $effect(() => {
    if ($activeCompany) {
      loadData();
    }
  });

  async function loadData() {
    loading = true;
    error = "";
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) throw new Error("Non connecté");
      if (!$activeCompany?.id) throw new Error("Pas d'entreprise active");

      [technologies, dashboardData] = await Promise.all([
        fetchTechTree($activeCompany.id),
        fetchDashboardData(userId),
      ]);
    } catch (err: any) {
      error = err.message;
      notifications.error(error);
    } finally {
      loading = false;
    }
  }

  // Filtrer les technologies par niveau requis
  const filteredTechs = $derived(
    technologies.filter((t) => {
      const levelMatch = !filterLevel || t.required_level <= filterLevel;
      return levelMatch;
    })
  );

  // Grouper les technologies par niveau
  const techsByLevel = $derived.by(() => {
    const grouped = new Map<number, (Technology & { isOwned: boolean })[]>();
    filteredTechs.forEach((tech) => {
      const level = tech.required_level || 1;
      if (!grouped.has(level)) {
        grouped.set(level, []);
      }
      grouped.get(level)!.push(tech);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
  });

  function handleTechUnlock() {
    loadData();
  }
</script>

<div class="min-h-screen bg-slate-950 text-slate-200 p-6">
  <div class="max-w-7xl mx-auto space-y-8">
    <!-- Header -->
    <header
      class="flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div class="flex items-center gap-4">
        <div>
          <h1
            class="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3"
          >
            <span class="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path
                  d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
                ></path></svg
              >
            </span>
            Laboratoire
          </h1>
          <p class="text-slate-400 mt-2 text-sm ml-1">
            Débloquez de nouvelles technologies pour faire progresser votre
            entreprise.
          </p>
        </div>
      </div>
    </header>

    {#if error}
      <div
        transition:fade={{ duration: 200 }}
        class="p-4 bg-red-500/10 border border-red-600/30 rounded-xl flex items-center gap-3"
      >
        <span class="text-2xl">❌</span>
        <p class="text-sm text-red-300 font-medium">{error}</p>
      </div>
    {/if}

    {#if loading}
      <div class="flex flex-col items-center justify-center py-20">
        <div class="relative w-16 h-16">
          <div
            class="absolute top-0 left-0 w-full h-full border-4 border-slate-700 rounded-full"
          ></div>
          <div
            class="absolute top-0 left-0 w-full h-full border-4 border-indigo-500 rounded-full animate-spin border-t-transparent"
          ></div>
        </div>
        <p class="mt-6 text-slate-400 font-medium animate-pulse">
          Chargement des données...
        </p>
      </div>
    {:else if technologies.length === 0}
      <div
        class="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800 border-dashed"
      >
        <span class="text-4xl block mb-4">🧪</span>
        <p class="text-slate-400 font-medium">
          Aucune technologie disponible pour le moment.
        </p>
      </div>
    {:else}
      <!-- Stats Section -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Balance Card -->
        <div
          class="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden"
        >
          <div
            class="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl"
          ></div>
          <div class="relative z-10">
            <p
              class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2"
            >
              Solde disponible
            </p>
            <p class="text-3xl font-black text-white">
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              }).format(dashboardData?.financials.cash || 0)}
            </p>
            <p class="text-xs text-indigo-400/80 mt-1 font-medium">
              Pour débloquer les technologies
            </p>
          </div>
        </div>

        <div
          class="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden"
        >
          <div
            class="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"
          ></div>
          <div class="relative z-10">
            <p
              class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2"
            >
              Technologies débloquées
            </p>
            <div class="flex items-end gap-2">
              <span class="text-3xl font-black text-white">
                {technologies.filter((t) => t.isOwned).length}
              </span>
              <span class="text-sm text-slate-500 font-medium mb-1"
                >/ {technologies.length}</span
              >
            </div>
            <div
              class="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden"
            >
              <div
                class="bg-emerald-500 h-full rounded-full"
                style="width: {(technologies.filter((t) => t.isOwned).length /
                  technologies.length) *
                  100}%"
              ></div>
            </div>
          </div>
        </div>

        <div
          class="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden"
        >
          <div
            class="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"
          ></div>
          <div class="relative z-10">
            {#if technologies
              .map((t) => t.required_level)
              .sort((a, b) => a - b)
              .find((l) => l > (dashboardData?.company.level || 1))}
              {@const nextLevel = technologies
                .map((t) => t.required_level)
                .sort((a, b) => a - b)
                .find((l) => l > (dashboardData?.company.level || 1))}
              <p
                class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2"
              >
                Prochain Palier
              </p>
              <p class="text-3xl font-black text-white">
                Niveau {nextLevel}
              </p>
              <p class="text-xs text-amber-500/80 mt-1 font-medium">
                Débloque de nouvelles technologies
              </p>
            {:else}
              <p
                class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2"
              >
                Arbre Technologique
              </p>
              <p class="text-3xl font-black text-emerald-400">Complet</p>
              <p class="text-xs text-slate-500 mt-1 font-medium">
                Niveau {Math.max(
                  ...technologies.map((t) => t.required_level || 0)
                )} atteint
              </p>
            {/if}
          </div>
        </div>
      </div>

      <!-- Tech Tree by Level -->
      <div class="space-y-10">
        {#each techsByLevel as [level, techs] (level)}
          <section class="relative">
            <div class="flex items-center gap-4 mb-6">
              <div
                class="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center font-black text-slate-300 shadow-lg z-10 relative"
              >
                {level}
              </div>
              <h2
                class="text-xl font-bold text-white flex-1 flex items-center gap-2"
              >
                <span class="text-slate-400 font-normal">Palier</span> Niveau {level}
                <div class="h-px bg-slate-800 flex-1 ml-4"></div>
              </h2>
            </div>

            <div
              class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-5 md:pl-0 border-l-2 border-slate-800 md:border-l-0 ml-5 md:ml-0 pb-4 md:pb-0"
            >
              {#each techs as tech (tech.id)}
                <TechCard
                  technology={tech}
                  companyLevel={dashboardData?.company.level || 1}
                  companyId={$activeCompany?.id || ""}
                  availableBalance={dashboardData?.financials.cash || 0}
                  isOwned={tech.isOwned}
                  onUnlock={handleTechUnlock}
                />
              {/each}
            </div>
          </section>
        {/each}
      </div>

      <!-- Technology Progress Section -->
      {#if dashboardData}
        <section
          class="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm"
        >
          <h3 class="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <span class="text-indigo-400">🎯</span> Objectifs recommandés
          </h3>
          <div class="space-y-3">
            {#each technologies.slice(0, 3) as tech}
              {#if !tech.isOwned}
                <div
                  class="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors group"
                >
                  <div class="flex items-center gap-4">
                    <div
                      class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-lg text-slate-400 group-hover:text-white transition-colors"
                    >
                      🔭
                    </div>
                    <div>
                      <p class="font-bold text-white text-sm">
                        {tech.name}
                      </p>
                      <div class="flex gap-3 text-xs text-slate-400 mt-1">
                        <span class="flex items-center gap-1"
                          >📈 Niv {tech.required_level}</span
                        >
                      </div>
                    </div>
                  </div>
                  <div class="text-right">
                    {#if dashboardData.company.level >= tech.required_level}
                      <span
                        class="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 uppercase tracking-wide"
                        >Disponible</span
                      >
                    {:else}
                      <span
                        class="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-1 rounded border border-amber-500/20 uppercase tracking-wide"
                        >Verrouillé</span
                      >
                    {/if}
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        </section>
      {/if}
    {/if}
  </div>
</div>

<style>
  :global(body) {
    background-color: rgb(15, 23, 42);
  }
</style>
