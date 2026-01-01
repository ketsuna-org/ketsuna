import pb from "$lib/pocketbase";
import type { Item } from "$lib/types";

export interface Exploration {
    id: string;
    company: string;
    target_resource: string;
    status: "En cours" | "Succès" | "Echec";
    end_time: string;
    expand?: {
        target_resource: Item;
    };
}

export interface Deposit {
    id: string;
    company: string;
    ressource: string; // Corrected to match schema 'ressource'
    quantity: number;
    richness: number;
    expand?: {
        ressource: Item;
    };
}

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
    return await pb.collection("deposits").getFullList<Deposit>({
        filter: `company = "${companyId}"`,
        expand: "ressource", // Corrected to match schema 'ressource'
    });
}
