<script lang="ts">
  import "./layout.css";
  import favicon from "$lib/assets/favicon.svg";
  import { onMount } from "svelte";
  import { initFirebase } from "$lib/firebase";
  import pb from "$lib/pocketbase";
  import { currentUser, activeCompany } from "$lib/stores";
  import type { Company } from "$lib/pocketbase";
  import { page } from "$app/stores";
  import NotificationCenter from "$lib/components/NotificationCenter.svelte";
  import Footer from "$lib/components/Footer.svelte";

  let { children } = $props();

  // Hide footer on full-screen pages like dashboard
  let hideFooter = $derived($page.url.pathname.startsWith("/dashboard"));

  onMount(async () => {
    // Initialise Firebase/Analytics
    initFirebase();

    // Sync auth state
    pb.authStore.onChange(async (token, model) => {
      currentUser.set(model);
      if (model && model.active_company) {
        try {
          const company = await pb
            .collection("companies")
            .getOne<Company>(model.active_company);
          activeCompany.set(company);
        } catch (e) {
          console.error("Failed to load active company", e);
        }
      } else {
        activeCompany.set(null);
      }
    }, true);
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="flex flex-col min-h-screen">
  <div class="flex-grow">
    {@render children()}
  </div>
  {#if !hideFooter}
    <Footer />
  {/if}
</div>

<NotificationCenter />
