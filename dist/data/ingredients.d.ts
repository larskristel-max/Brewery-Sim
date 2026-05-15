import type { Ingredient, IngredientId, IngredientStock } from '../game/schema.js';
export declare const ingredients: Ingredient[];
export declare const getIngredient: (ingredientId: IngredientId) => Ingredient;
export declare const createIngredientStock: () => Record<IngredientId, IngredientStock>;
