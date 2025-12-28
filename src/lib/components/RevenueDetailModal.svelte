<script lang="ts">
  interface Breakdown {
    base_hourly_revenue: number;
    reputation_hourly_bonus: number;
    employees_hourly_revenue: number;
    maintenance_hourly: number;
    premium_multiplier: number;
    machine_production_count: number;
    daily_payroll: number;
  }

  interface DailyView {
    revenue_base: number;
    revenue_employees: number;
    revenue_reputation: number;
    cost_maintenance: number;
    cost_payroll: number;
    total_revenue: number;
    total_cost: number;
    profit: number;
  }

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    breakdown: Breakdown;
    daily_view: DailyView;
    monthlyProfit: number;
    formatCurrency: (value: number) => string;
  }

  let {
    isOpen,
    onClose,
    breakdown,
    daily_view,
    monthlyProfit,
    formatCurrency,
  }: Props = $props();

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleBackdropKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      if (e.target === e.currentTarget) {
        onClose();
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const handleDialogKeyDown = (e: KeyboardEvent) => {
    // Prevent event propagation to avoid closing when interacting with dialog content
    e.stopPropagation();
  };
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
  <div
    class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm outline-none"
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKeyDown}
    role="button"
    tabindex="0"
    aria-label="Fermer la modale en cliquant sur l'arrière-plan"
  >
    <div
      class="bg-slate-900 border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="0"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleDialogKeyDown}
    >
      <header
        class="p-6 border-b border-white/5 bg-linear-to-br from-indigo-500/10 to-transparent shrink-0"
      >
        <div class="flex justify-between items-center">
          <div>
            <h3 id="modal-title" class="text-xl font-bold text-white">
              Analyse des revenus
            </h3>
            <p
              class="text-xs text-indigo-400 font-medium uppercase tracking-widest mt-1"
            >
              Cycle de 24 Heures
            </p>
          </div>
          <button
            onclick={onClose}
            class="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer"
            aria-label="Fermer la modale"
          >
            ✕
          </button>
        </div>
      </header>

      <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar">
        <section class="pb-2 border-b border-white/5 space-y-3">
          <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Revenus (24h)
          </h4>
          <div class="flex justify-between items-center">
            <span class="text-slate-300 text-sm">Revenu de base</span>
            <span class="text-white font-mono font-bold"
              >{formatCurrency(daily_view.revenue_base)}</span
            >
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-300 text-sm">Production Employés</span>
            <span class="text-emerald-400 font-mono font-bold"
              >+{formatCurrency(daily_view.revenue_employees)}</span
            >
          </div>
        </section>

        <section class="pb-2 border-b border-white/5 space-y-3">
          <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Dépenses (24h)
          </h4>
          <div class="flex justify-between items-center">
            <span class="text-slate-300 text-sm">Salaires</span>
            <span class="text-red-400 font-mono font-bold"
              >-{formatCurrency(daily_view.cost_payroll)}</span
            >
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-300 text-sm">Maintenance</span>
            <span class="text-red-400 font-mono font-bold"
              >-{formatCurrency(daily_view.cost_maintenance)}</span
            >
          </div>
        </section>

        <footer class="mt-4">
          <div
            class="p-6 {daily_view.profit > 0
              ? 'bg-indigo-500/10 border-indigo-500/30'
              : 'bg-red-500/10 border-red-500/30'} border rounded-3xl"
          >
            <p
              class="text-xs font-black uppercase tracking-widest mb-1 opacity-70"
            >
              Projection Mensuelle
            </p>
            <p class="text-white text-3xl font-black tracking-tight">
              {formatCurrency(monthlyProfit)}
            </p>
          </div>

          <button
            onclick={onClose}
            class="w-full mt-6 py-4 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-200 transition-colors shadow-lg cursor-pointer"
          >
            Compris
          </button>
        </footer>
      </div>
    </div>
  </div>
{/if}
