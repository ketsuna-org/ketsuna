import pb from "$lib/pocketbase";
import type { InventoryItem } from "$lib/pocketbase";
import { logAnalyticsEvent } from '$lib/firebase';

export interface ReserveOverview {
    used: number;
    max: number;
}

export interface ReserveItem {
    id: string; // record id
    collectionId: string;
    company: string;
    item: string;
    quantity: number;
    updated: string;
    expand: {
        item: {
            id: string;
            name: string;
            type: string;
            base_price: number;
        };
    };
}

export async function getReserveOverview(): Promise<ReserveOverview> {
    try {
        const response = await pb.send('/api/reserve/overview', {
            method: 'GET'
        });
        return response as ReserveOverview;
    } catch (error) {
        console.error("Error fetching reserve overview:", error);
        return { used: 0, max: 0 };
    }
}

export async function withdrawFromReserve(itemId: string, quantity: number): Promise<{ success: boolean; message: string }> {
    const res = await pb.send('/api/reserve/withdraw', {
        method: 'POST',
        body: JSON.stringify({ itemId, quantity })
    });
    logAnalyticsEvent("reserve_withdraw", { itemId, quantity });
    return res;
}

export async function fetchReserveItems(companyId: string): Promise<ReserveItem[]> {
    return await pb.collection('reserve').getFullList<ReserveItem>({
        filter: `company="${companyId}"`,
        sort: '-quantity',
        expand: 'item',
        requestKey: null // disable auto-cancellation
    });
}
