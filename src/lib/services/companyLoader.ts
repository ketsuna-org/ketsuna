import pb from "$lib/pocketbase";
import type { Company } from "$lib/pocketbase";

export interface CompanyWithCounts extends Company {
    employee_count: number;
    machine_count: number;
}

/**
 * Load companies with employee and machine counts efficiently
 * Uses a single batch approach instead of N+1 queries
 */
export async function loadCompaniesWithCounts(): Promise<CompanyWithCounts[]> {
    try {
        // Load all companies
        const companies = await pb.collection("companies").getFullList<Company>({
            sort: "-balance",
            expand: "ceo",
            requestKey: null,
        });

        if (!companies.length) {
            return [];
        }

        // Get all company IDs
        const companyIds = companies.map((c) => c.id);

        // Fetch employee counts for all companies in batch
        const employeeCountMap = await getEmployeeCounts(companyIds);
        const machineCountMap = await getMachineCounts(companyIds);

        // Merge data
        return companies.map((company) => ({
            ...company,
            employee_count: employeeCountMap.get(company.id) || 0,
            machine_count: machineCountMap.get(company.id) || 0,
        }));
    } catch (err) {
        console.error("Failed to load companies with counts:", err);
        throw err;
    }
}

/**
 * Get employee counts for multiple companies
 * Uses a single query with OR filters instead of N queries
 */
async function getEmployeeCounts(
    companyIds: string[]
): Promise<Map<string, number>> {
    const countMap = new Map<string, number>();

    try {
        // Build filter: employer = "id1" || employer = "id2" || ...
        const filter = companyIds
            .map((id) => `employer = "${id}"`)
            .join(" || ");

        // Use getFullList with a high limit and empty pagination to count all
        const result = await pb.collection("employees").getFullList<any>({
            filter,
            requestKey: null,
            $autoCancel: false,
        });

        // Count employees per company
        const counts = new Map<string, number>();
        result.forEach((emp) => {
            const count = counts.get(emp.employer) || 0;
            counts.set(emp.employer, count + 1);
        });

        return counts;
    } catch (err) {
        console.error("Failed to fetch employee counts:", err);
        return countMap;
    }
}

/**
 * Get machine counts for multiple companies
 * Uses a single query with OR filters instead of N queries
 */
async function getMachineCounts(
    companyIds: string[]
): Promise<Map<string, number>> {
    const countMap = new Map<string, number>();

    try {
        // Build filter: company = "id1" || company = "id2" || ...
        const filter = companyIds.map((id) => `company = "${id}"`).join(" || ");

        const result = await pb.collection("machines").getFullList<any>({
            filter,
            requestKey: null,
            $autoCancel: false,
        });

        // Count machines per company
        const counts = new Map<string, number>();
        result.forEach((machine) => {
            const count = counts.get(machine.company) || 0;
            counts.set(machine.company, count + 1);
        });

        return counts;
    } catch (err) {
        console.error("Failed to fetch machine counts:", err);
        return countMap;
    }
}

/**
 * Search and filter companies
 */
export function filterCompanies(
    companies: CompanyWithCounts[],
    filters: {
        search?: string;
        sortBy?: "balance" | "name" | "employees" | "machines";
        sortOrder?: "asc" | "desc";
        minLevel?: number;
        maxLevel?: number;
        showNPC?: boolean;
        hideNPC?: boolean;
    }
): CompanyWithCounts[] {
    let filtered = [...companies];

    // Search filter
    if (filters.search) {
        const query = filters.search.toLowerCase();
        filtered = filtered.filter((c) => c.name.toLowerCase().includes(query));
    }

    // Level filters
    if (filters.minLevel !== undefined) {
        filtered = filtered.filter((c) => c.level >= filters.minLevel!);
    }
    if (filters.maxLevel !== undefined) {
        filtered = filtered.filter((c) => c.level <= filters.maxLevel!);
    }

    // NPC filter
    if (filters.hideNPC) {
        filtered = filtered.filter((c) => !c.is_npc);
    }
    if (filters.showNPC) {
        filtered = filtered.filter((c) => c.is_npc);
    }

    // Sort
    const sortBy = filters.sortBy || "balance";
    const sortOrder = filters.sortOrder || "desc";

    filtered.sort((a, b) => {
        let aVal: any, bVal: any;

        switch (sortBy) {
            case "balance":
                aVal = a.balance || 0;
                bVal = b.balance || 0;
                break;
            case "name":
                aVal = a.name;
                bVal = b.name;
                break;
            case "employees":
                aVal = a.employee_count;
                bVal = b.employee_count;
                break;
            case "machines":
                aVal = a.machine_count;
                bVal = b.machine_count;
                break;
        }

        if (typeof aVal === "string") {
            return sortOrder === "asc"
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        }

        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    return filtered;
}
