<script lang="ts">
  import pb from "$lib/pocketbase";
  import { currentUser, activeCompany } from "$lib/stores";
  import type { Company } from "$lib/types";

  let { onCreated } = $props<{ onCreated?: () => void }>();

  let name = $state("");
  let loading = $state(false);
  let error = $state("");

  async function createCompany() {
    if (!name) return;
    loading = true;
    error = "";

    try {
      const user = $currentUser || pb.authStore.model;
      if (!user)
        throw new Error("Vous devez être connecté pour créer une entreprise");

      // 1. Create the company
      const newCompany = await pb.collection("companies").create<Company>({
        name: name,
        ceo: user.id,
        is_npc: false,
      });

      // 3. Update local state
      activeCompany.set(newCompany);

      // Reload user and trigger authStore change to sync active_company
      const freshUser = await pb.collection("users").getOne(user.id);
      pb.authStore.save(pb.authStore.token, freshUser);
      currentUser.set(freshUser);

      if (onCreated) {
        onCreated();
      }
    } catch (e: any) {
      console.error("Error creating company:", e);
      error = e.message || "Failed to create company";
    } finally {
      loading = false;
    }
  }
</script>

<div
  class="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 max-w-md w-full mx-auto"
>
  <h2 class="text-xl font-bold text-white mb-4">Lancez votre Entreprise</h2>

  {#if error}
    <div class="bg-red-900/50 text-red-200 p-3 rounded mb-4 text-sm">
      {error}
    </div>
  {/if}

  <div class="space-y-4">
    <div>
      <label
        for="companyName"
        class="block text-sm font-medium text-slate-400 mb-1"
        >Nom de l'entreprise</label
      >
      <input
        id="companyName"
        type="text"
        bind:value={name}
        placeholder="ex : Acme Corp"
        class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-600"
        disabled={loading}
      />
    </div>

    <button
      onclick={createCompany}
      disabled={loading || !name}
      class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-all flex justify-center items-center"
    >
      {#if loading}
        <span
          class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"
        ></span>
        Traitement...
      {:else}
        Immatriculer la société
      {/if}
    </button>
  </div>
</div>
