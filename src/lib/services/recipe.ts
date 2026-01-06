import pb from "$lib/pocketbase";
import type { Recipe, InventoryItem } from "$lib/pocketbase";
import { getAllRecipes, getItem, getRecipe } from "$lib/data/game-static";

/**
 * Récupère toutes les recettes disponibles pour une entreprise
 * En filtrant par les technologies requises (si applicable)
 * 
 * @param companyId - ID de l'entreprise
 * @returns Liste des recettes disponibles
 */
export async function fetchAvailableRecipes(companyId: string): Promise<Recipe[]> {
    try {
        const allRecipes = getAllRecipes();

        // Récupérer les technologies possédées par l'entreprise
        const ownedTechs = await pb.collection("company_techs").getFullList({
            filter: `company="${companyId}"`,
            fields: "technology_id",
            requestKey: null,
        });

        const ownedTechIds = new Set(ownedTechs.map(ct => ct.technology_id));

        // Filtrer les recettes
        const availableRecipes = allRecipes.filter(recipe => {
            if (!recipe.required_tech) {
                return true; 
            }
            return ownedTechIds.has(recipe.required_tech);
        });

        return availableRecipes as Recipe[];
    } catch (err: unknown) {
        const error = err as Error;
        console.error("[RECIPE] Erreur lors de la récupération des recettes:", error);
        throw new Error(error.message || "Impossible de récupérer les recettes");
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
        const inputIds = recipe.inputs_items || [];
        const unitQty = recipe.input_quantity || 1;

        // Récupérer l'inventaire actuel
        const inventory = await pb.collection("inventory").getFullList<InventoryItem>({
            filter: `company="${companyId}"`,
            requestKey: null,
        });

        const inventoryMap = new Map<string, number>();
        inventory.forEach(inv => {
            inventoryMap.set(inv.item_id, inv.quantity);
        });

        const shortages: Array<{ itemId: string; itemName: string; needed: number; available: number }> = [];

        // Vérifier chaque input
        for (const itemId of inputIds) {
            const available = inventoryMap.get(itemId) ?? 0;

            if (available < unitQty) {
                const item = getItem(itemId);
                shortages.push({
                    itemId: itemId,
                    itemName: item?.name || "Item inconnu",
                    needed: unitQty,
                    available,
                });
            }
        }

        return {
            canProduce: shortages.length === 0,
            shortages,
        };
    } catch (err: unknown) {
        const error = err as Error;
        console.error("[RECIPE] Erreur lors de la vérification des requis:", error);
        throw new Error(error.message || "Impossible de vérifier les requis de la recette");
    }
}

/**
 * Produit un item à partir d'une recette via l'endpoint custom
 * 
 * @param recipe - La recette à produire
 * @param quantity - Nombre de fois à produire (par défaut 1)
 * @returns Les résultats de la production
 */
export async function produceFromRecipe(
    _companyId: string,
    recipe: Recipe,
    quantity: number = 1
): Promise<{
    success: boolean;
    outputItemId: string;
    outputQuantity: number;
    inputsConsumed: Array<{ itemId: string; quantity: number }>;
}> {
    try {
        // Appeler l'endpoint custom
        const response = await fetch(`${pb.baseUrl}/api/workshop/produce`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": pb.authStore.token
            },
            body: JSON.stringify({
                recipeId: recipe.id,
                quantity: quantity
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Erreur lors de la production");
        }

        return {
            success: true,
            outputItemId: recipe.output_item,
            outputQuantity: quantity,
            inputsConsumed: []
        };
    } catch (err: unknown) {
        const error = err as Error;
        console.error("[RECIPE] Erreur lors de la production:", error);
        throw new Error(error.message || "Erreur lors de la production");
    }
}

/**
 * Récupère les détails d'une recette
 * 
 * @param recipeId - ID de la recette
 * @returns Détails de la recette
 */
export async function getRecipeDetails(recipeId: string): Promise<Recipe> {
    const recipe = getRecipe(recipeId);
    if (!recipe) {
        throw new Error("Recette introuvable");
    }
    return recipe;
}
