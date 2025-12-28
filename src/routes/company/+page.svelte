<script lang="ts">
  import { activeCompany, currentUser } from "$lib/stores";
  import { fade } from "svelte/transition";
  import StatCard from "$lib/components/StatCard.svelte";
  import CreateCompanyForm from "$lib/components/CreateCompanyForm.svelte";
  import { levelUpCompany } from "$lib/services/company";
  import pb from "$lib/pocketbase";
  import type { Company } from "$lib/types";

  let levelUpLoading = $state(false);

  // Level Up Config (could be moved to a shared config)
  // Cost = Base * (Level^1.5)
  // Rep Req = Level * 10
  const getLevelCost = (lvl: number) => Math.floor(1000 * Math.pow(lvl, 1.5));
  const getRepReq = (lvl: number) => lvl * 10;

  async function handleLevelUp() {
    if (!$activeCompany) return;

    const cost = getLevelCost($activeCompany.level);
    const repReq = getRepReq($activeCompany.level);

    if ($activeCompany.balance < cost) {
      alert(`Not enough funds. Need $${cost}`);
      return;
    }
    if ($activeCompany.reputation < repReq) {
      alert(`Reputation too low. Need ${repReq}`);
      return;
    }

    levelUpLoading = true;
    try {
      await levelUpCompany($activeCompany, cost);
      // Refresh state
      const updated = await pb
        .collection("companies")
        .getOne<Company>($activeCompany.id);
      activeCompany.set(updated);
    } catch (e: any) {
      alert(e.message);
    } finally {
      levelUpLoading = false;
    }
  }

  async function grantTestingFunds() {
    if (!$activeCompany) return;
    try {
      const updated = await pb
        .collection("companies")
        .update<Company>($activeCompany.id, {
          balance: $activeCompany.balance + 1_000_000,
        });
      activeCompany.set(updated);
    } catch (e: any) {
      alert("Erreur subvention: " + e.message);
    }
  }
</script>

<div class="container mx-auto p-4 max-w-6xl">
  {#if $currentUser}
    <div class="mb-6">
      <a
        href="/dashboard"
        class="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 text-sm transition-colors"
      >
        ← Retour au Dashboard
      </a>
    </div>
    {#if $activeCompany}
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1
            class="text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-cyan-400"
          >
            {$activeCompany.name}
          </h1>
          <span class="text-slate-400 text-sm"
            >CEO: {$currentUser.username}</span
          >
        </div>

        <div class="flex items-center gap-4">
          <button
            onclick={grantTestingFunds}
            class="text-xs text-slate-500 hover:text-slate-300 border border-slate-700 px-3 py-1 rounded transition-colors"
          >
            Subvention (+1M$)
          </button>
          <div class="text-right">
            <p class="text-slate-400 text-xs uppercase">Next Level Cost</p>
            <p class="text-emerald-400 font-mono text-sm">
              ${getLevelCost($activeCompany.level).toLocaleString()}
            </p>
          </div>
          <button
            onclick={handleLevelUp}
            disabled={levelUpLoading ||
              $activeCompany.balance < getLevelCost($activeCompany.level) ||
              $activeCompany.reputation < getRepReq($activeCompany.level)}
            class="bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-full shadow-lg border border-orange-400/20 transition-all transform hover:scale-105 min-w-40"
          >
            {#if levelUpLoading}
              Upgrading...
            {:else if $activeCompany.balance < getLevelCost($activeCompany.level)}
              Fonds insuffisants
            {:else if $activeCompany.reputation < getRepReq($activeCompany.level)}
              Manque de réputation
            {:else}
              Level Up (to ${$activeCompany.level + 1})
            {/if}
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <StatCard
          title="Balance"
          value={`$${$activeCompany.balance.toLocaleString()}`}
          color="text-emerald-400"
        />
        <StatCard
          title="Level"
          value={$activeCompany.level}
          color="text-blue-400"
        />
        <StatCard
          title="Reputation"
          value={$activeCompany.reputation}
          color="text-purple-400"
        />
        <StatCard
          title="Tech Points"
          value={$activeCompany.tech_points}
          color="text-cyan-400"
        />
      </div>

      <!-- Departments -->
      <h2 class="text-2xl font-bold text-white mb-4">Départements</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <a
          href="/employees"
          class="block p-6 bg-slate-800 rounded-lg border border-slate-700 hover:border-indigo-500 hover:bg-slate-800/80 transition-all group"
        >
          <div class="flex items-center gap-4 mb-2">
            <div class="text-3xl">👥</div>
            <h3
              class="text-xl font-bold text-white group-hover:text-indigo-400"
            >
              Ressources Humaines
            </h3>
          </div>
          <p class="text-slate-400 text-sm">
            Gérez vos employés, recrutements et licenciements pour optimiser
            votre productivité.
          </p>
        </a>

        <a
          href="/inventory"
          class="block p-6 bg-slate-800 rounded-lg border border-slate-700 hover:border-emerald-500 hover:bg-slate-800/80 transition-all group"
        >
          <div class="flex items-center gap-4 mb-2">
            <div class="text-3xl">📦</div>
            <h3
              class="text-xl font-bold text-white group-hover:text-emerald-400"
            >
              Inventaire & Logistique
            </h3>
          </div>
          <p class="text-slate-400 text-sm">
            Visualisez vos stocks de ressources brutes, composants et produits
            finis.
          </p>
        </a>
      </div>
    {:else}
      <div
        class="flex flex-col items-center justify-center min-h-[60vh]"
        in:fade
      >
        <CreateCompanyForm />
      </div>
    {/if}
  {:else}
    <div
      class="flex flex-col justify-center items-center h-[60vh] text-center space-y-4"
    >
      <h2 class="text-2xl font-bold text-white">Access Restricted</h2>
      <p class="text-slate-400">Please log in to manage your company.</p>
      <a href="/login" class="text-indigo-400 hover:text-indigo-300 underline"
        >Go to Login</a
      >
    </div>
  {/if}
</div>
