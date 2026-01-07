<script lang="ts">
  import type { Machine } from "$lib/pocketbase";
  import { getItem } from "$lib/data/game-static";
  import GameIcon from "$lib/components/GameIcon.svelte";

  interface Props {
    machine: Machine;
    isLoading: boolean;
    onRequestDelete: () => void;
  }

  let { machine, isLoading, onRequestDelete }: Props = $props();
</script>

<div class="mb-6 flex items-start justify-between">
  <div>
    <h3 class="text-xl font-bold text-white flex items-center gap-2">
      <span class="p-1.5 bg-slate-800 rounded-lg">
        <GameIcon
          icon={getItem(machine.machine_id)?.icon || "🤖"}
          size={24}
          alt={getItem(machine.machine_id)?.name || "Machine"}
        />
      </span>
      {getItem(machine.machine_id)?.name || "Machine"}
    </h3>
    <p class="text-xs text-slate-400 font-medium ml-1 mt-1">
      Configuration & production
    </p>
  </div>
  <div class="flex flex-col items-end gap-1">
    <button
      onclick={onRequestDelete}
      disabled={isLoading}
      class="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
      title="Retirer la machine"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><path d="M3 6h18" /><path
          d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
        /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line
          x1="10"
          x2="10"
          y1="11"
          y2="17"
        /><line x1="14" x2="14" y1="11" y2="17" /></svg
      >
    </button>
    <div
      class="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400"
    >
      ID: {machine.id.slice(0, 8)}
    </div>
  </div>
</div>
