<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { goto } from "$app/navigation";
  import pb from "$lib/pocketbase";
  import { fetchDashboardData, type DashboardData } from "$lib/dashboard";
  import { fetchEnergyStatus, type EnergyStatus } from "$lib/services/energy";
  import { levelUpCompany } from "$lib/services/company";
  import { notifications } from "$lib/notifications";
  import type { Company } from "$lib/pocketbase";

  // --- ENGINE TYPES ---
  interface Point { x: number; y: number; }
  interface Rect { x: number; y: number; w: number; h: number; }

  class InputManager {
    mouse: Point = { x: 0, y: 0 };
    isDown: boolean = false;
    clicked: boolean = false;

    update(rect: DOMRect, e: MouseEvent) {
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    }

    onMouseDown() { this.isDown = true; }
    onMouseUp() { this.isDown = false; this.clicked = true; }
    reset() { this.clicked = false; }
  }

  class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number = 0;
    height: number = 0;
    input: InputManager = new InputManager();
    animationId: number = 0;

    // Game Data
    data: DashboardData | null = null;
    energy: EnergyStatus | null = null;
    loading: boolean = true;
    error: string = "";

    // Assets
    particles: Array<{x: number, y: number, vx: number, vy: number, life: number, color: string}> = [];
    baseRotation: number = 0;

    // UI State
    showRevenueModal: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d")!;
      this.resize();

      // Events
      window.addEventListener("resize", () => this.resize());
      canvas.addEventListener("mousemove", (e) => this.input.update(canvas.getBoundingClientRect(), e));
      canvas.addEventListener("mousedown", () => this.input.onMouseDown());
      canvas.addEventListener("mouseup", () => this.input.onMouseUp());
    }

    async init() {
      const user = pb.authStore.model;
      if (!user) {
        goto("/login");
        return;
      }
      try {
        await this.loadData(user.id);
      } catch (e: any) {
        this.error = e.message;
        // If no company, we might need to redirect or show create UI.
        // For this "game mode", we assume established company or handle error gracefully.
        console.error(e);
      }
      this.loading = false;
      this.loop();
    }

    async loadData(userId: string) {
      this.data = await fetchDashboardData(userId);
      try {
        this.energy = await fetchEnergyStatus();
      } catch { /* ignore */ }
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    loop() {
      this.update();
      this.draw();
      this.input.reset();
      this.animationId = requestAnimationFrame(() => this.loop());
    }

    update() {
      // Rotation
      this.baseRotation += 0.005;

      // Particles
      for(let i = this.particles.length - 1; i >= 0; i--) {
        let p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if(p.life <= 0) this.particles.splice(i, 1);
      }
    }

    draw() {
      const { ctx, width, height } = this;

      // Clear
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, width, height);

      // Grid Background
      this.drawGrid();

      if (this.loading) {
        this.drawTextCentered("INITIALISATION...", width/2, height/2, 24, "#6366f1");
        return;
      }

      if (this.error) {
        this.drawTextCentered(`ERREUR: ${this.error}`, width/2, height/2, 20, "#ef4444");
        return;
      }

      if (this.data) {
        this.drawHUD();
        this.drawBase();
        if (this.showRevenueModal) this.drawRevenueModal();
      }

      this.drawParticles();
    }

    drawGrid() {
      const { ctx, width, height } = this;
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      const gridSize = 60;
      const offset = (Date.now() / 50) % gridSize;

      ctx.beginPath();
      for(let x = offset; x < width; x+=gridSize) {
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
      }
      for(let y = offset; y < height; y+=gridSize) {
        ctx.moveTo(0, y); ctx.lineTo(width, y);
      }
      ctx.stroke();
    }

    drawBase() {
      const { ctx, width, height, input, data } = this;
      if (!data) return;

      const cx = width / 2;
      const cy = height / 2;
      const radius = 80;

      // Interaction
      const dist = Math.hypot(input.mouse.x - cx, input.mouse.y - cy);
      const hovered = dist < radius;

      if (hovered) {
        document.body.style.cursor = "pointer";
        if (input.clicked) {
          this.handleLevelUp();
        }
      } else {
        // Reset cursor if not hovered (check other UIs later)
        document.body.style.cursor = "default";
      }

      // Outer Glow
      const glow = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 2.5);
      glow.addColorStop(0, hovered ? "rgba(99, 102, 241, 0.4)" : "rgba(99, 102, 241, 0.1)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, radius * 2.5, 0, Math.PI*2); ctx.fill();

      // Rotating Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.baseRotation);
      ctx.strokeStyle = hovered ? "#818cf8" : "#4f46e5";
      ctx.lineWidth = 4;
      ctx.setLineDash([20, 10]);
      ctx.beginPath(); ctx.arc(0, 0, radius + 10, 0, Math.PI*2); ctx.stroke();
      ctx.restore();

      // Main Circle
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = hovered ? "#fff" : "#6366f1";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();

      // Label
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px monospace";
      ctx.fillText(data.company.name.substring(0, 12).toUpperCase(), cx, cy - 10);

      ctx.font = "14px monospace";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`LVL ${data.company.level}`, cx, cy + 10);

      if (hovered) {
        const cost = Math.floor(1000 * Math.pow(data.company.level, 1.5));
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 12px monospace";
        ctx.fillText(`UPGRADE: ${this.formatMoney(cost)}`, cx, cy + 30);
      }
    }

    drawHUD() {
      const { ctx, width, height, data, energy } = this;
      if (!data) return;

      // Top Bar Background
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.fillRect(0, 0, width, 60);
      ctx.strokeStyle = "#334155";
      ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(width, 60); ctx.stroke();

      // Top Stats Helper
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      const drawTopStat = (label: string, value: string, x: number, color: string = "#fff") => {
        ctx.font = "bold 16px monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(label, x, 30);
        const m = ctx.measureText(label).width;
        ctx.fillStyle = color;
        ctx.fillText(value, x + m + 10, 30);
        return x + m + ctx.measureText(value).width + 40; // Return new X
      };

      let x = 20;
      x = drawTopStat("CASH", this.formatMoney(data.financials.cash), x, "#4ade80");
      x = drawTopStat("VAL", this.formatMoney(data.financials.valuation), x, "#60a5fa");

      // Profit Button
      const profitLabel = "PROFIT";
      const profitVal = this.formatMoney(data.financials.monthly_net_profit);
      const profitX = x;
      const profitW = 200; // estimated hit width

      if (this.checkHover(profitX, 10, profitW, 40)) {
         ctx.fillStyle = "rgba(255,255,255,0.1)";
         ctx.fillRect(profitX - 5, 10, profitW, 40);
         document.body.style.cursor = "pointer";
         if (this.input.clicked) {
             this.showRevenueModal = !this.showRevenueModal;
         }
      }
      x = drawTopStat("PROFIT", profitVal, x, data.financials.monthly_net_profit >= 0 ? "#4ade80" : "#ef4444");

      // Right Side Buttons
      this.drawButton("QUIT", width - 100, 15, 80, 30, () => goto('/'), "#ef4444");

      // Bottom Bar
      const bH = 40;
      const bY = height - bH;
      const textY = bY + bH/2;

      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.fillRect(0, bY, width, bH);
      ctx.beginPath(); ctx.moveTo(0, bY); ctx.lineTo(width, bY); ctx.stroke();

      x = 20;

      const drawBottomStat = (label: string, value: string, color: string = "#fff") => {
          ctx.font = "14px monospace";
          ctx.fillStyle = "#94a3b8";
          ctx.fillText(label, x, textY);
          const m = ctx.measureText(label).width;
          ctx.fillStyle = color;
          ctx.fillText(value, x + m + 10, textY);
          x += m + ctx.measureText(value).width + 40;
      };

      drawBottomStat("STAFF", `${data.staff.total_employees}`);
      drawBottomStat("EFF", `${data.staff.average_efficiency}%`);

      if (energy) {
         const eColor = energy.productionSpeed < 1 ? "#fbbf24" : "#4ade80";
         drawBottomStat("ENERGY", `${Math.round(energy.productionSpeed * 100)}%`, eColor);
      }
    }

    drawRevenueModal() {
        const { ctx, width, height, data } = this;
        if (!data) return;

        const w = 400;
        const h = 300;
        const x = (width - w) / 2;
        const y = (height - h) / 2;

        // Overlay
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0,0,width,height);

        // Panel
        ctx.fillStyle = "#1e293b";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);

        // Header
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("REVENUE BREAKDOWN", width/2, y + 40);

        // Content
        ctx.font = "16px monospace";
        ctx.textAlign = "left";
        let ty = y + 80;

        const row = (label: string, val: number) => {
            ctx.fillStyle = "#94a3b8";
            ctx.fillText(label, x + 30, ty);
            ctx.textAlign = "right";
            ctx.fillStyle = val >= 0 ? "#4ade80" : "#ef4444";
            ctx.fillText(this.formatMoney(val), x + w - 30, ty);
            ctx.textAlign = "left";
            ty += 30;
        };

        row("Gross Revenue", data.financials.monthly_net_profit + data.financials.daily_payroll * 30); // Approx
        row("Expenses", -(data.financials.daily_payroll * 30));

        ctx.beginPath(); ctx.moveTo(x+20, ty); ctx.lineTo(x+w-20, ty); ctx.stroke();
        ty += 20;

        row("Net Profit", data.financials.monthly_net_profit);

        // Close Button
        this.drawButton("CLOSE", width/2 - 50, y + h - 50, 100, 30, () => this.showRevenueModal = false);
    }

    drawButton(text: string, x: number, y: number, w: number, h: number, action: () => void, color: string = "#6366f1") {
        const { ctx, input } = this;
        const hovered = this.checkHover(x, y, w, h);

        if (hovered) {
            document.body.style.cursor = "pointer";
            if (input.clicked) action();
        }

        ctx.fillStyle = hovered ? color : "#334155";
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 14px monospace";
        ctx.fillText(text, x + w/2, y + h/2);
    }

    drawTextCentered(text: string, x: number, y: number, size: number, color: string) {
        this.ctx.font = `bold ${size}px monospace`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(text, x, y);
    }

    drawParticles() {
        const { ctx } = this;
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    spawnParticles(x: number, y: number, count: number, color: string) {
        for(let i=0; i<count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color
            });
        }
    }

    async handleLevelUp() {
        if (!this.data) return;
        const cost = Math.floor(1000 * Math.pow(this.data.company.level, 1.5));
        if (this.data.financials.cash < cost) {
            this.spawnParticles(this.width/2, this.height/2, 20, "#ef4444"); // Red fail
            return;
        }

        try {
            // Optimistic update for visual feedback
            this.spawnParticles(this.width/2, this.height/2, 50, "#fbbf24"); // Gold success

            // Real update
             const companyFull = await pb.collection("companies").getOne(this.data.company.id);
             await levelUpCompany(companyFull as unknown as Company, cost);
             await this.loadData(pb.authStore.model!.id);
        } catch (e) {
            console.error(e);
        }
    }

    checkHover(x: number, y: number, w: number, h: number): boolean {
        const mx = this.input.mouse.x;
        const my = this.input.mouse.y;
        return mx >= x && mx <= x + w && my >= y && my <= y + h;
    }

    formatMoney(val: number): string {
        if (Math.abs(val) >= 1_000_000) return (val/1_000_000).toFixed(1) + "M€";
        if (Math.abs(val) >= 1_000) return (val/1_000).toFixed(0) + "k€";
        return val.toFixed(0) + "€";
    }

    destroy() {
        cancelAnimationFrame(this.animationId);
        window.removeEventListener("resize", () => this.resize());
        // Clean up other listeners if needed
    }
  }

  // --- SVELTE LIFECYCLE ---
  let canvas: HTMLCanvasElement;
  let game: Game;

  onMount(() => {
    if (canvas) {
        game = new Game(canvas);
        game.init();
    }
  });

  onDestroy(() => {
    if (game) game.destroy();
  });

</script>

<svelte:head>
  <title>Ketsuna Engine</title>
</svelte:head>

<!-- Full Screen Container, Z-Index 50 to cover global layout -->
<div class="fixed inset-0 z-50 bg-slate-950 overflow-hidden">
    <canvas bind:this={canvas} class="block w-full h-full"></canvas>
</div>
