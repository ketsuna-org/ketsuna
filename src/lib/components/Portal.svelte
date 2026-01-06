<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Snippet } from "svelte";

  /**
   * A Portal component that renders its children directly into document.body.
   * This escapes any parent stacking contexts (z-index, overflow, etc.)
   */
  interface Props {
    children?: Snippet;
  }
  let { children }: Props = $props();

  let portalTarget = $state<HTMLElement | null>(null);

  onMount(() => {
    portalTarget = document.createElement("div");
    portalTarget.className = "portal-root";
    document.body.appendChild(portalTarget);
  });

  onDestroy(() => {
    if (portalTarget && portalTarget.parentNode) {
      portalTarget.parentNode.removeChild(portalTarget);
    }
  });
</script>

{#if portalTarget}
  <svelte:element this={'div'} bind:this={portalTarget}>
    {@render children?.()}
  </svelte:element>
{/if}
