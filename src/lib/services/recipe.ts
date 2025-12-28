import pb from "$lib/pocketbase";
import type { Recipe, RecipeInput, Item, InventoryItem } from "$lib/types";

/**
 * Récupère toutes les recettes disponibles pour une entreprise
 * En filtrant par les technologies requises (si applicable)
 * 
 * @param companyId - ID de l'entreprise
 * @returns Liste des recettes disponibles avec expand sur items
 */
export async function fetchAvailableRecipes(companyId: string): Promise<Recipe[]> {
    try {
        // Récupérer toutes les recettes avec expand sur output_item et required_tech
        const allRecipes = await pb.collection("recipes").getFullList<Recipe>({
            expand: "output_item,required_tech",
            requestKey: null,
        });

        // Récupérer les technologies possédées par l'entreprise
        const ownedTechs = await pb.collection("company_techs").getFullList({
            filter: `company="${companyId}"`,
            fields: "technology",
            requestKey: null,
        });

        const ownedTechIds = new Set(ownedTechs.map(ct => ct.technology));

        // Filtrer les recettes: 
        // - Si required_tech est vide => accessible
        // - Si required_tech existe => vérifier que l'entreprise l'a
        const availableRecipes = allRecipes.filter(recipe => {
            if (!recipe.required_tech) {
                return true; // Pas de tech requise
            }
            return ownedTechIds.has(recipe.required_tech);
        });

        return availableRecipes;
    } catch (err: any) {
        console.error("[RECIPE] Erreur lors de la récupération des recettes:", err);
        throw new Error(err.message || "Impossible de récupérer les recettes");
    }
}

/**
 * Vérifie si une recette peut être produite avec le stock actuel
 * 
 * @param companyId - ID de l'entreprise
 * @param recipe - La recette à vérifier
 * @returns Objet avec { canProduce: boolean, shortages: Array<{item, needed, available}> }
 */
export async function checkRecipeRequirements(
    companyId: string,
    recipe: Recipe
): Promise<{
    canProduce: boolean;
    shortages: Array<{ itemId: string; itemName: string; needed: number; available: number }>;
}> {
    try {
        const inputs = recipe.inputs_json as RecipeInput[];

        // Récupérer l'inventaire actuel
        const inventory = await pb.collection("inventory").getFullList<InventoryItem>({
            filter: `company="${companyId}"`,
            expand: "item",
            requestKey: null,
        });

        const inventoryMap = new Map<string, { quantity: number; name: string }>();
        inventory.forEach(inv => {
            inventoryMap.set(inv.item, {
                quantity: inv.quantity,
                name: inv.expand?.item?.name || "Item inconnu",
            });
        });

        const shortages: Array<{ itemId: string; itemName: string; needed: number; available: number }> = [];

        // Vérifier chaque input
        for (const input of inputs) {
            const current = inventoryMap.get(input.item_id);
            const available = current?.quantity ?? 0;

            if (available < input.quantity) {
                shortages.push({
                    itemId: input.item_id,
                    itemName: current?.name || "Item inconnu",
                    needed: input.quantity,
                    available,
                });
            }
        }

        return {
            canProduce: shortages.length === 0,
            shortages,
        };
    } catch (err: any) {
        console.error("[RECIPE] Erreur lors de la vérification des requis:", err);
        throw new Error(err.message || "Impossible de vérifier les requis de la recette");
    }
}

/**
 * Produit un item à partir d'une recette (décrémenter inputs, incrémenter output)
 * 
 * @param companyId - ID de l'entreprise
 * @param recipe - La recette à produire
 * @param quantity - Nombre de fois à produire (par défaut 1)
 * @returns Les résultats de la production
 */
export async function produceFromRecipe(
    companyId: string,
    recipe: Recipe,
    quantity: number = 1
): Promise<{
    success: boolean;
    outputItemId: string;
    outputQuantity: number;
    inputsConsumed: Array<{ itemId: string; quantity: number }>;
}> {
    try {
        // Vérifier d'abord que on peut produire
        const requirements = await checkRecipeRequirements(companyId, recipe);
        if (!requirements.canProduce && quantity > 0) {
            const shortageMsg = requirements.shortages
                .map(s => `${s.itemName}: besoin ${s.needed}, disponible ${s.available}`)
                .join("; ");
            throw new Error(`Stock insuffisant: ${shortageMsg}`);
        }

        const inputs = recipe.inputs_json as RecipeInput[];
        const outputItemId = recipe.output_item;
        const inputsConsumed: Array<{ itemId: string; quantity: number }> = [];

        // Étape 1: Décrementer les inputs
        for (const input of inputs) {
            const totalToConsume = input.quantity * quantity;

            // Récupérer le record d'inventaire
            const invRecord = await pb.collection("inventory").getFirstListItem(
                `company="${companyId}" && item="${input.item_id}"`,
                { requestKey: null }
            );

            const newQuantity = Math.max(0, invRecord.quantity - totalToConsume);

            await pb.collection("inventory").update(invRecord.id, {
                quantity: newQuantity,
            });

            inputsConsumed.push({
                itemId: input.item_id,
                quantity: totalToConsume,
            });
        }

        // Étape 2: Incrémenter l'output
        let outputRecord = await pb.collection("inventory").getFirstListItem(
            `company="${companyId}" && item="${outputItemId}"`,
            { requestKey: null }
        ).catch(() => null);

        if (outputRecord) {
            // Mettre à jour la quantité existante
            await pb.collection("inventory").update(outputRecord.id, {
                quantity: outputRecord.quantity + quantity,
            });
        } else {
            // Créer un nouveau record d'inventaire
            await pb.collection("inventory").create({
                company: companyId,
                item: outputItemId,
                quantity: quantity,
            });
        }

        // Étape 3: Augmenter la réputation de l'entreprise
        const company = await pb.collection("companies").getOne(companyId);
        await pb.collection("companies").update(companyId, {
            reputation: (company.reputation || 0) + quantity,
        });

        console.log(
            `[RECIPE] Produit: ${recipe.expand?.output_item?.name || outputItemId} x${quantity}`
        );

        return {
            success: true,
            outputItemId,
            outputQuantity: quantity,
            inputsConsumed,
        };
    } catch (err: any) {
        console.error("[RECIPE] Erreur lors de la production:", err);
        throw new Error(err.message || "Erreur lors de la production");
    }
}

/**
 * Récupère les détails d'une recette avec expansion complète
 * 
 * @param recipeId - ID de la recette
 * @returns Détails completa de la recette
 */
export async function getRecipeDetails(recipeId: string): Promise<Recipe> {
    try {
        const recipe = await pb.collection("recipes").getOne<Recipe>(recipeId, {
            expand: "output_item,required_tech",
            requestKey: null,
        });

        return recipe;
    } catch (err: any) {
        console.error("[RECIPE] Erreur lors de la récupération des détails:", err);
        throw new Error(err.message || "Impossible de récupérer la recette");
    }
}
