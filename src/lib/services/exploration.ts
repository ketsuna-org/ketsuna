import pb from "$lib/pocketbase";
import type { Exploration, Deposit } from "$lib/pocketbase";
import { logAnalyticsEvent } from '$lib/firebase';
export type { Exploration, Deposit } ;

export async function startExploration(targetResourceId: string) {
    const res = await pb.send("/api/exploration/start", {
        method: "POST",
        body: { targetResourceId },
    });
    logAnalyticsEvent("exploration_start", { targetResourceId });
    return res;
}

export async function getExplorations(): Promise<Exploration[]> {
    return await pb.send("/api/explorations", { method: "GET" });
}

export async function getDeposits(companyId: string): Promise<Deposit[]> {
    return await pb.collection("deposits").getFullList({
        filter: `company = "${companyId}"`,
    });
}
