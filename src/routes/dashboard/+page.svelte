<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount, onDestroy } from "svelte";
  import pb from "$lib/pocketbase";
  import { fetchDashboardData, type DashboardData } from "$lib/dashboard";
  import { fetchEnergyStatus, type EnergyStatus } from "$lib/services/energy";
  import RevenueDetailModal from "$lib/components/RevenueDetailModal.svelte";
  import CreateCompanyForm from "$lib/components/CreateCompanyForm.svelte";
  import { levelUpCompany } from "$lib/services/company";
  import { notifications } from "$lib/notifications";
  import type { Company } from "$lib/pocketbase";

  // --- STATE MANAGEMENT (Svelte 5 Runes) ---
  const user = pb.authStore.model;

  let dashboardData = $state<DashboardData | null>(null);
  let energyStatus = $state<EnergyStatus | null>(null);
  let loading = $state(true);
  let error = $state("");
  let isRevenueModalOpen = $state(false);
  let showCreateCompany = $state(false);
  let levelUpLoading = $state(false);

  // Canvas refs
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationId: number;
  let width = 0;
  let height = 0;

  // Game Assets / State
  let particles: Array<{x: number, y: number, vx: number, vy: number, life: number, color: string}> = [];
  let mouse = { x: 0, y: 0 };
  let baseRadius = 60;

  // --- ACTIONS ---

  function logout() {
    pb.authStore.clear();
    goto("/");
  }

  function formatCurrency(value: number): string {
    if (value === undefined || value === null || isNaN(value)) {
      return "0€";
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M€`;
    } else if (value >= 1_000) {
      return `${(value / 1_000).toFixed(0)}k€`;
    }
    return `${value.toFixed(0)}€`;
  }

  const getLevelCost = (lvl: number) => Math.floor(1000 * Math.pow(lvl, 1.5));

  async function handleLevelUp() {
    if (!dashboardData) return;

    const currentLevel = dashboardData.company.level;
    const cost = getLevelCost(currentLevel);
    const currentBalance = dashboardData.financials.cash;

    if (currentBalance < cost) {
      notifications.error(
        `Fonds insuffisants. Besoin de ${formatCurrency(cost)}`
      );
      return;
    }

    levelUpLoading = true;
    try {
      const companyFull = await pb
        .collection("companies")
        .getOne(dashboardData.company.id);

      await levelUpCompany(companyFull as unknown as Company, cost);

      // Refresh data
      await loadDashboard();

      notifications.success("Expansion réussie ! Votre entreprise a gagné un niveau.");
      spawnParticles(width/2, height/2, 50, "#6366f1"); // Explosion effect
    } catch (e: any) {
      console.error("Level up error:", e);
      const msg = e?.data?.message || e?.message || "Erreur inconnue";
      notifications.error(msg);
    } finally {
      levelUpLoading = false;
    }
  }

  async function loadDashboard() {
    if (!user?.id) return;
    loading = true;
    try {
      dashboardData = await fetchDashboardData(user.id);
      try {
        energyStatus = await fetchEnergyStatus();
      } catch {
        energyStatus = null;
      }
      showCreateCompany = false;
    } catch (err: any) {
      if (
        (err.message && err.message.includes("Pas d'entreprise active")) ||
        err.message.includes("pas d'entreprise active")
      ) {
        showCreateCompany = true;
        error = "";
      } else {
        if (err.message === "L'utilisateur n'a pas d'entreprise active") {
          showCreateCompany = true;
          error = "";
        } else {
          error = err.message || "Impossible de charger le dashboard";
          console.error(err);
        }
      }
    } finally {
      loading = false;
    }
  }

  // --- GAME LOOP ---

  function resize() {
    if (canvas) {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }
  }

  function spawnParticles(x: number, y: number, count: number, color: string) {
      for(let i=0; i<count; i++) {
          particles.push({
              x, y,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              life: 1.0,
              color
          });
      }
  }

  function updateParticles() {
      for(let i = particles.length - 1; i >= 0; i--) {
          let p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.02;
          if(p.life <= 0) {
              particles.splice(i, 1);
          }
      }
  }

  function drawParticles() {
      if (!ctx) return;
      particles.forEach(p => {
          ctx!.globalAlpha = p.life;
          ctx!.fillStyle = p.color;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx!.fill();
      });
      ctx!.globalAlpha = 1;
  }

  function drawBase() {
      if (!ctx || !dashboardData) return;

      const centerX = width / 2;
      const centerY = height / 2;
      const dist = Math.hypot(mouse.x - centerX, mouse.y - centerY);
      const isHovered = dist < baseRadius;

      // Glow
      const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.5, centerX, centerY, baseRadius * 2);
      if (isHovered) {
          gradient.addColorStop(0, "rgba(99, 102, 241, 0.7)");
      } else {
          gradient.addColorStop(0, "rgba(99, 102, 241, 0.5)"); // Indigo
      }
      gradient.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Base Circle
      ctx.fillStyle = "#1e1b4b"; // Indigo 950
      ctx.strokeStyle = "#6366f1"; // Indigo 500
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Text inside
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (isHovered) {
          // Show Level Up Cost on hover
          const cost = getLevelCost(dashboardData.company.level);
          ctx.font = "bold 14px sans-serif";
          ctx.fillText("UPGRADE", centerX, centerY - 10);
          ctx.font = "12px sans-serif";
          ctx.fillStyle = "#a5b4fc";
          ctx.fillText(`Cost: ${formatCurrency(cost)}`, centerX, centerY + 10);
      } else {
          ctx.font = "bold 16px sans-serif";
          ctx.fillText(dashboardData.company.name.substring(0, 10), centerX, centerY - 10);
          ctx.font = "12px sans-serif";
          ctx.fillText(`Lvl ${dashboardData.company.level}`, centerX, centerY + 10);
      }

      // Interaction Hint Cursor
      if (isHovered) {
          ctx.strokeStyle = "white";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(centerX, centerY, baseRadius + 5, 0, Math.PI * 2);
          ctx.stroke();
          document.body.style.cursor = "pointer";
      } else {
          const onProfit = (mouse.x > 20 && mouse.x < 300 && mouse.y > 70 && mouse.y < 100);
          if (onProfit) {
            document.body.style.cursor = "pointer";
          } else {
            document.body.style.cursor = "default";
          }
      }
  }

  function drawHUD() {
      if (!ctx || !dashboardData) return;

      ctx.fillStyle = "white";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      // Top Left: Financials
      ctx.fillText(`💰 Cash: ${formatCurrency(dashboardData.financials.cash)}`, 20, 20);
      ctx.font = "16px monospace";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`📈 Val: ${formatCurrency(dashboardData.financials.valuation)}`, 20, 50);

      // Profit - Make it look interactive on hover
      const profitY = 75;
      const profitText = `💸 Profit: ${formatCurrency(dashboardData.financials.monthly_net_profit)}`;
      const onProfit = (mouse.x > 20 && mouse.x < 300 && mouse.y > profitY && mouse.y < profitY + 20);

      if (onProfit) {
          ctx.fillStyle = "#6366f1"; // Highlight color
          ctx.font = "bold 16px monospace";
      } else {
          ctx.fillStyle = "#94a3b8";
          ctx.font = "16px monospace";
      }
      ctx.fillText(profitText, 20, profitY);

      // Top Right: Stock
      ctx.textAlign = "right";
      ctx.fillStyle = "white";
      ctx.font = "bold 20px monospace";
      ctx.fillText(`${dashboardData.financials.stock_ticker}: ${formatCurrency(dashboardData.financials.stock_price)}`, width - 20, 20);

      // Inventory (New)
      ctx.font = "16px monospace";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`📦 Items: ${dashboardData.resources.inventory_count}`, width - 20, 50);

      // Bottom Left: Staff
      ctx.textAlign = "left";
      ctx.fillStyle = "white";
      ctx.font = "bold 20px monospace";
      ctx.fillText(`👥 Staff: ${dashboardData.staff.total_employees}`, 20, height - 60);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "16px monospace";
      ctx.fillText(`⚡ Eff: ${dashboardData.staff.average_efficiency}%`, 20, height - 35);

      // Bottom Right: Energy
      if (energyStatus) {
        ctx.textAlign = "right";
        ctx.fillStyle = energyStatus.productionSpeed < 1 ? "#fbbf24" : "#34d399";
        ctx.font = "bold 20px monospace";
        ctx.fillText(`⚡ Energy: ${Math.round(energyStatus.productionSpeed * 100)}%`, width - 20, height - 60);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "16px monospace";
        ctx.fillText(`Prod: ${energyStatus.energyProduced} / Cons: ${energyStatus.energyDemand}`, width - 20, height - 35);
      }
  }

  function animate() {
      if (!ctx || !canvas) return;

      ctx.fillStyle = "#020617"; // Slate 950
      ctx.fillRect(0, 0, width, height);

      // Grid effect
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      const gridSize = 50;
      const time = Date.now() / 1000;
      const offsetX = (time * 10) % gridSize;

      for(let x=offsetX; x<width; x+=gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
      }
      for(let y=0; y<height; y+=gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
      }

      updateParticles();
      drawParticles();

      if (dashboardData) {
          drawBase();
          drawHUD();
      }

      animationId = requestAnimationFrame(animate);
  }

  function handleMouseMove(e: MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
  }

  function handleCanvasClick(e: MouseEvent) {
      if (!dashboardData) return;
      const centerX = width / 2;
      const centerY = height / 2;

      // Click on Base -> Level Up
      const dist = Math.hypot(mouse.x - centerX, mouse.y - centerY);
      if (dist < baseRadius) {
          handleLevelUp();
          return;
      }

      // Click on Profit -> Open Modal
      const profitY = 75;
      if (mouse.x > 20 && mouse.x < 300 && mouse.y > profitY && mouse.y < profitY + 20) {
          isRevenueModalOpen = true;
          return;
      }
  }

  onMount(async () => {
    if (!user?.id) {
      goto("/login");
      return;
    }
    await loadDashboard();

    if (canvas) {
      ctx = canvas.getContext("2d");
      resize();
      animate();
    }
  });

  onDestroy(() => {
      if (typeof window !== 'undefined' && animationId) cancelAnimationFrame(animationId);
      if (typeof document !== 'undefined') document.body.style.cursor = "default";
  });

</script>

<svelte:head>
  <title>Game Mode | Ketsuna</title>
</svelte:head>

<svelte:window onresize={resize} />

<div class="relative w-full h-screen overflow-hidden bg-slate-950 text-slate-200 font-sans">

    <canvas
        bind:this={canvas}
        onmousemove={handleMouseMove}
        onclick={handleCanvasClick}
        class="absolute inset-0 block cursor-crosshair"
    ></canvas>

    <!-- Overlay UI for Non-Game Actions -->
    <div class="absolute top-4 right-4 flex gap-2">
        <button
            onclick={logout}
            class="bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl border border-slate-700 backdrop-blur-sm transition-all text-sm font-medium z-10 cursor-pointer"
        >
            Quitter
        </button>
    </div>

    {#if loading}
        <div class="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-50">
            <div class="text-center">
                <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
                <p class="mt-4 text-indigo-300">Initialisation du système...</p>
            </div>
        </div>
    {/if}

    {#if showCreateCompany}
        <div class="absolute inset-0 flex items-center justify-center bg-slate-950/90 z-50 p-4">
             <div class="max-w-md w-full">
                <h2 class="text-2xl font-bold text-white mb-4 text-center">Initialisation de la Corporation</h2>
                <CreateCompanyForm onCreated={loadDashboard} />
             </div>
        </div>
    {/if}

    {#if error}
         <div class="absolute inset-0 flex items-center justify-center bg-slate-950/90 z-50">
            <div class="bg-red-900/20 border border-red-500/50 p-6 rounded text-center">
                <p class="text-red-400 font-bold">Erreur Critique</p>
                <p class="text-red-300">{error}</p>
            </div>
        </div>
    {/if}

    {#if isRevenueModalOpen && dashboardData}
        <RevenueDetailModal
        isOpen={isRevenueModalOpen}
        onClose={() => (isRevenueModalOpen = false)}
        breakdown={dashboardData.financials.profit_breakdown}
        daily_view={dashboardData.financials.daily_view}
        monthlyProfit={dashboardData.financials.monthly_net_profit}
        {formatCurrency}
        />
    {/if}
</div>
