<script lang="ts">
  import type { Employee } from "$lib/pocketbase";
  import { fade, scale, fly } from "svelte/transition";
  import { elasticOut } from "svelte/easing";

  let { employee, onclose } = $props<{
    employee: Employee;
    onclose: () => void;
  }>();

  function getRarityInfo(rarity: number) {
    switch (rarity) {
      case 3: // Legendary
        return {
          label: "Légendaire",
          badge: "bg-amber-500/20 text-amber-400 border border-amber-500/50",
          glow: "bg-amber-500",
          icon: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        };
      case 2: // Epic
        return {
          label: "Épique",
          badge: "bg-purple-500/20 text-purple-400 border border-purple-500/50",
          glow: "bg-purple-500",
          icon: "text-purple-400 bg-purple-500/10 border-purple-500/20",
        };
      case 1: // Rare
        return {
          label: "Rare",
          badge: "bg-blue-500/20 text-blue-400 border border-blue-500/50",
          glow: "bg-blue-500",
          icon: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        };
      default: // Common
        return {
          label: "Commun",
          badge: "bg-slate-600/20 text-slate-400 border border-slate-600/50",
          glow: "bg-slate-500",
          icon: "text-slate-400 bg-slate-500/10 border-slate-500/20",
        };
    }
  }

  let info = $derived(getRarityInfo(employee.rarity));
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
  transition:fade
>
  <div
    class="relative bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 max-w-sm w-full overflow-hidden"
    transition:scale={{ duration: 400, start: 0.9, easing: elasticOut }}
  >
    <!-- Background Glow -->
    <div class="absolute inset-0 opacity-10 pointer-events-none">
      <div
        class="absolute -top-24 -left-24 w-64 h-64 {info.glow} rounded-full blur-[100px]"
      ></div>
      <div
        class="absolute -bottom-24 -right-24 w-64 h-64 {info.glow} rounded-full blur-[100px]"
      ></div>
    </div>

    <div class="p-8 text-center relative z-10">
      <div
        class="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 border shadow-inner {info.icon}"
        in:fly={{ y: 20, delay: 200 }}
      >
        <span class="text-5xl">✨</span>
      </div>

      <h2
        class="text-3xl font-black text-white mb-2 tracking-tight"
        in:fly={{ y: 10, delay: 300 }}
      >
        Nouveau Talent !
      </h2>
      <p class="text-slate-400 font-medium mb-8" in:fly={{ y: 10, delay: 350 }}>
        Une excellente addition à votre équipe.
      </p>

      <div
        class="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 mb-8 transform transition-transform hover:scale-[1.02]"
        in:fly={{ y: 20, delay: 450 }}
      >
        <div
          class={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border mb-4 ${info.badge}`}
        >
          {info.label}
        </div>
        <h3 class="text-2xl font-bold text-white mb-6">{employee.name}</h3>

        <div
          class="grid grid-cols-2 gap-4 text-left border-t border-slate-800/80 pt-4"
        >
          <div>
            <p
              class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1"
            >
              Poste
            </p>
            <p class="text-slate-200 font-bold">{employee.poste}</p>
          </div>
          <div class="text-right">
            <p
              class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1"
            >
              Efficacité
            </p>
            <div
              class="text-emerald-400 font-black text-xl flex items-center justify-end gap-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"
                ></polyline><polyline points="17 6 23 6 23 12"></polyline></svg
              >
              {employee.efficiency}%
            </div>
          </div>
        </div>
      </div>

      <button
        onclick={onclose}
        class="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 border border-indigo-500/50"
        in:fly={{ y: 10, delay: 600 }}
      >
        Intégrer l'équipe
      </button>
    </div>
  </div>
</div>
