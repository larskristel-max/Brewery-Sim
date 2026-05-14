import type { BatchStep, GameState, Recipe } from './schema.js';
export declare const formatClock: (minute: number) => string;
export declare const formatCurrency: (amount: number) => string;
export declare const recipeCanStart: (state: GameState, recipe: Recipe) => boolean;
export declare const readyToPackage: (state: GameState) => boolean;
export declare const activeBatchForStep: (state: GameState, step: BatchStep) => import("./schema.js").Batch | undefined;
export declare const objectiveProgress: (state: GameState) => {
    label: string;
    progress: number;
    complete: boolean;
};
export declare const demandProgress: (state: GameState) => string;
export declare const nextSuggestedAction: (state: GameState) => string;
export declare const visibleRecipes: () => Recipe[];
export declare const saleValue: (state: GameState, cases: number) => number;
