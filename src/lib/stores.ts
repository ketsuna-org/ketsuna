import { writable } from 'svelte/store';
import type { AuthModel } from 'pocketbase';
import type { Company } from '$lib/types';

export const currentUser = writable<AuthModel | null>(null);
export const activeCompany = writable<Company | null>(null);
