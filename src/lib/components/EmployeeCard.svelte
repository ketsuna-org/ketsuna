<script lang="ts">
  import type { Employee } from "$lib/pocketbase";

  let {
    employee,
    onfire,
    assignedMachine = null,
  } = $props<{
    employee: Employee;
    onfire: (id: string) => void;
    assignedMachine?: string | null;
  }>();

  function getRarityInfo(rarity: number) {
    switch (rarity) {
      case 3: // legendary
        return {
          label: "Legendary",
          badge: "bg-amber-500/20 text-amber-400 border border-amber-500/50",
          container:
            "bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-900/30",
        };
      case 2: // epic
        return {
          label: "Epic",
          badge: "bg-purple-500/20 text-purple-400 border border-purple-500/50",
          container:
            "bg-purple-950/20 border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-900/30",
        };
      case 1: // rare
        return {
          label: "Rare",
          badge: "bg-blue-500/20 text-blue-400 border border-blue-500/50",
          container:
            "bg-blue-950/20 border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-900/30",
        };
      default: // common
        return {
          label: "Common",
          badge: "bg-slate-600/20 text-slate-400 border border-slate-600/50",
          container:
            "bg-slate-900/40 border-slate-700/50 hover:border-slate-600 hover:bg-slate-900/60",
        };
    }
  }

  let rarityInfo = $derived(getRarityInfo(employee.rarity));
</script>

<div
  class="p-5 rounded-2xl border transition-all hover:shadow-lg group relative overflow-hidden {rarityInfo.container}"
>
  <div class="flex justify-between items-start mb-4 relative z-10">
    <div>
      <h3
        class="font-bold text-white text-lg tracking-tight flex items-center gap-2"
      >
        <span
          class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm border border-slate-700"
        >
          {#if employee.poste === "Directeur"}👔
          {:else if employee.poste === "Ingénieur"}📐
          {:else if employee.poste === "Technicien"}🔧
          {:else if employee.poste === "Superviseur"}📋
          {:else}👷{/if}
        </span>
        {employee.name}
      </h3>
      <p class="text-xs text-slate-500 ml-10 -mt-1 font-medium">
        {employee.poste || "Employé"}
      </p>
    </div>
    <span
      class={`text-[10px] uppercase font-bold px-2 py-1 rounded-lg border ${rarityInfo.badge}`}
    >
      {rarityInfo.label}
    </span>
  </div>

  <div class="space-y-3 relative z-10">
    <!-- Stats Grid -->
    <div class="grid grid-cols-2 gap-2">
      <div class="bg-slate-950/30 rounded-xl p-2.5 border border-slate-800/50">
        <p class="text-[10px] text-slate-500 font-bold uppercase mb-0.5">
          Salaire
        </p>
        <p class="text-red-400 font-bold font-mono text-sm">
          {employee.salary}€<span class="text-[10px] text-slate-600 font-normal"
            >/j</span
          >
        </p>
      </div>
      <div class="bg-slate-950/30 rounded-xl p-2.5 border border-slate-800/50">
        <p class="text-[10px] text-slate-500 font-bold uppercase mb-0.5">
          Efficacité
        </p>
        <div class="flex items-center gap-1.5">
          <div
            class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex-1"
          >
            <div
              class="bg-emerald-500 h-full rounded-full"
              style="width: {employee.efficiency}%"
            ></div>
          </div>
          <span class="text-emerald-400 font-bold font-mono text-xs"
            >{employee.efficiency}%</span
          >
        </div>
      </div>
    </div>

    <!-- Assignment -->
    <div
      class="bg-slate-950/30 rounded-xl p-3 border border-slate-800/50 flex items-center justify-between"
    >
      <span class="text-[10px] text-slate-500 font-bold uppercase"
        >Affectation</span
      >
      {#if assignedMachine}
        <div
          class="flex items-center gap-1.5 text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20"
        >
          <span class="text-xs">🤖</span>
          <span class="text-xs font-bold truncate max-w-30"
            >{assignedMachine}</span
          >
        </div>
      {:else}
        <span class="text-slate-500 text-xs italic flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
          Non affecté
        </span>
      {/if}
    </div>
  </div>

  <div
    class="mt-4 pt-3 border-t border-slate-700/50 flex justify-end opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0"
  >
    <button
      onclick={() => onfire(employee.id)}
      class="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1 hover:underline px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><path d="M3 6h18"></path><path
          d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
        ></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg
      >
      Licencier
    </button>
  </div>
</div>
