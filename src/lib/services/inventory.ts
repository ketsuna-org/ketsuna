import pb from "$lib/pocketbase";
import { logAnalyticsEvent } from '$lib/firebase';

export async function sellItem(itemId: string, quantity: number) {
    if (!itemId) throw new Error("itemId requis");
    if (!quantity || quantity <= 0) throw new Error("Quantité invalide");

    const res = await pb.send("/api/inventory/sell", {
        method: "POST",
        body: { itemId, quantity }
    });
    
    logAnalyticsEvent("inventory_sell", { itemId, quantity, revenue: (res as any).revenue });

    return res as { success: boolean; revenue: number; unitSellPrice: number; techGain: number };
}
