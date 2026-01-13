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
    })
  );

  // Resource color from data or default
  let resourceColor = $derived((data?.resourceColor as string) || "#fbbf24");

  // Calculate path length
  let pathLength = $derived.by(() => {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    return Math.sqrt(dx * dx + dy * dy);
  });

  // Animation duration
  let animDuration = $derived(Math.max(2.5, pathLength / 100));

  // Unique ID
  let uniqueId = $derived(`pipe-${id}`);

  // Calculate segment positions
  let segmentCount = $derived(Math.floor(pathLength / 40));

  // Calculate midpoint for transfer rate label
  let midX = $derived((sourceX + targetX) / 2);
  let midY = $derived((sourceY + targetY) / 2);
</script>

<svg class="pipe-edge-svg">
  <defs>
    <!-- Top face of pipe (lightest) -->
    <linearGradient id="{uniqueId}-top" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8b8d94" />
      <stop offset="50%" stop-color="#b8bac0" />
      <stop offset="100%" stop-color="#8b8d94" />
    </linearGradient>

    <!-- Left side face (medium) -->
    <linearGradient id="{uniqueId}-left" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#5a5c63" />
      <stop offset="50%" stop-color="#6e7078" />
      <stop offset="100%" stop-color="#5a5c63" />
    </linearGradient>

    <!-- Right side face (darkest) -->
    <linearGradient id="{uniqueId}-right" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3f4147" />
      <stop offset="50%" stop-color="#4a4c52" />
      <stop offset="100%" stop-color="#3f4147" />
    </linearGradient>

    <!-- Inner hole gradient -->
    <radialGradient id="{uniqueId}-hole">
      <stop offset="0%" stop-color="#0a0a0c" />
      <stop offset="60%" stop-color="#1a1b1f" />
      <stop offset="100%" stop-color="#2a2b2f" />
    </radialGradient>

    <!-- Segment band (darker metal) -->
    <linearGradient id="{uniqueId}-band" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#2a2b2f" />
      <stop offset="50%" stop-color="#3a3b3f" />
      <stop offset="100%" stop-color="#2a2b2f" />
    </linearGradient>
  </defs>

  <!-- BOTTOM FACE (Right side - darkest) -->
  <path
    d={pathData[0]}
    fill="none"
    stroke="url(#{uniqueId}-right)"
    stroke-width="12"
    stroke-linecap="round"
    transform="translate(6, 6)"
    class="pipe-bottom"
  />

  <!-- LEFT FACE (Medium shade) -->
  <path
    d={pathData[0]}
    fill="none"
    stroke="url(#{uniqueId}-left)"
    stroke-width="12"
    stroke-linecap="round"
    transform="translate(-3, 3)"
    class="pipe-left"
  />

  <!-- Segment bands on left face -->
  {#each Array(segmentCount).fill(0) as _, i}
    <path
      d={pathData[0]}
      fill="none"
      stroke="url(#{uniqueId}-band)"
      stroke-width="12"
      stroke-linecap="butt"
      stroke-dasharray="8 {40 - 8}"
      stroke-dashoffset={-i * 40}
      transform="translate(-3, 3)"
      opacity="0.8"
    />
  {/each}

  <!-- TOP FACE (Lightest) -->
  <path
    d={pathData[0]}
    fill="none"
    stroke="url(#{uniqueId}-top)"
    stroke-width="10"
    stroke-linecap="round"
    transform="translate(0, -2)"
    class="pipe-top"
  />

  <!-- Top face highlight -->
  <path
    d={pathData[0]}
    fill="none"
    stroke="rgba(255, 255, 255, 0.4)"
    stroke-width="3"
    stroke-linecap="round"
    transform="translate(0, -2)"
    opacity="0.6"
  />

  <!-- INNER HOLE (hollow center) -->
  <path
    d={pathData[0]}
    fill="none"
    stroke="url(#{uniqueId}-hole)"
    stroke-width="6"
    stroke-linecap="round"
    class="pipe-hole"
  />

  <!-- Resource flow inside -->
  <path
    d={pathData[0]}
    fill="none"
    stroke={resourceColor}
    stroke-width="4"
    stroke-linecap="round"
    opacity="0.5"
    class="flow-ambient"
  />

  <!-- Animated resource items (Reduced count for performance) -->
  {#each Array(3)
    .fill(0)
    .map((_, i) => i / 3) as offset}
    <g>
      <!-- Main resource chunk (simplified) -->
      <g>
        <animateMotion
          dur="{animDuration}s"
          repeatCount="indefinite"
          begin="{offset * animDuration}s"
          path={pathData[0]}
        />

        <circle r="4" fill={resourceColor} opacity="0.9" />
        <circle r="2" fill="white" opacity="0.6" />
      </g>
    </g>
  {/each}

  <!-- Connection flanges -->
  <g transform="translate({sourceX}, {sourceY})">
    <!-- Flange bottom -->
    <ellipse cx="3" cy="3" rx="16" ry="12" fill="url(#{uniqueId}-right)" />
    <ellipse cx="0" cy="0" rx="16" ry="12" fill="url(#{uniqueId}-left)" />
    <ellipse cx="0" cy="-2" rx="15" ry="11" fill="url(#{uniqueId}-top)" />
    <ellipse cx="0" cy="-1" rx="8" ry="6" fill="url(#{uniqueId}-hole)" />

    <!-- Flange bolts -->
    {#each [0, 90, 180, 270] as angle}
      <g transform="rotate({angle})">
        <circle
          cx="11"
          cy="0"
          r="2.5"
          fill="#6e7078"
          stroke="#2a2b2f"
          stroke-width="1"
        />
        <circle cx="11" cy="0" r="1.2" fill="#9a9ca3" />
      </g>
    {/each}
  </g>

  <g transform="translate({targetX}, {targetY})">
    <!-- Flange bottom -->
    <ellipse cx="3" cy="3" rx="16" ry="12" fill="url(#{uniqueId}-right)" />
    <ellipse cx="0" cy="0" rx="16" ry="12" fill="url(#{uniqueId}-left)" />
    <ellipse cx="0" cy="-2" rx="15" ry="11" fill="url(#{uniqueId}-top)" />
    <ellipse cx="0" cy="-1" rx="8" ry="6" fill="url(#{uniqueId}-hole)" />

    <!-- Flange bolts -->
    {#each [0, 90, 180, 270] as angle}
      <g transform="rotate({angle})">
        <circle
          cx="11"
          cy="0"
          r="2.5"
          fill="#6e7078"
          stroke="#2a2b2f"
          stroke-width="1"
        />
        <circle cx="11" cy="0" r="1.2" fill="#9a9ca3" />
      </g>
    {/each}
  </g>

  <!-- Selection Highlight -->
  {#if selected}
    <path
      d={pathData[0]}
      fill="none"
      stroke="#3b82f6"
      stroke-width="17"
      stroke-opacity="0.6"
      stroke-linecap="round"
      class="selection-highlight"
    />
  {/if}

  <!-- Transfer Rate Label (5/s) -->
  <g transform="translate({midX}, {midY})">
    <rect
      x="-20"
      y="-10"
      width="40"
      height="20"
      rx="4"
      fill="rgba(15, 23, 42, 0.9)"
      stroke="#334155"
      stroke-width="1"
    />
    <text
      x="0"
      y="5"
      text-anchor="middle"
      fill="#fbbf24"
      font-size="11"
      font-weight="600"
      font-family="monospace">5/s</text
    >
  </g>

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

  .pipe-bottom {
    opacity: 0.95;
  }

  .pipe-left {
    opacity: 0.98;
  }

  .pipe-top {
    opacity: 1;
  }

  .pipe-hole {
    opacity: 0.9;
  }

  .flow-ambient {
    animation: flowPulse 2s ease-in-out infinite;
  }

  @keyframes flowPulse {
    0%,
    100% {
      opacity: 0.5;
    }
    50% {
      opacity: 0.7;
    }
  }
</style>
