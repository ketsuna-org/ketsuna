<script lang="ts">
  import { fade, fly, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    breakdown: {
      base_hourly_revenue: number;
      reputation_hourly_bonus: number;
      employees_hourly_revenue: number;
      hourly_costs: number;
      premium_multiplier: number;
      machine_production_count: number;
    };
    monthlyProfit: number;
    formatCurrency: (value: number) => string;
  }

  let { isOpen, onClose, breakdown, monthlyProfit, formatCurrency }: Props =
    $props();

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    transition:fade={{ duration: 200 }}
    onclick={handleBackdropClick}
  >
    <div
      class="bg-slate-900 border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
      transition:scale={{ start: 0.9, duration: 300, easing: backOut }}
    >
      <!-- Header -->
      <div
        class="p-6 border-b border-white/5 bg-linear-to-br from-indigo-500/10 to-transparent"
      >
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-xl font-bold text-white">Analyse des revenus</h3>
            <p
              class="text-xs text-indigo-400 font-medium uppercase tracking-widest mt-1"
            >
              Projection Mensuelle (24h)
            </p>
          </div>
          <button
            onclick={onClose}
            class="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        {#if breakdown.base_hourly_revenue === 0 && monthlyProfit <= 0}
          <div class="space-y-3">
            <!-- No Employees or No Stock Alert -->
            <div
              class="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 items-start"
              transition:fly={{ y: -10 }}
            >
              <div class="mt-0.5 text-red-500">
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
                    d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
                  ></path><path d="M12 9v4"></path><path d="M12 17h.01"
                  ></path></svg
                >
              </div>
              <div>
                <p class="text-sm font-bold text-red-400">
                  Production à l'arrêt
                </p>
                <div class="text-[11px] text-red-400/80 leading-relaxed mt-1">
                  Votre entreprise ne génère aucun revenu car :
                  <ul class="list-disc ml-4 mt-1 space-y-0.5">
                    <li>Vous n'avez peut-être aucun employé.</li>
                    <li>
                      Ou vous n'avez plus de <strong>Produit Fini</strong> en stock
                      à vendre.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Resignation Warning -->
            <div
              class="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex gap-3 items-center"
              transition:fade
            >
              <div class="text-amber-500">
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
                  ><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                  ></path><circle cx="9" cy="7" r="4"></circle><line
                    x1="17"
                    y1="8"
                    x2="22"
                    y2="13"
                  ></line><line x1="22" y1="8" x2="17" y2="13"></line></svg
                >
              </div>
              <p class="text-[10px] text-amber-500/80 font-medium">
                Attention : Si votre solde devient négatif, vos employés
                démissionneront un par un.
              </p>
            </div>
          </div>
        {/if}

        <div class="space-y-4">
          <div class="flex justify-between items-center group">
            <div class="flex flex-col">
              <span class="text-slate-400 text-sm">Revenu de base</span>
              <span class="text-[10px] text-slate-500 italic"
                >Lié au niveau de l'entreprise</span
              >
            </div>
            <span class="text-white font-mono font-bold"
              >{formatCurrency(breakdown.base_hourly_revenue * 1440)}</span
            >
          </div>

          <div class="flex justify-between items-center">
            <div class="flex flex-col">
              <span class="text-slate-400 text-sm">Bonus Réputation</span>
              <span class="text-[10px] text-slate-500 italic"
                >+{breakdown.reputation_hourly_bonus * 1440} points/mois</span
              >
            </div>
            <span class="text-white font-mono font-bold"
              >+{formatCurrency(breakdown.reputation_hourly_bonus * 1440)}</span
            >
          </div>

          {#if breakdown.premium_multiplier > 1}
            <div
              class="flex justify-between items-center p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl"
            >
              <div class="flex flex-col">
                <span class="text-amber-400 text-sm font-bold"
                  >Bonus de Compte Premium</span
                >
                <span class="text-[10px] text-amber-500/70 uppercase"
                  >Multiplicateur actif</span
                >
              </div>
              <span class="text-amber-400 font-mono font-black text-lg"
                >x{breakdown.premium_multiplier}</span
              >
            </div>
          {/if}

          <div
            class="flex justify-between items-center pt-2 border-t border-white/5"
          >
            <div class="flex flex-col">
              <span class="text-slate-400 text-sm font-medium"
                >Production des Employés</span
              >
              <span class="text-[10px] text-slate-500 italic"
                >Efficacité & Rareté</span
              >
            </div>
            <span class="text-emerald-400 font-mono font-bold"
              >+{formatCurrency(
                breakdown.employees_hourly_revenue * 1440
              )}</span
            >
          </div>

          <div
            class="flex justify-between items-center pt-2 border-t border-white/5"
          >
            <div class="flex flex-col">
              <span class="text-slate-400 text-sm">Coûts Opérationnels</span>
              <span class="text-[10px] text-slate-500 italic"
                >Salaires & Maintenance</span
              >
            </div>
            <span class="text-red-400 font-mono font-bold"
              >-{formatCurrency(breakdown.hourly_costs * 1440)}</span
            >
          </div>

          {#if breakdown.machine_production_count > 0}
            <div
              class="flex justify-between items-center pt-2 border-t border-white/5"
            >
              <div class="flex flex-col">
                <span class="text-slate-400 text-sm font-medium"
                  >Production Automatisée</span
                >
                <span class="text-[10px] text-slate-500 italic"
                  >Machines en service</span
                >
              </div>
              <span class="text-cyan-400 font-mono font-bold"
                >+{breakdown.machine_production_count * 1440} unités/mois</span
              >
            </div>
          {/if}
        </div>

        <!-- Result -->
        <div
          class="mt-8 p-6 bg-indigo-500/10 border border-indigo-500/30 rounded-3xl relative overflow-hidden group"
        >
          <div
            class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-indigo-400"
              ><line x1="12" y1="1" x2="12" y2="23"></line><path
                d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
              ></path></svg
            >
          </div>
          <p
            class="text-indigo-400 text-xs font-black uppercase tracking-widest mb-1"
          >
            Profit Net Mensuel Projeté
          </p>
          <p class="text-white text-3xl font-black">
            {formatCurrency(monthlyProfit)}
          </p>
        </div>

        <button
          onclick={onClose}
          class="w-full py-4 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-200 transition-colors shadow-lg shadow-white/5"
        >
          Compris
        </button>
      </div>
    </div>
  </div>
{/if}
