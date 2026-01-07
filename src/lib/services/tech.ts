import pb from "$lib/pocketbase";
import type { CompanyTech } from "$lib/pocketbase";
import { getAllTechnologies, type Technology } from "$lib/data/game-static";

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
    } catch (err: unknown) {
        const error = err as Error;
        console.error("[TECH] Erreur déblocage:", error);
        throw new Error(error.message || "Erreur lors du déblocage de la technologie.");
    }
}

/**
 * Liste toutes les technologies et marque celles déjà possédées
 */
export async function fetchTechTree(companyId: string) {
    // Get owned techs from PocketBase
    const ownedTechs = await pb.collection("company_techs").getFullList<CompanyTech>({
        filter: `company="${companyId}"`,
        requestKey: null,
    });

    const ownedIds = new Set(ownedTechs.map(ot => ot.technology_id));

    // Get all techs from static data
    const allTechs = getAllTechnologies();

    return allTechs.map(tech => ({
        ...tech,
        isOwned: ownedIds.has(tech.id)
    }));
}
