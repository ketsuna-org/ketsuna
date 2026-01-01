import Pocketbase, { LocalAuthStore, RecordService } from "pocketbase";

// ============================================================================
// Base Record Type (common fields for all collections)
// ============================================================================
export interface BaseRecord {
  id: string;
  created: string;
  updated: string;
}

// ============================================================================
// Collection Types - Generated from pb_schema.json
// ============================================================================

// users (auth collection)
export interface User extends BaseRecord {
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  username: string;
  avatar: string;
  is_premium: boolean;
  owned_companies: string[];
  active_company: string;
  // Expanded relations
  expand?: {
    owned_companies?: Company[];
    active_company?: Company;
  };
}

// companies
export interface Company extends BaseRecord {
  collectionId?: string;
  collectionName?: string;
  ceo: string;
  name: string;
  balance: number;
  level: number;
  is_npc: boolean;
  is_producing: string; // date
  item_harvesting: string;
  employee_count?: number; // computed field (not in schema, populated by queries)
  machine_count?: number; // computed field (not in schema, populated by queries)
  expand?: {
    ceo?: User;
    item_harvesting?: Item;
  };
}

// company_techs
export interface CompanyTech extends BaseRecord {
  company: string;
  technology: string;
  expand?: {
    company?: Company;
    technology?: Technology;
  };
}

// deposits
export interface Deposit extends BaseRecord {
  company: string;
  ressource: string;
  quantity: number;
  richness: number;
  expand?: {
    company?: Company;
    ressource?: Item;
  };
}

// employees
export interface Employee extends BaseRecord {
  employer: string;
  name: string;
  rarity: number;
  salary: number;
  efficiency: number;
  poste: string;
  expand?: {
    employer?: Company;
  };
}

// explorations
export interface Exploration extends BaseRecord {
  company: string;
  target_resource: string;
  status: "En cours" | "Echec" | "Succès";
  end_time: string;
  expand?: {
    company?: Company;
    target_resource?: Item;
  };
}

// game_events
export interface GameEvent extends BaseRecord {
  name: string;
  type: "market_crash" | "boom";
  modifiers_json: Record<string, unknown>;
  start_time: string;
  end_time: string;
}

// inventory
export interface InventoryItem extends BaseRecord {
  company: string;
  item: string;
  quantity: number;
  expand?: {
    company?: Company;
    item?: Item;
  };
}

// items
export interface Item extends BaseRecord {
  name: string;
  type: "Ressource Brute" | "Composant" | "Produit Fini" | "Machine" | "Stockage";
  base_price: number;
  volatility: number;
  product: string;
  product_quantity: number;
  use_recipe: string;
  production_time: number;
  max_employee: number;
  can_store: string[];
  produce_energy: number;
  can_consume: string[];
  can_store_energy: number;
  need_energy: number;
  energy_type: "Soleil" | "Electricité" | "Fosille" | "Manuel";
  circulating_supply: number;
  market_demand: number;
  minable: boolean;
  is_explorable: boolean;
  expand?: {
    product?: Item;
    use_recipe?: Recipe;
    can_store?: Item[];
    can_consume?: Item[];
  };
}

// machines (assigned machines in workshop)
export interface Machine extends BaseRecord {
  machine: string;
  employees: string[];
  company: string;
  production_started_at: string;
  stored_energy: number;
  deposit: string;
  expand?: {
    machine?: Item;
    employees?: Employee[];
    company?: Company;
    deposit?: Deposit;
  };
}

// messages
export interface Message extends BaseRecord {
  user: string;
  message: string;
  expand?: {
    user?: User;
  };
}

// recipes
export interface Recipe extends BaseRecord {
  name: string;
  output_item: string;
  production_time: number;
  required_tech: string;
  inputs_items: string[];
  input_quantity: number;
  ingredients: string[];
  expand?: {
    output_item?: Item;
    required_tech?: Technology;
    inputs_items?: Item[];
    ingredients?: RecipeIngredient[];
  };
}

// recipes_ingredients
export interface RecipeIngredient extends BaseRecord {
  item: string;
  quantity: number;
  expand?: {
    item?: Item;
  };
}

// reserve
export interface Reserve extends BaseRecord {
  company: string;
  item: string;
  quantity: number;
  expand?: {
    company?: Company;
    item?: Item;
  };
}

// shareholders
export interface Shareholder extends BaseRecord {
  holder_company: string;
  stock: string;
  quantity: number;
  expand?: {
    holder_company?: Company;
    stock?: Stock;
  };
}

// stocks
export interface Stock extends BaseRecord {
  company: string;
  symbol: string;
  share_price: number;
  total_shares: number;
  shares_owned_by_public: number;
  volatility: number;
  price_history_json: unknown;
  expand?: {
    company?: Company;
  };
}

// technologies
export interface Technology extends BaseRecord {
  name: string;
  description: string;
  cost: number;
  required_level: number;
  item_unlocked: string[];
  expand?: {
    item_unlocked?: Item[];
  };
}

// ============================================================================
// TypedPocketBase - Provides typed collection() methods
// ============================================================================
export interface TypedPocketBase extends Pocketbase {
  collection(idOrName: string): RecordService; // default fallback
  collection(idOrName: "users"): RecordService<User>;
  collection(idOrName: "companies"): RecordService<Company>;
  collection(idOrName: "company_techs"): RecordService<CompanyTech>;
  collection(idOrName: "deposits"): RecordService<Deposit>;
  collection(idOrName: "employees"): RecordService<Employee>;
  collection(idOrName: "explorations"): RecordService<Exploration>;
  collection(idOrName: "game_events"): RecordService<GameEvent>;
  collection(idOrName: "inventory"): RecordService<InventoryItem>;
  collection(idOrName: "items"): RecordService<Item>;
  collection(idOrName: "machines"): RecordService<Machine>;
  collection(idOrName: "messages"): RecordService<Message>;
  collection(idOrName: "recipes"): RecordService<Recipe>;
  collection(idOrName: "recipes_ingredients"): RecordService<RecipeIngredient>;
  collection(idOrName: "reserve"): RecordService<Reserve>;
  collection(idOrName: "shareholders"): RecordService<Shareholder>;
  collection(idOrName: "stocks"): RecordService<Stock>;
  collection(idOrName: "technologies"): RecordService<Technology>;
}

// ============================================================================
// Initialize PocketBase Client
// ============================================================================
const authStore = new LocalAuthStore("ketsuna:auth");

const pb = new Pocketbase("https://api.ketsuna.com", authStore) as TypedPocketBase;

// Désactiver l'auto-annulation globale pour éviter les erreurs "autocancelled"
// lors des chargements rapides ou concurrents de données.
pb.autoCancellation(false);

export default pb;