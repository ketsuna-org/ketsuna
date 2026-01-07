<script lang="ts">
  import { SvelteFlowProvider } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import { activeCompany, refreshActiveCompany } from "$lib/stores";
  import FactoryInner from "./FactoryInner.svelte";
  import NotificationBell from "$lib/components/NotificationBell.svelte";
  import GlobalChat from "$lib/components/GlobalChat.svelte";
  import CreateCompanyForm from "$lib/components/CreateCompanyForm.svelte";

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
  <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="text-center mb-8">
        <span class="text-6xl block mb-4">🏭</span>
        <h1 class="text-3xl font-black text-white mb-2">
          Bienvenue sur <span
            class="bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"
            >Ketsuna</span
          >
        </h1>
        <p class="text-slate-400">
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
      <div class="absolute top-4 right-48 pointer-events-auto">
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
    background: #0f172a;
    color: #e2e8f0;
    overflow: hidden;
  }
</style>
