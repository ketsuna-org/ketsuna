<script lang="ts">
  import { getBezierPath, type EdgeProps, type Position } from "@xyflow/svelte";

  let {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    interactionWidth = 20,
    selected,
  }: EdgeProps = $props();

  // Compute the bezier path
  let pathData = $derived(
    getBezierPath({
      sourceX,
      sourceY,
      sourcePosition: sourcePosition as Position,
      targetX,
      targetY,
      targetPosition: targetPosition as Position,
    }),
  );

  // Resource color from data or default
  let resourceColor = $derived((data?.resourceColor as string) || "#fbbf24");

  // Unique ID for gradients
  let uniqueId = $derived(`pipe-${id}`);
</script>

<svg class="pipe-edge-svg">
  <defs>
    <linearGradient id="{uniqueId}-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#94a3b8" />
      <stop offset="50%" stop-color="#cbd5e1" />
      <stop offset="100%" stop-color="#94a3b8" />
    </linearGradient>
  </defs>
  <!-- Soft shadow -->
  <path
    d={pathData[0]}
    fill="none"
    stroke="rgba(15, 23, 42, 0.55)"
    stroke-width="14"
    stroke-linecap="round"
  />

  <!-- Main pipe stroke -->
  <path
    d={pathData[0]}
    fill="none"
    stroke="url(#{uniqueId}-stroke)"
    stroke-width="12"
    stroke-linecap="round"
  />

  <!-- Resource tint (static, no animation) -->
  <path
    d={pathData[0]}
    fill="none"
    stroke={resourceColor}
    stroke-width="5"
    stroke-linecap="round"
    stroke-opacity="0.55"
  />

  {#if selected}
    <path
      d={pathData[0]}
      fill="none"
      stroke="#3b82f6"
      stroke-width="16"
      stroke-opacity="0.35"
      stroke-linecap="round"
    />
  {/if}

  <!-- Interaction Path (Invisible, captures clicks) -->
  <path
    d={pathData[0]}
    fill="none"
    stroke="transparent"
    stroke-width={interactionWidth}
    class="edge-interaction"
    style:pointer-events="stroke"
    style:cursor="pointer"
  />
</svg>

<style>
  .pipe-edge-svg {
    overflow: visible;
    position: absolute;
    pointer-events: none;
  }
</style>
