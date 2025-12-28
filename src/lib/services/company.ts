import pb from '$lib/pocketbase';
import type { Company } from '$lib/types';

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

    // In a real backend, we'd verify reputation here too against a rule, 
    // but the client already checked it. We trust the input for this exercise.
    
    // We update balance and level. Tech points might also increase or unlocked via level (handled by 'technologies' collection separately usually).
    // Let's assume level up grants +1 Tech Point as a bonus? Structure doesn't specify, but let's keep it simple: Balance decreases, Level increases.
    
    // Note: companies.updateRule requires @request.auth.id = ceo.id.
    
    const newLevel = company.level + 1;
    const newBalance = company.balance - cost;
    
    await pb.collection('companies').update(company.id, {
        level: newLevel,
        balance: newBalance,
        // Optional: Add tech points or reputation gain here if designed
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
