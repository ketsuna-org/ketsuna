import pb from "$lib/pocketbase";
import type { CompanyTech } from "$lib/pocketbase";
import { getAllTechnologies, type Technology } from "$lib/data/game-static";

import { logAnalyticsEvent } from "$lib/firebase";

/**
 * Débloque une technologie pour une entreprise
 */
export async function unlockTechnology(companyId: string, technology: Technology): Promise<void> {
    try {
        await pb.send("/api/company/unlock-tech", {
            method: "POST",
            body: {
                companyId,
                techId: technology.id
            }
        });

        console.log(`[TECH] Technologie débloquée: ${technology.name}`);
        logAnalyticsEvent("unlock_technology", { 
            tech_id: technology.id, 
            tech_name: technology.name,
            company_id: companyId
        });
    } catch (err: unknown) {
        const error = err as Error;
        console.error("[TECH] Erreur déblocage:", error);
        throw new Error(error.message || "Erreur lors du déblocage de la technologie.");
    }
}

/**
 * Liste toutes les technologies et marque celles déjà possédées ou en cours
 */
export async function fetchTechTree(companyId: string) {
    // Get owned/pending techs from PocketBase
    const ownedTechs = await pb.collection("company_techs").getFullList<CompanyTech & { status?: string; completed_at?: string }>({
        filter: `company="${companyId}"`,
        requestKey: null,
    });

    // Create a map for quick lookup
    const techStatusMap = new Map<string, { status: string; completed_at: string | null }>();
    ownedTechs.forEach(ot => {
        techStatusMap.set(ot.technology_id, {
            status: ot.status || "completed",
            completed_at: ot.completed_at || null
        });
    });

    // Get all techs from static data
    const allTechs = getAllTechnologies();

    return allTechs.map(tech => {
        const techInfo = techStatusMap.get(tech.id);
        return {
            ...tech,
            isOwned: techInfo?.status === "completed",
            isPending: techInfo?.status === "pending",
            completedAt: techInfo?.completed_at || null
        };
    });
}
