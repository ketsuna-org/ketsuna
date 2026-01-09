<script context="module">
  const pillars = [
    {
      name: "Terra-Forma",
      domain: "Terres & Écosystèmes",
      nickname: "Les Jardiniers",
      secret: "Contrôle de l'oxygène",
      color: "from-emerald-500 to-teal-600",
      icon: "🌿",
      description: "Tu ne paies pas ? On réduit le débit de ta ville.",
    },
    {
      name: "Aethel-Mining",
      domain: "Ressources Brutes",
      nickname: "Les Creuseurs",
      secret: "Monde creux",
      color: "from-amber-500 to-orange-600",
      icon: "⛏️",
      description:
        "Ils dévorent la croûte terrestre. Le monde est littéralement creux en dessous.",
    },
    {
      name: "Apex-Dynamics",
      domain: "Machines & IA",
      nickname: "Les Forgerons",
      secret: "Droit de retrait des machines",
      color: "from-slate-500 to-zinc-600",
      icon: "🤖",
      description: "Leurs machines peuvent s'éteindre si le client désobéit.",
    },
    {
      name: "Soma-Corp",
      domain: "Humains (Main d'œuvre)",
      nickname: "Les Éleveurs",
      secret: "Unités biologiques optimisées",
      color: "from-pink-500 to-rose-600",
      icon: "🧬",
      description:
        "Ils ne gèrent pas des employés, mais des unités génétiquement optimisées.",
    },
    {
      name: "Nexa-Bank",
      domain: "Argent & Données",
      nickname: "Les Archivistes",
      secret: "La monnaie est le temps de vie",
      color: "from-indigo-500 to-purple-600",
      icon: "🏦",
      description: "Ton compte en banque affiche tes minutes restantes.",
    },
  ];

  const extendedLore = [
    {
      title: "La Main-d'œuvre",
      subtitle: "Soma-Corp",
      icon: "🧬",
      content:
        "Chaque humain naît avec une 'Spécialisation de Naissance'. Bras renforcés ou cerveaux câblés, ils sont dépendants d'une drogue d'entreprise pour survivre.",
    },
    {
      title: "Le Cinquième Monde",
      subtitle: "Les Zones Blanches",
      icon: "🏚️",
      content:
        "Dans les interstices, les rebuts recyclent les déchets des 5 entreprises pour créer une technologie hybride et rebelle.",
    },
    {
      title: "La Religion du Profit",
      subtitle: "Le Dividende Sacré",
      icon: "🙏",
      content:
        "La réussite sociale est la seule forme de salut. La faillite est un péché mortel.",
    },
  ];
</script>

<script lang="ts">
  import { goto } from "$app/navigation";
  import pb from "$lib/pocketbase";
  import { fade, fly } from "svelte/transition";

  function startPlaying() {
    if (pb.authStore.isValid) {
      goto("/factory");
    } else {
      goto("/login");
    }
  }
</script>

<svelte:head>
  <title>Ketsuna: Iron Symphony</title>
</svelte:head>

<div
  class="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30"
>
  <!-- Hero Section -->
  <section
    class="relative flex items-center justify-center min-h-[90vh] px-4 overflow-hidden"
  >
    <!-- Background Effects -->
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none"
    ></div>
    <div class="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>

    <div class="relative z-10 text-center max-w-5xl mx-auto">
      <div
        in:fade={{ duration: 1000, delay: 200 }}
        class="inline-flex items-center px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm font-medium mb-8 backdrop-blur-sm"
      >
        <span class="flex w-2 h-2 bg-indigo-400 rounded-full mr-3 animate-pulse"
        ></span>
        Symphonie de Fer v0.1
      </div>

      <h1
        in:fly={{ y: 20, duration: 1000, delay: 400 }}
        class="text-5xl sm:text-7xl md:text-8xl font-black mb-8 tracking-tight leading-none text-white"
      >
        Le Grand <span
          class="bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
          >Équilibre</span
        >
      </h1>

      <p
        in:fly={{ y: 20, duration: 1000, delay: 600 }}
        class="text-xl md:text-2xl mb-12 text-slate-400 max-w-3xl mx-auto leading-relaxed"
      >
        <span class="text-white font-serif italic">"Le Pacte de l'Usure"</span
        ><br />
        Le monde n'est plus divisé par des frontières, mais par des Chaînes de Valeur.
        Si l'une des cinq entreprises tombe, l'humanité s'arrête.
      </p>

      <div
        in:fly={{ y: 20, duration: 1000, delay: 800 }}
        class="flex flex-col sm:flex-row gap-6 justify-center items-center"
      >
        <button
          onclick={startPlaying}
          class="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-indigo-900/20 transition-all duration-200 transform hover:-translate-y-0.5 overflow-hidden"
        >
          <div
            class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
          ></div>
          <span class="relative">Rejoindre la Symphonie</span>
        </button>

        <a
          href="#lore"
          class="px-8 py-4 bg-slate-900/50 hover:bg-slate-800 text-slate-300 font-medium rounded-xl border border-slate-700/50 backdrop-blur-sm transition-colors duration-200"
        >
          Découvrir le Lore
        </a>
      </div>
    </div>
  </section>

  <!-- Les 5 Piliers -->
  <section
    id="lore"
    class="py-32 px-4 border-t border-slate-800/50 bg-slate-900/20"
  >
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-20">
        <h2 class="text-3xl md:text-5xl font-black mb-6 text-white">
          Les Cinq Piliers
        </h2>
        <p class="text-slate-400 text-lg max-w-2xl mx-auto">
          Les corporations qui détiennent le destin de l'humanité.
        </p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {#each pillars as pillar, i}
          <div
            class="group relative bg-slate-900/50 border border-slate-800 rounded-3xl p-8 hover:border-slate-600/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
          >
            <!-- Gradient Overlay -->
            <div
              class={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-linear-to-br ${pillar.color}`}
            ></div>

            <div class="relative z-10">
              <div
                class={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6 bg-linear-to-br ${pillar.color} shadow-lg`}
              >
                {pillar.icon}
              </div>

              <h3 class="text-2xl font-bold mb-2 text-white">{pillar.name}</h3>
              <div class="text-sm font-medium text-indigo-400 mb-4">
                {pillar.nickname}
              </div>

              <p class="text-slate-300 mb-6 leading-relaxed">
                {pillar.description}
              </p>

              <div class="pt-6 border-t border-slate-800/50">
                <div
                  class="text-xs text-slate-500 uppercase tracking-wider mb-1"
                >
                  Secret
                </div>
                <div class="text-sm font-medium text-slate-200">
                  {pillar.secret}
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Le Twist Narratif -->
  <section class="py-32 px-4 relative overflow-hidden">
    <!-- Dark Background -->
    <div class="absolute inset-0 bg-slate-950">
      <div
        class="absolute inset-0 bg-linear-to-tr from-rose-900/10 via-slate-950 to-indigo-900/10"
      ></div>
    </div>

    <div class="max-w-6xl mx-auto relative z-10">
      <div class="grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div
            class="inline-block px-3 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-widest mb-6"
          >
            Menace Critique
          </div>
          <h2
            class="text-4xl md:text-6xl font-black mb-8 text-white leading-tight"
          >
            L'Entropie &<br />
            <span class="text-rose-500">L'Étincelle</span>
          </h2>

          <div class="space-y-6 text-lg text-slate-300">
            <p>
              Le problème n'est pas que ces entreprises dominent, c'est que le
              monde arrive à épuisement.
            </p>
            <p>
              <strong>Le Conflit :</strong> Les ressources brutes s'épuisent. Terra-Forma
              manque de machines, Apex-Dynamics manque de minerais, Aethel-Mining
              manque d'humains... La machine se grippe.
            </p>
            <div
              class="p-6 bg-rose-950/20 border border-rose-900/30 rounded-2xl"
            >
              <p class="text-rose-200 font-medium">
                <strong>L'Étincelle :</strong> Un "Bug" dans le système de la Nexa-Bank
                a effacé les dettes d'une ville entière. Pour la première fois en
                deux siècles, des gens sont "libres", ce qui terrifie les Cinq.
              </p>
            </div>
          </div>
        </div>

        <div class="relative">
          <!-- Visual representation of chaos/entropy could go here -->
          <div class="relative w-full aspect-square max-w-md mx-auto">
            <div
              class="absolute inset-0 bg-linear-to-br from-indigo-500 to-rose-600 rounded-full blur-[100px] opacity-20 animate-pulse"
            ></div>
            <div
              class="relative h-full bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl rounded-2xl p-8 flex flex-col justify-center items-center text-center"
            >
              <span class="text-6xl mb-4">⚠️</span>
              <h3 class="text-2xl font-bold text-white mb-2">Erreur Système</h3>
              <p class="text-slate-400">
                Dette effacée. Sujet hors de contrôle.
              </p>
              <div
                class="mt-8 w-full h-2 bg-slate-800 rounded-full overflow-hidden"
              >
                <div class="h-full bg-rose-500 w-[85%] animate-pulse"></div>
              </div>
              <div
                class="flex justify-between w-full mt-2 text-xs text-rose-400 font-mono"
              >
                <span>INSTABILITÉ</span>
                <span>85%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Univers Étendu -->
  <section class="py-32 px-4 bg-slate-900/30 border-t border-slate-800/50">
    <div class="max-w-7xl mx-auto">
      <h2 class="text-3xl md:text-4xl font-bold mb-16 text-center text-white">
        Archives du Monde
      </h2>

      <div class="grid md:grid-cols-3 gap-8">
        {#each extendedLore as item}
          <div
            class="bg-slate-950 border border-slate-800 p-8 rounded-2xl hover:border-slate-600 transition-colors"
          >
            <div class="text-4xl mb-6">{item.icon}</div>
            <h3 class="text-xl font-bold text-white mb-1">{item.title}</h3>
            <div class="text-sm text-indigo-400 mb-4 font-mono">
              {item.subtitle}
            </div>
            <p class="text-slate-400 leading-relaxed text-sm">
              {item.content}
            </p>
          </div>
        {/each}
      </div>

      <div class="mt-20 text-center">
        <p class="text-slate-500 mb-8">Prêt à entrer dans la danse ?</p>
        <button
          onclick={startPlaying}
          class="px-10 py-4 bg-white text-slate-950 font-bold rounded-full hover:bg-slate-200 transition-colors shadow-xl hover:shadow-2xl hover:scale-105 transform duration-200"
        >
          Lancer la Simulation
        </button>
      </div>
    </div>
  </section>
</div>

<style>
  /* Add any specific custom styles here if tailwind isn't enough */
  :global(body) {
    background-color: #020617; /* slate-950 */
  }
</style>
