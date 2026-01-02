<script lang="ts">
  import {
    wikiCategories,
    wikiArticles,
    getArticlesByCategory,
  } from "$lib/data/wiki";

  // Group articles by category for display
  const articlesByCategory = wikiCategories.map((cat) => ({
    ...cat,
    articles: getArticlesByCategory(cat.id),
  }));
</script>

<svelte:head>
  <title>Wiki & Guides | Ketsuna: Iron Symphony</title>
  <meta
    name="description"
    content="Guides, tutoriels et lore pour maîtriser Ketsuna Business."
  />
</svelte:head>

<div class="min-h-screen bg-slate-950 text-slate-300 py-20 px-4">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-16">
      <h1
        class="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight"
      >
        Base de Connaissance
      </h1>
      <p class="text-xl text-slate-400 max-w-2xl mx-auto">
        Toutes les ressources nécessaires pour faire prospérer votre empire et
        dominer le marché.
      </p>
    </div>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {#each articlesByCategory as category}
        <div
          class="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 hover:border-indigo-500/30 transition-all duration-300 group"
        >
          <div
            class="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300"
          >
            {category.icon}
          </div>

          <h2 class="text-2xl font-bold text-white mb-2">{category.title}</h2>
          <p class="text-slate-400 text-sm mb-6 h-10">{category.description}</p>

          <div class="space-y-3">
            {#each category.articles as article}
              <a
                href="/wiki/{article.slug}"
                class="block p-3 rounded-lg bg-slate-950/50 hover:bg-indigo-500/10 border border-slate-800 hover:border-indigo-500/30 transition-all duration-200 group-inner"
              >
                <div
                  class="font-semibold text-slate-200 group-inner-hover:text-indigo-300 transition-colors"
                >
                  {article.title}
                </div>
                <!-- <div class="text-xs text-slate-500 mt-1 line-clamp-1">{article.excerpt}</div> -->
              </a>
            {/each}

            {#if category.articles.length === 0}
              <div class="text-sm text-slate-600 italic px-3 py-2">
                Bientôt disponible...
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
