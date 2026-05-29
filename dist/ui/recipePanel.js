import { getIngredient } from '../data/ingredients.js';
import { campaignAllowsAdvancedRecipes, campaignAllowsCleaning } from '../game/campaign.js';
import { caseCountLabel, formatCurrency, formatGameDate, ingredientAmountLabel, litersToCases, orderCost, recipeCanStart, recipeCategories, recipeMissingIngredients, recipeOrderItems, recipeStockBatchCount, visibleRecipes } from '../game/selectors.js';
import { renderBrewExplainer } from './brewNotes.js';
const recipePageSize = 4;
const brewStockLabel = (count) => `${count} batch${count === 1 ? '' : 'es'} in stock`;
const incomingForIngredient = (state, ingredientId) => state.pendingOrders.reduce((summary, order) => {
    const amount = order.items.filter((item) => item.ingredientId === ingredientId).reduce((total, item) => total + item.amount, 0);
    if (amount <= 0)
        return summary;
    return {
        amount: summary.amount + amount,
        arrivalDay: summary.arrivalDay === null ? order.arrivalDay : Math.min(summary.arrivalDay, order.arrivalDay)
    };
}, { amount: 0, arrivalDay: null });
const missingOrderStatus = (state, missing) => {
    if (missing.length === 0)
        return { fullyIncoming: false, label: '', arrivalDay: null };
    const arrivals = missing.map((item) => incomingForIngredient(state, item.ingredientId));
    const fullyIncoming = missing.every((item, index) => arrivals[index].amount >= item.amount);
    const earliest = arrivals
        .map((arrival) => arrival.arrivalDay)
        .filter((day) => day !== null)
        .sort((a, b) => a - b)[0] ?? null;
    return {
        fullyIncoming,
        arrivalDay: earliest,
        label: fullyIncoming && earliest ? `Already ordered. Arrives ${formatGameDate(earliest)}.` : earliest ? `Some supplies arrive ${formatGameDate(earliest)}.` : ''
    };
};
const renderRecipeIngredientRows = (state, recipe) => `
  <div class="recipe-ingredient-list" aria-label="${recipe.name} ingredients">
    ${recipe.ingredients
    .map((item) => {
    const ingredient = getIngredient(item.ingredientId);
    const stock = state.inventory.ingredients[item.ingredientId]?.amount ?? 0;
    const missing = Math.max(0, item.amount - stock);
    const incoming = incomingForIngredient(state, item.ingredientId);
    return `
          <div class="${missing > 0 ? 'missing' : 'ready'}">
            <span>${ingredient.name}</span>
            <strong>${ingredientAmountLabel(item.ingredientId, item.amount)}</strong>
            <small>${missing > 0 ? `Missing ${ingredientAmountLabel(item.ingredientId, missing)}` : `${ingredientAmountLabel(item.ingredientId, stock)} stocked`}${incoming.amount > 0 && incoming.arrivalDay ? ` - ${ingredientAmountLabel(item.ingredientId, incoming.amount)} incoming ${formatGameDate(incoming.arrivalDay)}` : ''}</small>
          </div>
        `;
})
    .join('')}
  </div>
`;
const renderRecipeCategoryCards = (state) => {
    const allRecipes = visibleRecipes();
    const firstSaleDone = state.demand.casesSold > 0 || state.salesToday > 0;
    return recipeCategories
        .filter((category) => category.id === 'starter' || campaignAllowsAdvancedRecipes(state))
        .map((category) => {
        const categoryRecipes = category.recipeIds.map((recipeId) => allRecipes.find((recipe) => recipe.id === recipeId)).filter((recipe) => Boolean(recipe));
        const stockCounts = categoryRecipes.map((recipe) => recipeStockBatchCount(state, recipe));
        const bestStockCount = Math.max(0, ...stockCounts);
        const stockedRecipeCount = stockCounts.filter((count) => count > 0).length;
        const starterClass = category.id === 'starter' && !firstSaleDone ? 'recommended' : '';
        const recipeCountLabel = `${categoryRecipes.length} recipe${categoryRecipes.length === 1 ? '' : 's'}`;
        const stockSummary = bestStockCount > 0
            ? `${stockedRecipeCount}/${categoryRecipes.length} stocked - best ${brewStockLabel(bestStockCount)}`
            : 'No stocked batches yet';
        return `<button class="recipe-category-card ${starterClass}" data-action="select-recipe-category" data-category-id="${category.id}" type="button"><span>${category.name}</span><em class="recipe-stock-badge">${bestStockCount > 0 ? `Stock: ${brewStockLabel(bestStockCount)}` : 'Stock: needs order'}</em><strong>${recipeCountLabel}</strong><small class="recipe-stock-line">${stockSummary}</small><small>${category.recommendation ?? 'Check stock and risk before brewing'}</small></button>`;
    })
        .join('');
};
const substitutionCandidates = {
    'pilsner-malt': ['pale-malt', 'wheat-malt'],
    'pale-malt': ['pilsner-malt', 'wheat-malt'],
    'wheat-malt': ['pilsner-malt', 'pale-malt'],
    'saaz-hops': ['styrian-hops', 'fuggles-hops', 'ipa-hops'],
    'styrian-hops': ['saaz-hops', 'fuggles-hops', 'ipa-hops'],
    'fuggles-hops': ['styrian-hops', 'saaz-hops', 'ipa-hops'],
    'ipa-hops': ['styrian-hops', 'saaz-hops'],
    'ale-yeast': ['wheat-yeast', 'stout-yeast', 'saison-yeast'],
    'wheat-yeast': ['ale-yeast', 'saison-yeast'],
    'saison-yeast': ['ale-yeast', 'wheat-yeast', 'kveik-yeast'],
    'stout-yeast': ['ale-yeast'],
    'kveik-yeast': ['saison-yeast', 'ale-yeast']
};
const canShowSubstitutionButton = (state, missing, startBlocker) => missing.length > 0 &&
    startBlocker === '' &&
    missing.every((item) => (substitutionCandidates[item.ingredientId] ?? []).some((candidateId) => (state.inventory.ingredients[candidateId]?.amount ?? 0) >= item.amount));
const renderRecipeCard = ({ state, recipeStartBlocker }, recipe) => {
    const missing = recipeMissingIngredients(state, recipe);
    const incomingMissing = missingOrderStatus(state, missing);
    const missingCost = orderCost(missing);
    const extraCost = orderCost(recipeOrderItems(state, recipe, 'extra'));
    const startBlocker = recipeStartBlocker(recipe);
    const canStart = recipeCanStart(state, recipe) && startBlocker === '';
    const batchLiters = Math.min(recipe.targetBatchLiters, state.equipment.kettle.capacityLiters, state.equipment.fermenter.capacityLiters);
    const stockBatchCount = recipeStockBatchCount(state, recipe);
    const expectedValue = formatCurrency(Math.round(litersToCases(batchLiters) * recipe.salePricePerCase * recipe.marketAppeal));
    const estimatedArrivalDay = state.day + 3;
    const missingOrderDisabled = !recipe.enabled || missing.length === 0 || incomingMissing.fullyIncoming || state.cash < missingCost;
    const missingOrderLabel = missing.length === 0 ? 'Supplies ready' : incomingMissing.fullyIncoming ? 'Ordered' : `Order missing ${formatCurrency(missingCost)}`;
    const missingOrderNote = missing.length === 0
        ? 'Nothing to order'
        : incomingMissing.fullyIncoming
            ? `Arrives ${formatGameDate(incomingMissing.arrivalDay ?? state.day)}`
            : state.cash < missingCost
                ? 'Need cash'
                : formatGameDate(estimatedArrivalDay);
    const riskLine = campaignAllowsCleaning(state) ? `<span>${recipe.riskTags.slice(0, 2).join(', ') || 'Low risk'}</span>` : '';
    const substituteButton = canShowSubstitutionButton(state, missing, startBlocker)
        ? `<button data-action="start-batch" data-recipe-id="${recipe.id}" data-brewday-approach="fast" data-allow-substitutions="true" type="button">Brew with substitutions<small>Fast deadline play, quality risk</small></button>`
        : '';
    return `<article class="batch-card recipe-card compact-recipe-card"><div class="recipe-card-title"><strong>${recipe.name}</strong><em class="recipe-stock-badge">${brewStockLabel(stockBatchCount)}</em><span>${batchLiters} L - ${caseCountLabel(litersToCases(batchLiters))}</span></div>${renderRecipeIngredientRows(state, recipe)}${renderBrewExplainer(recipe)}<div class="recipe-decision-lines"><span>${canStart ? 'Can brew now' : startBlocker || 'Blocked'}</span><span>${expectedValue} expected value</span><span>${missing.length > 0 ? `${missing.length} missing item${missing.length === 1 ? '' : 's'}` : 'All recipe supplies stocked'}${incomingMissing.label ? ` - ${incomingMissing.label}` : ''}</span>${riskLine}</div><div class="hotspot-actions recipe-actions"><button data-action="start-batch" data-recipe-id="${recipe.id}" data-brewday-approach="careful" type="button" ${canStart ? '' : `disabled title="${startBlocker || 'Blocked'}"`}>Careful<small>Slower, safer</small></button><button data-action="start-batch" data-recipe-id="${recipe.id}" data-brewday-approach="standard" type="button" ${canStart ? '' : `disabled title="${startBlocker || 'Blocked'}"`}>Standard<small>Recipe path</small></button><button data-action="start-batch" data-recipe-id="${recipe.id}" data-brewday-approach="fast" type="button" ${canStart ? '' : `disabled title="${startBlocker || 'Blocked'}"`}>Fast<small>Style-dependent</small></button>${substituteButton}<button data-action="order-recipe" data-order-mode="missing" data-recipe-id="${recipe.id}" type="button" ${missingOrderDisabled ? 'disabled' : ''}>${missingOrderLabel}<small>${missingOrderNote}</small></button><button data-action="order-recipe" data-order-mode="extra" data-recipe-id="${recipe.id}" type="button" ${recipe.enabled && state.cash >= extraCost ? '' : 'disabled'}>Order 1 batch ${formatCurrency(extraCost)}<small>${state.cash < extraCost ? 'Need cash' : `${recipe.name} x1 - ${formatGameDate(estimatedArrivalDay)}`}</small></button></div></article>`;
};
export const renderRecipeSelectionPanel = (context) => {
    const { state, selectedRecipeCategoryId } = context;
    const allRecipes = campaignAllowsAdvancedRecipes(state) ? visibleRecipes() : visibleRecipes().filter((recipe) => recipe.id === 'garage-blonde');
    const firstSaleDone = state.demand.casesSold > 0 || state.salesToday > 0;
    if (!selectedRecipeCategoryId) {
        return {
            recipePage: 0,
            html: `
        <section class="station-panel-body recipe-style-list">
          <p class="panel-note">${firstSaleDone ? 'Choose a beer family, then a recipe.' : 'Recommended first: Garage Blonde.'}</p>
          <div class="compact-grid recipe-category-grid">${renderRecipeCategoryCards(state)}</div>
        </section>
      `
        };
    }
    const category = recipeCategories.find((item) => item.id === selectedRecipeCategoryId) ?? recipeCategories[0];
    const filtered = category.recipeIds
        .map((recipeId) => allRecipes.find((recipe) => recipe.id === recipeId))
        .filter((recipe) => Boolean(recipe));
    const pageCount = Math.max(1, Math.ceil(filtered.length / recipePageSize));
    const recipePage = Math.max(0, Math.min(context.recipePage, pageCount - 1));
    const pageRecipes = filtered.slice(recipePage * recipePageSize, recipePage * recipePageSize + recipePageSize);
    return {
        recipePage,
        html: `
      <section class="station-panel-body recipe-panel-flow">
        <div class="panel-meta-row"><button data-action="back-to-categories" type="button">Back</button><small>${category.name} - Page ${recipePage + 1} / ${pageCount}</small></div>
        <div class="recipe-page-grid">${pageRecipes.map((recipe) => renderRecipeCard(context, recipe)).join('')}</div>
        <div class="panel-meta-row page-controls"><button data-action="recipes-prev-page" type="button" ${recipePage === 0 ? 'disabled' : ''}>Previous</button><button data-action="recipes-next-page" type="button" ${recipePage >= pageCount - 1 ? 'disabled' : ''}>Next</button></div>
      </section>
    `
    };
};
//# sourceMappingURL=recipePanel.js.map