<script lang="ts">
  import type { Employee } from "$lib/types";

  let { employee, onfire } = $props<{
    employee: Employee;
    onfire: (id: string) => void;
  }>();

  function getRarityInfo(rarity: number) {
    switch (rarity) {
      case 3: // legendary
        return {
          label: "Legendary",
          color: "bg-amber-500/20 text-amber-400 border border-amber-500/50",
        };
      case 2: // epic
        return {
          label: "Epic",
          color: "bg-purple-500/20 text-purple-400 border border-purple-500/50",
        };
      case 1: // rare
        return {
          label: "Rare",
          color: "bg-blue-500/20 text-blue-400 border border-blue-500/50",
        };
      default: // common
        return {
          label: "Common",
          color: "bg-slate-600/20 text-slate-400 border border-slate-600/50",
        };
    }
  }

  let rarityInfo = $derived(getRarityInfo(employee.rarity));
</script>

<div
  class="bg-slate-800 p-4 rounded-lg shadow border border-slate-700 hover:border-slate-600 transition-all group"
>
  <div class="flex justify-between items-start mb-2">
    <h3 class="font-bold text-white text-lg">{employee.name}</h3>
    <span
      class={`text-xs uppercase font-bold px-2 py-0.5 rounded ${rarityInfo.color}`}
    >
      {rarityInfo.label}
    </span>
  </div>
  <div class="grid grid-cols-2 gap-2 text-sm">
    <div>
      <p class="text-slate-500 text-xs">Poste</p>
      <p class="text-slate-300">{employee.poste || "Employé"}</p>
    </div>
    <div class="text-right">
      <p class="text-slate-500 text-xs">Salaire/Jour</p>
      <p class="text-red-400 font-mono">-${employee.salary}</p>
    </div>
    <div>
      <p class="text-slate-500 text-xs">Efficacité</p>
      <p class="text-emerald-400 font-bold">{employee.efficiency}%</p>
    </div>
  </div>

  <div
    class="mt-4 pt-3 border-t border-slate-700 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity"
  >
    <button
      onclick={() => onfire(employee.id)}
      class="text-red-400 hover:text-red-300 text-xs underline"
    >
      Licencier
    </button>
  </div>
</div>
