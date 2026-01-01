/**
 * Svelte action to teleport an element to document.body.
 * This escapes any parent stacking contexts (backdrop-blur, transform, etc.)
 *
 * Usage: <div use:portal>...</div>
 */
export function portal(node: HTMLElement) {
  // Move node to body
  document.body.appendChild(node);

  return {
    destroy() {
      // Clean up when component is destroyed
      if (node.parentNode === document.body) {
        node.remove();
      }
    },
  };
}
