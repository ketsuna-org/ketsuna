import pb from "$lib/pocketbase";

export async function sellItem(itemId: string, quantity: number) {
    if (!itemId) throw new Error("itemId requis");
    if (!quantity || quantity <= 0) throw new Error("Quantité invalide");

    const res = await pb.send("/api/inventory/sell", {
        method: "POST",
        body: { itemId, quantity }
    });
    return res as { success: boolean; revenue: number; unitSellPrice: number; techGain: number };
}
