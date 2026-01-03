<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { mockCanvasState, getSpaceTotal } from "$lib/canvas/mockData";
  import {
    NODE_COLORS,
    CANVAS_CONFIG,
    type CanvasNode,
    type Connector,
    type CanvasState,
  } from "$lib/canvas/canvasTypes";

  // Props
  export let onNodeSelect: (node: CanvasNode | null) => void = () => {};

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrameId: number;

  // État du canvas
  let state: CanvasState = { ...mockCanvasState };

  // Camera
  let camera = { x: 0, y: 0, zoom: 1 };
  let isPanning = false;
  let lastMouse = { x: 0, y: 0 };
  let lastTouchDistance = 0;

  // Drag & Drop nodes
  let draggingNode: CanvasNode | null = null;
  let dragOffset = { x: 0, y: 0 };

  // Connector creation
  let isCreatingConnector = false;
  let connectorStart: {
    nodeId: string;
    portIndex: number;
    isOutput: boolean;
  } | null = null;
  let connectorEndPos = { x: 0, y: 0 };

  // Animation
  let animationTime = 0;

  const { GRID_SIZE, PORT_RADIUS, MIN_ZOOM, MAX_ZOOM, NODE_CORNER_RADIUS } =
    CANVAS_CONFIG;

  onMount(() => {
    ctx = canvas.getContext("2d");
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    // Centrer la caméra initialement
    camera.x = window.innerWidth / 2;
    camera.y = window.innerHeight / 2;
    loop();
  });

  onDestroy(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    }
  });

  function resizeCanvas() {
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 100;
    }
  }

  function loop() {
    animationTime += 0.02;
    render();
    animationFrameId = requestAnimationFrame(loop);
  }

  // Conversion grille -> écran
  function gridToScreen(gx: number, gy: number): { x: number; y: number } {
    return {
      x: gx * GRID_SIZE * camera.zoom + camera.x,
      y: gy * GRID_SIZE * camera.zoom + camera.y,
    };
  }

  // Conversion écran -> grille
  function screenToGrid(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - camera.x) / (GRID_SIZE * camera.zoom),
      y: (sy - camera.y) / (GRID_SIZE * camera.zoom),
    };
  }

  // Get port position in screen coordinates
  function getPortPosition(
    node: CanvasNode,
    portIndex: number,
    isOutput: boolean
  ): { x: number; y: number } {
    const pos = gridToScreen(node.x, node.y);
    const w = node.width * GRID_SIZE * camera.zoom;
    const h = node.height * GRID_SIZE * camera.zoom;
    const ports = isOutput ? node.outputs : node.inputs;
    const py = pos.y + (h / (ports.length + 1)) * (portIndex + 1);
    return {
      x: isOutput ? pos.x + w : pos.x,
      y: py,
    };
  }

  // Check if mouse is over a port
  function hitTestPort(
    mx: number,
    my: number
  ): { node: CanvasNode; portIndex: number; isOutput: boolean } | null {
    const hitRadius = PORT_RADIUS * camera.zoom * 2;

    for (const node of state.nodes) {
      // Check output ports
      for (let i = 0; i < node.outputs.length; i++) {
        const portPos = getPortPosition(node, i, true);
        const dx = mx - portPos.x;
        const dy = my - portPos.y;
        if (dx * dx + dy * dy < hitRadius * hitRadius) {
          return { node, portIndex: i, isOutput: true };
        }
      }
      // Check input ports
      for (let i = 0; i < node.inputs.length; i++) {
        const portPos = getPortPosition(node, i, false);
        const dx = mx - portPos.x;
        const dy = my - portPos.y;
        if (dx * dx + dy * dy < hitRadius * hitRadius) {
          return { node, portIndex: i, isOutput: false };
        }
      }
    }
    return null;
  }

  // Hit test node
  function hitTestNode(mx: number, my: number): CanvasNode | null {
    for (let i = state.nodes.length - 1; i >= 0; i--) {
      const node = state.nodes[i];
      const pos = gridToScreen(node.x, node.y);
      const w = node.width * GRID_SIZE * camera.zoom;
      const h = node.height * GRID_SIZE * camera.zoom;
      if (mx >= pos.x && mx <= pos.x + w && my >= pos.y && my <= pos.y + h) {
        return node;
      }
    }
    return null;
  }

  function render() {
    if (!ctx || !canvas) return;

    // Clear
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessiner la grille
    drawGrid();

    // Dessiner les limites d'espace
    drawCompanyBounds();

    // Dessiner les connecteurs
    for (const connector of state.connectors) {
      drawConnector(connector);
    }

    // Dessiner le connecteur en cours de création
    if (isCreatingConnector && connectorStart) {
      drawTempConnector();
    }

    // Dessiner les noeuds
    for (const node of state.nodes) {
      drawNode(node);
    }
  }

  function drawGrid() {
    if (!ctx) return;

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;

    const gridStep = GRID_SIZE * camera.zoom;
    const offsetX = camera.x % gridStep;
    const offsetY = camera.y % gridStep;

    ctx.beginPath();
    for (let x = offsetX; x < canvas.width; x += gridStep) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }
    for (let y = offsetY; y < canvas.height; y += gridStep) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawCompanyBounds() {
    if (!ctx) return;

    const spaceTotal = getSpaceTotal();
    const halfSpace = spaceTotal / 2;
    const topLeft = gridToScreen(-halfSpace, -halfSpace);
    const size = spaceTotal * GRID_SIZE * camera.zoom;

    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(topLeft.x, topLeft.y, size, size);
    ctx.setLineDash([]);

    ctx.fillStyle = "#6366f1";
    ctx.font = `${12 * camera.zoom}px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(
      `Espace: ${spaceTotal}×${spaceTotal}`,
      topLeft.x + 5,
      topLeft.y - 5
    );
  }

  function drawNode(node: CanvasNode) {
    if (!ctx) return;

    const pos = gridToScreen(node.x, node.y);
    const w = node.width * GRID_SIZE * camera.zoom;
    const h = node.height * GRID_SIZE * camera.zoom;
    const colors = NODE_COLORS[node.type];
    const isSelected = state.selectedNodeId === node.id;
    const isBeingDragged = draggingNode?.id === node.id;

    // Rectangle avec coins arrondis
    ctx.beginPath();
    const r = NODE_CORNER_RADIUS * camera.zoom;
    ctx.moveTo(pos.x + r, pos.y);
    ctx.lineTo(pos.x + w - r, pos.y);
    ctx.quadraticCurveTo(pos.x + w, pos.y, pos.x + w, pos.y + r);
    ctx.lineTo(pos.x + w, pos.y + h - r);
    ctx.quadraticCurveTo(pos.x + w, pos.y + h, pos.x + w - r, pos.y + h);
    ctx.lineTo(pos.x + r, pos.y + h);
    ctx.quadraticCurveTo(pos.x, pos.y + h, pos.x, pos.y + h - r);
    ctx.lineTo(pos.x, pos.y + r);
    ctx.quadraticCurveTo(pos.x, pos.y, pos.x + r, pos.y);
    ctx.closePath();

    // Shadow for dragging
    if (isBeingDragged) {
      ctx.shadowColor = "rgba(99, 102, 241, 0.5)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 5;
    }

    ctx.fillStyle = colors.fill;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    ctx.strokeStyle = isSelected
      ? "#ffffff"
      : isBeingDragged
        ? "#a5b4fc"
        : colors.stroke;
    ctx.lineWidth = isSelected || isBeingDragged ? 3 : 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = colors.text;
    ctx.font = `bold ${12 * camera.zoom}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.label, pos.x + w / 2, pos.y + h / 2);

    // Dessiner les ports
    drawPorts(node, pos, w, h);

    // Indicateur d'état pour les machines
    if (node.type === "machine" && node.data) {
      const data = node.data as { producing: boolean };
      const statusColor = data.producing ? "#22c55e" : "#f59e0b";
      ctx.beginPath();
      ctx.arc(
        pos.x + w - 10 * camera.zoom,
        pos.y + 10 * camera.zoom,
        5 * camera.zoom,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = statusColor;
      ctx.fill();
    }
  }

  function drawPorts(
    node: CanvasNode,
    pos: { x: number; y: number },
    w: number,
    h: number
  ) {
    if (!ctx) return;

    const pr = PORT_RADIUS * camera.zoom;

    // Inputs (côté gauche) - VERT
    const inputCount = node.inputs.length;
    for (let i = 0; i < inputCount; i++) {
      const py = pos.y + (h / (inputCount + 1)) * (i + 1);

      // Highlight brighter if we're creating a connector and this is a valid target
      const isValidTarget =
        isCreatingConnector &&
        connectorStart?.isOutput &&
        connectorStart.nodeId !== node.id;

      ctx.beginPath();
      ctx.arc(pos.x, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = isValidTarget ? "#4ade80" : "#22c55e"; // Green
      ctx.fill();
      ctx.strokeStyle = isValidTarget ? "#86efac" : "#16a34a";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Outputs (côté droit) - ROUGE
    const outputCount = node.outputs.length;
    for (let i = 0; i < outputCount; i++) {
      const py = pos.y + (h / (outputCount + 1)) * (i + 1);

      // Highlight if currently dragging from this port
      const isSource =
        connectorStart?.nodeId === node.id &&
        connectorStart?.portIndex === i &&
        connectorStart?.isOutput;

      ctx.beginPath();
      ctx.arc(pos.x + w, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = isSource ? "#f87171" : "#ef4444"; // Red
      ctx.fill();
      ctx.strokeStyle = isSource ? "#fca5a5" : "#dc2626";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawConnector(connector: Connector) {
    if (!ctx) return;

    const fromNode = state.nodes.find((n) => n.id === connector.from.nodeId);
    const toNode = state.nodes.find((n) => n.id === connector.to.nodeId);
    if (!fromNode || !toNode) return;

    const fromPos = getPortPosition(fromNode, connector.from.portIndex, true);
    const toPos = getPortPosition(toNode, connector.to.portIndex, false);

    // Courbe de Bézier
    const controlOffset = Math.min(100, Math.abs(toPos.x - fromPos.x) / 2);

    ctx.beginPath();
    ctx.moveTo(fromPos.x, fromPos.y);
    ctx.bezierCurveTo(
      fromPos.x + controlOffset,
      fromPos.y,
      toPos.x - controlOffset,
      toPos.y,
      toPos.x,
      toPos.y
    );

    ctx.strokeStyle = connector.isActive ? "#6366f1" : "#475569";
    ctx.lineWidth = (connector.isActive ? 3 : 2) * camera.zoom;
    ctx.stroke();

    // Animated flow particles
    if (connector.isActive) {
      drawFlowParticles(fromPos, toPos, controlOffset);
    }
  }

  function drawFlowParticles(
    from: { x: number; y: number },
    to: { x: number; y: number },
    controlOffset: number
  ) {
    if (!ctx) return;

    const particleCount = 3;
    const particleSize = 4 * camera.zoom;

    for (let i = 0; i < particleCount; i++) {
      // Stagger particles along the curve
      const baseT = (animationTime + i * 0.33) % 1;

      // Cubic bezier interpolation
      const t = baseT;
      const mt = 1 - t;

      const cp1x = from.x + controlOffset;
      const cp1y = from.y;
      const cp2x = to.x - controlOffset;
      const cp2y = to.y;

      const x =
        mt * mt * mt * from.x +
        3 * mt * mt * t * cp1x +
        3 * mt * t * t * cp2x +
        t * t * t * to.x;
      const y =
        mt * mt * mt * from.y +
        3 * mt * mt * t * cp1y +
        3 * mt * t * t * cp2y +
        t * t * t * to.y;

      ctx.beginPath();
      ctx.arc(x, y, particleSize, 0, Math.PI * 2);
      ctx.fillStyle = "#a5b4fc";
      ctx.fill();
    }
  }

  function drawTempConnector() {
    if (!ctx || !connectorStart) return;

    const startNode = state.nodes.find((n) => n.id === connectorStart!.nodeId);
    if (!startNode) return;

    const startPos = getPortPosition(
      startNode,
      connectorStart.portIndex,
      connectorStart.isOutput
    );
    const endX = connectorEndPos.x;
    const endY = connectorEndPos.y;

    const controlOffset = Math.min(100, Math.abs(endX - startPos.x) / 2);

    ctx.beginPath();
    ctx.moveTo(startPos.x, startPos.y);

    if (connectorStart.isOutput) {
      ctx.bezierCurveTo(
        startPos.x + controlOffset,
        startPos.y,
        endX - controlOffset,
        endY,
        endX,
        endY
      );
    } else {
      ctx.bezierCurveTo(
        startPos.x - controlOffset,
        startPos.y,
        endX + controlOffset,
        endY,
        endX,
        endY
      );
    }

    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2 * camera.zoom;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // --- Interactions ---

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check if clicking on a port (start connector creation)
    const portHit = hitTestPort(mx, my);
    if (portHit && portHit.isOutput) {
      isCreatingConnector = true;
      connectorStart = {
        nodeId: portHit.node.id,
        portIndex: portHit.portIndex,
        isOutput: true,
      };
      connectorEndPos = { x: mx, y: my };
      return;
    }

    // Check if clicking on a node (start dragging)
    const nodeHit = hitTestNode(mx, my);
    if (nodeHit && nodeHit.type !== "hq") {
      // Can't drag HQ
      draggingNode = nodeHit;
      const nodePos = gridToScreen(nodeHit.x, nodeHit.y);
      dragOffset = { x: mx - nodePos.x, y: my - nodePos.y };
      return;
    }

    // Otherwise, start panning
    isPanning = true;
    lastMouse = { x: e.clientX, y: e.clientY };
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Update cursor based on what we're hovering
    if (!draggingNode && !isPanning && !isCreatingConnector) {
      const portHit = hitTestPort(mx, my);
      const nodeHit = hitTestNode(mx, my);

      if (portHit?.isOutput) {
        canvas.style.cursor = "crosshair";
      } else if (nodeHit && nodeHit.type !== "hq") {
        canvas.style.cursor = "move";
      } else {
        canvas.style.cursor = "grab";
      }
    }

    if (isCreatingConnector) {
      connectorEndPos = { x: mx, y: my };
      canvas.style.cursor = "crosshair";
    } else if (draggingNode) {
      // Move the node
      const gridPos = screenToGrid(mx - dragOffset.x, my - dragOffset.y);
      const nodeIndex = state.nodes.findIndex((n) => n.id === draggingNode!.id);
      if (nodeIndex >= 0) {
        state.nodes[nodeIndex].x = Math.round(gridPos.x);
        state.nodes[nodeIndex].y = Math.round(gridPos.y);
        state = state; // Trigger reactivity
      }
      canvas.style.cursor = "grabbing";
    } else if (isPanning) {
      camera.x += e.clientX - lastMouse.x;
      camera.y += e.clientY - lastMouse.y;
      lastMouse = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = "grabbing";
    }
  }

  function handleMouseUp(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Complete connector creation
    if (isCreatingConnector && connectorStart) {
      const portHit = hitTestPort(mx, my);

      // Valid connection: output -> input of different node
      if (
        portHit &&
        !portHit.isOutput &&
        portHit.node.id !== connectorStart.nodeId
      ) {
        // Check if connection already exists
        const exists = state.connectors.some(
          (c) =>
            c.from.nodeId === connectorStart!.nodeId &&
            c.from.portIndex === connectorStart!.portIndex &&
            c.to.nodeId === portHit.node.id &&
            c.to.portIndex === portHit.portIndex
        );

        if (!exists) {
          const newConnector: Connector = {
            id: `conn-${Date.now()}`,
            from: {
              nodeId: connectorStart.nodeId,
              portIndex: connectorStart.portIndex,
            },
            to: { nodeId: portHit.node.id, portIndex: portHit.portIndex },
            isActive: true,
          };
          state.connectors = [...state.connectors, newConnector];
          state = state;
        }
      }
    }

    // Reset states
    isCreatingConnector = false;
    connectorStart = null;
    draggingNode = null;
    isPanning = false;
    canvas.style.cursor = "grab";
  }

  function handleClick(e: MouseEvent) {
    // Only handle click if we weren't dragging/creating
    if (draggingNode || isCreatingConnector) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const nodeHit = hitTestNode(mx, my);
    if (nodeHit) {
      state.selectedNodeId = nodeHit.id;
      state = state;
      onNodeSelect(nodeHit);
    } else {
      state.selectedNodeId = null;
      state = state;
      onNodeSelect(null);
    }
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const newZoom = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, camera.zoom - e.deltaY * zoomSensitivity)
    );

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomRatio = newZoom / camera.zoom;
    camera.x = mouseX - (mouseX - camera.x) * zoomRatio;
    camera.y = mouseY - (mouseY - camera.y) * zoomRatio;
    camera.zoom = newZoom;
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check if right-clicking on a connector (to delete)
    // Simplified: check if near the midpoint of any connector
    for (const connector of state.connectors) {
      const fromNode = state.nodes.find((n) => n.id === connector.from.nodeId);
      const toNode = state.nodes.find((n) => n.id === connector.to.nodeId);
      if (!fromNode || !toNode) continue;

      const fromPos = getPortPosition(fromNode, connector.from.portIndex, true);
      const toPos = getPortPosition(toNode, connector.to.portIndex, false);
      const midX = (fromPos.x + toPos.x) / 2;
      const midY = (fromPos.y + toPos.y) / 2;

      const dx = mx - midX;
      const dy = my - midY;
      if (dx * dx + dy * dy < 400) {
        // 20px radius
        state.connectors = state.connectors.filter(
          (c) => c.id !== connector.id
        );
        state = state;
        return;
      }
    }
  }

  // Touch support
  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.touches[0].clientX - rect.left;
      const my = e.touches[0].clientY - rect.top;

      const nodeHit = hitTestNode(mx, my);
      if (nodeHit && nodeHit.type !== "hq") {
        draggingNode = nodeHit;
        const nodePos = gridToScreen(nodeHit.x, nodeHit.y);
        dragOffset = { x: mx - nodePos.x, y: my - nodePos.y };
      } else {
        isPanning = true;
        lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    } else if (e.touches.length === 2) {
      isPanning = false;
      draggingNode = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
    }
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();

    if (e.touches.length === 1) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.touches[0].clientX - rect.left;
      const my = e.touches[0].clientY - rect.top;

      if (draggingNode) {
        const gridPos = screenToGrid(mx - dragOffset.x, my - dragOffset.y);
        const nodeIndex = state.nodes.findIndex(
          (n) => n.id === draggingNode!.id
        );
        if (nodeIndex >= 0) {
          state.nodes[nodeIndex].x = Math.round(gridPos.x);
          state.nodes[nodeIndex].y = Math.round(gridPos.y);
          state = state;
        }
      } else if (isPanning) {
        camera.x += e.touches[0].clientX - lastMouse.x;
        camera.y += e.touches[0].clientY - lastMouse.y;
        lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = dist - lastTouchDistance;
      camera.zoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, camera.zoom + delta * 0.005)
      );
      lastTouchDistance = dist;
    }
  }

  function handleTouchEnd() {
    draggingNode = null;
    isPanning = false;
  }

  // Fonction exportée pour centrer sur le HQ
  export function centerOnHQ() {
    const hq = state.nodes.find((n) => n.type === "hq");
    if (hq) {
      camera.x = canvas.width / 2 - hq.x * GRID_SIZE * camera.zoom;
      camera.y = canvas.height / 2 - hq.y * GRID_SIZE * camera.zoom;
    }
  }

  // Fonction exportée pour ajouter un nouveau noeud
  export function addNode(node: CanvasNode) {
    // Place the node near the center of the current view
    const centerGrid = screenToGrid(canvas.width / 2, canvas.height / 2);
    node.x = Math.round(centerGrid.x);
    node.y = Math.round(centerGrid.y);

    state.nodes = [...state.nodes, node];
    state.selectedNodeId = node.id;
    state = state;
    onNodeSelect(node);
  }

  // Fonction exportée pour supprimer un noeud
  export function removeNode(nodeId: string) {
    const node = state.nodes.find((n) => n.id === nodeId);
    if (!node || node.type === "hq" || node.type === "gisement") return;

    // Remove all connectors associated with this node
    state.connectors = state.connectors.filter(
      (c) => c.from.nodeId !== nodeId && c.to.nodeId !== nodeId
    );

    // Remove the node
    state.nodes = state.nodes.filter((n) => n.id !== nodeId);
    state.selectedNodeId = null;
    state = state;
    onNodeSelect(null);
  }
</script>

<canvas
  bind:this={canvas}
  class="absolute inset-0 cursor-grab touch-none"
  style="background: #0f172a;"
  on:mousedown={handleMouseDown}
  on:mousemove={handleMouseMove}
  on:mouseup={handleMouseUp}
  on:mouseleave={handleMouseUp}
  on:click={handleClick}
  on:wheel={handleWheel}
  on:contextmenu={handleContextMenu}
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
  on:touchend={handleTouchEnd}
></canvas>
