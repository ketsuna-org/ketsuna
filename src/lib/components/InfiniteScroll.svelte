<script lang="ts">
  /**
   * InfiniteScroll - Composant réutilisable pour le chargement infini
   *
   * Utilise IntersectionObserver pour détecter quand l'utilisateur
   * atteint le bas de la liste et déclenche le chargement de plus de données.
   *
   * @param onLoadMore - Callback appelé pour charger plus de données
   * @param loading - Si true, affiche un indicateur de chargement
   * @param hasMore - Si false, cache le sentinel et n'appelle plus onLoadMore
   * @param threshold - Distance en pixels avant le bas pour déclencher (défaut: 200)
   */
  import { onMount, onDestroy } from "svelte";

  let {
    onLoadMore,
    loading = false,
    hasMore = true,
    threshold = 200,
  } = $props<{
    onLoadMore: () => void | Promise<void>;
    loading?: boolean;
    hasMore?: boolean;
    threshold?: number;
  }>();

  let sentinel: HTMLDivElement | undefined = $state(undefined);
  let observer: IntersectionObserver | null = null;
  let isLoadingRef = false;

  function handleIntersection(entries: IntersectionObserverEntry[]) {
    const entry = entries[0];
    // Use current values, not closure values
    if (entry.isIntersecting && hasMore && !loading && !isLoadingRef) {
      isLoadingRef = true;
      // Small debounce to prevent multiple rapid calls
      setTimeout(() => {
        onLoadMore();
        // Reset after a delay to allow loading state to update
        setTimeout(() => {
          isLoadingRef = false;
        }, 100);
      }, 50);
    }
  }

  onMount(() => {
    if (!sentinel) return;

    observer = new IntersectionObserver(handleIntersection, {
      rootMargin: `${threshold}px`,
      threshold: 0,
    });

    observer.observe(sentinel);
  });

  onDestroy(() => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  });

  // Re-observe when sentinel changes (e.g., after conditional render)
  $effect(() => {
    if (sentinel && observer) {
      observer.disconnect();
      observer.observe(sentinel);
    }
  });
</script>

{#if hasMore}
  <div
    bind:this={sentinel}
    class="flex items-center justify-center py-8 w-full"
  >
    {#if loading}
      <div class="flex flex-col items-center gap-3">
        <div class="relative w-10 h-10">
          <div
            class="absolute top-0 left-0 w-full h-full border-4 border-slate-700 rounded-full"
          ></div>
          <div
            class="absolute top-0 left-0 w-full h-full border-4 border-indigo-500 rounded-full animate-spin border-t-transparent"
          ></div>
        </div>
        <span class="text-sm text-slate-400 font-medium">Chargement...</span>
      </div>
    {:else}
      <!-- Invisible sentinel - triggers load when visible -->
      <div class="h-1 w-full"></div>
    {/if}
  </div>
{:else}
  <div class="flex items-center justify-center py-6 w-full">
    <div
      class="flex items-center gap-2 text-slate-500 text-sm font-medium bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-800"
    >
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
      >
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>Fin de la liste</span>
    </div>
  </div>
{/if}
