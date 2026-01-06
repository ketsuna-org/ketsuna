import pb from "$lib/pocketbase";
import type { Exploration, Deposit } from "$lib/pocketbase";

export async function startExploration(targetResourceId: string) {
    return await pb.send("/api/exploration/start", {
        method: "POST",
        body: { targetResourceId },
    });
}

export async function getExplorations(): Promise<Exploration[]> {
    return await pb.send("/api/explorations", { method: "GET" });
}

export async function getDeposits(companyId: string): Promise<Deposit[]> {
    return await pb.collection("deposits").getFullList({
        filter: `company = "${companyId}"`,
    });
}
