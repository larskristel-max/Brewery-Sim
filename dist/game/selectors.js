import { getRecipe, recipes } from '../data/recipes.js';
export const formatClock = (minute) => {
    const dayMinute = minute % (24 * 60);
    const hours = Math.floor(dayMinute / 60);
    const minutes = dayMinute % 60;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${suffix}`;
};
export const recipeCanStart = (state, recipe) => state.inventory.grain >= recipe.grainCost &&
    state.inventory.hops >= recipe.hopCost &&
    state.inventory.yeast >= recipe.yeastCost &&
    state.inventory.water >= recipe.waterCost &&
    !state.batches.some((batch) => batch.step === 'mashing');
export const readyToPackage = (state) => state.batches.some((batch) => batch.step === 'ready');
export const activeBatchForStep = (state, step) => state.batches.find((batch) => batch.step === step);
export const nextSuggestedAction = (state) => {
    if (state.batches.length === 0 && state.inventory.cases === 0) {
        return 'Start a brew in the kettle.';
    }
    if (readyToPackage(state)) {
        return 'Package the finished fermenter batch.';
    }
    if (state.inventory.cases > 0) {
        return 'Sell cases to nearby taprooms.';
    }
    return 'Let the batch progress through the garage.';
};
export const visibleRecipes = () => recipes;
export const saleValue = (state, cases) => {
    const recipe = getRecipe('garage-pale');
    const reputationBonus = 1 + Math.min(state.reputation, 30) / 100;
    return Math.round(cases * recipe.salePricePerCase * reputationBonus);
};
//# sourceMappingURL=selectors.js.map