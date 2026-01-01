import pb from "$lib/pocketbase";
import type { Recipe } from "$lib/pocketbase";

export interface Item {
    id: string;
    name: string;
    type: "Ressource Brute" | "Composant" | "Produit Fini" | "Machine" | "Stockage";
    base_price: number;
    volatility: number;
    product?: string;
    product_quantity?: number;
    use_recipe?: string;
    minable?: boolean;
    circulating_supply?: number;
    market_demand?: number;
    // Energy properties
    need_energy?: number;
    produce_energy?: number;
    can_store_energy?: number;
    energy_type?: string;
    // Machine capacity
    max_employee?: number;
    expand?: {
        use_recipe?: Recipe;
    };
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
        await pb.send("/api/inventory/purchase", {
            method: "POST",
            body: {
                companyId,
                itemId: item.id,
                quantity
            }
        });

        const totalCost = item.base_price * quantity;
        console.log(`[MARKET] Achat réussi: ${quantity}x ${item.name} pour €${totalCost}`);
    } catch (err: unknown) {
        const error = err as Error;
        console.error("[MARKET] Erreur lors de l'achat:", error);
        throw new Error(error.message || "Une erreur est survenue lors de l'achat.");
    }
}

/**
 * Liste les items disponibles à l'achat (tout sauf Produit Fini peut-être ?)
 */
export async function fetchMarketItems(): Promise<Item[]> {
    return await pb.collection("items").getFullList<Item>({
        sort: "name",
        filter: 'type != "Produit Fini"', // Le marché vend des matières et machines
        expand: "use_recipe.inputs_items,use_recipe.output_item,product",
        requestKey: null
    });
}
