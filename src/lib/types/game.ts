// ============================================================================
// Static Game Data Types
// These types represent data that is now hardcoded in the server's gamedata package
// and provided to the frontend as static reference data.
// ============================================================================

export interface MachineMetadata {
  available_recipes?: string[];
  default_product?: string;
  product_quantity?: number;
  production_time?: number;
  max_employee?: number;
  max_maintenance?: number;
  need_energy?: number;
  energy_type?: "Soleil" | "Electricité" | "Fossile" | "Manuel";
  durability_per_cycle?: number;
  produce_energy?: number;
  can_consume?: string[];
  storage_capacity?: number;
  supported_storage_types?: ("kg" | "l" | "u")[];
  can_store_items?: string[];
}

export interface Item {
  id: string; // Static ID (e.g., 'iron_ore')
  name: string;
  type: "Ressource Brute" | "Composant" | "Produit Fini" | "Machine" | "Stockage";
  base_price: number;
  volatility: number;
  unit: "kg" | "l" | "u";
  minable: boolean;
  is_explorable: boolean;
  icon?: string;
  // Metadata for machines (replaces flat fields)
  metadata?: MachineMetadata;
  // Deprecated flat fields (kept for compatibility if needed, but prefer metadata)
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
  energy_type?: "Soleil" | "Electricité" | "Fossile" | "Manuel";
  circulating_supply?: number;
  market_demand?: number;
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
  inputs?: RecipeIngredient[];
  icon?: string;
  manual_craftable?: boolean;
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
