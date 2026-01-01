export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  is_premium: boolean;
  owned_companies: string[];
  active_company: string;
}

export interface Company {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  ceo: string; // Relation to User
  name: string;
  balance: number;
  level: number;
  is_npc: boolean;
  employee_count: number;
  machine_count?: number;
  expand?: {
    ceo?: User;
  };
}

export interface Employee {
  id: string;
  employer: string; // Relation to Company
  name: string;
  rarity: number; // 0: common, 1: rare, 2: epic, 3: legendary
  salary: number;
  efficiency: number;
  poste: string;
}

export interface Item {
  id: string;
  name: string;
  type: "Ressource Brute" | "Composant" | "Produit Fini" | "Machine" | "Stockage";
  base_price: number;
  volatility: number;
  product?: string; // Relation to item (for machines)
  product_quantity?: number; // Quantity produced per time unit
  use_recipe?: string; // Relation to recipe
  production_time?: number; // Time in seconds for passive production
  produce_energy?: number;
  can_store_energy?: number;
  need_energy?: number;
  max_employee?: number;
  can_consume?: string; // Relation to item (fuel)
  energy_type?: "Soleil" | "Fosille" | "Nucleaire" | string; // Energy source type
  required_tech?: string; // Relation to technology (optional)
  minable?: boolean;
  expand?: {
    product?: Item;
    use_recipe?: Recipe;
    can_consume?: Item;
    required_tech?: Technology;
  };
}

export interface InventoryItem {
  id: string;
  company: string;
  item: string;
  expand?: {
    item?: Item;
  };
  quantity: number;
}

export interface Technology {
  id: string;
  name: string;
  description: string;
  cost: number;
  required_level: number;
  item_unlocked: string[]; // Relation to items
  expand?: {
    item_unlocked?: Item[];
  };
}

export interface CompanyTech {
  id: string;
  company: string;
  technology: string;
  expand?: {
    technology?: Technology;
  };
}

export interface RecipeInput {
  item_id: string;
  quantity: number;
}

export interface RecipeIngredient {
  id: string;
  item: string;
  quantity: number;
  expand?: {
    item: Item;
  };
}

export interface Recipe {
  id: string;
  name: string;
  output_item: string; // Relation to Item
  inputs_items: string[]; // Relation to Items
  ingredients?: string[]; // Relation to RecipeIngredients
  input_quantity: number;
  production_time: number; // in seconds
  required_tech?: string; // Relation to Technology (optional)
  expand?: {
    output_item?: Item;
    inputs_items?: Item[];
    required_tech?: Technology;
    ingredients?: RecipeIngredient[];
  };
}

export interface Machine {
  id: string;
  company: string;
  machine: string; // Relation to Item (type: Machine)
  employees: string[]; // Relation to Employees
  production_started_at?: string; // ISO date string
  expand?: {
    machine?: Item;
    employees?: Employee[];
  };
}
