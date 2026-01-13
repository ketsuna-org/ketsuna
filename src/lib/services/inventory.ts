import pb from "$lib/pocketbase";
import { logAnalyticsEvent } from '$lib/firebase';

/**
 * Sell items from company inventory
 * @param itemId - The item ID to sell
 * @param quantity - How many to sell
 * @param storageId - Optional: If selling from a storage unit, pass the linked_storage ID. 
 *                    If empty/undefined, sells from the general company inventory (linked_storage is empty).
 */
export async function sellItem(itemId: string, quantity: number, storageId?: string) {
    if (!itemId) throw new Error("itemId requis");
    if (!quantity || quantity <= 0) throw new Error("Quantité invalide");

    const res = await pb.send("/api/inventory/sell", {
        method: "POST",
        body: { itemId, quantity, storageId: storageId || "" }
    });
    
    logAnalyticsEvent("inventory_sell", { itemId, quantity, revenue: (res as any).revenue });

    return res as { success: boolean; revenue: number; unitSellPrice: number; techGain: number };
}
