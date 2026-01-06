import Pocketbase, { LocalAuthStore } from "pocketbase";
import type { RecordService } from "pocketbase";
import type { Item, Recipe, Technology } from "$lib/types/game";
export type { Item, Recipe, Technology };

// ============================================================================
// Base Record Type (common fields for all collections)
// ============================================================================
export interface BaseRecord {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
}

// ============================================================================
// Collection Types - Synchronized with pb_schema.json
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
  ceo: string;
  name: string;
  location?: { lat: number; lon: number };
  balance: number;
  level: number;
  is_npc: boolean;
  machine_count?: number; // Optional derived field
  employee_count?: number; // Optional derived field
  // Expanded relations
  expand?: {
    ceo?: User;
  };
}

// company_techs
export interface CompanyTech extends BaseRecord {
  company: string;
  technology_id: string; // Static ID
  expand?: {
    company?: Company;
  };
}

// deposits
export interface Deposit extends BaseRecord {
  company: string;
  ressource_id: string; // Static ID
  quantity: number;
  size: number;
  location?: { lat: number; lon: number };
  expand?: {
    company?: Company;
  };
}

// edge_relation (Connections for the factory canvas)
export interface EdgeRelation extends BaseRecord {
  input_id: string;
  input_type: "deposit" | "machine";
  output_id: string;
  output_type: "company";
  item: string; // Static ID
}

// employees
export interface Employee extends BaseRecord {
  employer: string;
  name: string;
  salary: number;
  deposit?: string;
  exploration?: string;
  exploration_luck: number; // 0-10
  mining: number; // 0-10
  energy: number; // 0-100
  maintenance: number; // 0-10
  efficiency: number; // 1-200
  rarity: 0 | 1 | 2 | 3; // 0=Common, 1=Rare, 2=Epic, 3=Legendary
  poste: "Manutentionnaire" | "Opérateur" | "Ouvrier" | "Mineur" | "Explorateur" | "PDG" | string;
  expand?: {
    employer?: Company;
    deposit?: Deposit;
    exploration?: Exploration;
  };
}


// explorations
export interface Exploration extends BaseRecord {
  company: string;
  target_resource_id: string; // Static ID
  status: "En cours" | "Echec" | "Succès";
  end_time: string;
  expand?: {
    company?: Company;
  };
}

// inventory
export interface InventoryItem extends BaseRecord {
  company: string;
  item_id: string; // Static ID
  quantity: number;
  linked_storage?: string; // Relation to machines (Stockage)
  expand?: {
    company?: Company;
    linked_storage?: Machine;
  };
}

// machines
export interface Machine extends BaseRecord {
  machine_id: string; // Static ID
  employees: string[];
  company: string;
  production_started_at: string;
  stored_energy: number;
  deposit?: string;
  location?: { lat: number; lon: number };
  placed: boolean;
  expand?: {
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

// ============================================================================
// TypedPocketBase - Provides typed collection() methods
// ============================================================================
export interface TypedPocketBase extends Pocketbase {
  collection(idOrName: string): RecordService; 
  collection(idOrName: "users"): RecordService<User>;
  collection(idOrName: "companies"): RecordService<Company>;
  collection(idOrName: "company_techs"): RecordService<CompanyTech>;
  collection(idOrName: "deposits"): RecordService<Deposit>;
  collection(idOrName: "edge_relation"): RecordService<EdgeRelation>;
  collection(idOrName: "employees"): RecordService<Employee>;
  collection(idOrName: "explorations"): RecordService<Exploration>;
  collection(idOrName: "inventory"): RecordService<InventoryItem>;
  collection(idOrName: "machines"): RecordService<Machine>;
  collection(idOrName: "messages"): RecordService<Message>;
}

// Re-export static types for convenience
export type { Item, Recipe, Technology };

// ============================================================================
// Initialize PocketBase Client
// ============================================================================
const authStore = new LocalAuthStore("ketsuna:auth");
const pb = new Pocketbase("http://127.0.0.1:8090", authStore) as TypedPocketBase;

// Global settings
pb.autoCancellation(false);

export default pb;