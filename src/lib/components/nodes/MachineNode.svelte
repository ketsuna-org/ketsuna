<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";

  import type { NodeProps } from "@xyflow/svelte";

  type MachineNodeProps = NodeProps<{
    itemId?: string;
    name: string;
    icon: string;
    placed: boolean;
  }>;

  let { data }: MachineNodeProps = $props();
</script>

<div class="machine-node">
  <Handle type="target" position={Position.Left} />

  <div class="node-content">
    <span class="icon">{data.icon}</span>
    <span class="name">{data.name}</span>
  </div>

  <Handle type="source" position={Position.Right} />
</div>

<style>
  .machine-node {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 2px solid #3b82f6;
    border-radius: 12px;
    padding: 12px 16px;
    width: 140px;
    min-height: 100px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    color: #e2e8f0;
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
    transition: all 0.2s ease;
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
    gap: 6px;
  }

  .icon {
    font-size: 24px;
  }

  .name {
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
