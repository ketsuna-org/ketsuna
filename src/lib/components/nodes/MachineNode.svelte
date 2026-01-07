<script lang="ts">
  import { Handle, Position, type Node, type NodeProps } from "@xyflow/svelte";
  import GameIcon from "$lib/components/GameIcon.svelte";

  type MachineNode = Node<
    {
      itemId?: string;
      name: string;
      icon: string;
      placed: boolean;
    },
    "machine"
  >;

  let { data }: NodeProps<MachineNode> = $props();
</script>

<div class="machine-node" title={data.name}>
  <Handle type="target" position={Position.Left} />

  <div class="node-content" class:has-image={data.icon?.startsWith("/")}>
    {#if data.icon?.startsWith("/")}
      <div class="image-wrapper">
        <GameIcon icon={data.icon} size={140} alt={data.name} />
      </div>
    {:else}
      <div class="icon-wrapper">
        <GameIcon icon={data.icon} size={32} alt={data.name} />
      </div>
      <span class="name">{data.name}</span>
    {/if}
  </div>

  <Handle type="source" position={Position.Right} />
</div>

<style>
  .machine-node {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 2px solid #3b82f6;
    border-radius: 12px;
    padding: 0; /* Full bleed for images */
    width: 140px;
    height: 140px; /* Square aspect ratio */
    display: flex;
    flex-direction: column;
    justify-content: center;
    color: #e2e8f0;
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }

  .machine-node:hover {
    border-color: #60a5fa;
    box-shadow: 0 6px 24px rgba(59, 130, 246, 0.4);
    transform: translateY(-2px);
  }

  .node-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  /* Style for standard emoji icons */
  .icon-wrapper {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 8px;
    margin: 0 auto 6px auto; /* Center with margin */
  }

  /* Center content when no image */
  .node-content:not(.has-image) {
    padding: 12px;
  }

  /* Style for full-size image icons */
  .image-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .name {
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    z-index: 2;
  }
</style>
