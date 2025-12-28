<script lang="ts">
  import type { Employee } from "$lib/types";
  import { fade, scale, fly } from "svelte/transition";
  import { elasticOut } from "svelte/easing";

  let { employee, onclose } = $props<{
    employee: Employee;
    onclose: () => void;
  }>();

  function getRarityInfo(rarity: number) {
    switch (rarity) {
      case 3:
        return {
          label: "Légendaire",
          color: "text-amber-400",
          bg: "bg-amber-500/20",
          border: "border-amber-500/50",
        };
      case 2:
        return {
          label: "Épique",
          color: "text-purple-400",
          bg: "bg-purple-500/20",
          border: "border-purple-500/50",
        };
      case 1:
        return {
          label: "Rare",
          color: "text-blue-400",
          bg: "bg-blue-500/20",
          border: "border-blue-500/50",
        };
      default:
        return {
          label: "Commun",
          color: "text-slate-400",
          bg: "bg-slate-500/20",
          border: "border-slate-500/50",
        };
    }
  }

  let info = $derived(getRarityInfo(employee.rarity));
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
  transition:fade
>
  <div
    class="relative bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-sm w-full overflow-hidden"
    transition:scale={{ duration: 400, start: 0.9, easing: elasticOut }}
  >
    <!-- Background Glow -->
    <div class="absolute inset-0 opacity-20 pointer-events-none">
      <div
        class="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500 rounded-full blur-[80px]"
      ></div>
      <div
        class="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500 rounded-full blur-[80px]"
      ></div>
    </div>

    <div class="p-8 text-center relative z-10">
      <div
        class="w-20 h-20 mx-auto bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20 shadow-inner"
        in:fly={{ y: 20, delay: 200 }}
      >
        <span class="text-4xl">✨</span>
      </div>

      <h2
        class="text-2xl font-black text-white mb-1 tracking-tight"
        in:fly={{ y: 10, delay: 300 }}
      >
        Nouveau Recrutement !
      </h2>
      <p class="text-slate-400 text-sm mb-6" in:fly={{ y: 10, delay: 350 }}>
        Un nouveau talent rejoint votre empire.
      </p>

      <div
        class="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 mb-8 transform transition-transform hover:scale-[1.02]"
        in:fly={{ y: 20, delay: 450 }}
      >
        <div
          class={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border mb-3 ${info.bg} ${info.color} ${info.border}`}
        >
          {info.label}
        </div>
        <h3 class="text-xl font-bold text-white mb-4">{employee.name}</h3>

        <div
          class="grid grid-cols-2 gap-4 text-left border-t border-slate-700/50 pt-4"
        >
          <div>
            <p
              class="text-[10px] text-slate-500 uppercase font-bold tracking-wider"
            >
              Poste
            </p>
            <p class="text-slate-300 font-medium">{employee.poste}</p>
          </div>
          <div class="text-right">
            <p
              class="text-[10px] text-slate-500 uppercase font-bold tracking-wider"
            >
              Efficacité
            </p>
            <p class="text-emerald-400 font-black text-lg">
              {employee.efficiency}%
            </p>
          </div>
        </div>
      </div>

      <button
        onclick={onclose}
        class="w-full py-4 bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/40 transition-all active:scale-95"
        in:fly={{ y: 10, delay: 600 }}
      >
        Bienvenue à bord
      </button>
    </div>
  </div>
</div>
