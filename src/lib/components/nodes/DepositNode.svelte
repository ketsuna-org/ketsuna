<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";

  import type { NodeProps } from "@xyflow/svelte";

  type DepositNodeProps = NodeProps<{
    resourceId?: string;
    name: string;
    icon: string;
    quantity?: number;
    placed: boolean;
  }>;

  let { data }: DepositNodeProps = $props();

  const quantityPercent = $derived(
    data.quantity ? Math.min(100, (data.quantity / 10000) * 100) : 0
  );
</script>

<div class="deposit-node">
  <div class="node-content">
    <span class="icon">{data.icon}</span>
    <span class="name">{data.name}</span>

    {#if data.quantity !== undefined}
      <div class="quantity-bar">
        <div class="quantity-fill" style="width: {quantityPercent}%"></div>
      </div>
      <span class="quantity-text">{data.quantity?.toLocaleString()}</span>
    {/if}
  </div>

  <Handle type="source" position={Position.Right} />
</div>

<style>
  .deposit-node {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 2px solid #10b981;
    border-radius: 12px;
    padding: 12px 16px;
    width: 140px;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    color: #e2e8f0;
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
    transition: all 0.2s ease;
  }

  .deposit-node:hover {
    border-color: #34d399;
    box-shadow: 0 6px 24px rgba(16, 185, 129, 0.4);
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
  }

  .quantity-bar {
    width: 80px;
    height: 4px;
    background: #334155;
    border-radius: 2px;
    overflow: hidden;
  }

  .quantity-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #34d399);
    transition: width 0.3s ease;
  }

  .quantity-text {
    font-size: 9px;
    color: #94a3b8;
  }
</style>
