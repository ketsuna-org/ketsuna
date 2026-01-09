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
      const response = await pb.send(`/api/company/statistics?period=${period}`, {
        method: "GET",
      });

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

<div class="min-h-screen bg-slate-950 text-slate-100">
  <!-- Header -->
  <header
    class="sticky top-0 z-40 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <NavigationHub />
          <div>
            <h1
              class="text-2xl font-bold bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"
            >
              📊 Statistiques
            </h1>
            <p class="text-sm text-slate-400">Production & Consommation</p>
          </div>
        </div>
        <UserMenu />
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Period Selector -->
    <div class="mb-8">
      <div
        class="inline-flex rounded-xl bg-slate-900/50 p-1 border border-slate-800"
      >
        {#each ["1m", "10m", "1h", "10h", "24h"] as p}
          <button
            onclick={() => changePeriod(p as typeof period)}
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all
                   {period === p
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'}"
          >
            {p}
          </button>
        {/each}
      </div>
      <span class="ml-4 text-sm text-slate-500">
        {loading ? "Chargement..." : "Dernière mise à jour à l'instant"}
      </span>
    </div>

    {#if error}
      <div
        class="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400"
      >
        {error}
      </div>
    {/if}

    <!-- Money Summary -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div
        class="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6"
      >
        <div class="flex items-center gap-3 mb-2">
          <span class="text-2xl">💰</span>
          <span class="text-sm text-slate-400">Revenus</span>
        </div>
        <p class="text-3xl font-bold text-emerald-400">
          +{moneyData.income.toLocaleString("fr-FR")} €
        </p>
      </div>
      <div
        class="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6"
      >
        <div class="flex items-center gap-3 mb-2">
          <span class="text-2xl">📤</span>
          <span class="text-sm text-slate-400">Dépenses</span>
        </div>
        <p class="text-3xl font-bold text-red-400">
          -{moneyData.expenses.toLocaleString("fr-FR")} €
        </p>
      </div>
      <div
        class="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6"
      >
        <div class="flex items-center gap-3 mb-2">
          <span class="text-2xl">📈</span>
          <span class="text-sm text-slate-400">Bénéfice Net</span>
        </div>
        <p
          class="text-3xl font-bold {moneyData.net >= 0
            ? 'text-emerald-400'
            : 'text-red-400'}"
        >
          {moneyData.net >= 0 ? "+" : ""}{moneyData.net.toLocaleString(
            "fr-FR"
          )} €
        </p>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Production -->
      <div
        class="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6"
      >
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <span class="text-emerald-400">⚙️</span>
          Production
        </h2>
        {#if productionData.length === 0}
          <div class="h-64 flex items-center justify-center text-slate-500">
            Aucune production enregistrée
          </div>
        {:else}
          <div class="h-64">
            <canvas bind:this={productionChartCanvas}></canvas>
          </div>
          <!-- Details table -->
          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-slate-400 border-b border-slate-700">
                  <th class="text-left py-2">Item</th>
                  <th class="text-right py-2">Total</th>
                  <th class="text-right py-2">Par minute</th>
                </tr>
              </thead>
              <tbody>
                {#each productionData as item}
                  <tr class="border-b border-slate-800/50">
                    <td class="py-2">{item.name}</td>
                    <td class="text-right text-emerald-400"
                      >{item.quantity.toFixed(1)}</td
                    >
                    <td class="text-right text-slate-400"
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
        class="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6"
      >
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <span class="text-red-400">📦</span>
          Consommation
        </h2>
        {#if consumptionData.length === 0}
          <div class="h-64 flex items-center justify-center text-slate-500">
            Aucune consommation enregistrée
          </div>
        {:else}
          <div class="h-64">
            <canvas bind:this={consumptionChartCanvas}></canvas>
          </div>
          <!-- Details table -->
          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-slate-400 border-b border-slate-700">
                  <th class="text-left py-2">Item</th>
                  <th class="text-right py-2">Total</th>
                  <th class="text-right py-2">Par minute</th>
                </tr>
              </thead>
              <tbody>
                {#each consumptionData as item}
                  <tr class="border-b border-slate-800/50">
                    <td class="py-2">{item.name}</td>
                    <td class="text-right text-red-400"
                      >{item.quantity.toFixed(1)}</td
                    >
                    <td class="text-right text-slate-400"
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
