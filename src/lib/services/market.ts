import pb from "$lib/pocketbase";

export interface Item {
    id: string;
    name: string;
    type: "Ressource Brute" | "Composant" | "Produit Fini" | "Machine";
    base_price: number;
    volatility: number;
    product?: string;
    product_quantity?: number;
}

/**
 * Achète un item au marché pour l'entreprise active
 * 
 * @param companyId - ID de l'entreprise
 * @param item - Objet item complet
 * @param quantity - Quantité à acheter
 * 
 * NOTE: Le hook inventory.pb.js s'occupe de:
 * - Vérifier que l'utilisateur est CEO
 * - Vérifier le solde disponible
 * - Déduire le coût du balance
 */
export async function buyItem(companyId: string, item: Item, quantity: number): Promise<void> {
    try {
        // Créer/mettre à jour l'inventaire
        // Le hook inventory.pb.js déduira automatiquement le balance lors de la création
        const existing = await pb.collection("inventory").getFirstListItem(
            `company="${companyId}" && item="${item.id}"`,
            { requestKey: null }
        ).catch(() => null);

        if (existing) {
            // Item déjà en inventaire, juste augmenter la quantité
            await pb.collection("inventory").update(existing.id, {
                quantity: (existing.quantity || 0) + quantity
            });
        } else {
            // Nouvel item - créer l'inventaire
            // Le hook déduira le coût du solde
            await pb.collection("inventory").create({
                company: companyId,
                item: item.id,
                quantity: quantity
            });
        }

        const totalCost = item.base_price * quantity;
        console.log(`[MARKET] Achat réussi: ${quantity}x ${item.name} pour €${totalCost}`);
    } catch (err: any) {
        console.error("[MARKET] Erreur lors de l'achat:", err);
        throw new Error(err.message || "Une erreur est survenue lors de l'achat.");
    }
}

/**
 * Liste les items disponibles à l'achat (tout sauf Produit Fini peut-être ?)
 */
export async function fetchMarketItems(): Promise<Item[]> {
    return await pb.collection("items").getFullList<Item>({
        sort: "name",
        filter: 'type != "Produit Fini"' // Le marché vend des matières et machines
    });
}
