import pb from "$lib/pocketbase";
import type { Technology } from "$lib/types";

/**
 * Débloque une technologie pour une entreprise
 */
export async function unlockTechnology(companyId: string, technology: Technology): Promise<void> {
    try {
        // 1. Récupérer l'entreprise pour vérifier les points
        const company = await pb.collection("companies").getOne(companyId, { requestKey: null });




        // Vérification du solde (Check balance)
        if (company.balance < technology.cost) {
            throw new Error(`Fonds insuffisants. Requis: ${technology.cost}, Actuel: ${company.balance}`);
        }

        if (company.level < technology.required_level) {
            throw new Error(`Niveau d'entreprise insuffisant. Requis: ${technology.required_level}`);
        }

        // 2. Créer le lien company_techs
        // Le backend gère la déduction du solde via les hooks
        await pb.collection("company_techs").create({
            company: companyId,
            technology: technology.id
        });

        // Refresh store happen in the component via activeCompany update

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
