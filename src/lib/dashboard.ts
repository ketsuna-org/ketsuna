import pb from "$lib/pocketbase";
import { getItem } from "./data/game-static";

// --- TYPES ---

// Réponse brute de l'API /api/company/finance
interface ApiFinanceResponse {
    success: boolean;
    companyId: string;
    hourly_net: number;
    daily_net: number;
    monthly_net: number;
    breakdown: {
        base_hourly_revenue: number;
        employees_hourly_revenue: number;
        hourly_costs?: number; // Parfois agrégé
        maintenance_hourly: number;
        payroll_hourly: number;
        premium_multiplier: number;
        machine_production_count: number;
        daily_payroll: number;
    };
    daily_view: {
        revenue_base: number;
        revenue_employees: number;
        cost_maintenance: number;
        cost_payroll: number;
        total_revenue: number;
        total_cost: number;
        profit: number;
    };
}

export interface DashboardData {
    company: {
        name: string;
        level: number;
        ceo: string;
        id: string;
    };
    financials: {
        cash: number;
        valuation: number;
        daily_payroll: number;
        stock_ticker: string;
        stock_price: number;
        monthly_net_profit: number;
        // On stocke directement la vue journalière de l'API
        daily_view: ApiFinanceResponse["daily_view"];
        // On garde le breakdown horaire pour compatibilité
        profit_breakdown: ApiFinanceResponse["breakdown"];
    };
    resources: {
        inventory_count: number;
        top_items: Array<{
            name: string;
            qty: number;
            value: number;
        }>;
    };
    staff: {
        total_employees: number;
        average_efficiency: number;
    };
}

// Types PocketBase (restent nécessaires pour les autres widgets: Staff, Inventory, Stocks)
interface PBUser {
    id: string;
    username: string;
    is_premium?: boolean;
    active_company: string;
    expand?: {
        active_company?: PBCompany;
    };
}

interface PBCompany {
    id: string;
    name: string;
    balance: number;
    level: number;
}

interface PBStock {
    id: string;
    company: string;
    ticker: string;
    current_price: number;
    total_shares: number;
}

interface PBEmployee {
    id: string;
    efficiency?: number;
}

interface PBInventoryItem {
    id: string;
    quantity: number;
    item_id: string;
}

// --- FONCTIONS ---

/**
 * Agrège les données via des requêtes parallèles :
 * 1. API Finance (Source de vérité pour l'argent)
 * 2. Collections PB (Pour les inventaires, le nombre d'employés, le stock market)
 */
export async function fetchDashboardData(userId: string): Promise<DashboardData> {
    try {
        // 1. Récupération User & Company ID
        const user = await pb.collection("users").getOne<PBUser>(userId, {
            expand: "active_company",
            requestKey: null,
        });

        if (!user.active_company || !user.expand?.active_company) {
            throw new Error("L'utilisateur n'a pas d'entreprise active");
        }

        const company = user.expand.active_company;
        const companyId = company.id;

        // 2. Requêtes Parallèles (API + Collections)
        // On ne fetch plus 'machines' ici car l'API finance nous donne déjà le 'machine_production_count'
        const [financeData, stockData, employeesData, inventoryData] = await Promise.all([
            
            // A. Appel à ton Endpoint Custom (Source de vérité financière)
            pb.send<ApiFinanceResponse>("/api/company/finance", {
                method: "POST",
                body: { companyId },
            }),

            // B. Données boursières (Pour valuation & ticker)
            pb.collection("stocks").getFirstListItem<PBStock>(
                `company="${companyId}"`,
                { requestKey: null }
            ).catch(() => null),

            // C. Liste employés (Juste pour compter le nombre total et l'efficacité moyenne)
            pb.collection("employees").getFullList<PBEmployee>({
                filter: `employer="${companyId}"`,
                fields: "efficiency", // On optimise en ne demandant que ce champ
                requestKey: null,
            }),

            // D. Inventaire (Pour le widget Top Items)
            pb.collection("inventory").getFullList<PBInventoryItem>({
                filter: `company="${companyId}"`,
                expand: "item",
                requestKey: null,
            }),
        ]);

        // 3. Traitement des données non-financières

        // Valuation Boursière
        const stockPrice = stockData?.current_price || 0;
        const totalShares = stockData?.total_shares || 0;
        const valuation = stockPrice * totalShares;

        // Ressources (Top 5 Items)
        const inventoryCount = inventoryData.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
        const itemsMap = new Map<string, { name: string; qty: number; value: number }>();

        inventoryData.forEach((inv) => {
            const staticItem = getItem(inv.item_id);
            const itemName = staticItem?.name || "Item inconnu";
            const itemPrice = staticItem?.base_price || 0;
            const qty = inv.quantity || 0;

            if (itemsMap.has(itemName)) {
                const existing = itemsMap.get(itemName)!;
                existing.qty += qty;
                existing.value += qty * itemPrice;
            } else {
                itemsMap.set(itemName, { name: itemName, qty, value: qty * itemPrice });
            }
        });
        
        const topItems = Array.from(itemsMap.values())
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);

        // Staff Stats
        const totalEmployees = employeesData.length;
        const averageEfficiency = totalEmployees > 0
            ? employeesData.reduce((sum, emp) => sum + (emp.efficiency || 100), 0) / totalEmployees
            : 100;

        // 4. Construction de l'objet final
        return {
            company: {
                name: company.name,
                level: company.level || 1,
                ceo: user.username || "Anonyme",
                id: companyId
            },
            financials: {
                cash: company.balance || 0,
                valuation,
                daily_payroll: financeData.breakdown.daily_payroll,
                stock_ticker: stockData?.ticker || "N/A",
                stock_price: stockPrice,
                monthly_net_profit: financeData.monthly_net,
                
                // On injecte directement les objets retournés par l'API
                daily_view: financeData.daily_view,
                profit_breakdown: financeData.breakdown
            },
            resources: {
                inventory_count: inventoryCount,
                top_items: topItems,
            },
            staff: {
                total_employees: totalEmployees,
                average_efficiency: parseFloat(averageEfficiency.toFixed(1)),
            },
        };
    } catch (error: unknown) {
        console.error("Erreur Dashboard:", error);
        throw new Error(error instanceof Error ? error.message : "Erreur inconnue");
    }
}

/**
 * Version légère : Appelle uniquement l'API Finance + Company/Stocks de base
 */
export async function fetchFinancialsOnly(companyId: string): Promise<DashboardData["financials"]> {
    try {
        const [company, stockData, financeData] = await Promise.all([
            pb.collection("companies").getOne<PBCompany>(companyId, { requestKey: null }),
            pb.collection("stocks").getFirstListItem<PBStock>(`company="${companyId}"`, { requestKey: null }).catch(() => null),
            pb.send<ApiFinanceResponse>("/api/company/finance", {
                method: "POST",
                body: { companyId },
            }),
        ]);

        return {
            cash: company.balance || 0,
            valuation: (stockData?.current_price || 0) * (stockData?.total_shares || 0),
            daily_payroll: financeData.breakdown.daily_payroll,
            stock_ticker: stockData?.ticker || "N/A",
            stock_price: stockData?.current_price || 0,
            monthly_net_profit: financeData.monthly_net,
            daily_view: financeData.daily_view,
            profit_breakdown: financeData.breakdown
        };
    } catch (error) {
        console.error("Error financials:", error);
        throw error;
    }
}