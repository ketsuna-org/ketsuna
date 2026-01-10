<script lang="ts">
  import { onMount } from "svelte";
  import { Chart, registerables } from "chart.js";
  import pb from "$lib/pocketbase";
  import { activeCompany } from "$lib/stores";
  import NavigationHub from "$lib/components/NavigationHub.svelte";
  import UserMenu from "$lib/components/UserMenu.svelte";

  // Register Chart.js components
  Chart.register(...registerables);

  // State
  let period = $state<"1m" | "10m" | "1h" | "10h" | "24h">("10m");
  let loading = $state(false);
  let error = $state("");

  // Data
  let productionData = $state<
    Array<{
      item_id: string;
      name: string;
      quantity: number;
      rate_per_minute: number;
    }>
  >([]);
  let consumptionData = $state<
    Array<{
      item_id: string;
      name: string;
      quantity: number;
      rate_per_minute: number;
    }>
  >([]);
  let moneyData = $state<{
    income: number;
    expenses: number;
    net: number;
  }>({ income: 0, expenses: 0, net: 0 });

  // Chart references
  let productionChartCanvas: HTMLCanvasElement;
  let consumptionChartCanvas: HTMLCanvasElement;
  let productionChart: Chart | null = null;
  let consumptionChart: Chart | null = null;

  let company = $derived($activeCompany);

  async function fetchStatistics() {
    if (!company?.id) return;

    loading = true;
    error = "";

    try {
      const response = await pb.send(
        `/api/company/statistics?period=${period}`,
        {
          method: "GET",
        }
      );

      if (response.success) {
        productionData = response.production || [];
        consumptionData = response.consumption || [];
        moneyData = response.money || { income: 0, expenses: 0, net: 0 };
        updateCharts();
      }
    } catch (err: any) {
      error = err.message || "Erreur lors du chargement des statistiques";
    } finally {
      loading = false;
    }
  }

  function updateCharts() {
    // Production Chart
    if (productionChart) {
      productionChart.destroy();
    }
    if (productionChartCanvas && productionData.length > 0) {
      productionChart = new Chart(productionChartCanvas, {
        type: "bar",
        data: {
          labels: productionData.map((d) => d.name),
          datasets: [
            {
              label: "Production totale",
              data: productionData.map((d) => d.quantity),
              backgroundColor: "rgba(99, 102, 241, 0.8)",
              borderColor: "rgba(99, 102, 241, 1)",
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: "#e2e8f0" },
            },
          },
          scales: {
            x: {
              ticks: { color: "#94a3b8" },
              grid: { color: "rgba(148, 163, 184, 0.1)" },
            },
            y: {
              ticks: { color: "#94a3b8" },
              grid: { color: "rgba(148, 163, 184, 0.1)" },
            },
          },
        },
      });
    }

    // Consumption Chart
    if (consumptionChart) {
      consumptionChart.destroy();
    }
    if (consumptionChartCanvas && consumptionData.length > 0) {
      consumptionChart = new Chart(consumptionChartCanvas, {
        type: "bar",
        data: {
          labels: consumptionData.map((d) => d.name),
          datasets: [
            {
              label: "Consommation totale",
              data: consumptionData.map((d) => d.quantity),
              backgroundColor: "rgba(239, 68, 68, 0.8)",
              borderColor: "rgba(239, 68, 68, 1)",
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: "#e2e8f0" },
            },
          },
          scales: {
            x: {
              ticks: { color: "#94a3b8" },
              grid: { color: "rgba(148, 163, 184, 0.1)" },
            },
            y: {
              ticks: { color: "#94a3b8" },
              grid: { color: "rgba(148, 163, 184, 0.1)" },
            },
          },
        },
      });
    }
  }

  function changePeriod(newPeriod: typeof period) {
    period = newPeriod;
    fetchStatistics();
  }

  onMount(() => {
    fetchStatistics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatistics, 30000);
    return () => clearInterval(interval);
  });

  // Watch for period changes
  $effect(() => {
    if (company?.id) {
      fetchStatistics();
    }
  });
</script>

<svelte:head>
  <title>Statistiques | Ketsuna</title>
</svelte:head>

<div
  class="min-h-screen bg-[#020617] text-slate-100 font-sans relative overflow-x-hidden"
>
  <!-- Global background pattern -->
  <div
    class="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none fixed"
  ></div>
  <div
    class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[128px] pointer-events-none fixed"
  ></div>

  <!-- Header -->
  <header
    class="sticky top-0 z-40 backdrop-blur-xl bg-[#020617]/80 border-b border-[#334155]"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <NavigationHub />
          <div>
            <h1
              class="text-2xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-tight"
            >
              📊 Statistiques
            </h1>
            <p
              class="text-xs font-bold text-slate-500 uppercase tracking-widest"
            >
              Production & Consommation
            </p>
          </div>
        </div>
        <UserMenu />
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
    <!-- Period Selector -->
    <div class="mb-8 flex flex-col sm:flex-row sm:items-center gap-4">
      <div
        class="inline-flex rounded-lg bg-[#0f172a] p-1 border border-[#334155]"
      >
        {#each ["1m", "10m", "1h", "10h", "24h"] as p}
          <button
            onclick={() => changePeriod(p as typeof period)}
            class="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all
                   {period === p
              ? 'bg-[#334155] text-white shadow-sm ring-1 ring-white/10'
              : 'text-slate-400 hover:text-white hover:bg-[#1e293b]'}"
          >
            {p}
          </button>
        {/each}
      </div>
      <span class="text-xs text-slate-500 font-mono flex items-center gap-2">
        {#if loading}
          <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          Chargement...
        {:else}
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          Dernière mise à jour à l'instant
        {/if}
      </span>
    </div>

    {#if error}
      <div
        class="mb-6 p-4 bg-red-950/20 border border-red-900/50 rounded-lg text-red-400 flex items-center gap-3"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><circle cx="12" cy="12" r="10"></circle><line
            x1="12"
            y1="8"
            x2="12"
            y2="12"
          ></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg
        >
        {error}
      </div>
    {/if}

    <!-- Money Summary -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <!-- Income -->
      <div
        class="relative bg-[#1e293b]/60 backdrop-blur-md border border-[#334155] rounded-xl p-6 overflow-hidden group hover:border-[#334155]/80 transition-all"
      >
        <div class="absolute top-0 left-0 w-1 h-full bg-emerald-500/50"></div>
        <div
          class="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"
        ></div>

        <div class="flex items-center gap-3 mb-2 relative z-10">
          <div
            class="w-8 h-8 rounded-lg bg-emerald-950/30 border border-emerald-900/50 flex items-center justify-center text-emerald-500"
          >
            💰
          </div>
          <span
            class="text-xs font-bold text-slate-400 uppercase tracking-widest"
            >Revenus</span
          >
        </div>
        <p
          class="text-3xl font-black text-emerald-400 font-mono tracking-tight relative z-10"
        >
          +{moneyData.income.toLocaleString("fr-FR")} €
        </p>
      </div>

      <!-- Expenses -->
      <div
        class="relative bg-[#1e293b]/60 backdrop-blur-md border border-[#334155] rounded-xl p-6 overflow-hidden group hover:border-[#334155]/80 transition-all"
      >
        <div class="absolute top-0 left-0 w-1 h-full bg-red-500/50"></div>
        <div
          class="absolute -right-6 -top-6 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all"
        ></div>

        <div class="flex items-center gap-3 mb-2 relative z-10">
          <div
            class="w-8 h-8 rounded-lg bg-red-950/30 border border-red-900/50 flex items-center justify-center text-red-500"
          >
            📤
          </div>
          <span
            class="text-xs font-bold text-slate-400 uppercase tracking-widest"
            >Dépenses</span
          >
        </div>
        <p
          class="text-3xl font-black text-red-400 font-mono tracking-tight relative z-10"
        >
          -{moneyData.expenses.toLocaleString("fr-FR")} €
        </p>
      </div>

      <!-- Net -->
      <div
        class="relative bg-[#1e293b]/60 backdrop-blur-md border border-[#334155] rounded-xl p-6 overflow-hidden group hover:border-[#334155]/80 transition-all"
      >
        <div
          class="absolute top-0 left-0 w-1 h-full {moneyData.net >= 0
            ? 'bg-indigo-500/50'
            : 'bg-orange-500/50'}"
        ></div>
        <div
          class="absolute -right-6 -top-6 w-24 h-24 {moneyData.net >= 0
            ? 'bg-indigo-500/10'
            : 'bg-orange-500/10'} rounded-full blur-2xl group-hover:opacity-100 transition-all"
        ></div>

        <div class="flex items-center gap-3 mb-2 relative z-10">
          <div
            class="w-8 h-8 rounded-lg bg-[#0f172a] border border-[#334155] flex items-center justify-center text-slate-300"
          >
            📈
          </div>
          <span
            class="text-xs font-bold text-slate-400 uppercase tracking-widest"
            >Bénéfice Net</span
          >
        </div>
        <p
          class="text-3xl font-black {moneyData.net >= 0
            ? 'text-indigo-400'
            : 'text-orange-400'} font-mono tracking-tight relative z-10"
        >
          {moneyData.net >= 0 ? "+" : ""}{moneyData.net.toLocaleString("fr-FR")}
          €
        </p>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Production -->
      <div
        class="bg-[#1e293b]/40 backdrop-blur-md border border-[#334155] rounded-xl p-6"
      >
        <h2
          class="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-widest text-slate-300 border-b border-[#334155] pb-2"
        >
          <span class="text-emerald-400 text-lg">⚙️</span>
          Production
        </h2>
        {#if productionData.length === 0}
          <div
            class="h-64 flex flex-col items-center justify-center text-slate-500 gap-2"
          >
            <span class="text-2xl opacity-50">💤</span>
            <span class="text-xs font-medium uppercase tracking-wide"
              >Aucune activité</span
            >
          </div>
        {:else}
          <div class="h-64 mb-6">
            <canvas bind:this={productionChartCanvas}></canvas>
          </div>
          <!-- Details table -->
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr
                  class="text-slate-500 border-b border-[#334155] font-bold uppercase tracking-wider"
                >
                  <th class="text-left py-2 px-2">Item</th>
                  <th class="text-right py-2 px-2">Total</th>
                  <th class="text-right py-2 px-2">Taux</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#334155]/50">
                {#each productionData as item}
                  <tr class="hover:bg-[#334155]/20 transition-colors">
                    <td class="py-2 px-2 font-medium text-slate-300"
                      >{item.name}</td
                    >
                    <td class="text-right px-2 font-mono text-emerald-400"
                      >{item.quantity.toFixed(1)}</td
                    >
                    <td class="text-right px-2 font-mono text-slate-400"
                      >{item.rate_per_minute.toFixed(2)}/min</td
                    >
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>

      <!-- Consumption -->
      <div
        class="bg-[#1e293b]/40 backdrop-blur-md border border-[#334155] rounded-xl p-6"
      >
        <h2
          class="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-widest text-slate-300 border-b border-[#334155] pb-2"
        >
          <span class="text-red-400 text-lg">📦</span>
          Consommation
        </h2>
        {#if consumptionData.length === 0}
          <div
            class="h-64 flex flex-col items-center justify-center text-slate-500 gap-2"
          >
            <span class="text-2xl opacity-50">💤</span>
            <span class="text-xs font-medium uppercase tracking-wide"
              >Aucune activité</span
            >
          </div>
        {:else}
          <div class="h-64 mb-6">
            <canvas bind:this={consumptionChartCanvas}></canvas>
          </div>
          <!-- Details table -->
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr
                  class="text-slate-500 border-b border-[#334155] font-bold uppercase tracking-wider"
                >
                  <th class="text-left py-2 px-2">Item</th>
                  <th class="text-right py-2 px-2">Total</th>
                  <th class="text-right py-2 px-2">Taux</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#334155]/50">
                {#each consumptionData as item}
                  <tr class="hover:bg-[#334155]/20 transition-colors">
                    <td class="py-2 px-2 font-medium text-slate-300"
                      >{item.name}</td
                    >
                    <td class="text-right px-2 font-mono text-red-400"
                      >{item.quantity.toFixed(1)}</td
                    >
                    <td class="text-right px-2 font-mono text-slate-400"
                      >{item.rate_per_minute.toFixed(2)}/min</td
                    >
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    </div>
  </main>
</div>
