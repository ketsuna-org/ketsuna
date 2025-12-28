import pb from "$lib/pocketbase";

// Types pour typage fort
export interface DashboardData {
    company: {
        name: string;
        level: number;
        prestige: number;
        ceo: string;
        tech_points: number;
    };
    financials: {
        cash: number;
        valuation: number;
        daily_payroll: number;
        stock_ticker: string;
        stock_price: number;
        monthly_net_profit: number;
        profit_breakdown: {
            base_hourly_revenue: number;
            reputation_hourly_bonus: number;
            employees_hourly_revenue: number;
            hourly_costs: number;
            premium_multiplier: number;
            machine_production_count: number;
        };
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
    reputation: number;
    tech_points?: number;
}

interface PBStock {
    id: string;
    company: string;
    ticker: string;
    current_price: number;
    total_shares: number;
}

interface PBMachine {
    id: string;
    machine: string;
    expand?: {
        machine?: PBItem;
    };
}

interface PBEmployee {
    id: string;
    company: string;
    salary: number;
    rarity: number;
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
    type: string;
    product?: string;
    product_quantity?: number;
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
        const [stockData, employeesData, inventoryData, assignedMachines] = await Promise.all([
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

            // Récupérer les machines installées
            pb.collection("machines").getFullList<PBMachine>({
                filter: `company="${companyId}"`,
                expand: "machine",
                requestKey: null,
            }),
        ]);

        // Étape 3: Calculs et agrégations côté client

        let hourlyRevenue = 0;
        let baseRevenue = 0;
        let reputationBonus = 0;
        let employeesRevenue = 0;
        const premiumMultiplier = user.is_premium ? 1.5 : 1.0;

        // Vérifier si nous avons des produits finis en stock
        const hasFinishedProducts = inventoryData.some(inv =>
            inv.expand?.item?.type === "Produit Fini" && inv.quantity > 0
        );

        if (employeesData.length > 0 && hasFinishedProducts) {
            baseRevenue = (company.level || 1) * 100;
            reputationBonus = (company.reputation || 0) * 10;

            employeesData.forEach((emp) => {
                const efficiency = emp.efficiency || 1.0;
                const rarity = emp.rarity || 0;
                employeesRevenue += efficiency * (rarity + 1) * 50;
            });

            hourlyRevenue = (baseRevenue + reputationBonus) * premiumMultiplier + employeesRevenue;
        }

        // Calculer la production des machines
        let machineProductionCount = 0;
        assignedMachines.forEach((assignment) => {
            if (assignment.expand?.machine) {
                machineProductionCount += assignment.expand.machine.product_quantity || 0;
            }
        });

        const dailyPayroll = employeesData.reduce((sum, emp) => sum + (emp.salary || 0), 0);

        // Ne compter les coûts que s'il y a un potentiel de revenu
        // (employés + produits finis en stock)
        let hourlyCost = 0;
        if (employeesData.length > 0 && hasFinishedProducts) {
            hourlyCost = (dailyPayroll / 24) + ((company.level || 1) * 5);
        }

        const netHourlyProfit = hourlyRevenue - hourlyCost;
        // User definition: 1 month = 24h real = 1440 game hours (assuming 1min=1h)
        const monthlyNetProfit = netHourlyProfit * 1440;

        // Financials
        const cash = company.balance || 0;
        const stockPrice = stockData?.current_price || 0;
        const totalShares = stockData?.total_shares || 0;
        const valuation = stockPrice * totalShares;

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
                tech_points: Math.round((company.tech_points || 0) * 100) / 100,
            },
            financials: {
                cash,
                valuation: valuation || 0,
                daily_payroll: dailyPayroll,
                stock_ticker: stockData?.ticker || "N/A",
                stock_price: stockPrice,
                monthly_net_profit: monthlyNetProfit,
                profit_breakdown: {
                    base_hourly_revenue: baseRevenue,
                    reputation_hourly_bonus: reputationBonus,
                    employees_hourly_revenue: employeesRevenue,
                    hourly_costs: hourlyCost,
                    premium_multiplier: premiumMultiplier,
                    machine_production_count: machineProductionCount
                }
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
        console.error("Erreur lors de la récupération des données du dashboard:", error);
        const message = error instanceof Error ? error.message : "Impossible de récupérer les données du dashboard";
        throw new Error(message);
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
            monthly_net_profit: 0,
            profit_breakdown: {
                base_hourly_revenue: 0,
                reputation_hourly_bonus: 0,
                employees_hourly_revenue: 0,
                hourly_costs: 0,
                premium_multiplier: 1,
                machine_production_count: 0
            }
        };
    } catch (error: unknown) {
        console.error("Error fetching financials:", error);
        throw error;
    }
}
