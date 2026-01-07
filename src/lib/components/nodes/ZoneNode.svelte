<script lang="ts">
  /**
   * ZoneNode - Parent subgroup node that defines the factory building zone.
   * All machines and deposits placed inside are children of this node.
   */
  import { Handle, Position, type Node, type NodeProps } from "@xyflow/svelte";

  type ZoneNode = Node<
    {
      name: string;
      width: number;
      height: number;
      level: number;
      placed: boolean;
    },
    "zone"
  >;

  let { data }: NodeProps<ZoneNode> = $props();
</script>

<div class="zone-node" style="width: {data.width}px; height: {data.height}px;">
  <div class="zone-header">
    <span class="zone-icon">🏗️</span>
    <span class="zone-label">{data.name}</span>
    <span class="zone-level">Niv. {data.level}</span>
  </div>
  <div class="zone-content">
    <!-- Child nodes are rendered here by SvelteFlow -->
  </div>
</div>

<style>
  .zone-node {
    background: linear-gradient(
      135deg,
      rgba(30, 41, 59, 0.9) 0%,
      rgba(15, 23, 42, 0.95) 100%
    );
    border: 2px dashed rgba(99, 102, 241, 0.4);
    border-radius: 16px;
    position: relative;
    box-shadow: 0 0 60px rgba(99, 102, 241, 0.1);
  }

  .zone-header {
    position: absolute;
    top: -12px;
    left: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    padding: 4px 12px;
    border-radius: 8px;
    border: 1px solid rgba(99, 102, 241, 0.3);
    z-index: 10;
  }

  .zone-icon {
    font-size: 14px;
  }

  .zone-label {
    font-weight: 700;
    font-size: 12px;
    color: #e2e8f0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .zone-level {
    font-size: 10px;
    color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
  }

  .zone-content {
    width: 100%;
    height: 100%;
    position: relative;
  }
</style>
