export interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    is_premium: boolean;
    prestige_score: number;
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
    tech_points: number;
    reputation: number;
    payroll_daily_cost: number;
    is_npc: boolean;
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
    type: 'Ressource Brute' | 'Composant' | 'Produit Fini';
    base_price: number;
    volatility: number;
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
