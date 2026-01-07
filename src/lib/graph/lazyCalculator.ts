/**
 * Lazy Calculator - Frontend Graph Economy Calculations
 * Replicates the logic from backend: internal/hooks/lazy_calculator.go
 */

import {
  ENERGY_WORK_DURATION,
  ENERGY_REST_DURATION,
  ENERGY_CYCLE_TOTAL,
  DEFAULT_HARVEST_CYCLE,
} from './gameConstants';

// =============================================================================
// EMPLOYEE ENERGY CALCULATIONS (DETERMINISTIC)
// =============================================================================

function getEmployeeOffset(emp: any): number {
  // Use created timestamp for deterministic offset, matching backend
  if (!emp || !emp.created) return 0;
  return new Date(emp.created).getTime() / 1000; // Seconds
}

/**
 * Get current energy status for an employee
 */
export function getEmployeeEnergy(emp: any): { energy: number; phase: 'working' | 'resting' } {
  const offset = getEmployeeOffset(emp);
  const now = Date.now() / 1000;
  const totalSeconds = now + offset;
  
  const cyclePos = totalSeconds % ENERGY_CYCLE_TOTAL;
  
  if (cyclePos < ENERGY_WORK_DURATION) {
    // Work Phase: 100 -> 0
    const progress = cyclePosition => cyclePosition / ENERGY_WORK_DURATION;
    const pct = 1.0 - (cyclePos / ENERGY_WORK_DURATION);
    return { energy: Math.max(0, Math.min(100, pct * 100)), phase: 'working' };
  } else {
    // Rest Phase: 0 -> 100
    const restPos = cyclePos - ENERGY_WORK_DURATION;
    const pct = restPos / ENERGY_REST_DURATION;
    return { energy: Math.max(0, Math.min(100, pct * 100)), phase: 'resting' };
  }
}

/**
 * Calculate effective productivity seconds for an employee over a time window
 * Logic mirrors backend integration of Energy(t).
 */
export function calculateEmployeeProductivity(emp: any, start: Date, end: Date): number {
  if (!emp) return 0;
  
  const offset = getEmployeeOffset(emp);
  const startT = (start.getTime() / 1000) + offset;
  const endT = (end.getTime() / 1000) + offset;
  
  if (endT <= startT) return 0;

  let effectiveSeconds = 0.0;
  let current = startT;
  
  while (current < endT) {
    const cycleStart = Math.floor(current / ENERGY_CYCLE_TOTAL) * ENERGY_CYCLE_TOTAL;
    const relStart = current - cycleStart;
    
    const amountRemainingInCycle = ENERGY_CYCLE_TOTAL - relStart;
    const amountToProcess = Math.min(endT - current, amountRemainingInCycle);
    const relEnd = relStart + amountToProcess;
    
    // Integrate logic
    // We care about Work Phase [0, ENERGY_WORK_DURATION]
    // Integral of (1 - t/WorkDuration) dt
    
    const workDur = ENERGY_WORK_DURATION;
    
    // Overlap with work phase
    const segStart = Math.max(relStart, 0);
    const segEnd = Math.min(relEnd, workDur);
    
    if (segStart < segEnd) {
       // Definite integral of (1 - t/D) = [t - t^2/2D]
       const valEnd = segEnd - (segEnd * segEnd) / (2 * workDur);
       const valStart = segStart - (segStart * segStart) / (2 * workDur);
       effectiveSeconds += (valEnd - valStart);
    }
    
    current += amountToProcess;
  }
  
  return effectiveSeconds;
}

/**
 * Calculate effective maintenance seconds (during Rest Phase)
 */
export function calculateEmployeeMaintenance(emp: any, start: Date, end: Date): number {
  if (!emp) return 0;
  const offset = getEmployeeOffset(emp);
  const startT = (start.getTime() / 1000) + offset;
  const endT = (end.getTime() / 1000) + offset;
  
  let effectiveSeconds = 0.0;
  let current = startT;
  
  const workDur = ENERGY_WORK_DURATION;
  
  while (current < endT) {
    const cycleStart = Math.floor(current / ENERGY_CYCLE_TOTAL) * ENERGY_CYCLE_TOTAL;
    const relStart = current - cycleStart;
    const amountToProcess = Math.min(endT - current, ENERGY_CYCLE_TOTAL - relStart);
    const relEnd = relStart + amountToProcess;
    
    // Maintenance happens in [workDur, Total]
    const segStart = Math.max(relStart, workDur);
    const segEnd = Math.min(relEnd, ENERGY_CYCLE_TOTAL);
    
    if (segStart < segEnd) {
      // Efficiency 1.0 during rest
      effectiveSeconds += (segEnd - segStart);
    }
    current += amountToProcess;
  }
  return effectiveSeconds;
}

// =============================================================================
// MINING CALCULATIONS
// =============================================================================

export interface MiningProgressResult {
  progressPercent: number; // 0-100
  estimatedYield: number;
  averageEnergy: number; // Average energy of active employees
  activeWorkers: number;
}

export function calculateMiningProgress(
  deposit: any,
  employees: any[],
  lastHarvestAt: Date | null
): MiningProgressResult {
  if (!lastHarvestAt || employees.length === 0) {
    return {
      progressPercent: 0,
      estimatedYield: 0,
      averageEnergy: 0,
      activeWorkers: 0,
    };
  }

  const now = new Date();
  const elapsed = (now.getTime() - lastHarvestAt.getTime());
  const elapsedSeconds = elapsed / 1000;
  const harvestInterval = 60; // Seconds

  // Calculate total effective yield
  let totalWeightedYield = 0.0;
  let activeWorkers = 0;
  let totalEnergy = 0;

  employees.forEach(emp => {
    // Current energy snapshot for UI
    const { energy, phase } = getEmployeeEnergy(emp);
    if (phase === 'working') {
       activeWorkers++;
       totalEnergy += energy;
    }
    
    // Effective work done since last harvest
    const effSeconds = calculateEmployeeProductivity(emp, lastHarvestAt, now);
    if (effSeconds > 0) {
       const skill = emp.mining || 0;
       totalWeightedYield += skill * effSeconds;
    }
  });

  // Yield = Weighted / Interval
  const estimatedYield = parseFloat((totalWeightedYield / harvestInterval).toFixed(2));
  
  const progressPercent = Math.min(100, (elapsedSeconds / harvestInterval) * 100);
  const averageEnergy = activeWorkers > 0 ? (totalEnergy / activeWorkers) : 0;

  return {
    progressPercent,
    estimatedYield,
    averageEnergy,
    activeWorkers
  };
}

// =============================================================================
// PRODUCTION CALCULATIONS
// =============================================================================

export interface ProductionProgressResult {
  progressPercent: number;
  cyclesCompleted: number;
  estimatedProduced: number;
  currentDurability: number;
  averageEnergy: number;
  activeWorkers: number;
  canProduce: boolean;
  blockReason?: string;
}

export function calculateProductionProgress(
  machine: any,
  machineData: any | null,
  employees: any[],
  productionStartedAt: Date | null
): ProductionProgressResult {
  const defaultResult: ProductionProgressResult = {
    progressPercent: 0,
    cyclesCompleted: 0,
    estimatedProduced: 0,
    currentDurability: machine.durability || 1000,
    averageEnergy: 0,
    activeWorkers: 0,
    canProduce: false,
    blockReason: 'Machine non configurée',
  };

  if (!machineData || !productionStartedAt) {
    return defaultResult;
  }

  // Initial Durability check
  let durability = machine.durability !== undefined ? machine.durability : 1000;
  
  // Apply Maintenance logic for visualization?
  // Backend applies maintenance at start of processing.
  // We can simulate it here if we want accurate "current" durability.
  // But strictly, until backend processes it, it's not applied.
  // Let's just show current DB value to avoid confusion? 
  // OR show "Predicted"? UI usually shows DB state. 
  // But progress bar needs real-time.
  
  if (durability <= 0) {
     // Check if maintenance would fix it?
     // Complex. Let's stick to DB state + basic extrapolation if we want.
     // For now, simpler:
     return { ...defaultResult, canProduce: false, blockReason: 'Durabilité 0' };
  }

  // We don't have global energy check anymore.
  // But we need Machine Energy (Power) check from graph.
  // This info isn't easily available in frontend without full graph data.
  // We'll assume Power is OK for UI estimation unless we have `energyRatio` prop passed down?
  // Let's assumes 100% power for UI estimation or check if passed in machine record (not standard).
  const energyMultiplier = 1.0; 

  // Cycle Calc
  const cycleTime = (machineData.production_time || machineData.ProductionTime || DEFAULT_HARVEST_CYCLE); // Seconds
  const now = new Date();
  const elapsed = (now.getTime() - productionStartedAt.getTime()) / 1000;
  
  const effectiveDelta = elapsed * energyMultiplier;
  const cyclesCompleted = Math.floor(effectiveDelta / cycleTime);
  
  const progressInCurrentCycle = (effectiveDelta % cycleTime) / cycleTime;
  const progressPercent = progressInCurrentCycle * 100;
  
  // Production
  // Base
  let baseQty = machineData.product_quantity || machineData.ProductQuantity || 1;
  // Recipe?
  // machineData might be Item definition. If UseRecipe, we need recipe.
  // Frontend might not have all recipes loaded? 
  // Assuming base logic for now.
  
  let totalProduced = cyclesCompleted * baseQty;
  
  // Employee Bonus
  let totalWeightedBonus = 0;
  let currentActive = 0;
  let currentEnergySum = 0;
  
  employees.forEach(emp => {
      // UI Stats
      const { energy, phase } = getEmployeeEnergy(emp);
      if (phase === 'working') {
        currentActive++;
        currentEnergySum += energy;
      }
      
      // Bonus Integration
      const effSeconds = calculateEmployeeProductivity(emp, productionStartedAt, now);
      const skill = emp.mining || 0;
      totalWeightedBonus += skill * effSeconds;
  });
  
  // Bonus Formula from Backend: 
  // boostCycles = (Power * TotalSkillSeconds / 10) / CycleTime * BaseQty
  // (Ignoring the 'ratio' complexity for UI estimation)
  
  const boostCycles = (energyMultiplier * totalWeightedBonus / 10.0) / cycleTime;
  totalProduced += boostCycles * baseQty;

  return {
    progressPercent,
    cyclesCompleted,
    estimatedProduced: Math.floor(totalProduced), // Integer items
    currentDurability: durability - cyclesCompleted, // Estimated loss
    averageEnergy: currentActive > 0 ? (currentEnergySum / currentActive) : 0,
    activeWorkers: currentActive,
    canProduce: true
  };
}
