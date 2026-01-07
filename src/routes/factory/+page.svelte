<script lang="ts">
  import { SvelteFlowProvider } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import { activeCompany } from "$lib/stores";
  import FactoryInner from "./FactoryInner.svelte";
  import NotificationBell from "$lib/components/NotificationBell.svelte";
  import GlobalChat from "$lib/components/GlobalChat.svelte";

  // Company reactive
  let company = $derived($activeCompany);
</script>

<svelte:head>
  <title>Factory | Ketsuna</title>
</svelte:head>

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

<style>
  .factory-container {
    display: flex;
    height: 100vh;
    background: #0f172a;
    color: #e2e8f0;
    overflow: hidden;
  }
</style>
