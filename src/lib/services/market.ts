import pb from "$lib/pocketbase";
import { logAnalyticsEvent } from '$lib/firebase';

import type { Item as MarketItem } from "$lib/types/game";
export type { MarketItem };

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
          logAnalyticsEvent("market_buy", { 
              item_id: item.id, 
              item_name: item.name, 
              quantity, 
              total_cost: totalCost 
          });
      } catch (err: unknown) {
          const error = err as Error;
          console.error("[MARKET] Erreur lors de l'achat:", error);
          throw new Error(error.message || "Une erreur est survenue lors de l'achat.");
      }
  }
