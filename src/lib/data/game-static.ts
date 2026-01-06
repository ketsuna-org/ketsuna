import type { Item, Recipe, Technology } from "$lib/types/game";
export type { Item, Recipe, Technology };

// =============================================================================
// STATIC ITEM DATABASE
// =============================================================================

export const ITEMS: Record<string, Item> = {
  // Ressources Brutes
  "wood": { id: "wood", name: "Bois", type: "Ressource Brute", base_price: 2, volatility: 0, minable: true, is_explorable: false, icon: "🪵" },
  "stone": { id: "stone", name: "Pierre", type: "Ressource Brute", base_price: 3, volatility: 0, minable: true, is_explorable: false, icon: "🪨" },
  "silica": { id: "silica", name: "Silice (Sable)", type: "Ressource Brute", base_price: 6.63, volatility: 0.1, minable: true, is_explorable: false, icon: "🏜️" },
  "iron_ore": { id: "iron_ore", name: "Minerai de Fer", type: "Ressource Brute", base_price: 13.45, volatility: 0.15, minable: false, is_explorable: true, icon: "🔩" },
  "copper_ore": { id: "copper_ore", name: "Minerai de Cuivre", type: "Ressource Brute", base_price: 21.19, volatility: 0.2, minable: false, is_explorable: true, icon: "🟠" },
  "coal": { id: "coal", name: "Charbon", type: "Ressource Brute", base_price: 8.27, volatility: 0.25, minable: false, is_explorable: true, icon: "🪨" },
  "gold_ore": { id: "gold_ore", name: "Or Brut", type: "Ressource Brute", base_price: 72.86, volatility: 0.4, minable: false, is_explorable: true, icon: "💎" },
  "crude_oil": { id: "crude_oil", name: "Pétrole Brut", type: "Ressource Brute", base_price: 56.82, volatility: 0.55, minable: false, is_explorable: true, icon: "🛢️" },
  "lithium": { id: "lithium", name: "Lithium", type: "Ressource Brute", base_price: 16.94, volatility: 0.6, minable: false, is_explorable: false, icon: "🔋" },

  // Composants
  "wooden_plank": { id: "wooden_plank", name: "Planche de bois", type: "Composant", base_price: 15.45, volatility: 0.1, minable: false, is_explorable: false, icon: "🪵" },
  "iron_ingot": { id: "iron_ingot", name: "Lingot de Fer", type: "Composant", base_price: 41.12, volatility: 0.15, minable: false, is_explorable: false, icon: "🔩" },
  "copper_ingot": { id: "copper_ingot", name: "Lingot de Cuivre", type: "Composant", base_price: 55.83, volatility: 0.18, minable: false, is_explorable: false, icon: "🟠" },
  "steel": { id: "steel", name: "Acier", type: "Composant", base_price: 98.21, volatility: 0.12, minable: false, is_explorable: false, icon: "⬛" },
  "glass": { id: "glass", name: "Verre", type: "Composant", base_price: 42.42, volatility: 0.15, minable: false, is_explorable: false, icon: "🪟" },
  "plastic": { id: "plastic", name: "Plastique", type: "Composant", base_price: 64.99, volatility: 0.3, minable: false, is_explorable: false, icon: "🧱" },
  "electric_cable": { id: "electric_cable", name: "Câble Électrique", type: "Composant", base_price: 81.14, volatility: 0.18, minable: false, is_explorable: false, icon: "🔌" },
  "gear": { id: "gear", name: "Engrenage", type: "Composant", base_price: 61.49, volatility: 0.1, minable: false, is_explorable: false, icon: "⚙️" },
  "simple_circuit": { id: "simple_circuit", name: "Circuit Simple", type: "Composant", base_price: 268.83, volatility: 0.35, minable: false, is_explorable: false, icon: "🔲" },
  "processor": { id: "processor", name: "Processeur", type: "Composant", base_price: 1560.83, volatility: 0.5, minable: false, is_explorable: false, icon: "💻" },
  "battery_cell": { id: "battery_cell", name: "Cellule de Batterie", type: "Composant", base_price: 985.43, volatility: 0.45, minable: false, is_explorable: false, icon: "🔋" },

  // Produits Finis
  "electric_motor": { id: "electric_motor", name: "Moteur Électrique", type: "Produit Fini", base_price: 2500, volatility: 0.25, minable: false, is_explorable: false, icon: "⚡" },
  "smartphone": { id: "smartphone", name: "Smartphone", type: "Produit Fini", base_price: 8500, volatility: 0.45, minable: false, is_explorable: false, icon: "📱" },
  "computer": { id: "computer", name: "Ordinateur", type: "Produit Fini", base_price: 12000, volatility: 0.4, minable: false, is_explorable: false, icon: "🖥️" },

  // Machines
  "forestry_machine": { id: "forestry_machine", name: "Exploitation Forestière", type: "Machine", base_price: 1042, volatility: 0, minable: false, is_explorable: false, product: "wood", product_quantity: 2, production_time: 120, max_employee: 2, energy_type: "Manuel", icon: "🌲" },
  "basic_mining_machine": { id: "basic_mining_machine", name: "Extraction Minière de base", type: "Machine", base_price: 2876, volatility: 0, minable: false, is_explorable: false, product: "iron_ore", product_quantity: 3, production_time: 50, max_employee: 2, energy_type: "Manuel", icon: "⛏️" },
  "sawmill": { id: "sawmill", name: "Scierie", type: "Machine", base_price: 1500, volatility: 0, minable: false, is_explorable: false, use_recipe: "wooden_plank_recipe", production_time: 20, max_employee: 2, energy_type: "Manuel", icon: "🪚" },
  "solar_panel": { id: "solar_panel", name: "Panneau Solaire", type: "Machine", base_price: 2500, volatility: 0, minable: false, is_explorable: false, produce_energy: 10, energy_type: "Soleil", icon: "☀️" },
  "iron_foundry": { id: "iron_foundry", name: "Fonderie Simple", type: "Machine", base_price: 4108, volatility: 0, minable: false, is_explorable: false, use_recipe: "iron_ingot_recipe", production_time: 5, max_employee: 2, need_energy: 5, energy_type: "Electricité", icon: "🔥" },
  "copper_foundry": { id: "copper_foundry", name: "Fonderie Cuivre", type: "Machine", base_price: 4735, volatility: 0, minable: false, is_explorable: false, use_recipe: "copper_ingot_recipe", production_time: 5, max_employee: 2, need_energy: 5, energy_type: "Electricité", icon: "🔥" },
  "iron_extractor": { id: "iron_extractor", name: "Extraction Minière de Fer", type: "Machine", base_price: 18234, volatility: 0, minable: false, is_explorable: false, product: "iron_ore", product_quantity: 5, production_time: 50, max_employee: 3, need_energy: 8, energy_type: "Electricité", icon: "⬛" },
  "copper_extractor": { id: "copper_extractor", name: "Extraction Minière de Cuivre", type: "Machine", base_price: 20527, volatility: 0, minable: false, is_explorable: false, product: "copper_ore", product_quantity: 3, production_time: 60, max_employee: 3, need_energy: 8, energy_type: "Electricité", icon: "🔶" },
  "thermal_plant": { id: "thermal_plant", name: "Central Thermique", type: "Machine", base_price: 17928, volatility: 0, minable: false, is_explorable: false, produce_energy: 100, can_consume: ["coal"], energy_type: "Fosille", max_employee: 4, icon: "🔥" },
  "glass_furnace": { id: "glass_furnace", name: "Four à Verre", type: "Machine", base_price: 8500, volatility: 0, minable: false, is_explorable: false, use_recipe: "glass_recipe", production_time: 60, max_employee: 2, need_energy: 15, energy_type: "Electricité", icon: "🔥" },
  "steel_press": { id: "steel_press", name: "Presse à Acier", type: "Machine", base_price: 15000, volatility: 0, minable: false, is_explorable: false, use_recipe: "steel_recipe", production_time: 120, max_employee: 3, need_energy: 25, energy_type: "Electricité", icon: "⚙️" },
  "oil_refinery": { id: "oil_refinery", name: "Raffinerie", type: "Machine", base_price: 45000, volatility: 0, minable: false, is_explorable: false, use_recipe: "plastic_recipe", production_time: 120, max_employee: 5, need_energy: 50, energy_type: "Electricité", icon: "🏭" },
  "petrol_pumpjack": { id: "petrol_pumpjack", name: "Pompe à Pétrole", type: "Machine", base_price: 45000, volatility: 0, minable: false, is_explorable: false, product: "crude_oil", product_quantity: 1, production_time: 120, max_employee: 5, need_energy: 50, energy_type: "Electricité", icon: "🛢️" },
  "assembly_line": { id: "assembly_line", name: "Ligne d'Assemblage", type: "Machine", base_price: 85000, volatility: 0, minable: false, is_explorable: false, use_recipe: "electric_motor_recipe", production_time: 360, max_employee: 8, need_energy: 100, energy_type: "Electricité", icon: "🏭" },
  "hightech_factory": { id: "hightech_factory", name: "Usine High-Tech", type: "Machine", base_price: 250000, volatility: 0, minable: false, is_explorable: false, use_recipe: "smartphone_recipe", production_time: 600, max_employee: 12, need_energy: 200, energy_type: "Electricité", icon: "🏢" },
};

// =============================================================================
// STATIC RECIPE DATABASE
// =============================================================================

export const RECIPES: Record<string, Recipe> = {
  "wooden_plank_recipe": {
    id: "wooden_plank_recipe", name: "Sciage du Bois", output_item: "wooden_plank", production_time: 20,
    required_tech: "basic_automation", inputs_items: ["wood"], input_quantity: 1
  },
  "iron_ingot_recipe": {
    id: "iron_ingot_recipe", name: "Fonte du Fer", output_item: "iron_ingot", production_time: 30,
    required_tech: "basic_metallurgy", inputs_items: ["iron_ore"], input_quantity: 2
  },
  "copper_ingot_recipe": {
    id: "copper_ingot_recipe", name: "Fonte du Cuivre", output_item: "copper_ingot", production_time: 30,
    required_tech: "basic_metallurgy", inputs_items: ["copper_ore"], input_quantity: 2
  },
  "glass_recipe": {
    id: "glass_recipe", name: "Fabrication du Verre", output_item: "glass", production_time: 60,
    required_tech: "glass_production", inputs_items: ["silica"], input_quantity: 10
  },
  "steel_recipe": {
    id: "steel_recipe", name: "Fabrication d'Acier", output_item: "steel", production_time: 120,
    required_tech: "steel_production", inputs_items: ["iron_ingot"], input_quantity: 3
  },
  "plastic_recipe": {
    id: "plastic_recipe", name: "Rafinage du Pétrole", output_item: "plastic", production_time: 120,
    required_tech: "plastic_era", inputs_items: ["crude_oil"], input_quantity: 1
  },
  "gear_recipe": {
    id: "gear_recipe", name: "Fabrication d'Engrenage", output_item: "gear", production_time: 45,
    required_tech: "steel_production", inputs_items: ["steel"], input_quantity: 1
  },
  "electric_cable_recipe": {
    id: "electric_cable_recipe", name: "Câblage Électrique", output_item: "electric_cable", production_time: 30,
    required_tech: "plastic_era", inputs_items: ["copper_ingot", "plastic"], input_quantity: 2
  },
  "simple_circuit_recipe": {
    id: "simple_circuit_recipe", name: "Circuit Simple", output_item: "simple_circuit", production_time: 90,
    required_tech: "electronics", inputs_items: ["copper_ingot", "plastic"], input_quantity: 2
  },
  "battery_cell_recipe": {
    id: "battery_cell_recipe", name: "Cellule de Batterie", output_item: "battery_cell", production_time: 120,
    required_tech: "assembly_line_tech", inputs_items: ["lithium", "plastic"], input_quantity: 5
  },
  "processor_recipe": {
    id: "processor_recipe", name: "Fabrication de Processeur", output_item: "processor", production_time: 180,
    required_tech: "electronics", inputs_items: ["simple_circuit", "gold_ore", "lithium"], input_quantity: 2
  },
  "electric_motor_recipe": {
    id: "electric_motor_recipe", name: "Moteur Électrique", output_item: "electric_motor", production_time: 360,
    required_tech: "assembly_line_tech", inputs_items: ["copper_ingot", "iron_ingot", "steel", "plastic"], input_quantity: 10
  },
  "smartphone_recipe": {
    id: "smartphone_recipe", name: "Assemblage Smartphone", output_item: "smartphone", production_time: 600,
    required_tech: "hightech_manufacturing", inputs_items: ["glass", "lithium", "gold_ore", "copper_ingot", "plastic"], input_quantity: 5
  },
  "computer_recipe": {
    id: "computer_recipe", name: "Assemblage Ordinateur", output_item: "computer", production_time: 900,
    required_tech: "hightech_manufacturing", inputs_items: ["processor", "simple_circuit", "plastic", "steel"], input_quantity: 2
  }
};

// =============================================================================
// STATIC TECHNOLOGY DATABASE
// =============================================================================

export const TECHNOLOGIES: Record<string, Technology> = {
  "basic_automation": {
    id: "basic_automation", name: "Un début d'automatisation", description: "Débloquer les premières machines pour automatiser la production.",
    cost: 1000, required_level: 1, item_unlocked: ["forestry_machine", "basic_mining_machine", "sawmill", "wooden_plank"]
  },
  "solar_power": {
    id: "solar_power", name: "Énergie Solaire", description: "Exploiter l'énergie du soleil pour alimenter vos machines.",
    cost: 2500, required_level: 1, item_unlocked: ["solar_panel"]
  },
  "basic_metallurgy": {
    id: "basic_metallurgy", name: "Métallurgie Fondamentale", description: "Transformer les minerais en lingots utilisables.",
    cost: 20000, required_level: 2, item_unlocked: ["iron_foundry", "copper_foundry", "iron_ingot", "copper_ingot", "iron_extractor", "copper_extractor"]
  },
  "advanced_mining": {
    id: "advanced_mining", name: "Extraction Avancée", description: "Techniques d'extraction pour des minerais plus profonds.",
    cost: 35000, required_level: 3, item_unlocked: ["iron_ore", "copper_ore", "coal"]
  },
  "thermal_power": {
    id: "thermal_power", name: "L'Éveil de la Dynamo", description: "Produire de l'électricité à partir du charbon.",
    cost: 100000, required_level: 6, item_unlocked: ["thermal_plant"]
  },
  "glass_production": {
    id: "glass_production", name: "Verrerie Industrielle", description: "Transformer la silice en verre.",
    cost: 75000, required_level: 5, item_unlocked: ["glass_furnace", "glass"]
  },
  "steel_production": {
    id: "steel_production", name: "Forge d'Acier", description: "Produire de l'acier à partir de lingots de fer.",
    cost: 150000, required_level: 7, item_unlocked: ["steel_press", "steel", "gear"]
  },
  "plastic_era": {
    id: "plastic_era", name: "Ère du Plastique", description: "Raffiner le pétrole en plastique, matériau révolutionnaire.",
    cost: 1000000, required_level: 10, item_unlocked: ["oil_refinery", "plastic", "crude_oil", "electric_cable"]
  },
  "assembly_line_tech": {
    id: "assembly_line_tech", name: "Ligne d'asse mble de premier Niveau.", description: "Assembler des composants complexes en produits finis.",
    cost: 10000000, required_level: 15, item_unlocked: ["assembly_line", "electric_motor", "lithium", "battery_cell"]
  },
  "electronics": {
    id: "electronics", name: "Électronique Avancée", description: "Fabriquer des circuits et processeurs.",
    cost: 8000000, required_level: 18, item_unlocked: ["simple_circuit", "processor"]
  },
  "hightech_manufacturing": {
    id: "hightech_manufacturing", name: "Manufacture High-Tech", description: "Produire des appareils électroniques avancés.",
    cost: 15000000, required_level: 20, item_unlocked: ["hightech_factory", "smartphone", "computer"]
  }
};

// =============================================================================
// LOOKUP HELPERS
// =============================================================================

export function getItem(id: string): Item | undefined {
  return ITEMS[id];
}

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES[id];
}

export function getTechnology(id: string): Technology | undefined {
  return TECHNOLOGIES[id];
}

export function getAllItems(): Item[] {
  return Object.values(ITEMS);
}

export function getAllRecipes(): Recipe[] {
  return Object.values(RECIPES);
}

export function getAllTechnologies(): Technology[] {
  return Object.values(TECHNOLOGIES);
}
