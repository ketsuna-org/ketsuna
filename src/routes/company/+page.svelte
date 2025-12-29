<script lang="ts">
  import { activeCompany, currentUser } from "$lib/stores";
  import { fade } from "svelte/transition";
  import StatCard from "$lib/components/StatCard.svelte";
  import CreateCompanyForm from "$lib/components/CreateCompanyForm.svelte";
  import DeleteConfirmation from "$lib/components/DeleteConfirmation.svelte";
  import { levelUpCompany } from "$lib/services/company";
  import pb from "$lib/pocketbase";
  import type { Company } from "$lib/types";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { deleteCompany } from "$lib/services/company";
  import { notifications } from "$lib/notifications";
  import { onMount } from "svelte";

  onMount(async () => {
    const user = pb.authStore.model;
    if (!user?.id) {
      activeCompany.set(null);
      return;
    }

    try {
      // Fetch user with expanded active_company relation
      const fullUser = await pb.collection("users").getOne(user.id, {
        expand: "active_company",
        requestKey: null,
      });

      if (fullUser.expand?.active_company) {
        activeCompany.set(fullUser.expand.active_company);
      } else {
        activeCompany.set(null);
      }
    } catch (e) {
      console.error("Failed to load active company", e);
      activeCompany.set(null);
    }
  });

  let levelUpLoading = $state(false);

  // Read view state from URL
  let viewState = $derived($page.url.searchParams.get("state"));

  // Level Up Config
  const getLevelCost = (lvl: number) => Math.floor(1000 * Math.pow(lvl, 1.5));
  const getRepReq = (lvl: number) => lvl * 10;

  async function handleLevelUp() {
    if (!$activeCompany) return;

    const cost = getLevelCost($activeCompany.level);
    const repReq = getRepReq($activeCompany.level);

    if ($activeCompany.balance < cost) {
      notifications.error(
        `Fonds insuffisants. Besoin de $${cost.toLocaleString()}`,
      );
      return;
    }
    if ($activeCompany.reputation < repReq) {
      notifications.warning(
        `Réputation trop basse. Besoin de ${repReq} points`,
      );
      return;
    }

    levelUpLoading = true;
    try {
      await levelUpCompany($activeCompany, cost);
      const updated = await pb
        .collection("companies")
        .getOne<Company>($activeCompany.id, { requestKey: null });
      activeCompany.set(updated);
      notifications.success(
        "Expansion réussie ! Votre entreprise a gagné un niveau.",
      );
    } catch (e: any) {
      console.error("Level up error:", e);
      // Try to extract detailed message from PocketBase error
      const msg = e?.data?.message || e?.message || "Erreur inconnue";
      notifications.error(msg);
    } finally {
      levelUpLoading = false;
    }
  }

  function openDelete() {
    goto("?state=delete");
  }

  function closeDelete() {
    goto("?");
  }

  async function performDeletion() {
    if (!$activeCompany || !$currentUser) return;
    await deleteCompany($activeCompany.id, $currentUser.id);
    activeCompany.set(null);
    const freshUser = await pb
      .collection("users")
      .getOne($currentUser.id, { requestKey: null });
    currentUser.set(freshUser);
    await goto("/company", { replaceState: true });
  }
</script>

<div class="container mx-auto p-4 max-w-6xl">
  {#if $currentUser}
    <div class="mb-6 flex justify-between items-center">
      <a
        href="/dashboard"
        class="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 text-sm transition-colors"
      >
        ← Retour au Dashboard
      </a>

      {#if $activeCompany}
        <button
          onclick={openDelete}
          class="text-xs text-red-500/60 hover:text-red-400 flex items-center gap-1 transition-colors group"
        >
          <span class="opacity-0 group-hover:opacity-100 transition-opacity"
            >Destruction irréversible •</span
          >
          Supprimer l'entreprise
        </button>
      {/if}
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

        <div class="flex items-center gap-6">
          <div class="text-right">
            <p class="text-slate-400 text-xs uppercase tracking-wider mb-1">
              Prochain Niveau
            </p>
            <p class="text-emerald-400 font-mono text-lg">
              {getLevelCost($activeCompany.level).toLocaleString()}€
            </p>
            <p class="text-purple-400 font-mono text-xs">
              {getRepReq($activeCompany.level)} Rep
            </p>
          </div>
          <button
            onclick={handleLevelUp}
            disabled={levelUpLoading ||
              $activeCompany.balance < getLevelCost($activeCompany.level) ||
              $activeCompany.reputation < getRepReq($activeCompany.level)}
            class="bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-2xl shadow-lg border border-orange-400/20 transition-all transform hover:scale-105 active:scale-95 min-w-50"
          >
            {#if levelUpLoading}
              <span class="flex items-center justify-center gap-2">
                <div
                  class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                ></div>
                Expansion...
              </span>
            {:else if $activeCompany.balance < getLevelCost($activeCompany.level)}
              Fonds insuffisants
            {:else if $activeCompany.reputation < getRepReq($activeCompany.level)}
              Manque de réputation
            {:else}
              Level Up (to {$activeCompany.level + 1})
            {/if}
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <StatCard
          title="Balance"
          value={`${$activeCompany.balance.toLocaleString()}€`}
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
      <h2 class="text-2xl font-bold text-white mb-6">Départements</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <a
          href="/employees"
          class="block p-6 bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all group"
        >
          <div class="flex items-center gap-4 mb-3">
            <div
              class="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle
                  cx="9"
                  cy="7"
                  r="4"
                /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path
                  d="M16 3.13a4 4 0 0 1 0 7.75"
                /></svg
              >
            </div>
            <h3
              class="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors"
            >
              Ressources Humaines
            </h3>
          </div>
          <p class="text-slate-400 text-sm leading-relaxed">
            Gérez vos employés, recrutements et licenciements pour optimiser
            votre productivité.
          </p>
        </a>

        <a
          href="/inventory"
          class="block p-6 bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all group"
        >
          <div class="flex items-center gap-4 mb-3">
            <div
              class="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><path
                  d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
                /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22.08V12" /></svg
              >
            </div>
            <h3
              class="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors"
            >
              Inventaire & Logistique
            </h3>
          </div>
          <p class="text-slate-400 text-sm leading-relaxed">
            Visualisez vos stocks de ressources brutes, composants et produits
            finis.
          </p>
        </a>
      </div>

      {#if viewState === "delete"}
        <DeleteConfirmation
          title="Supprimer l'entreprise"
          message={`Êtes-vous sûr de vouloir supprimer <strong>${$activeCompany.name}</strong> ? Cette action est irréversible et toutes les données associées seront perdues.`}
          confirmText="Supprimer"
          onConfirm={performDeletion}
          onCancel={closeDelete}
        />
      {/if}
    {:else}
      <div
        class="flex flex-col items-center justify-center min-h-[60vh] space-y-8"
        in:fade
      >
        <div class="text-center space-y-2">
          <h2 class="text-3xl font-bold text-white">
            Aucune entreprise active
          </h2>
          <p class="text-slate-400">
            Prêt à bâtir votre empire ? Commencez par créer votre première
            société.
          </p>
        </div>
        <CreateCompanyForm />
      </div>
    {/if}
  {:else}
    <div
      class="flex flex-col justify-center items-center h-[60vh] text-center space-y-6"
    >
      <div
        class="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center text-slate-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path
            d="M7 11V7a5 5 0 0 1 10 0v4"
          /></svg
        >
      </div>
      <div class="space-y-2">
        <h2 class="text-2xl font-bold text-white">Accès Restreint</h2>
        <p class="text-slate-400 max-w-xs">
          Veuillez vous connecter pour gérer votre entreprise et vos actifs.
        </p>
      </div>
      <a
        href="/login"
        class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
      >
        Se connecter
      </a>
    </div>
  {/if}
</div>
