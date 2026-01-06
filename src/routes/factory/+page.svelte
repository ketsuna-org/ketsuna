<script lang="ts">
  import { SvelteFlowProvider } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import { activeCompany } from "$lib/stores";
  import FactoryInner from "./FactoryInner.svelte";

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
