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

  // Physics State
  type PhysicsNode = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number; // Visual radius
    mass: number;
    dominationRadius: number; // Physics collision radius
    company: Company;
  };
  let nodes: PhysicsNode[] = [];

  // Array of rendered nodes with screen positions for hit testing (derived from physics nodes)
  type RenderNode = {
    x: number;
    y: number;
    radius: number;
    company: Company;
  };
  let renderNodes: RenderNode[] = [];

  // Background Stars
  type Star = {
    x: number;
    y: number;
    size: number;
    opacity: number;
    depth: number; // 1 = near, 0.1 = far (moves slower)
  };
  let stars: Star[] = [];

  // Constants
  const FRICTION = 0.9;
  const GRAVITY = 0.005; // Pull to center
  const REPULSION_STRENGTH = 0.5;
  const CENTER_X = 0;
  const CENTER_Y = 0;

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

    // Initial Layout Generation (Simple Spiral or Grid)
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
      // Center camera initially
      if (camera.x === 0 && camera.y === 0) {
        camera.x = window.innerWidth / 2;
        camera.y = window.innerHeight / 2;
      }
    }
  }

  function generateLayout() {
    nodes = [];

    // Initialize nodes scattered around center
    const spread = 800;

    for (const company of companies) {
      // Calculate radii first
      const baseRadius = 40;
      const wealthFactor = Math.log10((company.balance || 0) + 10) * 2;
      const empFactor = Math.log2((company.employee_count || 0) + 1) * 3;
      const visualRadius = Math.min(120, baseRadius + wealthFactor + empFactor);

      // Domination Radius
      // Each machine adds "space" around the company
      const machineCount = company.machine_count || 0;
      // 1 machine = +2px push radius
      const dominationRadius = visualRadius + machineCount * 2 + 20; // +20 default padding

      nodes.push({
        x: (Math.random() - 0.5) * spread,
        y: (Math.random() - 0.5) * spread,
        vx: 0,
        vy: 0,
        radius: visualRadius,
        mass: visualRadius, // Heavier nodes move less
        dominationRadius: dominationRadius,
        company: company,
      });
    }
  }

  function updatePhysics() {
    // 1. Apply Forces
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // Gravity (Center Attraction)
      const dx = CENTER_X - node.x;
      const dy = CENTER_Y - node.y;
      node.vx += dx * GRAVITY * (60 / node.mass); // Heavier objects pulled slower? No, normally same.
      // Let's just make gravity constant scalar
      node.vx += dx * 0.0005;
      node.vy += dy * 0.0005;

      // Repulsion / Collision
      for (let j = i + 1; j < nodes.length; j++) {
        const other = nodes[j];
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        // Combined Domination Radius
        const minDist = node.dominationRadius + other.dominationRadius;

        if (dist < minDist && dist > 0) {
          // Push apart!
          // Force proportional to overlap
          const overlap = minDist - dist;
          const force = overlap * REPULSION_STRENGTH;

          // Normalized direction
          const nx = dx / dist;
          const ny = dy / dist;

          // Apply force inversely proportional to mass (f=ma -> a=f/m)
          // Heavier companies push lighter ones more easily
          const totalMass = node.mass + other.mass;
          const m1Params = other.mass / totalMass;
          const m2Params = node.mass / totalMass;

          node.vx -= nx * force * m1Params;
          node.vy -= ny * force * m1Params;

          other.vx += nx * force * m2Params;
          other.vy += ny * force * m2Params;
        }
      }
    }

    // 2. Integration
    for (const node of nodes) {
      node.x += node.vx;
      node.y += node.vy;
      node.vx *= FRICTION;
      node.vy *= FRICTION;
    }
  }

  function generateStars() {
    stars = [];
    const count = 300;
    // We generate stars in a large area around 0,0
    const spread = 5000;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: (Math.random() - 0.5) * spread * 2,
        y: (Math.random() - 0.5) * spread * 2,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        depth: Math.random() * 0.5 + 0.1, // 0.1 to 0.6
      });
    }
  }

  function loop(time: number) {
    updatePhysics(); // Run physics step
    render(time);
    animationFrameId = requestAnimationFrame(loop);
  }

  function render(time: number) {
    if (!ctx || !canvas) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background Gradient (Nebula effect base)
    // Dark radial gradient for depth
    const grd = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width
    );
    grd.addColorStop(0, "#0f172a"); // Slate 900
    grd.addColorStop(1, "#020617"); // Slate 950
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Stars (Parallax)
    for (const star of stars) {
      // Parallax position:
      // We move the star opposite to camera movement, scaled by depth
      // But we need to keep them 'looping' or just generate enough area
      // For simple MVP, simple parallax transform
      const screenX = star.x + camera.x * star.depth + canvas.width / 2;
      // + canvas.width/2 to center 0,0 roughly if camera is 0,0
      // Wait, camera.x is offset. If camera moves left (positive x in typical 2d engines, but here dragging mouse right increases camera.x means we move 'left' into the world?)
      // Let's stick to: screen = world * zoom + offset
      // For stars: screen = star.x + offset * depth

      const sx = star.x + camera.x * star.depth;
      const sy = star.y + camera.y * star.depth;

      // Culling
      if (sx < 0 || sx > canvas.width || sy < 0 || sy > canvas.height) continue;

      ctx.beginPath();
      ctx.arc(
        sx,
        sy,
        star.size * Math.max(0.5, camera.z * 0.5),
        0,
        Math.PI * 2
      );
      // Stars don't zoom much
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      ctx.fill();
    }

    // Background Grid
    drawGrid();

    renderNodes = [];

    // Draw Nodes
    for (const node of nodes) {
      const { x, y, radius: nodeRadius, company } = node;

      // Apply Camera Transform
      const screenX = x * camera.z + camera.x;
      const screenY = y * camera.z + camera.y;

      // Culling (Don't draw if outside screen)
      const size = nodeRadius * camera.z;
      const dominationSize = node.dominationRadius * camera.z;

      if (
        screenX + dominationSize < 0 ||
        screenX - dominationSize > canvas.width ||
        screenY + dominationSize < 0 ||
        screenY - dominationSize > canvas.height
      ) {
        continue;
      }

      // Draw Node with Mini-Factory view
      drawNode(ctx, screenX, screenY, size, dominationSize, company, time);

      // Store for hit testing
      renderNodes.push({
        x: screenX,
        y: screenY,
        radius: dominationSize, // Use larger radius for easier clicking
        company,
      });
    }

    // Draw connections (after nodes logic? no, preferably before so lines are behind)
    // Actually standard is lines behind.
    // Let's do a quick pass for lines BEFORE drawing nodes

    // NOTE: Loop restructure for layering:
    // 1. Calc positions (Physics - Done)
    // 2. Draw Lines
    // 3. Draw Nodes

    // Fixing the loop above to just calculate renderNodes first, then draw.
    // But 'renderNodes' is cleared at start of render().
    // We can just iterate 'nodes' twice.

    // Pass 1: Lines
    const MAX_LINE_DIST = 300;
    ctx.lineWidth = 1 * camera.z;
    ctx.strokeStyle = "#475569";

    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i];
      const sx1 = n1.x * camera.z + camera.x;
      const sy1 = n1.y * camera.z + camera.y;

      // Screen cull somewhat?
      if (
        sx1 < -500 ||
        sx1 > canvas.width + 500 ||
        sy1 < -500 ||
        sy1 > canvas.height + 500
      )
        continue;

      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        const dx = n1.x - n2.x; // World dist
        const dy = n1.y - n2.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < MAX_LINE_DIST * MAX_LINE_DIST) {
          const sx2 = n2.x * camera.z + camera.x;
          const sy2 = n2.y * camera.z + camera.y;

          ctx.globalAlpha = 0.15 * (1 - Math.sqrt(distSq) / MAX_LINE_DIST); // Fade out
          ctx.beginPath();
          ctx.moveTo(sx1, sy1);
          ctx.lineTo(sx2, sy2);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    // Pass 2: Nodes
    for (const node of nodes) {
      const { x, y, radius: nodeRadius, company } = node;
      const screenX = x * camera.z + camera.x;
      const screenY = y * camera.z + camera.y;
      const size = nodeRadius * camera.z;

      if (
        screenX + size < 0 ||
        screenX - size > canvas.width ||
        screenY + size < 0 ||
        screenY - size > canvas.height
      ) {
        continue;
      }

      const dominationSize = node.dominationRadius * camera.z;
      drawNode(ctx, screenX, screenY, size, dominationSize, company, time);

      renderNodes.push({
        x: screenX,
        y: screenY,
        radius: size,
        company,
      });
    }
  }

  function getCompanyColor(company: Company): {
    fill: string;
    stroke: string;
    glow: string;
  } {
    // NPC
    if (company.is_npc) {
      return { fill: "#1e293b", stroke: "#3b82f6", glow: "#60a5fa" };
    }

    // Wealth Tiers
    const balance = company.balance || 0;

    if (balance > 1_000_000_000) {
      // Elite / Gold
      return { fill: "#1c1917", stroke: "#fbbf24", glow: "#f59e0b" };
    } else if (balance > 10_000_000) {
      // Rich / Violet
      return { fill: "#1e1b4b", stroke: "#818cf8", glow: "#6366f1" };
    } else if (balance > 100_000) {
      // Mid / Emerald
      return { fill: "#022c22", stroke: "#34d399", glow: "#10b981" };
    } else {
      // Starter / Slate
      return { fill: "#0f172a", stroke: "#94a3b8", glow: "#cbd5e1" };
    }

    // We could also mix in sector colors if we had a 'sector' field,
    // but for now we stick to wealth as requested (Blue -> Gold).
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
    dominationR: number,
    company: Company,
    time: number
  ) {
    const colors = getCompanyColor(company);
    const machineCount = company.machine_count || 0;
    const empCount = company.employee_count || 0;

    // === MINI-FACTORY VIEW ===
    // Draw installation grid around the company node
    if (machineCount > 0) {
      // Simulate breakdown: 40% extractors, 40% processors, 20% storage
      const extractorCount = Math.ceil(machineCount * 0.4);
      const processorCount = Math.ceil(machineCount * 0.4);
      const storageCount = Math.max(
        1,
        machineCount - extractorCount - processorCount
      );

      // Installation icons with colors
      const installations = [
        ...Array(Math.min(extractorCount, 8)).fill({
          icon: "⛏️",
          color: "#3b82f6",
        }), // Blue - Extractors
        ...Array(Math.min(processorCount, 8)).fill({
          icon: "🔥",
          color: "#f59e0b",
        }), // Orange - Processors
        ...Array(Math.min(storageCount, 4)).fill({
          icon: "📦",
          color: "#10b981",
        }), // Green - Storage
      ];

      // Draw installations in a circular pattern
      const maxVisible = Math.min(installations.length, 12);
      const installSize = Math.max(12, 20 * camera.z);
      const installRadius = r + installSize + 10 * camera.z;

      // Initialize RNG with company ID for stable positions
      let seed = 0;
      for (let i = 0; i < company.id.length; i++)
        seed += company.id.charCodeAt(i);
      const rand = mulberry32(seed);

      for (let i = 0; i < maxVisible; i++) {
        const inst = installations[i];
        const angle = (i / maxVisible) * Math.PI * 2 - Math.PI / 2;

        // Slight variation in distance
        const distVar = 1 + (rand() - 0.5) * 0.2;
        const ix = x + Math.cos(angle) * installRadius * distVar;
        const iy = y + Math.sin(angle) * installRadius * distVar;

        // Draw installation background (small rounded square)
        const squareSize = installSize * 0.9;
        ctx.fillStyle = "#0f172a";
        ctx.strokeStyle = inst.color;
        ctx.lineWidth = 2 * camera.z;

        // Rounded rectangle
        const cornerRadius = 4 * camera.z;
        ctx.beginPath();
        ctx.roundRect(
          ix - squareSize / 2,
          iy - squareSize / 2,
          squareSize,
          squareSize,
          cornerRadius
        );
        ctx.fill();
        ctx.stroke();

        // Draw icon
        ctx.font = `${installSize * 0.6}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(inst.icon, ix, iy);
      }

      // Draw connection lines from installations to center
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 1 * camera.z;
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < maxVisible; i++) {
        const angle = (i / maxVisible) * Math.PI * 2 - Math.PI / 2;
        const ix = x + Math.cos(angle) * installRadius;
        const iy = y + Math.sin(angle) * installRadius;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(ix, iy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // === MAIN NODE (Company HQ) ===
    // Glow Effect
    ctx.shadowBlur = r * 0.5;
    ctx.shadowColor = colors.glow;

    // Circle Bg
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = colors.fill;
    ctx.fill();

    // Border
    ctx.shadowBlur = 0;
    ctx.lineWidth = (2 + Math.log10((company.balance || 1) + 1)) * camera.z;
    ctx.strokeStyle = colors.stroke;
    ctx.stroke();

    // HQ Icon
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${r * 0.5}px sans-serif`;
    ctx.fillText("🏛️", x, y - r * 0.1);

    // Stats Row (employees + machines)
    const statsY = y + r * 0.35;
    ctx.font = `bold ${9 * camera.z}px sans-serif`;
    ctx.fillStyle = colors.glow;
    ctx.fillText(`👥${empCount}  ⚙️${machineCount}`, x, statsY);

    // Company Name
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.fillStyle = "#f8fafc";
    ctx.font = `bold ${11 * camera.z}px sans-serif`;
    ctx.fillText(company.name.slice(0, 14), x, y + r + 14 * camera.z);
    ctx.shadowBlur = 0;

    // Level Badge (top right)
    const badgeR = r * 0.26;
    const badgeX = x + r * 0.72;
    const badgeY = y - r * 0.72;

    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = colors.stroke;
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = `bold ${badgeR * 1.1}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(company.level.toString(), badgeX, badgeY);

    // Wealth indicator (small bar under name)
    const barWidth = r * 1.2;
    const barHeight = 3 * camera.z;
    const barY = y + r + 22 * camera.z;
    const balance = company.balance || 0;
    const wealthPercent = Math.min(1, Math.log10(balance + 1) / 10); // 0-1 scale

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x - barWidth / 2, barY, barWidth, barHeight);

    // Gradient fill based on wealth
    const wealthGrad = ctx.createLinearGradient(
      x - barWidth / 2,
      0,
      x + barWidth / 2,
      0
    );
    wealthGrad.addColorStop(0, "#10b981");
    wealthGrad.addColorStop(0.5, "#f59e0b");
    wealthGrad.addColorStop(1, "#ef4444");
    ctx.fillStyle = wealthGrad;
    ctx.fillRect(x - barWidth / 2, barY, barWidth * wealthPercent, barHeight);
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
