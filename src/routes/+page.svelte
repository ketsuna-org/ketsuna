<script lang="ts">
  import { goto } from "$app/navigation";
  import pb from "$lib/pocketbase";
  import { onMount } from "svelte";
  import { fade, fly, scale } from "svelte/transition";
  import { cubicOut, quintOut } from "svelte/easing";

  let mounted = false;
  let introComplete = false;
  let portalScale = 1;
  let textOpacity = 1;

  onMount(() => {
    mounted = true;

    // Portal Animation Sequence
    setTimeout(() => {
      // Start expanding the portal
      portalScale = 50;
      textOpacity = 0;
    }, 2000);

    setTimeout(() => {
      introComplete = true;
    }, 3500);
  });

  function startPlaying() {
    if (pb.authStore.isValid) {
      goto("/factory");
    } else {
      goto("/login");
    }
  }

  const doctrines = [
    {
      name: "Le Marionnettiste",
      role: "Spécialisation Bourse",
      description:
        "Le vrai pouvoir réside dans la valeur perçue. Créez des krachs boursiers pour ruiner les armées adverses.",
      icon: "📈",
      color: "from-emerald-500 to-teal-400",
    },
    {
      name: "Le Baron de la Matière",
      role: "Monopole Ressources",
      description:
        "Celui qui contrôle le pétrole contrôle l'univers. Imposez votre 'Taxe Impériale' au monde entier.",
      icon: "🛢️",
      color: "from-amber-500 to-orange-400",
    },
    {
      name: "L'Architecte",
      role: "Machines & Composants",
      description:
        "Transformez la boue en miracle technologique. Vous êtes le marchand d'armes ultime.",
      icon: "⚙️",
      color: "from-indigo-500 to-purple-400",
    },
  ];
</script>

<svelte:head>
  <title>Ketsuna: L'Âge du Capital Absolu</title>
</svelte:head>

<div
  class="min-h-screen bg-black text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden"
>
  <!-- INTRO PORTAL SEQUENCE -->
  {#if !introComplete}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden pointer-events-none"
      out:fade={{ duration: 1000 }}
    >
      <!-- The Portal -->
      <div
        class="relative rounded-full aspect-square bg-white shadow-[0_0_100px_rgba(255,255,255,0.8)] transition-transform duration-[1500ms] ease-[cubic-bezier(0.7,0,0.3,1)]"
        style="width: 20px; transform: scale({portalScale});"
      >
        <div
          class="absolute inset-0 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-spin-slow opacity-80 blur-md"
        ></div>
      </div>

      <!-- Intro Text -->
      <div
        class="absolute inset-0 flex flex-col items-center justify-center text-white mix-blend-difference transition-opacity duration-500"
        style="opacity: {textOpacity};"
      >
        <div
          class="text-xs font-mono uppercase tracking-[0.3em] mb-4 text-slate-400"
        >
          Connexion en cours
        </div>
        <h1 class="text-4xl font-black tracking-tighter">
          SECTEUR <span class="text-indigo-500">OMNI</span>
        </h1>
      </div>
    </div>
  {/if}

  <!-- MAIN CONTENT -->
  {#if introComplete}
    <!-- Background Elements -->
    <div class="fixed inset-0 pointer-events-none">
      <div
        class="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] bg-center [mask-image:linear-gradient(to_bottom,transparent,black)]"
      ></div>
      <div
        class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"
      ></div>
      <div
        class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-rose-900/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2"
      ></div>
    </div>

    <!-- Hero Section -->
    <section
      class="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20"
    >
      <div
        class="text-center max-w-4xl mx-auto z-10"
        in:fade={{ duration: 1000, delay: 200 }}
      >
        <div
          class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800 bg-slate-950/50 backdrop-blur-sm text-xs font-mono text-indigo-400 mb-8"
        >
          <span class="relative flex h-2 w-2">
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"
            ></span>
            <span
              class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"
            ></span>
          </span>
          SYSTÈME OPÉRATIONNEL
        </div>

        <h1
          class="text-6xl md:text-8xl lg:text-9xl font-black text-white mb-6 leading-none tracking-tight"
        >
          CAPITAL<br />
          <span
            class="bg-linear-to-r from-indigo-400 via-purple-400 to-rose-400 bg-clip-text text-transparent"
            >ABSOLU</span
          >
        </h1>

        <p
          class="text-xl md:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          "Ici, la paix est une perte de temps et la guerre une opportunité de
          marché."
        </p>

        <div
          class="flex flex-col sm:flex-row gap-6 justify-center items-center"
        >
          <button
            onclick={startPlaying}
            class="group relative px-8 py-4 bg-white text-black font-bold text-lg rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Rejoindre le Marché
          </button>

          <a
            href="/wiki"
            class="px-8 py-4 text-slate-300 font-medium hover:text-white transition-colors border-b border-transparent hover:border-slate-500"
          >
            Explorer le Lore
          </a>
        </div>
      </div>

      <!-- Scroll Indicator -->
      <div
        class="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-slate-600"
      >
        ↓
      </div>
    </section>

    <!-- Context: The Fall -->
    <section class="py-32 px-4 relative z-10">
      <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div in:fly={{ x: -50, duration: 1000, delay: 200 }}>
          <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
            La Chute des Nations
          </h2>
          <div class="h-1 w-20 bg-rose-500 mb-8"></div>
          <p class="text-lg text-slate-300 leading-relaxed mb-6">
            Il n'y a plus de pays. Il n'y a plus de gouvernements. Après
            l'épuisement des ressources terrestres, l'humanité s'est tournée
            vers les étoiles.
          </p>
          <p class="text-lg text-slate-300 leading-relaxed">
            Dans cette ruée vers l'or galactique, seules les méga-corporations
            ont survécu. Aujourd'hui, l'univers est un immense marché libre
            dérégulé : le <strong class="text-white">Secteur Omni</strong>.
          </p>
        </div>
        <div
          class="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 group"
        >
          <div
            class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614728853975-69c960c7704e?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-110 transition-transform duration-700"
          ></div>
          <div
            class="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent"
          ></div>
          <div class="absolute bottom-6 left-6 right-6">
            <div class="text-xs font-mono text-rose-400 mb-2">
              ARCHIVE #2094
            </div>
            <div class="text-xl font-bold text-white">
              L'effondrement du dernier État
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- The Graal: Neutron Star -->
    <section
      class="py-32 px-4 bg-slate-950 border-y border-slate-900 relative overflow-hidden"
    >
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[100px]"
      ></div>

      <div class="max-w-4xl mx-auto text-center relative z-10">
        <div
          class="inline-block px-3 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-8"
        >
          Objectif Ultime
        </div>

        <h2 class="text-5xl md:text-7xl font-black text-white mb-8">
          L'Étoile "Zéro"
        </h2>

        <p class="text-2xl text-slate-300 mb-12">
          La Singularité Économique. Celui qui la contrôle, contrôle
          l'Omniscience.
        </p>

        <div class="grid md:grid-cols-3 gap-8 text-left">
          <div
            class="p-6 bg-black/40 border border-slate-800 rounded-xl backdrop-blur-sm hover:border-indigo-500/30 transition-colors"
          >
            <div class="text-4xl mb-4">🌌</div>
            <h3 class="text-xl font-bold text-white mb-2">
              Données Quantiques
            </h3>
            <p class="text-slate-400 text-sm">
              Contient la totalité des données de l'univers compressées dans sa
              matière.
            </p>
          </div>
          <div
            class="p-6 bg-black/40 border border-slate-800 rounded-xl backdrop-blur-sm hover:border-indigo-500/30 transition-colors"
          >
            <div class="text-4xl mb-4">⚡</div>
            <h3 class="text-xl font-bold text-white mb-2">Fin de la R&D</h3>
            <p class="text-slate-400 text-sm">
              Toutes les technologies possibles sont instantanément débloquées.
            </p>
          </div>
          <div
            class="p-6 bg-black/40 border border-slate-800 rounded-xl backdrop-blur-sm hover:border-indigo-500/30 transition-colors"
          >
            <div class="text-4xl mb-4">👁️</div>
            <h3 class="text-xl font-bold text-white mb-2">Monopole Éternel</h3>
            <p class="text-slate-400 text-sm">
              Plus d'incertitude. Domination totale du marché.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Philosophy -->
    <section class="py-32 px-4 relative">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-20">
          <h2 class="text-4xl font-bold text-white mb-4">
            Philosophie du Secteur
          </h2>
          <div class="text-rose-500 font-mono text-xl">
            "L'Autre est l'Ennemi"
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <div
            class="p-8 bg-slate-900 rounded-3xl border border-slate-800 flex flex-col justify-center"
          >
            <h3 class="text-2xl font-bold text-white mb-4">
              L'Argent, c'est le Sang
            </h3>
            <p class="text-slate-400 leading-relaxed">
              Sans liquidités, vos usines s'arrêtent. Si vos usines s'arrêtent,
              vos défenses tombent. Si vos défenses tombent, vous êtes rayé de
              la carte.
            </p>
          </div>
          <div class="space-y-4">
            <div
              class="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              <div class="text-indigo-400 font-bold mb-2">La Connaissance</div>
              <p class="text-slate-400 text-sm">
                L'espionnage industriel est vital. Savoir, c'est pouvoir.
              </p>
            </div>
            <div
              class="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              <div class="text-indigo-400 font-bold mb-2">Les Contrats</div>
              <p class="text-slate-400 text-sm">
                Faits pour être rompus dès que la pénalité est inférieure au
                profit.
              </p>
            </div>
            <div
              class="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              <div class="text-indigo-400 font-bold mb-2">L'Automatisation</div>
              <p class="text-slate-400 text-sm">
                Une ligne de production a plus de valeur qu'une ville humaine.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Doctrines / Ascension -->
    <section class="py-32 px-4 border-t border-slate-900 bg-slate-950/50">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <div
            class="text-indigo-400 text-sm font-bold uppercase tracking-widest mb-4"
          >
            Le Tournant Fatidique
          </div>
          <h2 class="text-4xl md:text-5xl font-black text-white">
            L'Ascension
          </h2>
          <p class="text-slate-500 mt-4">
            Choisissez votre Doctrine de Domination.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          {#each doctrines as doc}
            <div
              class="group relative bg-slate-900 border border-slate-800 rounded-3xl p-1 overflow-hidden hover:scale-105 transition-transform duration-300"
            >
              <!-- Gradient Border Effect -->
              <div
                class={`absolute inset-0 bg-linear-to-br ${doc.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              ></div>

              <div
                class="relative bg-slate-950 rounded-[22px] p-8 h-full flex flex-col"
              >
                <div
                  class="text-5xl mb-6 bg-slate-900 w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner"
                >
                  {doc.icon}
                </div>
                <h3 class="text-2xl font-bold text-white mb-2">{doc.name}</h3>
                <div
                  class={`text-sm font-bold bg-clip-text text-transparent bg-linear-to-r ${doc.color} mb-4`}
                >
                  {doc.role}
                </div>
                <p class="text-slate-400 leading-relaxed text-sm">
                  {doc.description}
                </p>
              </div>
            </div>
          {/each}
        </div>

        <div class="mt-20 text-center">
          <button
            onclick={startPlaying}
            class="px-12 py-5 bg-white text-black font-bold text-xl rounded-full hover:bg-slate-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            PRENDRE LE CONTRÔLE
          </button>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer
      class="py-12 border-t border-slate-900 text-center text-slate-600 text-sm"
    >
      <p>
        &copy; 2054 Secteur Omni. Aucune reproduction autorisée sans licence
        corporatiste.
      </p>
    </footer>
  {/if}
</div>

<style>
  /* Custom animations via Tailwind config usually, but here for specific one-offs */
  @keyframes spin-slow {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  .animate-spin-slow {
    animation: spin-slow 10s linear infinite;
  }
</style>
