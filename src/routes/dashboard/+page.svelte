<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import pb from "$lib/pocketbase";
  import { fetchDashboardData, type DashboardData } from "$lib/dashboard";

  const user = pb.authStore.model;

  let dashboardData: DashboardData | null = null;
  let loading = true;
  let error = "";

  function logout() {
    pb.authStore.clear();
    goto("/");
  }

  // Formatter en devise
  function formatCurrency(value: number): string {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}k`;
    }
    return `$${value.toFixed(0)}`;
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

  // Données mockées de fallback
  const mockedCompanies = [
    { name: "Ketsuna Industries", revenue: "$1.2M", employees: 120 },
    { name: "Nova Tech", revenue: "$550k", employees: 48 },
  ];

  const mockedPortfolio = [
    { ticker: "KTS", change: "+2.4%", value: "$45,230" },
    { ticker: "NVT", change: "-0.8%", value: "$12,780" },
  ];
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
      <div class="flex gap-3">
        <a
          href="/company"
          class="bg-surface hover:bg-surface-highlight border border-border text-content-secondary hover:text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200"
          >Gérer mes compagnies</a
        >
        <button
          on:click={logout}
          class="bg-primary-600 hover:bg-primary-500 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200"
          >Se déconnecter</button
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
          <p class="text-content-tertiary text-xs mt-4">
            Mode démo actif (données mockées).
          </p>
        </div>
      </div>
    </section>

    <!-- Fallback avec données mockées -->
    <section class="py-10 px-4">
      <div class="max-w-7xl mx-auto grid md:grid-cols-3 gap-6">
        <div class="bg-surface border border-border rounded-card p-6">
          <p class="text-content-tertiary text-xs uppercase tracking-wide">
            Trésorerie
          </p>
          <p class="text-white text-2xl font-bold mt-2">$240,500</p>
        </div>
        <div class="bg-surface border border-border rounded-card p-6">
          <p class="text-content-tertiary text-xs uppercase tracking-wide">
            Valorisation
          </p>
          <p class="text-white text-2xl font-bold mt-2">$58,010</p>
        </div>
        <div class="bg-surface border border-border rounded-card p-6">
          <p class="text-content-tertiary text-xs uppercase tracking-wide">
            Employés
          </p>
          <p class="text-white text-2xl font-bold mt-2">168</p>
        </div>
      </div>
    </section>
  {:else if dashboardData}
    <!-- Données réelles depuis PocketBase -->
    <section class="py-10 px-4">
      <div class="max-w-7xl mx-auto grid md:grid-cols-3 gap-6">
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
            Salaires / Jour
          </p>
          <p class="text-white text-2xl font-bold mt-2">
            {formatCurrency(dashboardData.financials.daily_payroll)}
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
  {:else}
    <!-- Mode démo (pas de données réelles ni d'erreur) -->
    <section class="py-4 px-4">
      <div
        class="max-w-7xl mx-auto bg-primary-900/10 border border-primary-900/20 rounded-card p-4"
      >
        <p class="text-primary-300 text-sm">
          Cette page contient des données mockées et sert uniquement de
          maquette.
        </p>
      </div>
    </section>

    <section class="py-10 px-4">
      <div class="max-w-7xl mx-auto grid md:grid-cols-2 gap-6">
        <div class="bg-surface border border-border rounded-card p-6">
          <h2 class="text-lg font-semibold text-white mb-4">Mes Entreprises</h2>
          <div class="space-y-3">
            {#each mockedCompanies as c}
              <div
                class="flex items-center justify-between bg-surface-alt border border-border rounded-lg p-4"
              >
                <div>
                  <p class="text-white font-medium">
                    {c.name}
                  </p>
                  <p class="text-content-secondary text-sm">
                    {c.employees} employés
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-content-secondary text-xs">Revenus</p>
                  <p class="text-white font-semibold">
                    {c.revenue}
                  </p>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="bg-surface border border-border rounded-card p-6">
          <h2 class="text-lg font-semibold text-white mb-4">
            Portefeuille Boursier
          </h2>
          <div class="space-y-3">
            {#each mockedPortfolio as p}
              <div
                class="flex items-center justify-between bg-surface-alt border border-border rounded-lg p-4"
              >
                <p class="text-white font-medium">
                  {p.ticker}
                </p>
                <p class="text-content-secondary">{p.value}</p>
                <p
                  class="{p.change.startsWith('+')
                    ? 'text-status-success'
                    : 'text-status-danger'} font-semibold"
                >
                  {p.change}
                </p>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>
  {/if}
</div>
