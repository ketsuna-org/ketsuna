<script lang="ts">
  import { wikiCategories } from "$lib/data/wiki";

  export let data;

  const { article } = data;
  const category = wikiCategories.find((c) => c.id === article.category);
</script>

<svelte:head>
  <title>{article.title} | Ketsuna: Iron Symphony</title>
  <meta name="description" content={article.excerpt} />
</svelte:head>

<div class="min-h-screen bg-slate-950 text-slate-300 py-20 px-4">
  <div class="max-w-4xl mx-auto">
    <!-- Breadcrumb / Header -->
    <div class="mb-12">
      <a
        href="/wiki"
        class="inline-flex items-center text-sm text-slate-500 hover:text-indigo-400 transition-colors mb-6"
      >
        ← Retour au Wiki
      </a>

      <div class="flex items-center gap-3 mb-4">
        <span
          class="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-medium text-slate-400"
        >
          {category?.icon}
          {category?.title}
        </span>
      </div>

      <h1 class="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
        {article.title}
      </h1>

      <p
        class="text-xl text-slate-400 leading-relaxed border-l-4 border-indigo-500 pl-6"
      >
        {article.excerpt}
      </p>
    </div>

    <!-- Content -->
    <article
      class="prose prose-invert prose-lg max-w-none text-slate-300 prose-headings:text-white prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-strong:text-white"
    >
      <!-- Simple HTML rendering since content is trusted string from our own data file -->
      {@html article.content}
    </article>

    <div class="mt-16 pt-8 border-t border-slate-800">
      <h3 class="text-xl font-bold text-white mb-4">Besoin de plus d'aide ?</h3>
      <p class="text-slate-400 mb-6">
        Rejoignez la communauté des PDG sur Discord pour poser vos questions.
      </p>
      <a
        href="https://discord.gg/97qSsc6Vrs"
        target="_blank"
        class="inline-flex items-center gap-2 px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-900/20"
      >
        Rejoindre le Discord
      </a>
    </div>
  </div>
</div>
