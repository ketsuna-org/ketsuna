<script lang="ts">
  import {
    wikiCategories,
    getArticlesByCategory,
    type WikiCategory,
  } from "$lib/data/wiki-categories";
  import {
    items,
    recipes,
    technologies,
    loadGameData,
    isLoading,
  } from "$lib/data/game-static";
  import { onMount } from "svelte";
  import { fade, fly } from "svelte/transition";

  export let data;

  onMount(async () => {
    // Trigger data fetch if needed (cached)
    loadGameData();
  });

  // Reactive Logic
  $: staticArticles = data.articles || [];

  // Consolidated Logic to avoid duplicates and preserve order
  $: allCategories = wikiCategories.map((cat) => {
    let articles: any[] = [];
    let description = cat.description;
    let sorted = false;

    if (cat.id === "items") {
      articles = $items
        .filter((i) => i.type !== "Machine")
        .map((i) => ({
          title: i.name,
          slug: `item-${i.id}`,
          excerpt: i.type,
        }));
      description = `${articles.length} objets répertoriés dans la base de données.`;
      sorted = true;
    } else if (cat.id === "machines") {
      articles = $items
        .filter((i) => i.type === "Machine")
        .map((i) => ({
          title: i.name,
          slug: `item-${i.id}`,
          excerpt: "Machine Industrielle",
        }));
      description = `${articles.length} machines industrielles.`;
      sorted = true;
    } else if (cat.id === "technologies") {
      articles = $technologies.map((t) => ({
        title: t.name,
        slug: `tech-${t.id}`,
        excerpt: `Lvl ${t.required_level}`,
      }));
      description = `${articles.length} recherches disponibles.`;
      sorted = true;
    } else if (cat.id === "recipes") {
      articles = $recipes.map((r) => ({
        title: r.name,
        slug: `recipe-${r.id}`,
        excerpt: `${r.production_time}s`,
      }));
      description = `${articles.length} procédés de fabrication.`;
      sorted = true;
    } else {
      // Static Content
      articles = getArticlesByCategory(cat.id, staticArticles);
      sorted = false;
    }

    if (sorted) {
      articles.sort((a, b) => a.title.localeCompare(b.title));
    }

    return {
      ...cat,
      description,
      articles,
      sorted,
    };
  });
</script>

<svelte:head>
  <title>Wiki & Archives | Secteur Omni</title>
  <meta
    name="description"
    content="Archives officielles du Secteur Omni. Comprendre les règles pour dominer."
  />
</svelte:head>

<div
  class="min-h-screen bg-black text-slate-300 font-sans selection:bg-indigo-500/30"
>
  <!-- Background Elements -->
  <div class="fixed inset-0 pointer-events-none">
    <div
      class="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] bg-center"
    ></div>
    <div
      class="absolute top-0 w-full h-px bg-linear-to-r from-transparent via-indigo-900/50 to-transparent"
    ></div>
  </div>

  <div class="max-w-7xl mx-auto px-4 py-20 relative z-10">
    <!-- Header -->
    <div class="text-center mb-20">
      <div
        in:fade={{ duration: 1000 }}
        class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800 bg-slate-900/50 backdrop-blur-sm text-xs font-mono text-indigo-400 mb-6"
      >
        <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
        ARCHIVES CENTRALES
      </div>

      <h1
        in:fly={{ y: 20, duration: 1000, delay: 200 }}
        class="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight"
      >
        Omniscience <span class="text-indigo-500">Database</span>
      </h1>

      <p
        in:fly={{ y: 20, duration: 1000, delay: 400 }}
        class="text-xl text-slate-400 max-w-2xl mx-auto"
      >
        "La Connaissance c'est le Pouvoir. L'Ignorance c'est la Faillite."
      </p>
    </div>

    <!-- Loading State -->
    {#if $isLoading && allCategories.length === 0}
      <div class="flex justify-center py-20">
        <div
          class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"
        ></div>
      </div>
    {:else}
      <!-- Masonry/Grid Layout -->
      <div class="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
        {#each allCategories as category, i}
          <div
            in:fly={{ y: 30, duration: 800, delay: 0 + i * 100 }}
            class="group relative bg-slate-900/40 border border-slate-800 rounded-3xl p-8 hover:border-indigo-500/30 hover:bg-slate-900/60 transition-all duration-500"
          >
            <!-- Hover Gradient -->
            <div
              class="absolute inset-0 bg-linear-to-br from-indigo-500/0 via-transparent to-transparent opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity duration-500 pointer-events-none"
            ></div>

            <div class="flex items-start justify-between mb-8">
              <div
                class="w-14 h-14 bg-slate-800/50 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-300"
              >
                {category.icon}
              </div>
              <div
                class="text-xs font-mono text-slate-600 uppercase tracking-widest"
              >
                SEC-{i + 1}
              </div>
            </div>

            <h2
              class="text-3xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors"
            >
              {category.title}
            </h2>
            <p
              class="text-slate-400 text-sm mb-8 leading-relaxed border-l-2 border-slate-800 pl-4"
            >
              {category.description}
            </p>

            <div
              class="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
            >
              {#each category.articles as article}
                <a
                  href="/wiki/{article.slug}"
                  class="flex items-center justify-between p-4 rounded-xl bg-black/20 hover:bg-indigo-500/10 border border-slate-800/50 hover:border-indigo-500/30 transition-all duration-200 group-inner"
                >
                  <div
                    class="font-medium text-slate-300 group-inner-hover:text-white transition-colors"
                  >
                    {article.title}
                  </div>
                  <div class="flex items-center gap-3">
                    {#if article.excerpt && article.excerpt.length < 20}
                      <span class="text-xs text-slate-600 font-mono"
                        >{article.excerpt}</span
                      >
                    {/if}
                    <span
                      class="text-slate-600 group-inner-hover:translate-x-1 transition-transform"
                      >→</span
                    >
                  </div>
                </a>
              {/each}

              {#if category.articles.length === 0}
                <div class="text-sm text-slate-600 italic px-3 py-2">
                  Données corrompues ou manquantes...
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <div class="mt-20 text-center">
      <a
        href="/"
        class="text-slate-500 hover:text-white transition-colors underline decoration-slate-800 underline-offset-4"
        >Retour au Portail</a
      >
    </div>
  </div>
</div>
