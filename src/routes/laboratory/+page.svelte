<script lang="ts">
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { fetchTechTree } from "$lib/services/tech";
    import { fetchDashboardData, type DashboardData } from "$lib/dashboard";
    import { activeCompany } from "$lib/stores";
    import pb from "$lib/pocketbase";
    import type { Technology } from "$lib/types";
    import TechCard from "$lib/components/TechCard.svelte";
    import StatCard from "$lib/components/StatCard.svelte";
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
        }),
    );

    // Grouper les technologies par niveau
    const techsByLevel = $derived.by(() => {
        const grouped = new Map<
            number,
            (Technology & { isOwned: boolean })[]
        >();
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
                <button
                    onclick={() => goto("/dashboard")}
                    class="text-slate-400 hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                    ← Tableau de bord
                </button>
                <div>
                    <h1 class="text-4xl font-black text-white tracking-tight">
                        📚 Laboratoire
                    </h1>
                    <p class="text-slate-400 mt-1">
                        Débloquez de nouvelles technologies pour progression
                        votre entreprise.
                    </p>
                </div>
            </div>

            {#if dashboardData}
                <StatCard
                    title="POINTS TECH"
                    value={dashboardData.company.tech_points}
                    color="indigo"
                />
            {/if}
        </header>

        {#if error}
            <div
                transition:fade={{ duration: 200 }}
                class="p-4 bg-red-500/10 border border-red-600/30 rounded-lg"
            >
                <p class="text-sm text-red-400">❌ {error}</p>
            </div>
        {/if}

        {#if loading}
            <div class="flex flex-col items-center justify-center py-12">
                <div
                    class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"
                ></div>
                <p class="mt-4 text-slate-400">
                    Chargement des technologies...
                </p>
            </div>
        {:else if technologies.length === 0}
            <div class="text-center py-12">
                <p class="text-slate-400">Aucune technologie disponible</p>
            </div>
        {:else}
            <!-- Stats Section -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                    class="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
                >
                    <p class="text-sm text-slate-400">
                        Technologies débloquées
                    </p>
                    <p class="text-3xl font-black text-emerald-400">
                        {technologies.filter((t) => t.isOwned).length}
                    </p>
                    <p class="text-xs text-slate-500 mt-1">
                        sur {technologies.length}
                    </p>
                </div>
                <div
                    class="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
                >
                    <p class="text-sm text-slate-400">
                        Prochain seuil de niveau
                    </p>
                    <p class="text-3xl font-black text-amber-400">
                        {Math.max(
                            ...technologies.map((t) => t.required_level || 0),
                        )}
                    </p>
                </div>
                <div
                    class="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
                >
                    <p class="text-sm text-slate-400">Points disponibles</p>
                    <p class="text-3xl font-black text-indigo-400">
                        {dashboardData?.company.tech_points || 0}
                    </p>
                </div>
            </div>

            <!-- Tech Tree by Level -->
            <div class="space-y-8">
                {#each techsByLevel as [level, techs] (level)}
                    <section>
                        <h2
                            class="text-2xl font-bold text-white mb-4 border-b border-slate-700 pb-2"
                        >
                            Niveau {level}
                        </h2>
                        <div
                            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                        >
                            {#each techs as tech (tech.id)}
                                <TechCard
                                    technology={tech}
                                    availableTechPoints={dashboardData?.company
                                        .tech_points || 0}
                                    companyLevel={dashboardData?.company
                                        .level || 1}
                                    companyId={$activeCompany?.id || ""}
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
                    class="bg-slate-800/30 border border-slate-700 rounded-lg p-6"
                >
                    <h3 class="text-xl font-bold text-white mb-4">
                        🎯 Prochaines cibles
                    </h3>
                    <div class="space-y-3">
                        {#each technologies.slice(0, 3) as tech}
                            {#if !tech.isOwned}
                                <div
                                    class="flex items-center justify-between p-3 bg-slate-700/30 rounded border border-slate-600"
                                >
                                    <div class="flex-1">
                                        <p class="font-semibold text-white">
                                            {tech.name}
                                        </p>
                                        <p class="text-xs text-slate-400">
                                            Coût: {tech.cost} pts | Niveau requis:
                                            {tech.required_level}
                                        </p>
                                    </div>
                                    <div class="text-right">
                                        {#if dashboardData.company.tech_points >= tech.cost && dashboardData.company.level >= tech.required_level}
                                            <span
                                                class="text-xs text-emerald-400 font-semibold"
                                                >✓ Accessible</span
                                            >
                                        {:else}
                                            <span
                                                class="text-xs text-amber-400 font-semibold"
                                                >⏳ Bloquée</span
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
