<script lang="ts">
  import {
    SvelteFlow,
    Controls,
    Background,
    BackgroundVariant,
    MiniMap,
    useSvelteFlow,
    type Node,
    type Edge,
    type Connection,
  } from "@xyflow/svelte";
  import HeadQuarter from "./Nodes/HeadQuarter.svelte";

  let {
    nodes = $bindable(),
    edges = $bindable(),
    inventoryItems,
    isInventoryOpen = $bindable(),
  } = $props();

  const { screenToFlowPosition } = useSvelteFlow();

  // --- DND Logic ---
  function onDragStart(event: DragEvent, item: any) {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData("application/svelteflow", JSON.stringify(item));
    event.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    if (!event.dataTransfer) return;

    const itemData = event.dataTransfer.getData("application/svelteflow");
    if (!itemData) return;

    const item = JSON.parse(itemData);

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newNode: Node = {
      id: `${item.id}-${Date.now()}`,
      type: "default",
      position,
      data: { label: `${item.icon} ${item.name}` },
      origin: [0.5, 0.5],
      parentId: "0",
      extent: "parent",
      style: `background: #0f172a; color: #e2e8f0; border: 1px solid; border-color: inherit; border-radius: 12px; padding: 10px; width: 150px; text-align: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);`,
    };

    nodes = [...nodes, newNode];
  }

  function onConnect(connection: Connection): void {
    edges = [
      ...edges,
      {
        ...connection,
        animated: true,
      },
    ];
  }
</script>

<div
  class="grow w-full h-full relative"
  ondragover={onDragOver}
  ondrop={onDrop}
  role="region"
  aria-label="Map Area"
>
  <SvelteFlow
    {nodes}
    {edges}
    nodeTypes={{
      headQuater: HeadQuarter,
    }}
    onconnect={onConnect}
    fitView
    class="bg-slate-950"
    proOptions={{ hideAttribution: true }}
  >
    <Background
      variant={BackgroundVariant.Dots}
      gap={20}
      size={1}
      bgColor="#334155"
    />
  </SvelteFlow>

  <!-- Inventory Panel (Bottom) -->
  <div
    class="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4 pointer-events-none"
  >
    {#if isInventoryOpen}
      <div
        class="pointer-events-auto bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div class="flex items-center justify-between px-2">
          <h3
            class="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"
          >
            <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"
            ></span>
            Inventaire
          </h3>
          <span class="text-xs text-slate-500"
            >Glisser-déposer sur la carte</span
          >
        </div>

        <div
          class="flex items-center gap-4 overflow-x-auto pb-2 pt-1 scrollbar-hide"
        >
          {#each inventoryItems as item}
            <div
              draggable="true"
              ondragstart={(e) => onDragStart(e, item)}
              class={`
                        shrink-0 w-24 h-24 rounded-xl border ${item.color} border-opacity-40 bg-opacity-10 
                        hover:bg-opacity-20 hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing
                        flex flex-col items-center justify-center gap-2 transition-all duration-200 select-none
                        group relative overflow-hidden
                    `}
              role="button"
              tabindex="0"
            >
              <div
                class="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
              ></div>
              <span
                class="text-3xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-200"
                >{item.icon}</span
              >
              <span class="text-xs font-bold">{item.name}</span>
            </div>
          {/each}

          <div
            class="shrink-0 w-24 h-24 rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 text-slate-600"
          >
            <span class="text-2xl opacity-50">+</span>
          </div>
        </div>
      </div>
    {/if}

    <!-- Navbar Dock -->
    <nav
      class="pointer-events-auto mt-4 flex justify-between items-center bg-slate-950/80 backdrop-blur-lg border border-slate-800/50 rounded-full px-6 py-3 shadow-xl mx-auto max-w-sm"
    >
      <button
        class="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-white/5 rounded-lg transition-colors"
        title="Carte"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-map"
          ><path
            d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"
          /><path d="M15 5.764v15" /><path d="M9 3.236v15" /></svg
        >
      </button>
      <button
        class="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
        title="Marché"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-store"
          ><path
            d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"
          /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path
            d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"
          /><path d="M2 7h20" /><path
            d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"
          /></svg
        >
      </button>
      <button
        class="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
        title="Paramètres"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-settings"
          ><path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
          /><circle cx="12" cy="12" r="3" /></svg
        >
      </button>
    </nav>
  </div>
</div>
