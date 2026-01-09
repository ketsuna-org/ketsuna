/**
 * Gamedata Store - Centralized access to static game data
 * Fetches data from /api/gamedata endpoint
 */

import { writable, get } from 'svelte/store';
import pb from '$lib/pocketbase';

// Types matching backend gamedata
export interface Item {
  id: string;
  name: string;
  type: string;
  base_price: number;
  volatility?: number;
  icon?: string;
  unit: string;
  minable: boolean;
  is_explorable: boolean;
  // Machine-specific fields
  product?: string;
  product_quantity?: number;
  ProductQuantity?: number;
  use_recipe?: string;
  production_time?: number;
  ProductionTime?: number;
  max_employee?: number;
  MaxEmployee?: number;
  produce_energy?: number;
  need_energy?: number;
  energy_type?: string;
  metadata?: any;
}

export interface Recipe {
  id: string;
  name: string;
  inputs_json?: string;
  output_item: string;
  output_quantity: number;
  production_time: number;
  required_tech?: string;
  machine_type?: string;
}

export interface Technology {
  id: string;
  name: string;
  description?: string;
  cost: number;
  level_required: number;
}

export interface GameData {
  items: Item[];
  recipes: Recipe[];
  technologies: Technology[];
}

interface GameDataStore {
  data: GameData | null;
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function createGameDataStore() {
  const { subscribe, set, update } = writable<GameDataStore>({
    data: null,
    loading: false,
    error: null,
    lastFetch: null,
  });

  let fetchPromise: Promise<void> | null = null;

  async function fetchGameData(force = false): Promise<void> {
    const state = get({ subscribe });

    // If already loading, wait for existing fetch
    if (fetchPromise && !force) {
      return fetchPromise;
    }

    // Check cache validity
    if (!force && state.data && state.lastFetch) {
      const cacheAge = Date.now() - state.lastFetch.getTime();
      if (cacheAge < CACHE_DURATION) {
        return; // Cache is still valid
      }
    }

    update((s) => ({ ...s, loading: true, error: null }));

    fetchPromise = (async () => {
      try {
        const response = await pb.send('/api/gamedata', {
          method: 'GET',
        });

        set({
          data: response as GameData,
          loading: false,
          error: null,
          lastFetch: new Date(),
        });
      } catch (err: any) {
        console.error('Failed to fetch gamedata:', err);
        update((s) => ({
          ...s,
          loading: false,
          error: err.message || 'Failed to fetch gamedata',
        }));
        throw err;
      } finally {
        fetchPromise = null;
      }
    })();

    return fetchPromise;
  }

  // Helper to get item by ID
  function getItem(id: string): Item | null {
    const state = get({ subscribe });
    if (!state.data) return null;
    return state.data.items.find((item) => item.id === id) || null;
  }

  // Helper to get recipe by ID
  function getRecipe(id: string): Recipe | null {
    const state = get({ subscribe });
    if (!state.data) return null;
    return state.data.recipes.find((recipe) => recipe.id === id) || null;
  }

  // Helper to get technology by ID
  function getTechnology(id: string): Technology | null {
    const state = get({ subscribe });
    if (!state.data) return null;
    return state.data.technologies.find((tech) => tech.id === id) || null;
  }

  return {
    subscribe,
    fetch: fetchGameData,
    getItem,
    getRecipe,
    getTechnology,
  };
}

export const gamedataStore = createGameDataStore();

// Export helper functions for direct usage (game-static compatibility)
export const getItem = gamedataStore.getItem;
export const getRecipe = gamedataStore.getRecipe;
export const getTechnology = gamedataStore.getTechnology;

export const getItemName = (id: string) => gamedataStore.getItem(id)?.name || id;
export const getRecipeName = (id: string) => gamedataStore.getRecipe(id)?.name || id;
export const getTechnologyName = (id: string) => gamedataStore.getTechnology(id)?.name || id;

// Auto-fetch on first import (lazy load)
if (typeof window !== 'undefined') {
  gamedataStore.fetch().catch((err) => {
    console.warn('Initial gamedata fetch failed:', err);
  });
}
