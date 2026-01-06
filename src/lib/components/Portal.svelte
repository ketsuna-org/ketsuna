<script lang="ts">
  import { onMount, onDestroy, type Snippet } from "svelte";

  /**
   * A Portal component that renders its children directly into document.body.
   * This escapes any parent stacking contexts (z-index, overflow, etc.)
   */
  interface Props {
    children?: Snippet;
  }
  let { children }: Props = $props();

  let container = $state<HTMLElement | null>(null);

  onMount(() => {
    if (container) {
      document.body.appendChild(container);
    }
  });

  onDestroy(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });
</script>

<div bind:this={container} class="portal-root">
  {@render children?.()}
</div>
