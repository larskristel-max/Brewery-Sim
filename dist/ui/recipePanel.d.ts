import type { GameState, Recipe, RecipeCategoryId } from '../game/schema.js';
type RecipePanelContext = {
    state: GameState;
    selectedRecipeCategoryId: RecipeCategoryId | null;
    recipePage: number;
    recipeStartBlocker: (recipe: Recipe) => string;
};
export type RecipePanelRenderResult = {
    html: string;
    recipePage: number;
};
export declare const renderRecipeSelectionPanel: (context: RecipePanelContext) => RecipePanelRenderResult;
export {};
