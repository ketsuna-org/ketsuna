<script lang="ts">
  import { slide } from "svelte/transition";
  import type {
    CanvasNode,
    MachineData,
    StorageData,
  } from "$lib/canvas/canvasTypes";

  export let onPlaceNode: (template: CanvasNode) => void = () => {};

  let isExpanded = false;

  // Templates de machines disponibles (mock inventory)
  const machineTemplates: {
    label: string;
    icon: string;
    template: Partial<CanvasNode>;
  }[] = [
    {
      label: "Foreuse",
      icon: "⛏️",
      template: {
        type: "machine",
        label: "Foreuse",
        width: 3,
        height: 2,
        inputs: [{ type: "input" }],
        outputs: [{ type: "output" }],
        data: {
          productionTime: 10,
          producing: false,
          employees: 0,
          maxEmployees: 4,
          needsEnergy: 5,
          outputItem: "Minerai",
        } as MachineData,
      },
    },
    {
      label: "Fonderie",
      icon: "🔥",
      template: {
        type: "machine",
        label: "Fonderie",
        width: 3,
        height: 2,
        inputs: [{ type: "input" }, { type: "input" }],
        outputs: [{ type: "output" }],
        data: {
          productionTime: 20,
          producing: false,
          employees: 0,
          maxEmployees: 6,
          needsEnergy: 15,
          inputItem: "Minerai + Charbon",
          outputItem: "Lingot",
        } as MachineData,
      },
    },
    {
      label: "Assembleur",
      icon: "🔧",
      template: {
        type: "machine",
        label: "Assembleur",
        width: 3,
        height: 2,
        inputs: [{ type: "input" }],
        outputs: [{ type: "output" }],
        data: {
          productionTime: 15,
          producing: false,
          employees: 0,
          maxEmployees: 3,
          needsEnergy: 10,
          inputItem: "Lingot",
          outputItem: "Plaque",
        } as MachineData,
      },
    },
    {
      label: "Générateur",
      icon: "⚡",
      template: {
        type: "machine",
        label: "Générateur",
        width: 2,
        height: 2,
        inputs: [{ type: "input" }],
        outputs: [{ type: "output" }],
        data: {
          productionTime: 5,
          producing: false,
          employees: 0,
          maxEmployees: 2,
          needsEnergy: 0,
          inputItem: "Charbon",
          outputItem: "⚡ 50 kWh",
        } as MachineData,
      },
    },
  ];

  const storageTemplates: {
    label: string;
    icon: string;
    template: Partial<CanvasNode>;
  }[] = [
    {
      label: "Entrepôt S",
      icon: "📦",
      template: {
        type: "storage",
        label: "Entrepôt S",
        width: 2,
        height: 2,
        inputs: [{ type: "input" }],
        outputs: [{ type: "output" }],
        data: {
          capacity: 100,
          used: 0,
          storedItems: [],
        } as StorageData,
      },
    },
    {
      label: "Entrepôt M",
      icon: "🏪",
      template: {
        type: "storage",
        label: "Entrepôt M",
        width: 3,
        height: 2,
        inputs: [{ type: "input" }],
        outputs: [{ type: "output" }],
        data: {
          capacity: 300,
          used: 0,
          storedItems: [],
        } as StorageData,
      },
    },
    {
      label: "Entrepôt L",
      icon: "🏭",
      template: {
        type: "storage",
        label: "Entrepôt L",
        width: 4,
        height: 3,
        inputs: [{ type: "input" }, { type: "input" }],
        outputs: [{ type: "output" }, { type: "output" }],
        data: {
          capacity: 500,
          used: 0,
          storedItems: [],
        } as StorageData,
      },
    },
  ];

  function handlePlaceTemplate(template: Partial<CanvasNode>) {
    const node: CanvasNode = {
      id: `node-${Date.now()}`,
      type: template.type || "machine",
      label: template.label || "Nouveau",
      x: 0, // Will be placed at center/cursor
      y: 0,
      width: template.width || 2,
      height: template.height || 2,
      inputs: template.inputs || [],
      outputs: template.outputs || [],
      data: template.data,
    };
    onPlaceNode(node);
  }
</script>

<div class="fixed top-4 right-20 z-40">
  <button
    on:click={() => (isExpanded = !isExpanded)}
    class="flex items-center gap-2 px-4 py-2 bg-slate-900/90 backdrop-blur-sm hover:bg-slate-800 rounded-xl border border-slate-700/50 text-white transition-colors"
  >
    <span class="text-lg">🔨</span>
    <span class="font-bold text-sm">Construire</span>
    <svg
      class="w-4 h-4 transition-transform {isExpanded ? 'rotate-180' : ''}"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M19 9l-7 7-7-7"
      />
    </svg>
  </button>

  {#if isExpanded}
    <div
      class="mt-2 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden shadow-2xl"
      transition:slide={{ duration: 200 }}
    >
      <!-- Machines -->
      <div class="p-3 border-b border-slate-800/50">
        <h3 class="text-xs font-bold text-slate-400 uppercase mb-2">
          Machines
        </h3>
        <div class="grid grid-cols-2 gap-2">
          {#each machineTemplates as item}
            <button
              on:click={() => handlePlaceTemplate(item.template)}
              class="flex items-center gap-2 p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
            >
              <span class="text-xl">{item.icon}</span>
              <span class="text-white text-sm font-medium">{item.label}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Stockages -->
      <div class="p-3">
        <h3 class="text-xs font-bold text-slate-400 uppercase mb-2">
          Stockages
        </h3>
        <div class="grid grid-cols-2 gap-2">
          {#each storageTemplates as item}
            <button
              on:click={() => handlePlaceTemplate(item.template)}
              class="flex items-center gap-2 p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
            >
              <span class="text-xl">{item.icon}</span>
              <span class="text-white text-sm font-medium">{item.label}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Info -->
      <div class="px-3 pb-3">
        <p class="text-xs text-slate-500 text-center">
          Cliquez pour placer au centre du canvas
        </p>
      </div>
    </div>
  {/if}
</div>
