<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Company } from "$lib/types";

  /**
   * List of companies to display on the map
   */
  export let companies: Company[] = [];

  /**
   * Callback when a node is selected
   */
  export let onSelectCompany: (company: Company) => void;

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrameId: number;

  // Viewport State
  let camera = { x: 0, y: 0, z: 1 }; // x, y offset, z = zoom level
  let isDragging = false;
  let lastMouse = { x: 0, y: 0 };
  let lastTouchDistance = 0;

  // Node Layout Map
  // Map coordinates (q, r) -> Company
  let nodeMap = new Map<string, Company>();
  // Array of rendered nodes with screen positions for hit testing
  type RenderNode = {
    x: number;
    y: number;
    radius: number;
    company: Company;
  };
  let renderNodes: RenderNode[] = [];

  // Constants
  const HEX_SIZE = 120; // Radius of a hex cell
  const NODE_RADIUS = 50; // Radius of the company circle
  const SPACING_X = HEX_SIZE * 1.732; // sqrt(3) * size
  const SPACING_Y = HEX_SIZE * 1.5;

  onMount(() => {
    ctx = canvas.getContext("2d");
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initial Layout Generation (Simple Spiral or Grid)
    generateLayout();

    // Start Loop
    loop();
  });

  onDestroy(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    }
  });

  // Re-generate layout when companies change
  $: if (companies) {
    generateLayout();
  }

  function resizeCanvas() {
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Center camera initially
      if (camera.x === 0 && camera.y === 0) {
        camera.x = window.innerWidth / 2;
        camera.y = window.innerHeight / 2;
      }
    }
  }

  function generateLayout() {
    nodeMap.clear();

    // Spiral Algorithm for Hex Grid
    // Just a simple way to place nodes outward from center (0,0)
    let q = 0,
      r = 0;

    // Helper to generate next hex coordinate in a spiral
    // For MVP, lets just do a simple grid fill or spiral
    // We will map index -> hex coord
    let visited = new Set<string>();
    const directions = [
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 1 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
      { q: 1, r: -1 },
    ];

    // Center is first company
    const queue = [{ q: 0, r: 0 }];
    visited.add("0,0");

    let companyIndex = 0;

    // BFS to fill grid
    while (companyIndex < companies.length) {
      // If queue is empty (shouldn't happen with infinite generation logic, but for static list)
      if (queue.length === 0) break;

      const current = queue.shift()!;
      const key = `${current.q},${current.r}`;

      // Place company
      nodeMap.set(key, companies[companyIndex]);
      companyIndex++;

      // Add neighbors to queue
      for (const dir of directions) {
        const nQ = current.q + dir.q;
        const nR = current.r + dir.r;
        const nKey = `${nQ},${nR}`;

        if (!visited.has(nKey)) {
          visited.add(nKey);
          queue.push({ q: nQ, r: nR });
        }
      }
    }
  }

  function hexToPixel(q: number, r: number) {
    const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = HEX_SIZE * ((3 / 2) * r);
    return { x, y };
  }

  function loop() {
    render();
    animationFrameId = requestAnimationFrame(loop);
  }

  function render() {
    if (!ctx || !canvas) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background Grid (Optional)
    drawGrid();

    renderNodes = [];

    // Draw Nodes
    for (const [key, company] of nodeMap.entries()) {
      const [qs, rs] = key.split(",");
      const q = parseInt(qs);
      const r = parseInt(rs);

      const pos = hexToPixel(q, r);

      // Calculate Dynamic Radius
      const baseRadius = 40;
      // Logarithmic scale: +5px per doubling of employees
      // 0 emp -> 40
      // 10 emp -> ~56
      // 100 emp -> ~73
      // 1000 emp -> ~90
      const empBonus = Math.log2((company.employee_count || 0) + 1) * 5;
      const nodeRadius = Math.min(100, baseRadius + empBonus);

      // Apply Camera Transform
      const screenX = pos.x * camera.z + camera.x;
      const screenY = pos.y * camera.z + camera.y;

      // Culling (Don't draw if outside screen)
      const size = nodeRadius * camera.z;
      if (
        screenX + size < 0 ||
        screenX - size > canvas.width ||
        screenY + size < 0 ||
        screenY - size > canvas.height
      ) {
        continue;
      }

      // Draw Connection Lines (Optional - to neighbors)
      // ...

      // Draw Node
      drawNode(ctx, screenX, screenY, size, company);

      // Store for hit testing
      renderNodes.push({
        x: screenX,
        y: screenY,
        radius: size,
        company,
      });
    }
  }

  function drawGrid() {
    if (!ctx) return;
    ctx.strokeStyle = "#1e293b"; // slate-800
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;

    const gridSize = 100 * camera.z;
    const offsetX = camera.x % gridSize;
    const offsetY = camera.y % gridSize;

    ctx.beginPath();
    // Vertical
    for (let x = offsetX; x < canvas.width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }
    // Horizontal
    for (let y = offsetY; y < canvas.height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawNode(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    company: Company
  ) {
    // Circle Bg
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#0f172a"; // slate-900
    ctx.fill();

    // Border
    ctx.lineWidth = 2 * camera.z;
    ctx.strokeStyle = company.is_npc ? "#3b82f6" : "#6366f1"; // Blue for NPC, Indigo for Users
    ctx.stroke();

    // Icon/Text
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Emoji size relative to radius
    ctx.font = `${r * 0.6}px sans-serif`;
    ctx.fillText("🏭", x, y - r * 0.1);

    // Name
    ctx.font = `bold ${12 * camera.z}px sans-serif`;
    ctx.fillText(company.name.slice(0, 10), x, y + r + 15 * camera.z);

    // Level Badge
    const badgeR = r * 0.3;
    const badgeX = x + r * 0.7;
    const badgeY = y - r * 0.7;

    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b"; // amber-500
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = `bold ${badgeR * 1.2}px sans-serif`;
    ctx.fillText(company.level.toString(), badgeX, badgeY);
  }

  // --- Interaction Handlers ---

  function handleMouseDown(e: MouseEvent) {
    isDragging = true;
    lastMouse = { x: e.clientX, y: e.clientY };
  }

  function handleMouseMove(e: MouseEvent) {
    if (isDragging) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      camera.x += dx;
      camera.y += dy;
      lastMouse = { x: e.clientX, y: e.clientY };
    }
  }

  function handleMouseUp(e: MouseEvent) {
    isDragging = false;
  }

  function handleClick(e: MouseEvent) {
    // Check for node hit
    // We iterate in reverse to hit top-most first
    for (let i = renderNodes.length - 1; i >= 0; i--) {
      const node = renderNodes[i];
      const dx = e.clientX - node.x;
      const dy = e.clientY - node.y;
      if (dx * dx + dy * dy < node.radius * node.radius) {
        onSelectCompany(node.company);
        return;
      }
    }
  }

  // Zoom
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const newZoom = Math.max(
      0.1,
      Math.min(3, camera.z - e.deltaY * zoomSensitivity)
    );

    // Zoom towards mouse pointer logic would go here
    // For MVP, just center zoom is easier or naive
    // Naive zoom:
    camera.z = newZoom;
  }

  // Touch Support
  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      isDragging = true;
      lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDragging = false;
      // Calculate initial distance
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
    }
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault(); // Prevent scrolling page
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - lastMouse.x;
      const dy = e.touches[0].clientY - lastMouse.y;
      camera.x += dx;
      camera.y += dy;
      lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const delta = dist - lastTouchDistance;
      const zoomSensitivity = 0.005;

      camera.z = Math.max(0.1, Math.min(3, camera.z + delta * zoomSensitivity));
      lastTouchDistance = dist;
    }
  }
</script>

<canvas
  bind:this={canvas}
  class="fixed inset-0 bg-slate-950 cursor-grab active:cursor-grabbing touch-none"
  on:mousedown={handleMouseDown}
  on:mousemove={handleMouseMove}
  on:mouseup={handleMouseUp}
  on:mouseleave={handleMouseUp}
  on:click={handleClick}
  on:wheel={handleWheel}
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
  on:touchend={() => (isDragging = false)}
></canvas>
