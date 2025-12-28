<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import pb from "$lib/pocketbase";
  import { fetchDashboardData, type DashboardData } from "$lib/dashboard";
  import RevenueDetailModal from "$lib/components/RevenueDetailModal.svelte";

  // --- STATE MANAGEMENT (Svelte 5 Runes) ---
  const user = pb.authStore.model;

  let dashboardData = $state<DashboardData | null>(null);
  let loading = $state(true);
  let error = $state("");
  let isRevenueModalOpen = $state(false);

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

  onMount(async () => {
    if (!user?.id) {
      goto("/login");
      return;
    }

    try {
      dashboardData = await fetchDashboardData(user.id);
    } catch (err: any) {
      error = err.message || "Impossible de charger le dashboard";
      console.error(err);
    } finally {
      loading = false;
    }
  });
</script>

<div
  class="min-h-screen bg-background text-content-primary font-sans selection:bg-primary-500/30"
>
  <section class="py-10 px-4 border-b border-border">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold">Tableau de bord</h1>
        <p class="text-content-secondary text-sm mt-1">
          {user
            ? `Bienvenue, ${user.username ?? user.email}`
            : "Bienvenue, Invité"}
        </p>
      </div>
      <div class="flex flex-wrap gap-3">
        <a
          href="/market"
          class="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
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
            ><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"
            ></circle><path
              d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
            ></path></svg
          >
          Marché
        </a>
        <a
          href="/laboratory"
          class="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
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
            ><path d="M10 2v7.5"></path><path d="M14 2v7.5"></path><path
              d="M8.5 2h7"
            ></path><path d="M14 11.5L19 21c.5 1 0 2-1 2H6c-1 0-1.5-1-1-2l5-9.5"
            ></path></svg
          >
          Laboratoire
        </a>
        <a
          href="/workshop"
          class="bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
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
            ><path
              d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
            ></path></svg
          >
          Atelier
        </a>
        <div class="h-10 w-px bg-border mx-2"></div>
        <a
          href="/company"
          class="bg-surface hover:bg-surface-highlight border border-border text-content-secondary hover:text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200"
          >Sociétés</a
        >
        <button
          onclick={logout}
          class="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200"
          >Quitter</button
        >
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
    <section class="py-10 px-4">
      <div class="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-surface border border-border rounded-card p-6">
          <p class="text-content-tertiary text-xs uppercase tracking-wide">
            Trésorerie
          </p>
          <p class="text-white text-2xl font-bold mt-2">
            {formatCurrency(dashboardData.financials.cash)}
          </p>
        </div>

        <div class="bg-surface border border-border rounded-card p-6">
          <p class="text-content-tertiary text-xs uppercase tracking-wide">
            Valorisation
          </p>
          <p class="text-white text-2xl font-bold mt-2">
            {formatCurrency(dashboardData.financials.valuation)}
          </p>
        </div>

        <div class="bg-surface border border-border rounded-card p-6">
          <p class="text-content-tertiary text-xs uppercase tracking-wide">
            Salaires (24h)
          </p>
          <p class="text-white text-2xl font-bold mt-2">
            {formatCurrency(dashboardData.financials.daily_payroll)}
          </p>
        </div>

        <div
          class="bg-primary-500/5 border border-primary-500/30 rounded-card p-6 relative overflow-hidden group"
        >
          <div
            class="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-primary-400"
              ><line x1="12" y1="1" x2="12" y2="23"></line><path
                d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
              ></path></svg
            >
          </div>
          <div class="flex items-center justify-between relative z-10">
            <p
              class="text-primary-400 text-xs font-bold uppercase tracking-widest"
            >
              Profit Net
            </p>
            <div class="relative group/tooltip">
              <button
                class="text-primary-400/50 hover:text-primary-400 transition-colors p-1 cursor-pointer"
                aria-label="Voir le détail des revenus"
                onclick={() => (isRevenueModalOpen = true)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
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

              <div
                class="absolute bottom-full right-0 mb-3 w-64 p-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none translate-y-2 group-hover/tooltip:translate-y-0"
              >
                <p
                  class="text-[10px] font-bold text-primary-400 uppercase tracking-widest mb-3"
                >
                  Aperçu Journalier
                </p>
                <div class="space-y-2 text-[11px]">
                  <div class="flex justify-between">
                    <span class="text-slate-400">Revenus Bruts</span>
                    <span class="text-white font-mono"
                      >+{formatCurrency(
                        dashboardData.financials.daily_view.total_revenue
                      )}</span
                    >
                  </div>
                  <div class="flex justify-between text-red-400/90">
                    <span>Coûts (Salaires/Maint)</span>
                    <span class="font-mono"
                      >-{formatCurrency(
                        dashboardData.financials.daily_view.total_cost
                      )}</span
                    >
                  </div>
                  <div
                    class="flex justify-between border-t border-primary-500/30 pt-2 mt-2"
                  >
                    <span class="text-white font-bold text-[12px]"
                      >Net Journalier</span
                    >
                    <span class="text-primary-400 font-bold text-[12px]"
                      >{formatCurrency(
                        dashboardData.financials.daily_view.profit
                      )}</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p class="text-white text-2xl font-black mt-2">
            {formatCurrency(dashboardData.financials.monthly_net_profit)}
          </p>
          <p class="text-[10px] text-content-tertiary mt-2">
            Projection sur 30 jours
          </p>
        </div>
      </div>
    </section>

    <section class="py-10 px-4">
      <div class="max-w-7xl mx-auto grid md:grid-cols-2 gap-6">
        <div class="bg-surface border border-border rounded-card p-6">
          <h2 class="text-lg font-semibold text-white mb-4">
            Entreprise Active
          </h2>
          <div class="bg-surface-alt border border-border rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <p class="text-white font-medium text-lg">
                {dashboardData.company.name}
              </p>
              <span
                class="bg-primary-500/20 text-primary-400 px-2 py-1 rounded text-xs font-semibold"
              >
                Niveau {dashboardData.company.level}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-content-tertiary text-xs">PDG</p>
                <p class="text-white font-medium">
                  {dashboardData.company.ceo}
                </p>
              </div>
              <div>
                <p class="text-content-tertiary text-xs">Employés</p>
                <p class="text-white font-medium">
                  {dashboardData.staff.total_employees}
                </p>
              </div>
              <div>
                <p class="text-content-tertiary text-xs">Prestige</p>
                <p class="text-white font-medium">
                  {dashboardData.company.prestige}
                </p>
              </div>
              <div>
                <p class="text-content-tertiary text-xs">Efficacité Moy.</p>
                <p class="text-white font-medium">
                  {dashboardData.staff.average_efficiency}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-surface border border-border rounded-card p-6">
          <h2 class="text-lg font-semibold text-white mb-4">
            Action Boursière
          </h2>
          <div class="bg-surface-alt border border-border rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <p class="text-white font-medium text-lg">
                {dashboardData.financials.stock_ticker}
              </p>
              <p class="text-white text-xl font-bold">
                {formatCurrency(dashboardData.financials.stock_price)}
              </p>
            </div>
            <div class="border-t border-border pt-3">
              <p class="text-content-tertiary text-xs">Valorisation Totale</p>
              <p class="text-white font-semibold text-lg">
                {formatCurrency(dashboardData.financials.valuation)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="py-4 px-4">
      <div class="max-w-7xl mx-auto">
        <div class="bg-surface border border-border rounded-card p-6">
          <h2 class="text-lg font-semibold text-white mb-4">
            Inventaire ({dashboardData.resources.inventory_count} items)
          </h2>
          {#if dashboardData.resources.top_items.length > 0}
            <div class="grid md:grid-cols-5 gap-3">
              {#each dashboardData.resources.top_items as item}
                <div
                  class="bg-surface-alt border border-border rounded-lg p-3 text-center"
                >
                  <p class="text-white font-medium text-sm truncate">
                    {item.name}
                  </p>
                  <p class="text-content-secondary text-xs mt-1">
                    Qté: {item.qty}
                  </p>
                  <p class="text-primary-400 text-xs font-semibold">
                    {formatCurrency(item.value)}
                  </p>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-content-secondary text-sm text-center py-4">
              Aucun item dans l'inventaire
            </p>
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
