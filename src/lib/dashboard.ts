import pb from "$lib/pocketbase";

// Types pour typage fort
export interface DashboardData {
    company: {
        name: string;
        level: number;
        prestige: number;
        ceo: string;
    };
    financials: {
        cash: number;
        valuation: number;
        daily_payroll: number;
        stock_ticker: string;
        stock_price: number;
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

interface PBUser {
    id: string;
    username: string;
    prestige?: number;
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
    tech_points?: number;
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
    company: string;
    salary: number;
    efficiency?: number;
}

interface PBInventoryItem {
    id: string;
    company: string;
    item: string;
    quantity: number;
    expand?: {
        item?: PBItem;
    };
}

interface PBItem {
    id: string;
    name: string;
    base_price: number;
}

/**
 * Agrège toutes les données du dashboard de l'entreprise active du joueur
 * en un minimum de requêtes API grâce à expand et Promise.all
 * 
 * @param userId - ID de l'utilisateur PocketBase
 * @returns Objet JSON structuré avec les données du dashboard
 * @throws Error si l'utilisateur n'existe pas ou n'a pas d'entreprise active
 */
export async function fetchDashboardData(userId: string): Promise<DashboardData> {
    try {
        // Étape 1: Récupérer l'utilisateur avec expand sur active_company
        const user = await pb.collection("users").getOne<PBUser>(userId, {
            expand: "active_company",
        });

        // Vérifier si l'utilisateur a une entreprise active
        if (!user.active_company || !user.expand?.active_company) {
            throw new Error("L'utilisateur n'a pas d'entreprise active");
        }

        const company = user.expand.active_company;
        const companyId = company.id;

        // Étape 2: Requêtes parallèles pour toutes les données liées à l'entreprise
        const [stockData, employeesData, inventoryData] = await Promise.all([
            // Récupérer les actions de l'entreprise (devrait retourner 1 seul résultat)
            pb.collection("stocks").getFirstListItem<PBStock>(
                `company="${companyId}"`,
                { requestKey: null }
            ).catch(() => null), // Gérer le cas où il n'y a pas encore d'actions

            // Récupérer tous les employés de l'entreprise (champ relation: employer)
            pb.collection("employees").getFullList<PBEmployee>({
                filter: `employer="${companyId}"`,
                requestKey: null,
            }),

            // Récupérer l'inventaire avec expand sur les items (champ relation: company)
            pb.collection("inventory").getFullList<PBInventoryItem>({
                filter: `company="${companyId}"`,
                expand: "item",
                requestKey: null,
            }),
        ]);

        // Étape 3: Calculs et agrégations côté client

        // Financials
        const cash = company.balance || 0;
        const stockPrice = stockData?.current_price || 0;
        const totalShares = stockData?.total_shares || 0;
        const valuation = stockPrice * totalShares;
        const dailyPayroll = employeesData.reduce((sum, emp) => sum + (emp.salary || 0), 0);

        // Resources - Calculer l'inventaire total et top 5 items
        const inventoryCount = inventoryData.reduce((sum, inv) => sum + (inv.quantity || 0), 0);

        // Grouper par item et calculer valeur totale
        const itemsMap = new Map<string, { name: string; qty: number; value: number }>();

        inventoryData.forEach((inv) => {
            const itemName = inv.expand?.item?.name || "Item inconnu";
            const itemPrice = inv.expand?.item?.base_price || 0;
            const qty = inv.quantity || 0;

            if (itemsMap.has(itemName)) {
                const existing = itemsMap.get(itemName)!;
                existing.qty += qty;
                existing.value += qty * itemPrice;
            } else {
                itemsMap.set(itemName, {
                    name: itemName,
                    qty,
                    value: qty * itemPrice,
                });
            }
        });

        // Trier par quantité et prendre le top 5
        const topItems = Array.from(itemsMap.values())
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);

        // Staff - Calculer moyenne d'efficacité
        const totalEmployees = employeesData.length;
        const averageEfficiency = totalEmployees > 0
            ? employeesData.reduce((sum, emp) => sum + (emp.efficiency || 100), 0) / totalEmployees
            : 100;

        // Étape 4: Construire l'objet de retour
        return {
            company: {
                name: company.name,
                level: company.level || 1,
                prestige: user.prestige || 0,
                ceo: user.username || "Anonyme",
            },
            financials: {
                cash,
                valuation: valuation || 0,
                daily_payroll: dailyPayroll,
                stock_ticker: stockData?.ticker || "N/A",
                stock_price: stockPrice,
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
    } catch (error: Error | any) {
        console.error("Erreur lors de la récupération des données du dashboard:", error);
        throw new Error(
            error.message || "Impossible de récupérer les données du dashboard"
        );
    }
}

/**
 * Version allégée pour les mises à jour fréquentes (seulement les données financières)
 */
export async function fetchFinancialsOnly(companyId: string): Promise<DashboardData["financials"]> {
    try {
        const [company, stockData, employees] = await Promise.all([
            pb.collection("companies").getOne<PBCompany>(companyId),
            pb.collection("stocks").getFirstListItem<PBStock>(`company="${companyId}"`).catch(() => null),
            pb.collection("employees").getFullList<PBEmployee>({
                filter: `employer="${companyId}"`,
                fields: "salary",
            }),
        ]);

        return {
            cash: company.balance || 0,
            valuation: (stockData?.current_price || 0) * (stockData?.total_shares || 0),
            daily_payroll: employees.reduce((sum, emp) => sum + (emp.salary || 0), 0),
            stock_ticker: stockData?.ticker || "N/A",
            stock_price: stockData?.current_price || 0,
        };
    } catch (error) {
        console.error("Error fetching financials:", error);
        throw error;
    }
}
