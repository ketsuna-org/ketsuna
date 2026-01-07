/**
 * Game Constants - Lazy Evaluation Rules
 * Replicated from backend: internal/gamedata/game_constants.go
 */

// Deposit Capacity
export const EMPLOYEES_PER_DEPOSIT_SIZE = 5; // Max employees = size * 5
export const MACHINES_PER_DEPOSIT_SIZE = 1; // Max machines = size * 1
export const MACHINE_EQUIVALENT_WORKERS = 5; // 1 machine = 5 worker equivalent

// Energy Cycle (synchronized for all employees)
export const ENERGY_WORK_DURATION = 1440; // 24 minutes in seconds
export const ENERGY_REST_DURATION = 1440; // 24 minutes in seconds
export const ENERGY_CYCLE_TOTAL = 2880; // 48 minutes total cycle

// Machine Durability
export const MACHINE_DURABILITY_ON_PLACE = 1000; // Durability when machine is placed
export const MAINTENANCE_INTERVAL_SECONDS = 10; // Maintenance skill applied every 10s

// Default harvest cycle (can be overridden by item ProductionTime)
export const DEFAULT_HARVEST_CYCLE = 20; // seconds

/**
 * Get max employees allowed for a deposit size
 */
export function getMaxEmployeesForDeposit(size: number): number {
  return size * EMPLOYEES_PER_DEPOSIT_SIZE;
}

/**
 * Get max machines allowed for a deposit size
 */
export function getMaxMachinesForDeposit(size: number): number {
  return size * MACHINES_PER_DEPOSIT_SIZE;
}

/**
 * Get total worker equivalent capacity
 * (employees + machines * MACHINE_EQUIVALENT_WORKERS)
 */
export function getDepositWorkerCapacity(employees: number, machines: number): number {
  return employees + machines * MACHINE_EQUIVALENT_WORKERS;
}
