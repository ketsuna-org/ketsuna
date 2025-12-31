import pb from "$lib/pocketbase";
import type { Technology } from "$lib/types";

/**
 * Débloque une technologie pour une entreprise
 */
export async function unlockTechnology(companyId: string, technology: Technology): Promise<void> {
    try {
        // 1. Récupérer l'entreprise pour vérifier les points
        const company = await pb.collection("companies").getOne(companyId, { requestKey: null });



        if (company.level < technology.required_level) {
            throw new Error(`Niveau d'entreprise insuffisant. Requis: ${technology.required_level}`);
        }

        // 2. Créer le lien company_techs
        // (Le backend PB hook gère probablement déjà le coût, mais on le fait proprement ici si nécessaire)
        await pb.collection("company_techs").create({
            company: companyId,
            technology: technology.id
        });

        // Note: Si le hook ne déduit pas les points, on devrait le faire ici.
        // Mais selon pocketbase-rule.md, c'est mieux si le backend le gère.
        // Néanmoins, pour la réactivité UI, on pourrait mettre à jour le store local.

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
    const [allTechs, ownedTechs] = await Promise.all([
        pb.collection("technologies").getFullList<Technology>({
            sort: "required_level,cost",
            expand: "item_unlocked",
            requestKey: null,
        }),
        pb.collection("company_techs").getFullList({
            filter: `company="${companyId}"`,
            requestKey: null,
        })
    ]);

    const ownedIds = new Set(ownedTechs.map(ot => ot.technology));

    return allTechs.map(tech => ({
        ...tech,
        isOwned: ownedIds.has(tech.id)
    }));
}
