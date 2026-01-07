/**
 * Game Static Data - Backward Compatibility Layer
 * 
 * This module re-exports from the game-data-store for backward compatibility.
 * The actual data is now fetched from the backend API.
 * 
 * MIGRATION: 
 * - Components should gradually migrate to using the store directly
 * - Use `loadGameData()` in +layout.svelte to initialize data early
 */

// Re-export types from the store
export type { Item, Recipe, Technology } from '$lib/stores/game-data-store';

// Re-export lookup helpers (sync, cached)
export {
  getItem,
  getRecipe,
  getTechnology,
  getItemName,
  getRecipeName,
  getTechnologyName,
} from '$lib/stores/game-data-store';

// Re-export the loader function for app initialization
export { loadGameData } from '$lib/stores/game-data-store';

// Re-export stores for reactive usage
export {
  gameData,
  items,
  recipes,
  technologies,
  machines,
  minableResources,
  isLoaded,
  isLoading,
  loadError,
} from '$lib/stores/game-data-store';

// Legacy exports - return arrays from the cached store data
import { get } from 'svelte/store';
import { items as itemsStore, recipes as recipesStore, technologies as techStore, type Item, type Recipe, type Technology } from '$lib/stores/game-data-store';

export function getAllItems(): Item[] {
  return get(itemsStore);
}

export function getAllRecipes(): Recipe[] {
  return get(recipesStore);
}

export function getAllTechnologies(): Technology[] {
  return get(techStore);
}
