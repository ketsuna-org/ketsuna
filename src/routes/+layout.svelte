<script lang="ts">
  import "./layout.css";
  import favicon from "$lib/assets/favicon.svg";
  import { onMount } from "svelte";
  import { initFirebase } from "$lib/firebase";
  import pb from "$lib/pocketbase";
  import { currentUser, activeCompany } from "$lib/stores";
  import type { Company } from "$lib/types";
  import { goto } from "$app/navigation";
  import NotificationCenter from "$lib/components/NotificationCenter.svelte";

  let { children } = $props();

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
{@render children()}
<NotificationCenter />
