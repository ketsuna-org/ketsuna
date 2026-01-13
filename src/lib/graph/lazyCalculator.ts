/**
 * Lazy Calculator - Frontend Graph Economy Calculations
 * Replicates the logic from backend: internal/hooks/lazy_calculator.go
 */

import { DEFAULT_HARVEST_CYCLE } from './gameConstants';

// =============================================================================
// EMPLOYEE CALCULATIONS (SIMPLIFIED)
// =============================================================================

interface Employee {
  id: string;
  mining?: number;
  [key: string]: unknown;
}

interface Deposit {
  id: string;
  quantity?: number;
  last_harvest_at?: string;
  [key: string]: unknown;
}

interface Machine {
  id: string;
  machine_id?: string;
  production_started_at?: string;
  [key: string]: unknown;
}

interface MachineData {
  production_time?: number;
  ProductionTime?: number;
  product_quantity?: number;
  ProductQuantity?: number;
  [key: string]: unknown;
}

/**
 * Calculate effective productivity seconds for an employee over a time window
 * SIMPLIFICATION: Simply total time elapsed.
 */
export function calculateEmployeeProductivity(emp: Employee | null, start: Date, end: Date): number {
  if (!emp) return 0;
  // Simple time difference
  const diff = (end.getTime() - start.getTime()) / 1000;
  return diff > 0 ? diff : 0;
}

// =============================================================================
// MINING CALCULATIONS
// =============================================================================

export interface MiningProgressResult {
  progressPercent: number; // 0-100
  estimatedYield: number;
}

export function calculateMiningProgress(
  _deposit: Deposit | null,
  employees: Employee[],
  lastHarvestAt: Date | null
): MiningProgressResult {
  if (!lastHarvestAt || employees.length === 0) {
    return {
      progressPercent: 0,
      estimatedYield: 0,
    };
  }

  const now = new Date();
  const elapsed = (now.getTime() - lastHarvestAt.getTime());
  const elapsedSeconds = elapsed / 1000;
  const harvestInterval = 60; // Seconds

  let totalWeightedYield = 0.0;
  
  // All employees active and full efficiency
  employees.forEach(emp => {
    const effSeconds = calculateEmployeeProductivity(emp, lastHarvestAt, now);
    const skill = emp.mining || 0;
    totalWeightedYield += skill * effSeconds;
  });

  const estimatedYield = Math.floor(parseFloat((totalWeightedYield / harvestInterval).toFixed(2)));
  const progressPercent = Math.min(100, (elapsedSeconds / harvestInterval) * 100);

  return {
    progressPercent,
    estimatedYield,
  };
}

// =============================================================================
// PRODUCTION CALCULATIONS
// =============================================================================

export interface ProductionProgressResult {
  progressPercent: number;
  cyclesCompleted: number;
  estimatedProduced: number;
  canProduce: boolean;
  blockReason?: string;
}

export function calculateProductionProgress(
  machine: Machine | null,
  machineData: MachineData | null,
  _employees: Employee[],
  productionStartedAt: Date | null
): ProductionProgressResult {
  const defaultResult: ProductionProgressResult = {
    progressPercent: 0,
    cyclesCompleted: 0,
    estimatedProduced: 0,
    canProduce: false,
    blockReason: 'Machine non configurée',
  };

  if (!machine || !machineData || !productionStartedAt) {
    return defaultResult;
  }

  // Get cycle time - server uses itemDef.ProductionTime
  // Priority: machineData.ProductionTime (Go) > machineData.production_time (legacy) > default 60s
  const cycleTime = machineData.ProductionTime || machineData.production_time || DEFAULT_HARVEST_CYCLE;
  
  const now = new Date();
  const elapsed = (now.getTime() - productionStartedAt.getTime()) / 1000;
  
  // Calculate theoretical cycles (matching server logic)
  let timeBasedCycles = Math.floor(elapsed / cycleTime);
  
  // Server caps at 3 cycles per tick to prevent resource hogging
  const MAX_CYCLES_PER_TICK = 3;
  const cyclesCompleted = Math.min(timeBasedCycles, MAX_CYCLES_PER_TICK);
  
  // Progress within current cycle (0-100%)
  // If we hit the cap, show 100% to indicate "ready for next tick"
  // VISUALIZATION FIX:
  // For the UI progress bar, we effectively ignore the server processing cap.
  // We want to show a continuous loop of production.
  const timeInCurrentCycle = elapsed % cycleTime;
  const progressPercent = (timeInCurrentCycle / cycleTime) * 100;
  
  // Production quantity per cycle - server uses itemDef.ProductQuantity
  const qtyPerCycle = machineData.ProductQuantity || machineData.product_quantity || 1;
  const totalProduced = cyclesCompleted * qtyPerCycle;
  
  return {
    progressPercent,
    cyclesCompleted,
    estimatedProduced: Math.floor(totalProduced),
    canProduce: true
  };
}
