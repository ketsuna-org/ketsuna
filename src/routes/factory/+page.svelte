<script lang="ts">
  import { SvelteFlowProvider } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import { activeCompany, refreshActiveCompany } from "$lib/stores";
  import FactoryInner from "./FactoryInner.svelte";
  import NotificationBell from "$lib/components/NotificationBell.svelte";
  import GlobalChat from "$lib/components/GlobalChat.svelte";
  import CreateCompanyForm from "$lib/components/CreateCompanyForm.svelte";
  import UserMenu from "$lib/components/UserMenu.svelte";

  // Company reactive
  let company = $derived($activeCompany);

  async function handleCompanyCreated() {
    await refreshActiveCompany();
  }
</script>

<svelte:head>
  <title>Factory | Ketsuna</title>
</svelte:head>

{#if !company}
  <!-- No company: Show create company form -->
  <div
    class="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden"
  >
    <!-- Background Industrial touches -->
    <div
      class="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none"
    ></div>
    <div
      class="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"
    ></div>

    <div class="max-w-md w-full relative z-10">
      <div class="text-center mb-8">
        <span class="text-6xl block mb-4 drop-shadow-xl">🏭</span>
        <h1
          class="text-3xl font-black text-white mb-2 uppercase tracking-tight"
        >
          Bienvenue sur <span
            class="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"
            >Ketsuna</span
          >
        </h1>
        <p class="text-slate-400 font-medium">
          Pour commencer votre aventure industrielle, vous devez d'abord créer
          votre société.
        </p>
      </div>
      <CreateCompanyForm onCreated={handleCompanyCreated} />
    </div>
  </div>
{:else}
  <div class="factory-container">
    <SvelteFlowProvider>
      <FactoryInner {company} />
    </SvelteFlowProvider>

    <div class="ui-overlay pointer-events-none fixed inset-0 z-50">
      <div class="absolute top-4 right-4 pointer-events-auto">
        <UserMenu />
      </div>
      <div class="absolute top-4 right-20 pointer-events-auto">
        <NotificationBell />
      </div>
      <div
        class="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto"
      >
        <GlobalChat />
      </div>
    </div>
  </div>
{/if}

<style>
  .factory-container {
    display: flex;
    height: 100vh;
    background: #020617; /* Darker industrial background */
    color: #e2e8f0;
    overflow: hidden;
  }
</style>
