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
    })
  );

  // Midpoint for label (simple calculation)
  let midX = $derived((sourceX + targetX) / 2);
  let midY = $derived((sourceY + targetY) / 2);
</script>

<svg class="simple-edge-svg">
  <!-- Edge Path -->
  <path
    d={pathData[0]}
    fill="none"
    stroke={selected ? "#3b82f6" : "#475569"}
    stroke-width={selected ? 4 : 2}
    stroke-linecap="round"
  />

  <!-- Single Animated Dot (reduced from 3) -->
  <circle r="4" fill="#fbbf24" class="flow-dot">
    <animateMotion dur="3s" repeatCount="indefinite" path={pathData[0]} />
  </circle>

  <!-- Transfer Rate Label -->
  <g transform="translate({midX}, {midY})">
    <rect
      x="-16"
      y="-8"
      width="32"
      height="16"
      rx="3"
      fill="rgba(15, 23, 42, 0.85)"
      stroke="#334155"
      stroke-width="1"
    />
    <text
      x="0"
      y="4"
      text-anchor="middle"
      fill="#fbbf24"
      font-size="10"
      font-weight="600"
      font-family="monospace">5/s</text
    >
  </g>

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

  .flow-dot {
    filter: drop-shadow(0 0 2px #fbbf24);
  }
</style>
