<script lang="ts">
    import type { Technology, Company } from "$lib/types";
    import { unlockTechnology } from "$lib/services/tech";
    import { notifications } from "$lib/notifications";
    import { activeCompany } from "$lib/stores";
    import pb from "$lib/pocketbase";

    /**
     * @type {Technology} - Données de la technologie à afficher
     */
    export let technology: Technology;

    /**
     * @type {number} - Points de tech actuels disponibles
     */
    export let availableTechPoints: number = 0;

    /**
     * @type {number} - Niveau de l'entreprise
     */
    export let companyLevel: number = 1;

    /**
     * @type {string} - ID de l'entreprise
     */
    export let companyId: string = "";

    /**
     * @type {boolean} - Si la technologie est déjà débloquée
     */
    export let isOwned: boolean = false;

    /**
     * @type {() => void} - Callback pour rafraîchir après achat
     */
    export let onUnlock: (() => void) | null = null;

    let isLoading = false;

    const canUnlock =
        !isOwned &&
        availableTechPoints >= technology.cost &&
        companyLevel >= technology.required_level;

    async function handleUnlock() {
        if (!canUnlock || !companyId) return;

        isLoading = true;
        try {
            await unlockTechnology(companyId, technology);
            // Refresh activeCompany store to reflect tech_points and balance changes
            const updated = await pb
                .collection("companies")
                .getOne<Company>(companyId);
            activeCompany.set(updated);
            notifications.success(`${technology.name} débloquée !`);
            onUnlock?.();
        } catch (error: any) {
            notifications.error(`Erreur: ${error.message}`);
        } finally {
            isLoading = false;
        }
    }
</script>

<div
    class="border border-slate-700 rounded-lg p-4 bg-slate-800 hover:border-indigo-500 hover:shadow-lg transition-all"
>
    <!-- Header -->
    <div class="flex justify-between items-start mb-3">
        <div class="flex-1">
            <h3 class="text-lg font-semibold text-white mb-1">
                {technology.name}
            </h3>
            <p class="text-sm text-slate-400">{technology.description}</p>
        </div>
        {#if isOwned}
            <div
                class="bg-emerald-500/20 border border-emerald-500 rounded px-2 py-1"
            >
                <span class="text-xs font-semibold text-emerald-400"
                    >DÉBLOQUÉE</span
                >
            </div>
        {/if}
    </div>

    <!-- Requirements -->
    <div class="mb-4 space-y-2">
        <!-- Tech Points -->
        <div class="flex items-center justify-between text-sm">
            <span class="text-slate-400">Coût:</span>
            <div class="flex items-center gap-2">
                <span class="text-indigo-400 font-semibold"
                    >{technology.cost}</span
                >
                <span class="text-slate-500">Tech Points</span>
            </div>
        </div>

        <!-- Level Requirement -->
        {#if technology.required_level > 0}
            <div class="flex items-center justify-between text-sm">
                <span class="text-slate-400">Niveau:</span>
                <div class="flex items-center gap-2">
                    <span
                        class={companyLevel >= technology.required_level
                            ? "text-emerald-400"
                            : "text-red-400"}
                    >
                        {companyLevel}/{technology.required_level}
                    </span>
                </div>
            </div>
        {/if}
    </div>

    <!-- Unlocked Items (if any) -->
    {#if technology.expand?.item_unlocked && technology.expand.item_unlocked.length > 0}
        <div class="mb-4 p-3 bg-slate-700/50 rounded border border-slate-600">
            <h4 class="text-xs font-semibold text-purple-400 mb-2">
                ITEMS DÉBLOQUÉS
            </h4>
            <div class="flex flex-wrap gap-2">
                {#each technology.expand.item_unlocked as item}
                    <span
                        class="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/50"
                    >
                        {item.name}
                    </span>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Status and Action -->
    <div class="border-t border-slate-700 pt-3">
        {#if isOwned}
            <div class="text-center text-sm text-emerald-400">
                Technologie débloquée
            </div>
        {:else}
            <div class="space-y-2">
                {#if !canUnlock}
                    <div class="text-xs text-red-400 space-y-1">
                        {#if availableTechPoints < technology.cost}
                            <div>
                                Points insuffisants:
                                <span class="font-semibold">
                                    {availableTechPoints}/{technology.cost}
                                </span>
                            </div>
                        {/if}
                        {#if companyLevel < technology.required_level}
                            <div>
                                Niveau insuffisant:
                                <span class="font-semibold">
                                    {companyLevel}/{technology.required_level}
                                </span>
                            </div>
                        {/if}
                    </div>
                {/if}
                <button
                    on:click={handleUnlock}
                    disabled={!canUnlock || isLoading}
                    class="w-full px-3 py-2 rounded font-semibold text-sm transition-all
                    {canUnlock && !isLoading
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'}"
                >
                    {#if isLoading}
                        Déblocage...
                    {:else}
                        Débloquer ({technology.cost} pts)
                    {/if}
                </button>
            </div>
        {/if}
    </div>
</div>
