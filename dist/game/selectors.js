import { getIngredient } from '../data/ingredients.js';
import { getRecipe, recipes } from '../data/recipes.js';
export const formatClock = (minute) => {
    const dayMinute = minute % (24 * 60);
    const hours = Math.floor(dayMinute / 60);
    const minutes = dayMinute % 60;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${suffix}`;
};
export const formatCurrency = (amount) => `EUR ${amount}`;
export const ingredientAmountLabel = (ingredientId, amount) => {
    const ingredient = getIngredient(ingredientId);
    if (ingredient.unit === 'kg')
        return `${amount.toFixed(amount % 1 === 0 ? 0 : 1)} kg`;
    if (ingredient.unit === 'g')
        return `${Math.round(amount)} g`;
    if (ingredient.unit === 'pack')
        return `${amount} pack${amount === 1 ? '' : 's'}`;
    return `${amount} units`;
};
export const ingredientUnitCost = (ingredientId) => {
    const ingredient = getIngredient(ingredientId);
    return ingredient.packPrice / ingredient.packSize;
};
export const recipeIngredientCost = (recipe) => Math.round(recipe.ingredients.reduce((total, item) => total + ingredientUnitCost(item.ingredientId) * item.amount, 0));
export const recipeMissingIngredients = (state, recipe) => recipe.ingredients
    .map((item) => {
    const stock = state.inventory.ingredients[item.ingredientId]?.amount ?? 0;
    return { ingredientId: item.ingredientId, amount: Math.max(0, item.amount - stock) };
})
    .filter((item) => item.amount > 0);
export const recipeCanStart = (state, recipe) => recipe.enabled &&
    state.inventory.water >= recipe.waterCost &&
    recipeMissingIngredients(state, recipe).length === 0 &&
    !state.batches.some((batch) => batch.step === 'mashing');
export const orderCost = (items) => Math.round(items.reduce((total, item) => {
    const ingredient = getIngredient(item.ingredientId);
    const packs = Math.ceil(item.amount / ingredient.packSize);
    return total + packs * ingredient.packPrice;
}, 0));
export const recipeOrderItems = (state, recipe, mode) => {
    if (mode === 'extra')
        return recipe.ingredients;
    return recipeMissingIngredients(state, recipe);
};
export const storageUseByArea = (state) => {
    const use = { 'dry-shelf': 0, 'cold-box': 0, 'utility-shelf': 0 };
    Object.entries(state.inventory.ingredients).forEach(([ingredientId, stock]) => {
        const ingredient = getIngredient(ingredientId);
        if (ingredient.storageArea === 'cold-box' && ingredient.unit === 'g')
            use['cold-box'] += stock.amount / 1000;
        else if (ingredient.storageArea === 'cold-box' && ingredient.unit === 'pack')
            use['cold-box'] += stock.amount * 0.0115;
        else
            use[ingredient.storageArea] += stock.amount;
    });
    return use;
};
export const storageCapacityByArea = (state) => ({
    'dry-shelf': state.storage.dryShelfCapacity,
    'cold-box': state.storage.coldBoxCapacity,
    'utility-shelf': state.storage.utilityShelfCapacity
});
export const storageOverflowByArea = (state) => {
    const use = storageUseByArea(state);
    const capacity = storageCapacityByArea(state);
    return {
        'dry-shelf': Math.max(0, use['dry-shelf'] - capacity['dry-shelf']),
        'cold-box': Math.max(0, use['cold-box'] - capacity['cold-box']),
        'utility-shelf': Math.max(0, use['utility-shelf'] - capacity['utility-shelf'])
    };
};
export const totalStorageOverflow = (state) => {
    const overflow = storageOverflowByArea(state);
    return overflow['dry-shelf'] + overflow['cold-box'] + overflow['utility-shelf'];
};
export const readyToPackage = (state) => state.batches.some((batch) => batch.step === 'ready');
export const activeBatchForStep = (state, step) => state.batches.find((batch) => batch.step === step);
export const equipmentConditionTier = (condition) => {
    if (condition >= 85)
        return 'clean';
    if (condition >= 65)
        return 'worn';
    if (condition >= 40)
        return 'dirty';
    return 'critical';
};
export const equipmentConditionLabel = (condition) => {
    const tier = equipmentConditionTier(condition);
    if (tier === 'clean')
        return 'Clean';
    if (tier === 'worn')
        return 'Worn';
    if (tier === 'dirty')
        return 'Dirty';
    return 'Critical';
};
export const contaminationRiskTier = (risk) => {
    if (risk <= 14)
        return 'low';
    if (risk <= 24)
        return 'elevated';
    if (risk <= 34)
        return 'high';
    return 'severe';
};
export const objectiveProgress = (state) => {
    const hasKettle = state.upgrades['larger-kettle'].purchased;
    const hasLabeler = state.upgrades.labeler.purchased;
    const cashProgress = Math.min(state.cash, 500);
    if (hasKettle && !hasLabeler) {
        const labelerCost = state.upgrades.labeler.cost;
        const labelerProgress = Math.min(state.cash, labelerCost);
        return {
            label: `Next objective: install the hand labeler. EUR ${labelerProgress}/EUR ${labelerCost}`,
            progress: Math.round((labelerProgress / labelerCost) * 100),
            complete: false
        };
    }
    return {
        label: hasKettle ? 'Objective complete: larger kettle and hand labeler installed.' : `Earn EUR 500 and buy the larger kettle. EUR ${cashProgress}/EUR 500`,
        progress: hasKettle ? 100 : Math.round((cashProgress / 500) * 100),
        complete: hasKettle
    };
};
export const demandProgress = (state) => `${state.demand.accountName}: ${state.demand.casesSold}/${state.demand.casesRequested} cases`;
export const currentWorkflowStage = (state) => {
    const readyBatch = state.batches.find((batch) => batch.step === 'ready');
    if (readyBatch) {
        return {
            stage: 'Package',
            tapTarget: 'bottler',
            instruction: `Tap the bottling station to stack ${readyBatch.casesExpected} cases.`
        };
    }
    if (state.inventory.cases > 0 && state.demand.casesSold < state.demand.casesRequested) {
        return {
            stage: 'Sell',
            tapTarget: 'cases',
            instruction: `Tap cases to sell into ${state.demand.accountName}'s order.`
        };
    }
    const activeBatch = state.batches[0];
    if (!activeBatch) {
        return {
            stage: 'Mash',
            tapTarget: 'kettle',
            instruction: 'Tap the 40 L mash kettle and choose a recipe.'
        };
    }
    if (activeBatch.step === 'mashing') {
        return {
            stage: 'Mash',
            tapTarget: 'kettle',
            instruction: 'Mash is running. Watch the kettle finish its stage.'
        };
    }
    if (activeBatch.step === 'fermenting') {
        return {
            stage: 'Ferment',
            tapTarget: 'fermenter',
            instruction: 'Fermentation is running. Tap the fermenter to check contamination risk.'
        };
    }
    return {
        stage: 'Package',
        tapTarget: 'bottler',
        instruction: 'Packaging is running. Watch the bottling station finish its stage.'
    };
};
export const nextSuggestedAction = (state) => {
    if (!state.upgrades['larger-kettle'].purchased && state.cash >= 500) {
        return 'Buy the larger kettle upgrade.';
    }
    return currentWorkflowStage(state).instruction;
};
export const visibleRecipes = () => recipes;
export const saleValue = (state, cases) => {
    const lot = state.finishedBeerLots[0];
    const recipe = getRecipe(lot?.recipeId ?? 'garage-blonde');
    const qualityMultiplier = lot ? 0.75 + Math.max(35, lot.quality) / 200 : 1;
    const reputationBonus = 1 + Math.min(state.reputation, 30) / 100;
    return Math.round(cases * recipe.salePricePerCase * recipe.marketAppeal * qualityMultiplier * reputationBonus);
};
//# sourceMappingURL=selectors.js.map