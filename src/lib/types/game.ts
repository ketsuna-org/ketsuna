// ============================================================================
// Static Game Data Types
// These types represent data that is now hardcoded in the server's gamedata package
// and provided to the frontend as static reference data.
// ============================================================================

export interface Item {
  id: string; // Static ID (e.g., 'iron_ore')
  name: string;
  type: "Ressource Brute" | "Composant" | "Produit Fini" | "Machine" | "Stockage";
  base_price: number;
  volatility: number;
  product?: string;
  product_quantity?: number;
  use_recipe?: string;
  production_time?: number;
  max_employee?: number;
  can_store?: string[];
  produce_energy?: number;
  can_consume?: string[];
  can_store_energy?: number;
  need_energy?: number;
  energy_type?: "Soleil" | "Electricité" | "Fosille" | "Manuel";
  circulating_supply?: number;
  market_demand?: number;
  minable: boolean;
  is_explorable: boolean;
  icon?: string;
}

export interface Recipe {
  id: string;
  name: string;
  output_item: string;
  production_time: number;
  required_tech?: string;
  inputs_items: string[];
  input_quantity: number;
  ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
  item: string;
  quantity: number;
}

export interface Technology {
  id: string;
  name: string;
  description: string;
  cost: number;
  required_level: number;
  item_unlocked: string[];
}
