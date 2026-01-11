<script lang="ts">
  import { wikiCategories } from "$lib/data/wiki-categories";
  import { fade } from "svelte/transition";

  export let data;

  $: ({ article } = data);
  $: category = wikiCategories.find((c) => c.id === article?.category);
</script>

<svelte:head>
  <title>{article.title} | Archives Omni</title>
  <meta name="description" content={article.excerpt} />
</svelte:head>

<div
  class="min-h-screen bg-black text-slate-300 py-20 px-4 selection:bg-indigo-500/30 font-sans"
>
  <!-- Global Background -->
  <div class="fixed inset-0 pointer-events-none z-0">
    <div
      class="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] bg-center"
    ></div>
  </div>

  <div class="max-w-4xl mx-auto relative z-10" in:fade={{ duration: 600 }}>
    <!-- Header / Context -->
    <div class="mb-12">
      <a
        href="/wiki"
        class="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-400 transition-colors mb-8 group"
      >
        <span class="group-hover:-translate-x-1 transition-transform">←</span> Retour
        aux Archives
      </a>

      <div class="flex items-center gap-4 mb-6">
        <span
          class="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-sm font-medium text-indigo-300"
        >
          <span>{category?.icon}</span>
          {category?.title}
        </span>
        <span class="text-slate-700">/</span>
        <span class="text-slate-500 text-sm font-mono uppercase tracking-wider"
          >ID-{article.slug
            .replace("item-", "")
            .replace("recipe-", "")
            .replace("tech-", "")
            .substring(0, 8)
            .toUpperCase()}</span
        >
      </div>

      <h1
        class="text-5xl md:text-6xl font-black text-white mb-8 leading-tight tracking-tight"
      >
        {article.title}
      </h1>

      <div
        class="p-6 bg-slate-900/30 border-l-4 border-indigo-500 backdrop-blur-sm rounded-r-xl"
      >
        <p class="text-xl text-slate-200 leading-relaxed font-light italic">
          "{article.excerpt}"
        </p>
      </div>
    </div>

    <!-- Content Card -->
    <div
      class="bg-slate-900/20 border border-slate-800/50 rounded-3xl p-8 md:p-12 mb-16 backdrop-blur-md shadow-2xl"
    >
      <article
        class="prose prose-invert prose-lg max-w-none
                prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
                prose-p:text-slate-300 prose-p:leading-8
                prose-a:text-indigo-400 hover:prose-a:text-indigo-300
                prose-strong:text-white prose-strong:font-bold
                prose-ul:marker:text-indigo-500
                prose-li:text-slate-300"
      >
        {@html article.content}
      </article>
    </div>

    <!-- Footer Action -->
    <div
      class="flex flex-col md:flex-row gap-6 justify-between items-center pt-8 border-t border-slate-900"
    >
      <div>
        <h3 class="text-lg font-bold text-white mb-2">
          Données insuffisantes ?
        </h3>
        <p class="text-slate-500 text-sm">
          Consultez le réseau neural des autres CEOs.
        </p>
      </div>
      <a
        href="https://discord.gg/97qSsc6Vrs"
        target="_blank"
        class="px-6 py-3 bg-[#5865F2]/10 hover:bg-[#5865F2] text-[#5865F2] hover:text-white font-semibold rounded-xl border border-[#5865F2]/20 hover:border-transparent transition-all duration-300 flex items-center gap-3"
      >
        <svg
          class="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
          ><path
            d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2763-3.68-.2763-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"
          ></path></svg
        >
        Rejoindre les Communications
      </a>
    </div>
  </div>
</div>
