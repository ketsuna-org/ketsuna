import pb from "$lib/pocketbase";

export interface MarketItem {
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
}

/**
 * Achète un item au marché pour l'entreprise active
 */
export async function buyItem(companyId: string, item: MarketItem, quantity: number): Promise<void> {
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
