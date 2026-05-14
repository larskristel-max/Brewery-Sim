import { getRecipe, recipes } from '../data/recipes.js';
export const formatClock = (minute) => {
    const dayMinute = minute % (24 * 60);
    const hours = Math.floor(dayMinute / 60);
    const minutes = dayMinute % 60;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${suffix}`;
};
export const formatCurrency = (amount) => `€${amount}`;
export const recipeCanStart = (state, recipe) => state.inventory.grain >= recipe.grainCost &&
    state.inventory.hops >= recipe.hopCost &&
    state.inventory.yeast >= recipe.yeastCost &&
    state.inventory.water >= recipe.waterCost &&
    !state.batches.some((batch) => batch.step === 'mashing');
export const readyToPackage = (state) => state.batches.some((batch) => batch.step === 'ready');
export const activeBatchForStep = (state, step) => state.batches.find((batch) => batch.step === step);
export const objectiveProgress = (state) => {
    const hasKettle = state.upgrades['larger-kettle'].purchased;
    const cashProgress = Math.min(state.cash, 500);
    return {
        label: hasKettle ? 'Objective complete: larger kettle installed.' : `Earn €500 and buy the larger kettle. €${cashProgress}/€500`,
        progress: hasKettle ? 100 : Math.round((cashProgress / 500) * 100),
        complete: hasKettle
    };
};
export const demandProgress = (state) => `${state.demand.accountName}: ${state.demand.casesSold}/${state.demand.casesRequested} cases`;
export const nextSuggestedAction = (state) => {
    if (!state.upgrades['larger-kettle'].purchased && state.cash >= 500) {
        return 'Buy the larger kettle upgrade.';
    }
    if (state.batches.length === 0 && state.inventory.cases === 0) {
        return 'Tap the 40 L mash kettle to start a brew.';
    }
    if (readyToPackage(state)) {
        return 'Tap the bench capper to package the finished batch.';
    }
    if (state.inventory.cases > 0 && state.demand.casesSold < state.demand.casesRequested) {
        return 'Tap ready cases to sell into today’s local demand.';
    }
    return 'Let the batch progress or clean equipment to reduce risk.';
};
export const visibleRecipes = () => recipes;
export const saleValue = (state, cases) => {
    const recipe = getRecipe('garage-pale');
    const reputationBonus = 1 + Math.min(state.reputation, 30) / 100;
    return Math.round(cases * recipe.salePricePerCase * reputationBonus);
};
//# sourceMappingURL=selectors.js.map