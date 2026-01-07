import { writable } from 'svelte/store';
import type { AuthModel } from 'pocketbase';
import type { Company } from '$lib/pocketbase';
import pb from '$lib/pocketbase';

export const currentUser = writable<AuthModel | null>(null);
export const activeCompany = writable<Company | null>(null);

/**
 * Refreshes the active company from the user's active_company field
 */
export async function refreshActiveCompany(): Promise<void> {
  const user = pb.authStore.model;
  if (!user?.id) return;

  try {
    // Refresh user record to get latest active_company
    const freshUser = await pb.collection('users').getOne(user.id);
    const activeCompanyId = freshUser.active_company;

    if (activeCompanyId) {
      const company = await pb.collection('companies').getOne<Company>(activeCompanyId);
      activeCompany.set(company);
    } else {
      activeCompany.set(null);
    }
  } catch (err) {
    console.error('Failed to refresh active company:', err);
    activeCompany.set(null);
  }
}
