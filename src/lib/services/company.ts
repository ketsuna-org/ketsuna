import pb from '$lib/pocketbase';
import type { Company } from '$lib/pocketbase';

/**
 * Handles the logic for leveling up a company.
 * Verifies requirements (Cost & Reputation) and performs the update.
 * @param company The current company object
 * @param cost The calculated monetary cost
 */
export async function levelUpCompany(company: Company, cost: number): Promise<void> {
    if (company.balance < cost) {
        throw new Error(`Insufficient funds: Need $${cost}, have $${company.balance}`);
    }

    // We update balance and level.
    // Let's assume level up grants benefits like unlocking technologies via level requirements.
    // Balance decreases, Level increases.
    
    // Use the dedicated server-side endpoint which bypasses strict field protections safely
    await pb.send("/api/company/levelup", {
        method: "POST",
        body: {
            companyId: company.id
        }
    });
}

/**
 * Deletes a company and resets the user's active company if it was the one deleted.
 * @param companyId The ID of the company to delete
 * @param userId The ID of the user who owns the company
 */
export async function deleteCompany(companyId: string, userId: string): Promise<void> {
    // 1. Delete the company (PocketBase hooks will check for employees/stock)
    await pb.collection('companies').delete(companyId);

    // 2. Fetch fresh user data to update the local owned_companies and active_company
    const user = await pb.collection('users').getOne(userId);
    
    const updatedOwned = (user.owned_companies || []).filter((id: string) => id !== companyId);
    let updatedActive = user.active_company;

    if (updatedActive === companyId) {
        updatedActive = updatedOwned.length > 0 ? updatedOwned[0] : "";
    }

    await pb.collection('users').update(userId, {
        owned_companies: updatedOwned,
        active_company: updatedActive
    });
}
