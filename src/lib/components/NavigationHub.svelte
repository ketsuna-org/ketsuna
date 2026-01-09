<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { fly, fade, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";

  let { isOpen = $bindable(false) } = $props<{ isOpen?: boolean }>();

  interface NavItem {
    label: string;
    href: string;
    icon: string;
    color: string;
    description: string;
  }

  const navItems: NavItem[] = [
    {
      label: "Usine",
      href: "/factory",
      icon: "🏭",
      color: "from-indigo-500 to-purple-600",
      description: "Gérez votre production",
    },
    {
      label: "Employés",
      href: "/employees",
      icon: "👥",
      color: "from-pink-500 to-rose-600",
      description: "Recrutez et gérez votre équipe",
    },
    {
      label: "Laboratoire",
      href: "/laboratory",
      icon: "🔬",
      color: "from-violet-500 to-purple-600",
      description: "Débloquez de nouvelles technologies",
    },
    {
      label: "Monde",
      href: "/world",
      icon: "🌍",
      color: "from-blue-600 to-indigo-800",
      description: "Explorez les autres sociétés",
    },
    {
      label: "Statistiques",
      href: "/factory/statistics",
      icon: "📊",
      color: "from-emerald-500 to-teal-600",
      description: "Production & Consommation",
    },
  ];

  function navigateTo(href: string) {
    isOpen = false;
    goto(href);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      isOpen = false;
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      isOpen = false;
    }
  }

  // Get current page for highlighting
  let currentPath = $derived($page.url.pathname);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center"
    transition:fade={{ duration: 200 }}
    onclick={handleBackdropClick}
    onkeydown={(e) => e.key === "Escape" && (isOpen = false)}
    role="dialog"
    aria-modal="true"
    aria-label="Navigation Hub"
    tabindex="-1"
  >
    <!-- Blur Background -->
    <div class="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"></div>

    <!-- Content Container -->
    <div
      class="relative z-10 w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto"
      transition:scale={{ duration: 300, easing: backOut, start: 0.9 }}
    >
      <!-- Header -->
      <div class="text-center mb-8">
        <h1
          class="text-4xl md:text-5xl font-black text-white tracking-tight mb-2"
        >
          <span
            class="bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            Tableau de Bord
          </span>
        </h1>
        <p class="text-slate-400 text-sm md:text-base">
          Sélectionnez une section pour naviguer
        </p>
      </div>

      <!-- Grid of Apps -->
      <div
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 p-4"
      >
        {#each navItems as item, i}
          <button
            onclick={() => navigateTo(item.href)}
            class="group relative flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl
                               bg-linear-to-br {item.color} 
                               shadow-lg shadow-black/30
                               hover:scale-105 hover:shadow-xl hover:shadow-black/40
                               active:scale-95
                               transition-all duration-200 ease-out
                               {currentPath === item.href
              ? 'ring-4 ring-white/50'
              : ''}"
            transition:fly={{ y: 20, delay: i * 50, duration: 300 }}
          >
            <!-- Glow Effect -->
            <div
              class="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
            ></div>

            <!-- Icon -->
            <span class="text-4xl md:text-5xl mb-3 drop-shadow-lg">
              {item.icon}
            </span>

            <!-- Label -->
            <span class="text-white font-bold text-sm md:text-base text-center">
              {item.label}
            </span>

            <!-- Description (Desktop only) -->
            <span
              class="hidden md:block text-white/70 text-xs text-center mt-1 max-w-30"
            >
              {item.description}
            </span>

            <!-- Active Indicator -->
            {#if currentPath === item.href}
              <div
                class="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full shadow-lg flex items-center justify-center"
              >
                <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
              </div>
            {/if}
          </button>
        {/each}
      </div>

      <!-- Close Button -->
      <div class="flex justify-center mt-8">
        <button
          onclick={() => (isOpen = false)}
          class="px-8 py-3 bg-slate-800/80 hover:bg-slate-700 text-white font-bold rounded-full
                           border border-slate-600 shadow-lg
                           hover:scale-105 active:scale-95 transition-all duration-200
                           flex items-center gap-2"
        >
          <span>✕</span>
          <span>Fermer</span>
          <kbd
            class="hidden md:inline-block ml-2 px-2 py-0.5 bg-slate-900 rounded text-xs text-slate-400"
            >ESC</kbd
          >
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Custom scrollbar for the hub */
  .overflow-auto::-webkit-scrollbar {
    width: 8px;
  }
  .overflow-auto::-webkit-scrollbar-track {
    background: transparent;
  }
  .overflow-auto::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
  .overflow-auto::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style>
