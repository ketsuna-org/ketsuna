import pb from "$lib/pocketbase";
import type { Machine, Employee, InventoryItem } from "$lib/pocketbase";
import { fetchDashboardData, type DashboardData } from "$lib/dashboard";

/**
 * Workshop Service
 * Centralizes all data fetching and business logic for the workshop page.
 */

export interface WorkshopData {
  employees: Employee[];
  inventory: InventoryItem[];
  dashboardData: DashboardData | null;
  energyStatus: EnergyStatus | null;
  busyEmployeeIds: Set<string>;
}

export interface EnergyStatus {
  total_capacity: number;
  total_stored: number;
  total_production: number;
  total_consumption: number;
  net_flow: number;
}

export interface MachineStats {
  totalMachines: number;
  totalMaxEmployees: number;
  currentAssigned: number;
  missingEmployees: number;
  availableEmployees: number;
  totalEmployees: number;
  machineTypeCount: number;
  stockageTypeCount: number;
}

export interface PaginatedResult<T> {
  items: T[];
  totalItems: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface RecipeFilters {
  searchQuery: string;
  time?: "fast" | "long";
}

export interface MachineFilters {
  searchQuery: string;
}

// --- Data Loading Functions ---

/**
 * Loads all initial workshop data for a company
 */
export async function loadWorkshopData(
  userId: string,
  companyId: string
): Promise<WorkshopData> {
  const [employeesData, inventoryData, dashData, busySet, energyData] =
    await Promise.all([
      pb.collection("employees").getFullList<Employee>({
        filter: `employer="${companyId}"`,
        requestKey: null,
      }),
      pb.collection("inventory").getFullList<InventoryItem>({
        filter: `company="${companyId}"`,
        requestKey: null,
      }),
      fetchDashboardData(userId),
      fetchBusyEmployees(companyId),
      pb
        .send("/api/company/energy-status", {
          params: { companyId },
        })
        .catch(() => null),
    ]);

  return {
    employees: employeesData,
    inventory: inventoryData,
    dashboardData: dashData,
    energyStatus: energyData,
    busyEmployeeIds: busySet,
  };
}

/**
 * Fetches the set of employee IDs that are currently assigned to machines
 */
export async function fetchBusyEmployees(
  companyId: string
): Promise<Set<string>> {
  try {
    const allMachines = await pb.collection("machines").getFullList({
      filter: `company="${companyId}"`,
      fields: "employees",
      requestKey: null,
    });

    const busyIds = new Set<string>();
    allMachines.forEach((m) => {
      if (m.employees) {
        m.employees.forEach((id: string) => busyIds.add(id));
      }
    });
    return busyIds;
  } catch (e) {
    console.warn("[WORKSHOP] Failed to fetch busy employees", e);
    return new Set<string>();
  }
}

/**
 * Loads paginated recipes with optional filters
 */
export async function loadRecipes(
  page: number,
  perPage: number,
  filters: RecipeFilters
): Promise<PaginatedResult<any>> {
  const filterParts: string[] = [];

  if (filters.searchQuery.trim()) {
    filterParts.push(`output_item.name ~ "${filters.searchQuery.trim()}"`);
  }
  if (filters.time === "fast") {
    filterParts.push("production_time <= 60");
  }
  if (filters.time === "long") {
    filterParts.push("production_time > 60");
  }

  const filter = filterParts.length > 0 ? filterParts.join(" && ") : undefined;

  const result = await pb.collection("recipes").getList(page, perPage, {
    filter,
    expand: "output_item,inputs_items,required_tech",
    sort: "production_time",
    requestKey: null,
  });

  return {
    items: result.items,
    totalItems: result.totalItems,
    page: result.page,
    totalPages: result.totalPages,
    hasMore: result.page < result.totalPages,
  };
}

/**
 * Loads paginated machines for a company with optional search filter
 */
export async function loadMachines(
  companyId: string,
  page: number,
  perPage: number,
  filters: MachineFilters
): Promise<PaginatedResult<Machine>> {
  const filterParts: string[] = [`company = "${companyId}"`];

  if (filters.searchQuery.trim()) {
    filterParts.push(`machine.name ~ "${filters.searchQuery.trim()}"`);
  }

  const filter = filterParts.join(" && ");

  const result = await pb.collection("machines").getList<Machine>(page, perPage, {
    filter,
    expand: "employees,deposit",
    requestKey: null,
  });

  return {
    items: result.items,
    totalItems: result.totalItems,
    page: result.page,
    totalPages: result.totalPages,
    hasMore: result.page < result.totalPages,
  };
}

/**
 * Fetches accurate machine stats from backend
 */
export async function loadMachineStats(): Promise<MachineStats> {
  try {
    const stats = await pb.send("/api/machines/stats", { method: "GET" });
    return stats;
  } catch (e) {
    console.error("[WORKSHOP] Failed to load machine stats", e);
    return {
      totalMachines: 0,
      totalMaxEmployees: 0,
      currentAssigned: 0,
      missingEmployees: 0,
      availableEmployees: 0,
      totalEmployees: 0,
      machineTypeCount: 0,
      stockageTypeCount: 0,
    };
  }
}

/**
 * Refreshes energy status for a company
 */
export async function refreshEnergyStatus(
  companyId: string
): Promise<EnergyStatus | null> {
  try {
    return await pb.send("/api/company/energy-status", {
      params: { companyId },
    });
  } catch (e) {
    return null;
  }
}

/**
 * Refreshes inventory data for a company
 */
export async function refreshInventory(
  companyId: string
): Promise<InventoryItem[]> {
  try {
    return await pb.collection("inventory").getFullList<InventoryItem>({
      filter: `company="${companyId}"`,
      requestKey: null,
    });
  } catch (e) {
    console.warn("[WORKSHOP] Inventory refresh failed", e);
    return [];
  }
}

// --- Machine Actions ---

/**
 * Creates a machine assignment from stock
 */
export async function assignMachineFromStock(
  companyId: string,
  itemId: string,
  quantity: number = 1
): Promise<Machine[]> {
  const machines: Machine[] = [];
  // Use sequential loop to avoid race conditions on inventory deduction and prevent auto-cancellation
  for (let i = 0; i < quantity; i++) {
    const m = await pb.collection("machines").create({
      company: companyId,
      machine_id: itemId,
      employees: [],
      placed: false,
    }, { requestKey: null });
    machines.push(m);
  }
  return machines;
}

/**
 * Auto-assigns available employees to machines needing them
 */
export async function autoAssignEmployees(): Promise<{
  assignedCount: number;
  message?: string;
}> {
  return await pb.send("/api/machines/auto-assign", {
    method: "POST",
  });
}

/**
 * Auto-assigns deposits to extraction machines
 */
export async function autoAssignDeposits(): Promise<{
  assignedCount: number;
  message?: string;
}> {
  return await pb.send("/api/machines/auto-assign-deposits", {
    method: "POST",
  });
}

// --- Subscription Helpers ---

export interface WorkshopSubscriptions {
  unsubscribeInventory: (() => void) | null;
  unsubscribeMachines: (() => void) | null;
}

/**
 * Creates realtime subscriptions for workshop data
 * Returns unsubscribe functions
 */
export async function subscribeToWorkshopData(
  companyId: string,
  callbacks: {
    onInventoryUpdate: (action: string, record: any) => void;
    onMachineUpdate: (action: string, record: Machine) => void;
  }
): Promise<WorkshopSubscriptions> {
  const unsubscribeInventory = await pb
    .collection("inventory")
    .subscribe("*", async ({ action, record }) => {
      if (record.company === companyId) {
        callbacks.onInventoryUpdate(action, record);
      }
    });

  const unsubscribeMachines = await pb
    .collection("machines")
    .subscribe<Machine>("*", async ({ action, record }) => {
      if (record.company === companyId) {
        callbacks.onMachineUpdate(action, record);
      }
    });

  return {
    unsubscribeInventory,
    unsubscribeMachines,
  };
}
