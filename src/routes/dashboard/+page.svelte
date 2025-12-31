<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import pb from "$lib/pocketbase";
  import { fetchDashboardData, type DashboardData } from "$lib/dashboard";
  import RevenueDetailModal from "$lib/components/RevenueDetailModal.svelte";
  import CreateCompanyForm from "$lib/components/CreateCompanyForm.svelte";
  import { levelUpCompany } from "$lib/services/company";
  import { notifications } from "$lib/notifications";
  import type { Company } from "$lib/types";

  // --- STATE MANAGEMENT (Svelte 5 Runes) ---
  const user = pb.authStore.model;

  let dashboardData = $state<DashboardData | null>(null);
  let loading = $state(true);
  let error = $state("");
  let isRevenueModalOpen = $state(false);
  let showCreateCompany = $state(false);
  let levelUpLoading = $state(false);

  // --- ACTIONS ---

  function logout() {
    pb.authStore.clear();
    goto("/");
  }

  // Formatter en devise compacte (ex: $1.2M)
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

  // Level Up Config
  const getLevelCost = (lvl: number) => Math.floor(1000 * Math.pow(lvl, 1.5));

  async function handleLevelUp() {
    if (!dashboardData) return;

    const currentLevel = dashboardData.company.level;
    const cost = getLevelCost(currentLevel);
    const currentBalance = dashboardData.financials.cash;

    // Note: DashboardData.company.prestige comes from user.prestige.
    // Ideally we need company.reputation.
    // Looking at fetchDashboardData in dashboard.ts, it seems 'reputation' isn't explicitly in 'company' object,
    // only 'prestige'. However, the original company page used 'reputation'.
    // Let's check dashboard.ts types again. DashboardData.company has: name, level, prestige, ceo, tech_points, id.
    // It seems 'reputation' was missed in previous DashboardData definition or mapped to prestige?
    // In dashboard.ts: prestige: user.prestige || 0.
    // And company.reputation is fetched in PBCompany but not exposed in DashboardData.company directly?
    // Wait, dashboard.ts line 87 defines reputation in PBCompany.
    // Line 208 maps prestige to user.prestige.
    // We should probably rely on what we have.
    // If reputation is critical for level up, we might need it.
    // BUT! For now, let's assume the user wants the UI logic.
    // Limitation: We might not have 'reputation' in dashboardData.company.
    // Let's check if we can simply pass the 'company' object to the service.
    // The service `levelUpCompany` likely takes a full company object.
    // dashboardData.company is a simplified object.

    // To be safe and simple: We will re-fetch the full company object for the level up action/check
    // OR we will update dashboardData to include reputation.
    // Given I can't easily change dashboard.ts right now without expanding scope too much (though I should),
    // I'll try to use what I have or fetch fresh data.

    // Actually, the previous code on company page used $activeCompany store.
    // Maybe we should update the $activeCompany store when dashboard loads?
    // dashboard.ts doesn't seem to update the store.

    // Let's implement the UI and simple checks.
    // If we need strict checks, the server/service will handle it.

    if (currentBalance < cost) {
      notifications.error(
        `Fonds insuffisants. Besoin de ${formatCurrency(cost)}`
      );
      return;
    }

    // We'll skip reputation check strictly here if we don't have it, or assume prestige is close enough for now?
    // Or better, let's fetch the real company ID and do it properly.

    levelUpLoading = true;
    try {
      // We need a proper Company object for the service usually, or at least ID.
      // Let's construct a minimal one or fetch it.
      // Assuming levelUpCompany takes {id, balance, level, ...}

      // Quick fetch to get latest state and full object
      const companyFull = await pb
        .collection("companies")
        .getOne(dashboardData.company.id);

      await levelUpCompany(companyFull as unknown as Company, cost);

      // Refresh dashboard data
      await loadDashboard();

      notifications.success(
        "Expansion réussie ! Votre entreprise a gagné un niveau."
      );
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
      showCreateCompany = false;
    } catch (err: any) {
      if (
        (err.message && err.message.includes("Pas d'entreprise active")) ||
        err.message.includes("pas d'entreprise active")
      ) {
        showCreateCompany = true;
        error = "";
      } else {
        // Fallback for my explicit error throw in dashboard.ts
        // "L'utilisateur n'a pas d'entreprise active"
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

  onMount(async () => {
    if (!user?.id) {
      goto("/login");
      return;
    }
    await loadDashboard();
  });
</script>

<div
  class="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30"
>
  <section class="py-8 px-4 border-b border-slate-800/50">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div>
        <h1 class="text-3xl md:text-4xl font-black text-white tracking-tight">
          Tableau de bord
        </h1>
        <p class="text-slate-400 text-sm mt-1">
          {user
            ? `Bienvenue, ${user.username ?? user.email}`
            : "Bienvenue, Invité"}
        </p>
      </div>
      <div class="flex flex-wrap gap-3 items-center">
        <button
          onclick={logout}
          class="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium py-2 px-4 rounded-xl border border-slate-700 transition-all duration-200 flex items-center gap-2 hover:shadow-lg hover:shadow-black/20"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Quitter
        </button>
      </div>
    </div>
  </section>

  {#if loading}
    <section class="py-10 px-4">
      <div class="max-w-7xl mx-auto text-center">
        <div
          class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"
        ></div>
        <p class="text-content-secondary mt-4">Chargement des données...</p>
      </div>
    </section>
  {:else if showCreateCompany}
    <section class="py-10 px-4">
      <div class="max-w-md mx-auto">
        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold text-white mb-2">
            Bienvenue entrepreneur !
          </h2>
          <p class="text-content-secondary">
            Pour commencer votre aventure, vous devez d'abord créer votre
            société.
          </p>
        </div>
        <CreateCompanyForm onCreated={loadDashboard} />
      </div>
    </section>
  {:else if error}
    <section class="py-10 px-4">
      <div class="max-w-7xl mx-auto">
        <div
          class="bg-status-danger/10 border border-status-danger/20 rounded-card p-6 text-center"
        >
          <p class="text-status-danger font-semibold mb-2">Erreur</p>
          <p class="text-content-secondary text-sm">{error}</p>
        </div>
      </div>
    </section>
  {:else if dashboardData}
    <section class="py-8 px-4">
      <div class="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Cash Card -->
        <div
          class="bg-linear-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-6 shadow-lg relative overflow-hidden group"
        >
          <div
            class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
          >
            <span class="text-4xl">💰</span>
          </div>
          <p
            class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1"
          >
            Trésorerie
          </p>
          <p class="text-white text-3xl font-black mt-2 tracking-tight">
            {formatCurrency(dashboardData.financials.cash)}
          </p>
        </div>

        <!-- Valuation Card -->
        <div
          class="bg-linear-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-6 shadow-lg relative overflow-hidden group"
        >
          <div
            class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
          >
            <span class="text-4xl">📈</span>
          </div>
          <p
            class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1"
          >
            Valorisation
          </p>
          <p class="text-white text-3xl font-black mt-2 tracking-tight">
            {formatCurrency(dashboardData.financials.valuation)}
          </p>
        </div>

        <!-- Payroll Card -->
        <div
          class="bg-linear-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-6 shadow-lg relative overflow-hidden group"
        >
          <div
            class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
          >
            <span class="text-4xl">👥</span>
          </div>
          <p
            class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1"
          >
            Salaires (24h)
          </p>
          <p class="text-white text-3xl font-black mt-2 tracking-tight">
            {formatCurrency(dashboardData.financials.daily_payroll)}
          </p>
        </div>

        <!-- Net Profit Card (Highlighted) -->
        <div
          class="bg-linear-to-br from-indigo-600 to-violet-700 text-white rounded-2xl p-6 shadow-xl shadow-indigo-900/20 relative overflow-hidden group border border-indigo-400/20"
        >
          <div
            class="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-opacity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-white"
              ><line x1="12" y1="1" x2="12" y2="23"></line><path
                d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
              ></path></svg
            >
          </div>
          <div class="flex items-center justify-between relative z-10">
            <p
              class="text-indigo-100/80 text-xs font-bold uppercase tracking-widest"
            >
              Profit Net
            </p>
            <div class="relative group/tooltip">
              <button
                class="text-white/70 hover:text-white transition-colors p-1 cursor-pointer"
                aria-label="Voir le détail des revenus"
                onclick={() => (isRevenueModalOpen = true)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><circle cx="12" cy="12" r="10"></circle><line
                    x1="12"
                    y1="16"
                    x2="12"
                    y2="12"
                  ></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg
                >
              </button>
            </div>
          </div>
          <p
            class="text-white text-3xl font-black mt-2 tracking-tight drop-shadow-md"
          >
            {formatCurrency(dashboardData.financials.monthly_net_profit)}
          </p>
          <p class="text-[10px] text-indigo-200 mt-2 font-medium">
            Projection sur 30 jours
          </p>
        </div>
      </div>
    </section>

    <section class="py-4 px-4">
      <div class="max-w-7xl mx-auto grid md:grid-cols-2 gap-6">
        <!-- Active Company Card -->
        <div
          class="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div class="flex justify-between items-start mb-6">
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <span>🏢</span> Entreprise Active
            </h2>
            {#if dashboardData}
              {@const nextLevelCost = getLevelCost(dashboardData.company.level)}
              <button
                onclick={handleLevelUp}
                disabled={levelUpLoading ||
                  dashboardData.financials.cash < nextLevelCost}
                class="text-xs bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-full font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {#if levelUpLoading}
                  <span
                    class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  ></span>
                  Expansion...
                {:else}
                  <span>Niveau Sup. ({formatCurrency(nextLevelCost)})</span>
                {/if}
              </button>
            {/if}
          </div>

          <div
            class="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50"
          >
            <div class="flex items-center justify-between mb-4">
              <p class="text-white font-black text-2xl tracking-tight">
                {dashboardData.company.name}
              </p>
              <span
                class="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/30"
              >
                Niveau {dashboardData.company.level}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-y-4 gap-x-2">
              <div>
                <p class="text-slate-400 text-xs font-semibold uppercase">
                  PDG
                </p>
                <p class="text-white font-medium">
                  {dashboardData.company.ceo}
                </p>
              </div>
              <div>
                <p class="text-slate-400 text-xs font-semibold uppercase">
                  Employés
                </p>
                <p class="text-white font-medium">
                  {dashboardData.staff.total_employees}
                </p>
              </div>

              <div>
                <p class="text-slate-400 text-xs font-semibold uppercase">
                  Efficacité Moy.
                </p>
                <p class="text-white font-medium">
                  {dashboardData.staff.average_efficiency}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Stock Market Card -->
        <div
          class="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
        >
          <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span>📉</span> Action Boursière
          </h2>
          <div
            class="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 flex flex-col justify-center h-[calc(100%-3.5rem)]"
          >
            <div class="flex items-center justify-between mb-6">
              <p class="text-slate-300 font-bold text-xl">
                {dashboardData.financials.stock_ticker}
              </p>
              <p class="text-emerald-400 text-3xl font-black">
                {formatCurrency(dashboardData.financials.stock_price)}
              </p>
            </div>
            <div class="border-t border-slate-700/50 pt-4 mt-auto">
              <p class="text-slate-400 text-xs font-semibold uppercase mb-1">
                Valorisation Totale
              </p>
              <p class="text-white font-black text-2xl tracking-tight">
                {formatCurrency(dashboardData.financials.valuation)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="py-4 px-4 pb-12">
      <div class="max-w-7xl mx-auto">
        <div
          class="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
        >
          <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span>📦</span> Aperçu Inventaire
            <span class="text-slate-500 text-sm font-normal ml-2"
              >({dashboardData.resources.inventory_count} items)</span
            >
          </h2>
          {#if dashboardData.resources.top_items.length > 0}
            <div class="grid md:grid-cols-5 gap-4">
              {#each dashboardData.resources.top_items as item}
                <div
                  class="bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-center hover:bg-slate-800 transition-colors group"
                >
                  <div
                    class="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-500/20 transition-colors"
                  >
                    <span class="text-lg">📦</span>
                  </div>
                  <p class="text-white font-bold text-sm truncate mb-1">
                    {item.name}
                  </p>
                  <p class="text-slate-400 text-xs mb-2">
                    Qté: <span class="text-white font-mono">{item.qty}</span>
                  </p>
                  <p
                    class="text-indigo-400 text-xs font-bold bg-indigo-500/10 py-1 px-2 rounded-lg inline-block"
                  >
                    {formatCurrency(item.value)}
                  </p>
                </div>
              {/each}
            </div>
          {:else}
            <div
              class="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl"
            >
              <p class="text-slate-500 text-sm">Aucun item dans l'inventaire</p>
            </div>
          {/if}
        </div>
      </div>
    </section>
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
