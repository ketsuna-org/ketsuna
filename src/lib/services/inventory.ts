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

/**
 * Sell multiple items from a storage or general inventory in one request.
 * @param storageId - Empty string to target general company inventory, or a storage unit id.
 * @param items - Array of items to sell with their quantities.
 */
export async function sellInventoryBulk(
    storageId: string,
    items: Array<{ itemId: string; quantity: number }>
) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("Aucun item à vendre");
    }

    const payload = {
        storageId: storageId || "",
        items: items.map((it) => ({ itemId: it.itemId, quantity: it.quantity })),
    };

    const res = await pb.send("/api/inventory/sell-bulk", {
        method: "POST",
        body: payload,
    });

    logAnalyticsEvent("inventory_sell_bulk", {
        storageId: storageId || "",
        itemCount: items.length,
    });

    return res as {
        success: boolean;
        storageId: string;
        totalRevenue: number;
        itemsSold: Array<{ itemId: string; quantity: number; revenue: number; unitSellPrice: number }>;
        failures: Array<{ itemId: string; quantity: number; error: string }>;
    };
}
