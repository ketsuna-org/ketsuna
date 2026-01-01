import pb from "$lib/pocketbase";

export interface EnergyStatus {
  energyProduced: number;
  energyDemand: number;
  energyStored: number;
  maxEnergyStored: number;
  energyRatio: number;
  isSolarActive: boolean;
  productionSpeed: number;
}

/**
 * Fetch energy status for the active company
 */
export async function fetchEnergyStatus(): Promise<EnergyStatus> {
  return await pb.send("/api/company/energy-status", {
    method: "GET",
  });
}
