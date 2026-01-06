<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";
  import type { NodeProps } from "@xyflow/svelte";
  import { activeCompany } from "$lib/stores";

  type CompanyNodeProps = NodeProps<{
    name: string;
    icon: string;
    placed: boolean;
  }>;

  let { data }: CompanyNodeProps = $props();
  let company = $derived($activeCompany);
</script>

<div class="company-node">
  <Handle type="target" position={Position.Left} />

  <div class="node-content">
    <span class="icon">🏢</span>
    <span class="name">{company?.name || "Siège Social"}</span>
    <div class="stats">
      <span class="balance">{company?.balance?.toLocaleString() || 0} $</span>
      <span class="level">Niveau {company?.level || 1}</span>
    </div>
  </div>
</div>

<style>
  .company-node {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 3px solid #f59e0b;
    border-radius: 16px;
    padding: 16px 24px;
    width: 220px;
    min-height: 160px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    color: #e2e8f0;
    box-shadow: 0 4px 30px rgba(245, 158, 11, 0.4);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .company-node:hover {
    box-shadow: 0 6px 40px rgba(245, 158, 11, 0.6);
    transform: scale(1.05);
  }

  .node-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .icon {
    font-size: 32px;
  }

  .name {
    font-size: 14px;
    font-weight: 800;
    text-align: center;
    color: #f59e0b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stats {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .balance {
    font-size: 12px;
    font-weight: 600;
    color: #fbbf24;
  }

  .level {
    font-size: 10px;
    color: #94a3b8;
    background: #1e293b;
    padding: 2px 8px;
    border-radius: 10px;
    margin-top: 4px;
  }
</style>
