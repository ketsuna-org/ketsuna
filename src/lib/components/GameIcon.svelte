<script lang="ts">
  /**
   * GameIcon Component
   * Renders either an emoji (text) or an image icon from the backend
   * Icons starting with "/" are treated as image URLs, others as emoji text
   */
  import pb from "$lib/pocketbase";

  interface Props {
    icon: string;
    size?: number;
    alt?: string;
  }

  let { icon, size = 24, alt = "icon" }: Props = $props();

  // Check if it's an image path (starts with /)
  const isImage = $derived(icon?.startsWith("/"));

  // Build the full URL for images
  const imageUrl = $derived(
    isImage ? `${pb.baseURL || "http://localhost:8090"}${icon}` : ""
  );
</script>

{#if isImage}
  <img
    src={imageUrl}
    {alt}
    class="game-icon"
    style="width: {size}px; height: {size}px;"
  />
{:else}
  <span class="game-icon-emoji" style="font-size: {size}px;"
    >{icon || "❓"}</span
  >
{/if}

<style>
  .game-icon {
    object-fit: contain;
    display: inline-block;
  }

  .game-icon-emoji {
    display: inline-block;
    line-height: 1;
  }
</style>
