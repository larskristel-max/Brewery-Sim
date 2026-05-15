import { getIngredient } from '../data/ingredients.js';
import { getRecipe } from '../data/recipes.js';
import { equipmentConditionTier, orderCost, recipeMissingIngredients, recipeOrderItems, saleValue, storageOverflowByArea, totalStorageOverflow } from './selectors.js';
const dayLengthSeconds = 60;
const orderLeadDays = 3;
const orderedSteps = ['mashing', 'fermenting', 'packaging', 'ready'];
const stepEquipment = {
    mashing: 'kettle',
    fermenting: 'fermenter',
    packaging: 'bottler'
};
const accountNames = ['Corner Cafe', 'Canal Bar', 'Market Taproom', 'Station Bistro', 'Old Town Pub'];
const cloneState = (state) => ({
    ...state,
    inventory: {
        ...state.inventory,
        ingredients: Object.fromEntries(Object.entries(state.inventory.ingredients).map(([id, stock]) => [id, { ...stock }]))
    },
    equipment: {
        kettle: { ...state.equipment.kettle },
        fermenter: { ...state.equipment.fermenter },
        bottler: { ...state.equipment.bottler }
    },
    upgrades: {
        'larger-kettle': { ...state.upgrades['larger-kettle'] },
        'temp-control': { ...state.upgrades['temp-control'] },
        labeler: { ...state.upgrades.labeler }
    },
    demand: { ...state.demand },
    batches: state.batches.map((batch) => ({ ...batch, faultEventsTriggered: [...batch.faultEventsTriggered] })),
    finishedBeerLots: state.finishedBeerLots.map((lot) => ({ ...lot })),
    pendingOrders: state.pendingOrders.map((order) => ({ ...order, items: order.items.map((item) => ({ ...item })) })),
    storage: { ...state.storage },
    events: [...state.events]
});
const addEvent = (state, message) => {
    state.events = [{ id: `${state.day}-${state.minute}-${state.events.length}`, minute: state.minute, message }, ...state.events].slice(0, 12);
};
const demandForDay = (state, day) => {
    const busyWeekend = day % 5 === 0;
    const casesRequested = 8 + ((day * 3 + state.reputation) % 7) + Math.floor(state.reputation / 10) + (busyWeekend ? 6 : 0);
    return {
        accountName: accountNames[day % accountNames.length],
        casesRequested,
        casesSold: 0,
        reputationReward: busyWeekend ? 3 : 2
    };
};
const storagePressure = (state) => Math.round(totalStorageOverflow(state) * 4);
const conditionLabel = (ingredientId, condition) => {
    const ingredient = getIngredient(ingredientId);
    if (condition >= 85)
        return 'fresh';
    if (ingredient.category === 'malt' || ingredient.category === 'sugar')
        return 'damp';
    if (ingredient.category === 'hops')
        return 'stale';
    if (ingredient.category === 'yeast')
        return 'weak';
    return 'stressed';
};
const storageUseForItem = (ingredientId, amount) => {
    const ingredient = getIngredient(ingredientId);
    if (ingredient.storageArea === 'cold-box' && ingredient.unit === 'g')
        return amount / 1000;
    if (ingredient.storageArea === 'cold-box' && ingredient.unit === 'pack')
        return amount * 0.0115;
    return amount;
};
const stockPenaltyForRecipe = (state, ingredients, sensitivity) => {
    const weighted = ingredients.reduce((total, item) => {
        const stock = state.inventory.ingredients[item.ingredientId];
        return {
            amount: total.amount + item.amount,
            penalty: total.penalty + Math.max(0, 95 - (stock?.condition ?? 60)) * item.amount
        };
    }, { amount: 0, penalty: 0 });
    return Math.round(((weighted.penalty / Math.max(1, weighted.amount)) / 5) * sensitivity);
};
const contamRiskForRecipe = (state, batchIngredients, recipeDifficulty, storagePenalty) => {
    const fermenterDirt = 100 - state.equipment.fermenter.condition;
    const tempControlReduction = state.upgrades['temp-control'].purchased ? 12 : 0;
    return Math.max(3, Math.round(8 + recipeDifficulty * 0.45 + fermenterDirt * 0.35 + storagePenalty + storagePressure(state) - tempControlReduction + batchIngredients.length));
};
const applyIngredientOrder = (next, items) => {
    items.forEach((item) => {
        const stock = next.inventory.ingredients[item.ingredientId];
        const currentAmount = stock.amount;
        stock.amount += item.amount;
        stock.condition = Math.round((stock.condition * currentAmount + 98 * item.amount) / Math.max(1, stock.amount));
    });
};
const receiveDueOrders = (state) => {
    const due = state.pendingOrders.filter((order) => order.arrivalDay <= state.day);
    if (due.length === 0)
        return;
    due.forEach((order) => {
        applyIngredientOrder(state, order.items);
        const summary = order.items.map((item) => `${getIngredient(item.ingredientId).name} x${item.packs}`).join(', ');
        addEvent(state, `Ingredient delivery arrived: ${summary}.`);
    });
    state.pendingOrders = state.pendingOrders.filter((order) => order.arrivalDay > state.day);
};
const degradeStoredIngredients = (state) => {
    const overflow = storageOverflowByArea(state);
    const pressure = totalStorageOverflow(state);
    Object.entries(state.inventory.ingredients).forEach(([ingredientId, stock]) => {
        if (stock.amount <= 0)
            return;
        const ingredient = getIngredient(ingredientId);
        const areaOverflow = overflow[ingredient.storageArea];
        let decay = 0;
        if (areaOverflow > 0)
            decay += 2 + storageUseForItem(ingredient.id, stock.amount) / Math.max(1, areaOverflow);
        if (ingredient.storageArea === 'cold-box' && areaOverflow > 0)
            decay += ingredient.category === 'yeast' ? 3 : 2;
        if (pressure > 4 && ingredient.storageArea === 'dry-shelf')
            decay += 1;
        if (decay > 0)
            stock.condition = Math.max(45, stock.condition - decay);
    });
    if (overflow['dry-shelf'] > 0)
        addEvent(state, `Dry shelf overflow: malt is crowding the garage and can turn damp or musty.`);
    if (overflow['cold-box'] > 0)
        addEvent(state, `Cold box overflow: hops lose aroma and yeast viability faster outside proper storage.`);
    if (overflow['utility-shelf'] > 0)
        addEvent(state, `Utility shelf overflow: bottles and chemicals are blocking clean work space.`);
};
const randomEventForDay = (state) => {
    const overflow = totalStorageOverflow(state);
    if (overflow > 5) {
        state.reputation = Math.max(0, state.reputation - 1);
        return 'A cluttered garage attracted pests and worried a neighbor. Reputation -1.';
    }
    const eventIndex = (state.day * 7 + state.reputation + state.salesToday + Math.round(state.visibilityRisk)) % 6;
    if (eventIndex === 0)
        return 'Local cafe requests extra cases for a tasting board.';
    if (eventIndex === 1)
        return 'Homebrew shop reminder: order before stock runs out; deliveries take 3 days.';
    if (eventIndex === 2)
        return 'Fermentation temperature warning: clean gear and temp control keep the batch safer.';
    if (eventIndex === 3)
        return 'Storage warning: damp malt and warm hops can show up later as beer faults.';
    if (eventIndex === 4) {
        state.reputation = Math.max(0, state.reputation - 1);
        return 'Neighbor complaint about late garage pickup. Reputation slips by 1.';
    }
    state.demand.casesRequested += 4;
    return 'Busy weekend demand: nearby bars want 4 extra cases today.';
};
const durationForStep = (state, batch, step) => {
    const recipe = getRecipe(batch.recipeId);
    let duration = recipe.stepDurations[step];
    if (step === 'mashing' && state.upgrades['larger-kettle'].purchased)
        duration *= 0.7;
    if (step === 'fermenting' && state.upgrades['temp-control'].purchased)
        duration *= 0.7;
    if (step === 'packaging' && state.upgrades.labeler.purchased)
        duration *= 0.6;
    const equipment = state.equipment[stepEquipment[step]];
    return Math.max(4, duration * (1.2 - equipment.condition / 500));
};
const triggerRecipeFault = (state, batch, completedStep) => {
    const recipe = getRecipe(batch.recipeId);
    const candidates = recipe.faultEvents.filter((event) => event.stage === completedStep && !batch.faultEventsTriggered.includes(event.id) && batch.faultRisk >= event.minRisk);
    if (candidates.length === 0)
        return;
    const event = candidates[(state.day + batch.recipeId.length + completedStep.length) % candidates.length];
    batch.quality = Math.max(25, batch.quality - event.qualityPenalty);
    batch.faultEventsTriggered.push(event.id);
    addEvent(state, event.message);
};
const applyStepQuality = (state, batch, completedStep) => {
    const equipment = state.equipment[stepEquipment[completedStep]];
    const dirtPenalty = Math.round((100 - equipment.condition) / (completedStep === 'fermenting' ? 4 : 7));
    batch.quality = Math.max(30, batch.quality - dirtPenalty);
    triggerRecipeFault(state, batch, completedStep);
    if (completedStep === 'fermenting') {
        const risk = batch.contaminationRisk;
        if (risk >= 35) {
            batch.quality = Math.max(25, batch.quality - 14);
            addEvent(state, `Contamination scare in ${batch.recipeName}: quality dropped hard. Clean the fermenter and improve storage.`);
        }
        else if (risk >= 24) {
            batch.quality = Math.max(30, batch.quality - 7);
            addEvent(state, `Slight fermentation off-note in ${batch.recipeName}. Risk was ${risk}%.`);
        }
    }
};
const advanceBatch = (state, batch, seconds) => {
    if (batch.step === 'ready')
        return;
    batch.stepProgress += (seconds / durationForStep(state, batch, batch.step)) * 100;
    while (batch.step !== 'ready' && batch.stepProgress >= 100) {
        batch.stepProgress -= 100;
        const completedStep = batch.step;
        applyStepQuality(state, batch, completedStep);
        const currentIndex = orderedSteps.indexOf(batch.step);
        batch.step = orderedSteps[currentIndex + 1];
        if (completedStep === 'mashing')
            addEvent(state, `${batch.recipeName} is ready to transfer. Tap the 18 C fermenter.`);
        if (completedStep === 'fermenting')
            addEvent(state, `${batch.recipeName} finished fermenting. Tap the bottling station to package.`);
        if (completedStep === 'packaging')
            addEvent(state, `${batch.recipeName} is boxed and ready. Tap cases to sell into demand.`);
    }
};
const degradeEquipment = (state, seconds) => {
    state.batches.forEach((batch) => {
        if (batch.step === 'ready')
            return;
        const equipmentId = stepEquipment[batch.step];
        state.equipment[equipmentId].condition = Math.max(25, state.equipment[equipmentId].condition - seconds * 0.08);
    });
};
const rolloverDay = (state) => {
    while (state.dayElapsedSeconds >= dayLengthSeconds) {
        state.dayElapsedSeconds -= dayLengthSeconds;
        const fulfilled = state.demand.casesSold >= state.demand.casesRequested;
        if (fulfilled) {
            state.reputation += state.demand.reputationReward;
            addEvent(state, `Day ${state.day} demand fulfilled. Reputation +${state.demand.reputationReward}.`);
        }
        else if (state.demand.casesSold < Math.floor(state.demand.casesRequested / 2)) {
            state.reputation = Math.max(0, state.reputation - 1);
            addEvent(state, `${state.demand.accountName} still needed cases yesterday. Reputation -1.`);
        }
        state.day += 1;
        state.minute = 8 * 60;
        state.salesToday = 0;
        receiveDueOrders(state);
        degradeStoredIngredients(state);
        state.demand = demandForDay(state, state.day);
        addEvent(state, `Day ${state.day}: ${state.demand.accountName} requests ${state.demand.casesRequested} cases.`);
        addEvent(state, randomEventForDay(state));
    }
};
const consumeIngredients = (next, ingredients) => {
    ingredients.forEach((item) => {
        next.inventory.ingredients[item.ingredientId].amount = Math.max(0, next.inventory.ingredients[item.ingredientId].amount - item.amount);
    });
};
const startBatch = (next, recipeId) => {
    const recipe = getRecipe(recipeId);
    if (!recipe.enabled) {
        addEvent(next, 'Custom recipe design is coming later.');
        return next;
    }
    const kettleBusy = next.batches.some((batch) => batch.step === 'mashing');
    const missing = recipeMissingIngredients(next, recipe);
    if (kettleBusy || missing.length > 0 || next.inventory.water < recipe.waterCost) {
        addEvent(next, 'The kettle is busy or ingredients are short. Order supplies before brewing.');
        return next;
    }
    const extraCases = next.upgrades['larger-kettle'].purchased ? 6 : 0;
    const tempQuality = next.upgrades['temp-control'].purchased ? 5 : 0;
    const kettlePenalty = Math.round((100 - next.equipment.kettle.condition) / 6);
    const storagePenalty = stockPenaltyForRecipe(next, recipe.ingredients, recipe.storageSensitivity);
    const risk = contamRiskForRecipe(next, recipe.ingredients, recipe.difficulty, storagePenalty);
    consumeIngredients(next, recipe.ingredients);
    next.inventory.water -= recipe.waterCost;
    next.batches.push({
        id: `${recipeId}-${next.day}-${next.minute}-${next.batches.length}`,
        recipeId: recipe.id,
        recipeName: recipe.name,
        step: 'mashing',
        stepProgress: 0,
        quality: Math.max(40, recipe.qualityBase + tempQuality - kettlePenalty - storagePenalty),
        casesExpected: recipe.batchSizeCases + extraCases,
        contaminationRisk: risk,
        faultRisk: risk + storagePenalty,
        storagePenalty,
        faultEventsTriggered: []
    });
    addEvent(next, `${recipe.name} started in the kettle. Storage penalty ${storagePenalty}, fault risk ${risk}%.`);
    return next;
};
const packageReadyBatch = (next) => {
    const batch = next.batches.find((item) => item.step === 'ready');
    if (!batch) {
        addEvent(next, 'No boxed batch is waiting at the bottling station yet.');
        return next;
    }
    const bottler = next.equipment.bottler;
    const bottlerTier = equipmentConditionTier(bottler.condition);
    const recipe = getRecipe(batch.recipeId);
    const lostCases = bottlerTier === 'critical' ? 2 : bottlerTier === 'dirty' ? 1 : 0;
    const packagedCases = Math.max(1, batch.casesExpected - lostCases);
    next.inventory.cases += packagedCases;
    next.finishedBeerLots.push({
        id: `${batch.id}-lot`,
        recipeId: batch.recipeId,
        recipeName: batch.recipeName,
        cases: packagedCases,
        quality: batch.quality,
        marketAppeal: recipe.marketAppeal
    });
    next.batches = next.batches.filter((item) => item.id !== batch.id);
    if (lostCases > 0) {
        addEvent(next, `Dirty bottling station lost ${lostCases} case${lostCases === 1 ? '' : 's'}. ${packagedCases} cases of ${batch.recipeName} stacked at Q${batch.quality}.`);
    }
    else {
        addEvent(next, `${packagedCases} cases of ${batch.recipeName} stacked by the garage door at Q${batch.quality}.`);
    }
    return next;
};
const createOrderItems = (items) => items.map((item) => {
    const ingredient = getIngredient(item.ingredientId);
    const packs = Math.ceil(item.amount / ingredient.packSize);
    return { ingredientId: item.ingredientId, amount: packs * ingredient.packSize, packs };
});
const orderItems = (next, items, label) => {
    if (items.length === 0) {
        addEvent(next, 'No missing ingredients to order for that recipe.');
        return next;
    }
    const cost = orderCost(items);
    if (next.cash < cost) {
        addEvent(next, `Not enough cash for ${label}. Need EUR ${cost}.`);
        return next;
    }
    const orderLineItems = createOrderItems(items);
    next.cash -= cost;
    next.pendingOrders.push({
        id: `order-${next.day}-${next.minute}-${next.pendingOrders.length}`,
        dayOrdered: next.day,
        arrivalDay: next.day + orderLeadDays,
        cost,
        items: orderLineItems
    });
    const overflowAfterOrder = orderLineItems.reduce((total, item) => total + storageUseForItem(item.ingredientId, item.amount), 0) + totalStorageOverflow(next);
    addEvent(next, `${label} ordered for EUR ${cost}. Delivery in ${orderLeadDays} days${overflowAfterOrder > 6 ? '; storage will be tight.' : '.'}`);
    return next;
};
const sellCases = (next, requestedCases) => {
    const lot = next.finishedBeerLots[0];
    const remainingDemand = Math.max(0, next.demand.casesRequested - next.demand.casesSold);
    const cases = Math.min(requestedCases, next.inventory.cases, lot?.cases ?? 0, remainingDemand || requestedCases);
    if (cases <= 0 || !lot) {
        addEvent(next, 'No sellable cases or open local demand right now.');
        return next;
    }
    const revenue = saleValue(next, cases);
    lot.cases -= cases;
    next.finishedBeerLots = next.finishedBeerLots.filter((item) => item.cases > 0);
    next.inventory.cases -= cases;
    next.cash += revenue;
    next.demand.casesSold += cases;
    next.salesToday += cases;
    next.visibilityRisk += Math.max(1, Math.round(cases * lot.marketAppeal));
    const repGain = (next.upgrades.labeler.purchased ? 2 : 1) + (next.demand.casesSold >= next.demand.casesRequested ? next.demand.reputationReward : 0);
    next.reputation += repGain;
    addEvent(next, `Sold ${cases} cases of ${lot.recipeName} to ${next.demand.accountName} for EUR ${revenue}. Reputation +${repGain}.`);
    if (next.visibilityRisk >= 30)
        addEvent(next, 'A retailer asked for an official invoice. Garage sales are getting too visible.');
    return next;
};
export const reduceGame = (state, action) => {
    const next = cloneState(state);
    if (action.type === 'tick') {
        next.dayElapsedSeconds += action.seconds;
        next.minute += Math.floor(action.seconds / 6);
        next.batches.forEach((batch) => advanceBatch(next, batch, action.seconds));
        degradeEquipment(next, action.seconds);
        rolloverDay(next);
        return next;
    }
    if (action.type === 'select-equipment') {
        next.selectedEquipmentId = action.equipmentId;
        return next;
    }
    if (action.type === 'use-equipment') {
        next.selectedEquipmentId = action.equipmentId;
        if (action.equipmentId === 'kettle')
            return startBatch(next, 'garage-blonde');
        if (action.equipmentId === 'fermenter') {
            const batch = next.batches.find((item) => item.step === 'fermenting');
            addEvent(next, batch ? `${batch.recipeName} fermenting at 18 C. Contamination risk ${batch.contaminationRisk}%.` : 'No batch is fermenting yet. Mash something in the kettle first.');
            return next;
        }
        if (action.equipmentId === 'bottler')
            return packageReadyBatch(next);
    }
    if (action.type === 'start-batch')
        return startBatch(next, action.recipeId);
    if (action.type === 'order-recipe') {
        const recipe = getRecipe(action.recipeId);
        return orderItems(next, recipeOrderItems(next, recipe, action.mode), action.mode === 'extra' ? `Extra ${recipe.name} supplies` : `Missing ${recipe.name} supplies`);
    }
    if (action.type === 'order-ingredient') {
        const ingredient = getIngredient(action.ingredientId);
        return orderItems(next, [{ ingredientId: action.ingredientId, amount: ingredient.packSize * action.packs }], `${ingredient.name} x${action.packs}`);
    }
    if (action.type === 'package-batch')
        return packageReadyBatch(next);
    if (action.type === 'sell-cases')
        return sellCases(next, action.cases);
    if (action.type === 'buy-upgrade') {
        const upgrade = next.upgrades[action.upgradeId];
        if (upgrade.purchased || next.cash < upgrade.cost) {
            addEvent(next, 'Not enough cash for that upgrade yet.');
            return next;
        }
        next.cash -= upgrade.cost;
        upgrade.purchased = true;
        if (action.upgradeId === 'larger-kettle')
            next.equipment.kettle.level += 1;
        if (action.upgradeId === 'temp-control')
            next.equipment.fermenter.level += 1;
        if (action.upgradeId === 'labeler')
            next.equipment.bottler.level += 1;
        addEvent(next, `${upgrade.name} installed. Its benefit applies to the next matching step immediately.`);
        return next;
    }
    if (action.type === 'clean-equipment') {
        const equipment = next.equipment[action.equipmentId];
        const cost = 18;
        if (next.cash < cost) {
            addEvent(next, 'Cleaning supplies are too expensive right now.');
            return next;
        }
        next.cash -= cost;
        equipment.condition = Math.min(100, equipment.condition + 26);
        const equipmentName = equipment.id === 'bottler' ? 'Bottling station' : equipment.name;
        addEvent(next, `${equipmentName} cleaned. Lower dirt means better quality and less contamination risk.`);
        return next;
    }
    return next;
};
//# sourceMappingURL=simulation.js.map