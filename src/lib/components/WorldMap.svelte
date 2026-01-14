<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Company } from "$lib/pocketbase";

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

  // Hover State
  let hoveredCompany: Company | null = null;
  let hoverTimer: any;

  // Node Definition
  type MapNode = {
    x: number;
    y: number;
    radius: number; // Visual radius for the HQ
    dominationRadius: number; // Territory radius
    company: Company;
    color: { fill: string; stroke: string; glow: string };
    installations: Array<{
      x: number;
      y: number;
      icon: string;
      color: string;
      angle: number;
      dist: number;
    }>;
  };
  let nodes: MapNode[] = [];

  // Background Stars
  type Star = {
    x: number;
    y: number;
    size: number;
    opacity: number;
    depth: number;
  };
  let stars: Star[] = [];

  // Constants
  const MAP_SIZE = 4000; // Virtual map size
  const MIN_DIST = 300; // Minimum distance between HQs

  // Simple Seeded PRNG
  function mulberry32(a: number) {
    return function () {
      var t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  onMount(() => {
    ctx = canvas.getContext("2d");
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initial Layout Generation
    generateLayout();
    generateStars();

    // Start Loop
    loop(0);
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
      // Center camera initially if at 0,0
      if (camera.x === 0 && camera.y === 0) {
        camera.x = window.innerWidth / 2;
        camera.y = window.innerHeight / 2;
      }
    }
  }

  function getCompanyColor(company: Company): {
    fill: string;
    stroke: string;
    glow: string;
  } {
    if (company.is_npc) {
      return { fill: "#1e293b", stroke: "#3b82f6", glow: "#60a5fa" };
    }
    const balance = company.balance || 0;
    if (balance > 1_000_000_000) {
      return { fill: "#1c1917", stroke: "#fbbf24", glow: "#f59e0b" };
    } else if (balance > 10_000_000) {
      return { fill: "#1e1b4b", stroke: "#818cf8", glow: "#6366f1" };
    } else if (balance > 100_000) {
      return { fill: "#022c22", stroke: "#34d399", glow: "#10b981" };
    } else {
      return { fill: "#0f172a", stroke: "#94a3b8", glow: "#cbd5e1" };
    }
  }

  function generateLayout() {
    nodes = [];
    if (!companies.length) return;

    // Deterministic placement based on company ID hash or similar would be cool, but random is requested.
    // We strive for semi-random but consistent-ish if the list order doesn't change much.
    // Using a simpler approach: Place one by one, checking distance.

    // Sort by wealth/size so big companies get priority placement?
    const sorted = [...companies].sort(
      (a, b) => (b.balance || 0) - (a.balance || 0)
    );

    // Seeded random for consistency across reloads (optional, lets use Math.random for now as requested "random location")
    // Use a fixed seed if we want it to persist per session? No, plain random is fine.

    for (const company of sorted) {
      const baseRadius = 40;
      const wealthFactor = Math.log10((company.balance || 0) + 10) * 2;
      const empFactor = Math.log2((company.employee_count || 0) + 1) * 3;
      const visualRadius = Math.min(120, baseRadius + wealthFactor + empFactor);
      const machineCount = company.machine_count || 0;
      const dominationRadius = visualRadius + machineCount * 4 + 50;

      // Pre-calculate installations for preview
      const installations = [];
      if (machineCount > 0) {
        // Generate aesthetic positions for installations
        const installCount = Math.min(machineCount, 24); // Cap for visual clarity
        const extractorCount = Math.ceil(installCount * 0.4);
        const processorCount = Math.ceil(installCount * 0.4);
        const storageCount = installCount - extractorCount - processorCount;

        const types = [
          ...Array(extractorCount).fill({ icon: "⛏️", color: "#3b82f6" }),
          ...Array(processorCount).fill({ icon: "🔥", color: "#f59e0b" }),
          ...Array(storageCount).fill({ icon: "📦", color: "#10b981" }),
        ];

        // Use seed for consistent installation placement per company
        let seed = 0;
        for (let i = 0; i < company.id.length; i++)
          seed += company.id.charCodeAt(i);
        const rand = mulberry32(seed);

        for (let i = 0; i < installCount; i++) {
          const angle = (i / installCount) * Math.PI * 2;
          const distVar = 1 + (rand() - 0.5) * 0.3;
          const dist = (visualRadius * 1.5 + 20) * distVar; // Distance from center

          installations.push({
            x: 0, // Computed at render
            y: 0,
            icon: types[i].icon,
            color: types[i].color,
            angle,
            dist,
          });
        }
      }

      // Find position
      let x = 0,
        y = 0;
      let placed = false;
      let attempts = 0;
      const MAX_ATTEMPTS = 100;

      while (!placed && attempts < MAX_ATTEMPTS) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.sqrt(Math.random()) * (MAP_SIZE / 2); // Distribute more uniformly in area
        x = Math.cos(angle) * dist;
        y = Math.sin(angle) * dist;

        // Check collisions
        let collides = false;
        for (const existing of nodes) {
          const dx = x - existing.x;
          const dy = y - existing.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          // Ensure enough space between territory boundaries or at least HQs
          if (d < existing.dominationRadius + dominationRadius) {
            collides = true;
            break;
          }
        }

        if (!collides) {
          placed = true;
        }
        attempts++;
      }

      // If couldn't place without overlap, place it far away or just place it anyway (fallback)
      if (!placed) {
        x = (Math.random() - 0.5) * MAP_SIZE * 1.5;
        y = (Math.random() - 0.5) * MAP_SIZE * 1.5;
      }

      nodes.push({
        x,
        y,
        radius: visualRadius,
        dominationRadius,
        company,
        color: getCompanyColor(company),
        installations,
      });
    }
  }

  function generateStars() {
    stars = [];
    const count = 400;
    const spread = MAP_SIZE * 1.5;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: (Math.random() - 0.5) * spread * 2,
        y: (Math.random() - 0.5) * spread * 2,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        depth: Math.random() * 0.5 + 0.1,
      });
    }
  }

  function loop(time: number) {
    render(time);
    animationFrameId = requestAnimationFrame(loop);
  }

  function render(time: number) {
    if (!ctx || !canvas) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background Gradient
    const grd = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width
    );
    grd.addColorStop(0, "#0f172a");
    grd.addColorStop(1, "#020617");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars
    for (const star of stars) {
      const sx = star.x + camera.x * star.depth + canvas.width / 2; // Parallax
      const sy = star.y + camera.y * star.depth + canvas.height / 2;

      // Culling
      if (sx < 0 || sx > canvas.width || sy < 0 || sy > canvas.height) continue;

      ctx.beginPath();
      ctx.arc(sx, sy, star.size * Math.max(0.5, camera.z), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      ctx.fill();
    }

    // Grid
    drawGrid();

    // Nodes
    for (const node of nodes) {
      const screenX = node.x * camera.z + camera.x;
      const screenY = node.y * camera.z + camera.y;

      // Extended culling to include domination area
      const maxDim = node.dominationRadius * camera.z;
      if (
        screenX + maxDim < 0 ||
        screenX - maxDim > canvas.width ||
        screenY + maxDim < 0 ||
        screenY - maxDim > canvas.height
      )
        continue;

      drawNode(
        ctx,
        screenX,
        screenY,
        node,
        time,
        node.company === hoveredCompany
      );
    }
  }

  function drawGrid() {
    if (!ctx) return;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.2;

    const gridSize = 150 * camera.z;
    const offsetX = camera.x % gridSize;
    const offsetY = camera.y % gridSize;

    ctx.beginPath();
    for (let x = offsetX; x < canvas.width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }
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
    node: MapNode,
    time: number,
    isHovered: boolean
  ) {
    const { radius, company, color, installations } = node;
    const size = radius * camera.z;

    // Territory circle (Domination Radius) - Visible on hover or always faint?
    // Let's make it visible on hover
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(x, y, node.dominationRadius * camera.z, 0, Math.PI * 2);
      ctx.fillStyle = color.glow;
      ctx.globalAlpha = 0.05;
      ctx.fill();
      ctx.strokeStyle = color.stroke;
      ctx.globalAlpha = 0.1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Installations (Factory Preview)
    if (installations && installations.length > 0) {
      const installSize = Math.max(12, 18 * camera.z);

      // Draw connections first
      ctx.strokeStyle = color.stroke;
      ctx.lineWidth = 1 * camera.z;
      ctx.globalAlpha = isHovered ? 0.6 : 0.2;

      ctx.beginPath();
      installations.forEach((inst) => {
        // Slight rotation animation
        const currentAngle = inst.angle + time * 0.0001;
        const ix = x + Math.cos(currentAngle) * inst.dist * camera.z;
        const iy = y + Math.sin(currentAngle) * inst.dist * camera.z;
        ctx.moveTo(x, y);
        ctx.lineTo(ix, iy);
      });
      ctx.stroke();

      // Draw icons
      ctx.globalAlpha = 1;
      installations.forEach((inst) => {
        const currentAngle = inst.angle + time * 0.0001;
        const ix = x + Math.cos(currentAngle) * inst.dist * camera.z;
        const iy = y + Math.sin(currentAngle) * inst.dist * camera.z;

        // Background
        ctx.fillStyle = "#0f172a";
        ctx.strokeStyle = inst.color;
        ctx.lineWidth = 1.5 * camera.z;

        ctx.beginPath();
        ctx.roundRect(
          ix - installSize / 2,
          iy - installSize / 2,
          installSize,
          installSize,
          4 * camera.z
        );
        ctx.fill();
        ctx.stroke();

        // Icon
        if (camera.z > 0.4) {
          // LOD
          ctx.font = `${installSize * 0.6}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#fff";
          ctx.fillText(inst.icon, ix, iy);
        }
      });
    }

    // Main HQ
    ctx.shadowBlur = isHovered ? size * 0.8 : size * 0.4;
    ctx.shadowColor = color.glow;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = color.fill;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.lineWidth = (isHovered ? 4 : 2) * camera.z;
    ctx.strokeStyle = color.stroke;
    ctx.stroke();

    // Icon
    ctx.fillStyle = "#fff";
    ctx.font = `${size * 0.5}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🏛️", x, y - size * 0.1);

    // Stats underneath
    if (camera.z > 0.3) {
      const statsY = y + size * 0.35;
      ctx.font = `bold ${10 * camera.z}px sans-serif`;
      ctx.fillStyle = color.glow;
      ctx.fillText(
        `👥${company.employee_count || 0}  ⚙️${company.machine_count || 0}`,
        x,
        statsY
      );
    }

    // Name Label
    if (camera.z > 0.3 || isHovered) {
      ctx.shadowColor = "black";
      ctx.shadowBlur = 4;
      ctx.fillStyle = "#f8fafc";
      ctx.font = `bold ${12 * camera.z}px sans-serif`;
      const nameY = y + size + 16 * camera.z;
      ctx.fillText(company.name, x, nameY);
      ctx.shadowBlur = 0;
    }
  }

  // --- Interaction Handlers ---

  function handleMouseDown(e: MouseEvent) {
    isDragging = true;
    lastMouse = { x: e.clientX, y: e.clientY };
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (isDragging) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      camera.x += dx;
      camera.y += dy;
      lastMouse = { x: e.clientX, y: e.clientY };
    } else {
      // Hover detection
      let found: Company | null = null;
      // Search in reverse draw order
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        const screenX = node.x * camera.z + camera.x;
        const screenY = node.y * camera.z + camera.y;
        const hitR = node.radius * camera.z;

        const dx = mx - screenX;
        const dy = my - screenY;
        if (dx * dx + dy * dy < hitR * hitR) {
          found = node.company;
          break;
        }
      }
      hoveredCompany = found;
      if (canvas)
        canvas.style.cursor = found
          ? "pointer"
          : isDragging
            ? "grabbing"
            : "grab";
    }
  }

  function handleMouseUp(e: MouseEvent) {
    isDragging = false;
  }

  function handleClick(e: MouseEvent) {
    if (hoveredCompany) {
      onSelectCompany(hoveredCompany);
    }
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const newZoom = Math.max(
      0.1,
      Math.min(3, camera.z - e.deltaY * zoomSensitivity)
    );

    // Zoom towards center for now
    camera.z = newZoom;
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      isDragging = true;
      lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
    }
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();
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
  class="fixed inset-0 bg-slate-950 touch-none block"
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

<style>
  /* No extra styles needed, managed by canvas */
</style>
