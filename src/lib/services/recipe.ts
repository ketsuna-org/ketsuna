import pb from "$lib/pocketbase";
import type { Recipe, InventoryItem } from "$lib/types";

/**
 * Récupère toutes les recettes disponibles pour une entreprise
 * En filtrant par les technologies requises (si applicable)
 * 
 * @param companyId - ID de l'entreprise
 * @returns Liste des recettes disponibles avec expand sur items
 */
export async function fetchAvailableRecipes(companyId: string): Promise<Recipe[]> {
    try {
        // Récupérer toutes les recettes avec expand sur output_item, required_tech et inputs_items
        const allRecipes = await pb.collection("recipes").getFullList<Recipe>({
            expand: "output_item,required_tech,inputs_items",
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
        const inputIds = Array.from(new Set(recipe.inputs_items || []));
        const unitQty = recipe.input_quantity || 1;

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
        for (const itemId of inputIds) {
            const current = inventoryMap.get(itemId);
            const available = current?.quantity ?? 0;

            if (available < unitQty) {
                // Essayer de trouver le nom dans l'expansion de la recette si absent de l'inventaire
                const expandedItem = recipe.expand?.inputs_items?.find(i => i.id === itemId);
                const itemName = current?.name || expandedItem?.name || "Item inconnu";

                shortages.push({
                    itemId: itemId,
                    itemName: itemName,
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
 * @param companyId - ID de l'entreprise (optionnel, récupéré via l'utilisateur côté backend)
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
        // Appeler l'endpoint custom pour une production atomique et sécurisée
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

        console.log(
            `[RECIPE] Production réussie: ${result.itemName} x${quantity}`
        );

        return {
            success: true,
            outputItemId: recipe.output_item,
            outputQuantity: quantity,
            inputsConsumed: [] // Non renvoyé par le backend actuellement ou format différent
        };
    } catch (err: unknown) {
        const error = err as Error;
        console.error("[RECIPE] Erreur lors de la production:", error);
        throw new Error(error.message || "Erreur lors de la production");
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
    } catch (err: unknown) {
        const error = err as Error;
        console.error("[RECIPE] Erreur lors de la récupération des détails:", error);
        throw new Error(error.message || "Impossible de récupérer la recette");
    }
}
