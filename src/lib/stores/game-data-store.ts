/**
 * Game Data Store
 * Fetches static game data from the backend API and caches it
 */
import { writable, derived, get } from 'svelte/store';
import pb from '$lib/pocketbase';

// Types matching the backend response
import type { Item, Recipe, Technology } from '$lib/types/game';
// Types are now imported from $lib/types/game to verify single source of truth
export type { Item, Recipe, Technology } from '$lib/types/game';

export interface RecipeIngredient {
  item_id: string;
  quantity: number;
}




interface GameData {
  items: Item[];
  recipes: Recipe[];
  technologies: Technology[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

// Internal state
const initialState: GameData = {
  items: [],
  recipes: [],
  technologies: [],
  loaded: false,
  loading: false,
  error: null,
};

// Main store
const gameDataStore = writable<GameData>(initialState);

// Indexed maps for fast lookups (built after load)
let itemsMap: Map<string, Item> = new Map();
let recipesMap: Map<string, Recipe> = new Map();
let technologiesMap: Map<string, Technology> = new Map();

/**
 * Load game data from the backend API
 * This is called once on app initialization
 */
export async function loadGameData(): Promise<boolean> {
  const current = get(gameDataStore);
  
  // Already loaded or loading
  if (current.loaded || current.loading) {
    return current.loaded;
  }

  gameDataStore.update(s => ({ ...s, loading: true, error: null }));

  try {
    // Get the base URL from PocketBase client
    const baseUrl = pb.baseURL || 'http://localhost:8090';
    // Add timestamp to prevent caching during development
    const response = await fetch(`${baseUrl}/api/gamedata?v=${Date.now()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch game data: ${response.status}`);
    }

    const data = await response.json();

    // Build lookup maps
    itemsMap = new Map(data.items.map((item: Item) => [item.id, item]));
    recipesMap = new Map(data.recipes.map((recipe: Recipe) => [recipe.id, recipe]));
    technologiesMap = new Map(data.technologies.map((tech: Technology) => [tech.id, tech]));

    gameDataStore.set({
      items: data.items,
      recipes: data.recipes,
      technologies: data.technologies,
      loaded: true,
      loading: false,
      error: null,
    });

    console.log('[GameData] Loaded from API:', {
      items: data.items.length,
      recipes: data.recipes.length,
      technologies: data.technologies.length,
    });

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GameData] Failed to load:', message);
    
    gameDataStore.update(s => ({
      ...s,
      loading: false,
      error: message,
    }));
    
    return false;
  }
}

// =============================================================================
// LOOKUP HELPERS (sync, use cached maps)
// =============================================================================

export function getItem(id: string): Item | undefined {
  return itemsMap.get(id);
}

export function getRecipe(id: string): Recipe | undefined {
  return recipesMap.get(id);
}

export function getTechnology(id: string): Technology | undefined {
  return technologiesMap.get(id);
}

export function getItemName(id: string): string {
  return itemsMap.get(id)?.name || 'Inconnu';
}

export function getRecipeName(id: string): string {
  return recipesMap.get(id)?.name || 'Inconnu';
}

export function getTechnologyName(id: string): string {
  return technologiesMap.get(id)?.name || 'Inconnu';
}

// =============================================================================
// DERIVED STORES
// =============================================================================

export const gameData = {
  subscribe: gameDataStore.subscribe,
};

export const items = derived(gameDataStore, $data => $data.items);
export const recipes = derived(gameDataStore, $data => $data.recipes);
export const technologies = derived(gameDataStore, $data => $data.technologies);
export const isLoaded = derived(gameDataStore, $data => $data.loaded);
export const isLoading = derived(gameDataStore, $data => $data.loading);
export const loadError = derived(gameDataStore, $data => $data.error);

// Items by type
export const itemsByType = derived(gameDataStore, $data => {
  const byType: Record<string, Item[]> = {};
  for (const item of $data.items) {
    if (!byType[item.type]) byType[item.type] = [];
    byType[item.type].push(item);
  }
  return byType;
});

// Machines only
export const machines = derived(gameDataStore, $data => 
  $data.items.filter(item => item.type === 'Machine')
);

// Minable resources
export const minableResources = derived(gameDataStore, $data =>
  $data.items.filter(item => item.minable)
);
