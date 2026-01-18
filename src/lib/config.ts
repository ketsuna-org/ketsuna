/**
 * Feature Flags Configuration
 * 
 * Toggle experimental features here for A/B testing and gradual rollout.
 */

/**
 * Use svelte-konva canvas rendering instead of Svelte Flow
 * 
 * Benefits:
 * - Native HTML5 Canvas for better performance with large node counts
 * - Smoother zoom/pan at scale
 * - Lower memory footprint
 * 
 * Set to `true` to enable the Konva-based factory visualization.
 */
export const USE_KONVA_CANVAS = true;
