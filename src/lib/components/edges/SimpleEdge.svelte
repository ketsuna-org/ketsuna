<script lang="ts">
  import {
    getSmoothStepPath,
    type EdgeProps,
    type Position,
  } from "@xyflow/svelte";

  let {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    interactionWidth = 20,
  }: EdgeProps = $props();

  // Get smooth step path (right angles)
  let pathData = $derived(
    getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition: sourcePosition as Position,
      targetX,
      targetY,
      targetPosition: targetPosition as Position,
      borderRadius: 8,
    }),
  );
</script>

<svg class="simple-edge-svg">
  <!-- Edge Path (no animation in performance mode) -->
  <path
    d={pathData[0]}
    fill="none"
    stroke={selected ? "#3b82f6" : "#475569"}
    stroke-width={selected ? 4 : 2}
    stroke-linecap="round"
  />

  <!-- Interaction Path -->
  <path
    d={pathData[0]}
    fill="none"
    stroke="transparent"
    stroke-width={interactionWidth}
    style:pointer-events="stroke"
    style:cursor="pointer"
  />
</svg>

<style>
  .simple-edge-svg {
    overflow: visible;
    position: absolute;
    pointer-events: none;
  }
</style>
