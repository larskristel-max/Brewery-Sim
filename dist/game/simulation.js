import { getIngredient } from '../data/ingredients.js';
import { createOwnedEquipment, getEquipmentCatalogItem, topGarageTier } from '../data/equipment.js';
import { getRecipe } from '../data/recipes.js';
import { activeOwnedEquipment, bottlesPerCase, caseCountLabel, equipmentConditionTier, garageSpaceAvailable, orderCost, recipeBatchCapacity, recipeMissingIngredients, recipeOrderItems, saleValue, salesChannels, storageOverflowByArea, totalStorageOverflow } from './selectors.js';
const orderLeadDays = 3;
const startOfDayMinute = 7 * 60;
const manualSteps = ['awaiting-transfer', 'awaiting-packaging', 'ready'];
const minFermenterTemperatureC = 8;
const maxFermenterTemperatureC = 40;
const gameStartDateUtc = Date.UTC(2026, 4, 16);
const stepEquipment = {
    brewing: 'kettle',
    fermenting: 'fermenter',
    packaging: 'bottler',
    'bottle-conditioning': 'bottler'
};
const cloneState = (state) => ({
    ...state,
    inventory: {
        ...state.inventory,
        ingredients: Object.fromEntries(Object.entries(state.inventory.ingredients).map(([id, stock]) => [id, { ...stock }]))
    },
    equipment: Object.fromEntries(Object.entries(state.equipment).map(([id, equipment]) => [id, { ...equipment }])),
    ownedEquipment: state.ownedEquipment.map((item) => ({ ...item })),
    activeEquipment: { ...state.activeEquipment },
    demand: { ...state.demand },
    batches: state.batches.map((batch) => ({ ...batch, faultEventsTriggered: [...batch.faultEventsTriggered] })),
    finishedBeerLots: state.finishedBeerLots.map((lot) => ({ ...lot })),
    pendingOrders: state.pendingOrders.map((order) => ({ ...order, items: order.items.map((item) => ({ ...item })) })),
    storage: { ...state.storage },
    events: [...state.events],
    fermenterTemperatureC: state.fermenterTemperatureC,
    energy: state.energy,
    garageSpaceUsed: state.garageSpaceUsed,
    garageSpaceLimit: state.garageSpaceLimit,
    householdPressure: state.householdPressure,
    complianceRisk: state.complianceRisk,
    canInvoice: state.canInvoice
});
const addEvent = (state, message) => {
    state.events = [{ id: `${state.day}-${state.minute}-${state.events.length}`, minute: state.minute, message }, ...state.events].slice(0, 12);
};
const formatGameDate = (day) => {
    const date = new Date(gameStartDateUtc + Math.max(0, day - 1) * 24 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
};
const demandForDay = (state, day) => {
    const busyWeekend = day % 5 === 0;
    const channelId = state.reputation >= 16 ? 'restaurant' : state.reputation >= 9 ? 'local-bar' : state.reputation >= 4 || busyWeekend ? 'private-event' : 'friends-family';
    const channel = salesChannels[channelId];
    const casesRequested = channel.cases + Math.floor(state.reputation / 6) + (busyWeekend ? 3 : 0);
    const invoiceRequired = channel.formal && (state.visibilityRisk >= channel.invoiceAfter || state.reputation >= 14 || channelId === 'restaurant');
    return {
        accountName: channel.name,
        channelId,
        channelName: channel.name,
        casesRequested,
        casesSold: 0,
        reputationReward: channel.rep + (busyWeekend ? 1 : 0),
        invoiceRequired,
        formalOrder: channel.formal
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
    if (ingredient.id === 'bottles')
        return amount / bottlesPerCase;
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
    const fermenter = activeOwnedEquipment(state, 'fermenter');
    const fermenterDirt = 100 - fermenter.condition;
    return Math.max(3, Math.round(8 + recipeDifficulty * 0.45 + fermenterDirt * 0.35 + storagePenalty + storagePressure(state) + fermenter.riskModifier + batchIngredients.length));
};
const clampFermenterTemperature = (temperatureC) => Math.min(maxFermenterTemperatureC, Math.max(minFermenterTemperatureC, Math.round(temperatureC)));
const fermentationProfileForRecipe = (recipe) => {
    const ingredientIds = recipe.ingredients.map((ingredient) => ingredient.ingredientId);
    const style = recipe.style.toLowerCase();
    if (ingredientIds.includes('lager-yeast'))
        return { family: 'lager', idealMin: 9, idealMax: 14, severeMin: 7, severeMax: 18 };
    if (style.includes('kveik') || ingredientIds.includes('kveik-yeast'))
        return { family: 'kveik', idealMin: 28, idealMax: 40, severeMin: 18, severeMax: 42 };
    if (ingredientIds.includes('saison-yeast'))
        return { family: 'saison', idealMin: 20, idealMax: 30, severeMin: 15, severeMax: 35 };
    if (ingredientIds.includes('wheat-yeast'))
        return { family: 'wheat ale', idealMin: 18, idealMax: 24, severeMin: 14, severeMax: 28 };
    if (ingredientIds.includes('stout-yeast'))
        return { family: 'stout ale', idealMin: 16, idealMax: 22, severeMin: 13, severeMax: 26 };
    return { family: 'clean ale', idealMin: 17, idealMax: 22, severeMin: 14, severeMax: 26 };
};
const fermentationTemperatureEffect = (recipe, temperatureC) => {
    const profile = fermentationProfileForRecipe(recipe);
    if (temperatureC >= profile.idealMin && temperatureC <= profile.idealMax) {
        return { label: `${profile.family} sweet spot`, risk: -3, quality: 2, speed: profile.family === 'lager' ? 0.96 : 1 };
    }
    const coldGap = Math.max(0, profile.idealMin - temperatureC);
    const hotGap = Math.max(0, temperatureC - profile.idealMax);
    const gap = coldGap || hotGap;
    const severe = temperatureC < profile.severeMin || temperatureC > profile.severeMax;
    const hot = hotGap > 0;
    const risk = Math.round(gap * (hot ? 2.1 : 1.5) + (severe ? 8 : 2));
    const quality = Math.round(gap * (hot ? 1.4 : 1) + (severe ? 6 : 2));
    const speed = coldGap > 0 ? 1 + coldGap * 0.08 : Math.max(0.78, 1 - hotGap * 0.025);
    const event = hot
        ? `${recipe.name} fermented too warm for ${profile.family} yeast at ${temperatureC} C: extra esters, fusels or diacetyl risk hurt quality.`
        : `${recipe.name} fermented too cold for ${profile.family} yeast at ${temperatureC} C: sluggish yeast left cleanup faults behind.`;
    return { label: hot ? 'too warm' : 'too cold', risk, quality: -quality, speed, event };
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
const isTimedStep = (step) => !manualSteps.includes(step);
const durationForStep = (state, batch, step) => {
    const recipe = getRecipe(batch.recipeId);
    let duration = recipe.stepDurations[step];
    if (step === 'fermenting')
        duration *= fermentationTemperatureEffect(recipe, state.fermenterTemperatureC).speed;
    const station = step === 'fermenting' ? state.ownedEquipment.find((item) => item.instanceId === batch.fermenterInstanceId) : activeOwnedEquipment(state, stepEquipment[step]);
    const equipment = station ?? activeOwnedEquipment(state, stepEquipment[step]);
    duration *= equipment.batchTimeModifier;
    return Math.max(4, duration * (1.2 - equipment.condition / 500));
};
const triggerRecipeFault = (state, batch, completedStep) => {
    const recipe = getRecipe(batch.recipeId);
    const risk = completedStep === 'fermenting' ? batch.faultRisk + fermentationTemperatureEffect(recipe, state.fermenterTemperatureC).risk : batch.faultRisk;
    const candidates = recipe.faultEvents.filter((event) => event.stage === completedStep && !batch.faultEventsTriggered.includes(event.id) && risk >= event.minRisk);
    if (candidates.length === 0)
        return;
    const event = candidates[(state.day + batch.recipeId.length + completedStep.length) % candidates.length];
    batch.quality = Math.max(25, batch.quality - event.qualityPenalty);
    batch.faultEventsTriggered.push(event.id);
    addEvent(state, event.message);
};
const applyStepQuality = (state, batch, completedStep) => {
    const equipment = completedStep === 'fermenting' ? state.ownedEquipment.find((item) => item.instanceId === batch.fermenterInstanceId) ?? activeOwnedEquipment(state, 'fermenter') : activeOwnedEquipment(state, stepEquipment[completedStep]);
    const dirtPenalty = Math.round((100 - equipment.condition) / (completedStep === 'fermenting' ? 4 : 7));
    batch.quality = Math.max(30, batch.quality - dirtPenalty);
    triggerRecipeFault(state, batch, completedStep);
    if (completedStep === 'fermenting') {
        const recipe = getRecipe(batch.recipeId);
        const temperatureEffect = fermentationTemperatureEffect(recipe, state.fermenterTemperatureC);
        if (temperatureEffect.quality !== 0) {
            batch.quality = Math.max(25, batch.quality + temperatureEffect.quality);
            if (temperatureEffect.event)
                addEvent(state, `${temperatureEffect.event} Quality ${temperatureEffect.quality > 0 ? '+' : ''}${temperatureEffect.quality}.`);
        }
        const risk = Math.max(3, batch.contaminationRisk + temperatureEffect.risk);
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
const finishConditionedBatch = (state, batch) => {
    const bottler = activeOwnedEquipment(state, 'bottler');
    const recipe = getRecipe(batch.recipeId);
    state.inventory.cases += batch.casesExpected;
    state.finishedBeerLots.push({
        id: `${batch.id}-lot`,
        recipeId: batch.recipeId,
        recipeName: batch.recipeName,
        cases: batch.casesExpected,
        quality: Math.min(100, batch.quality + bottler.qualityBonus),
        marketAppeal: recipe.marketAppeal
    });
    state.batches = state.batches.filter((item) => item.id !== batch.id);
    addEvent(state, `${caseCountLabel(batch.casesExpected)} of ${batch.recipeName} are packaged and ready on the pallet.`);
};
const completeTimedStep = (state, batch, completedStep) => {
    applyStepQuality(state, batch, completedStep);
    batch.stepProgress = 0;
    if (completedStep === 'brewing') {
        batch.step = 'awaiting-transfer';
        addEvent(state, `${batch.recipeName} brew day is complete. Tap Transfer to fermenter when you are ready.`);
    }
    else if (completedStep === 'fermenting') {
        batch.step = 'awaiting-packaging';
        addEvent(state, `${batch.recipeName} finished fermenting. Tap Package to bottle it.`);
    }
    else if (completedStep === 'packaging') {
        batch.step = 'ready';
        finishConditionedBatch(state, batch);
    }
    else {
        batch.step = 'ready';
        finishConditionedBatch(state, batch);
    }
};
const advanceBatch = (state, batch, minutes) => {
    if (!isTimedStep(batch.step) || batch.step === 'brewing' || batch.step === 'packaging')
        return;
    batch.stepProgress += (minutes / durationForStep(state, batch, batch.step)) * 100;
    if (batch.stepProgress >= 100)
        completeTimedStep(state, batch, batch.step);
};
const degradeEquipment = (state, minutes) => {
    state.batches.forEach((batch) => {
        if (!isTimedStep(batch.step))
            return;
        const equipmentId = stepEquipment[batch.step];
        const active = batch.step === 'fermenting' ? state.ownedEquipment.find((item) => item.instanceId === batch.fermenterInstanceId) : activeOwnedEquipment(state, equipmentId);
        if (active)
            active.condition = Math.max(25, active.condition - minutes * 0.01);
        state.equipment[equipmentId].condition = Math.max(25, state.equipment[equipmentId].condition - minutes * 0.01);
    });
};
const rolloverOneDay = (state) => {
    const fulfilled = state.demand.casesSold >= state.demand.casesRequested;
    if (fulfilled) {
        state.reputation += state.demand.reputationReward;
        addEvent(state, `Demand fulfilled. Reputation +${state.demand.reputationReward}.`);
    }
    else if (state.demand.casesSold < Math.floor(state.demand.casesRequested / 2)) {
        state.reputation = Math.max(0, state.reputation - 1);
        addEvent(state, `${state.demand.accountName} still needed cases yesterday. Reputation -1.`);
    }
    state.day += 1;
    state.salesToday = 0;
    state.energy = 100;
    receiveDueOrders(state);
    degradeStoredIngredients(state);
    state.demand = demandForDay(state, state.day);
    addEvent(state, `New morning: ${state.demand.accountName} requests ${state.demand.casesRequested} cases.`);
    addEvent(state, randomEventForDay(state));
};
const advanceGameTime = (state, minutes, energyCost = 0) => {
    state.minute += minutes;
    state.dayElapsedSeconds += minutes * 60;
    state.energy = Math.max(0, state.energy - energyCost);
    [...state.batches].forEach((batch) => advanceBatch(state, batch, minutes));
    degradeEquipment(state, minutes);
    while (state.minute >= 24 * 60) {
        state.minute -= 24 * 60;
        rolloverOneDay(state);
    }
};
const endDay = (state) => {
    if (state.batches.some((batch) => batch.step === 'awaiting-transfer' || batch.step === 'awaiting-packaging')) {
        addEvent(state, 'Finish the waiting transfer or packaging decision before ending the day.');
        return;
    }
    const minutesUntilMorning = state.minute < startOfDayMinute ? startOfDayMinute - state.minute : 24 * 60 - state.minute + startOfDayMinute;
    advanceGameTime(state, minutesUntilMorning, 0);
    if (state.minute < startOfDayMinute)
        state.minute = startOfDayMinute;
    addEvent(state, 'Ended the day. Fermentation and bottle conditioning advanced overnight.');
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
    const kettleBusy = next.batches.some((batch) => batch.step === 'brewing');
    const missing = recipeMissingIngredients(next, recipe);
    const capacity = recipeBatchCapacity(next, recipe);
    if (next.energy < 35) {
        addEvent(next, 'Not enough energy for a brew day. End the day first.');
        return next;
    }
    if (kettleBusy || missing.length > 0 || next.inventory.water < recipe.waterCost || !capacity.fermenter) {
        addEvent(next, capacity.reason || 'The kettle is busy or ingredients are short. Order supplies before brewing.');
        return next;
    }
    const brewhouse = activeOwnedEquipment(next, 'kettle');
    const fermenter = capacity.fermenter;
    const equipmentQuality = brewhouse.qualityBonus + fermenter.qualityBonus;
    const kettlePenalty = Math.round((100 - brewhouse.condition) / 6);
    const storagePenalty = stockPenaltyForRecipe(next, recipe.ingredients, recipe.storageSensitivity);
    const risk = Math.max(3, contamRiskForRecipe(next, recipe.ingredients, recipe.difficulty + brewhouse.riskModifier, storagePenalty));
    const batchId = `${recipeId}-${next.day}-${next.minute}-${next.batches.length}`;
    consumeIngredients(next, recipe.ingredients);
    next.inventory.water -= recipe.waterCost;
    fermenter.occupiedBatchId = batchId;
    next.batches.push({
        id: batchId,
        recipeId: recipe.id,
        recipeName: recipe.name,
        step: 'brewing',
        stepProgress: 0,
        quality: Math.max(35, recipe.qualityBase + equipmentQuality - kettlePenalty - storagePenalty),
        casesExpected: capacity.cases,
        volumeLiters: capacity.liters,
        fermenterInstanceId: fermenter.instanceId,
        contaminationRisk: risk,
        faultRisk: risk + storagePenalty,
        storagePenalty,
        faultEventsTriggered: []
    });
    addEvent(next, `${recipe.name} brew day started in ${brewhouse.name}: ${capacity.reason} Base fault risk ${risk}%.`);
    const batch = next.batches.find((item) => item.id === batchId);
    if (batch) {
        batch.stepProgress = 100;
        advanceGameTime(next, recipe.stepDurations.brewing, 45);
        completeTimedStep(next, batch, 'brewing');
    }
    return next;
};
const transferAwaitingBatch = (next, batchId) => {
    const batch = next.batches.find((item) => item.step === 'awaiting-transfer' && (!batchId || item.id === batchId));
    if (!batch) {
        addEvent(next, 'No brewed batch is waiting for transfer.');
        return next;
    }
    batch.step = 'fermenting';
    batch.stepProgress = 0;
    advanceGameTime(next, 20, 8);
    addEvent(next, `${batch.recipeName} transferred into ${stateEquipmentName(next, 'fermenter')}. Fermentation is now running.`);
    return next;
};
const stateEquipmentName = (state, equipmentId) => state.equipment[equipmentId].name;
const packageAwaitingBatch = (next, batchId) => {
    const batch = next.batches.find((item) => item.step === 'awaiting-packaging' && (!batchId || item.id === batchId));
    if (!batch) {
        addEvent(next, 'No fermented batch is waiting for packaging.');
        return next;
    }
    if (next.energy < 18) {
        addEvent(next, 'Not enough energy to package. End the day first.');
        return next;
    }
    const bottler = activeOwnedEquipment(next, 'bottler');
    const bottlerTier = equipmentConditionTier(bottler.condition);
    const dirtyLoss = bottlerTier === 'critical' ? 2 : bottlerTier === 'dirty' ? 1 : 0;
    const lostCases = Math.max(0, dirtyLoss + Math.round(batch.casesExpected * bottler.lossModifier));
    batch.casesExpected = Math.max(1, batch.casesExpected - lostCases);
    batch.step = 'packaging';
    batch.stepProgress = 100;
    const fermenter = next.ownedEquipment.find((item) => item.instanceId === batch.fermenterInstanceId);
    if (fermenter)
        delete fermenter.occupiedBatchId;
    advanceGameTime(next, getRecipe(batch.recipeId).stepDurations.packaging, 24);
    completeTimedStep(next, batch, 'packaging');
    if (lostCases > 0) {
        addEvent(next, `Dirty bottling station lost ${caseCountLabel(lostCases)}. ${caseCountLabel(batch.casesExpected)} are ready on the pallet.`);
    }
    else {
        addEvent(next, `${caseCountLabel(batch.casesExpected)} of ${batch.recipeName} bottled by hand and moved to the pallet.`);
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
    const alreadyIncoming = items.every((item) => {
        const incomingAmount = next.pendingOrders.reduce((total, order) => total + order.items.filter((orderItem) => orderItem.ingredientId === item.ingredientId).reduce((sum, orderItem) => sum + orderItem.amount, 0), 0);
        return incomingAmount >= item.amount;
    });
    if (alreadyIncoming) {
        const earliestArrival = Math.min(...next.pendingOrders.map((order) => order.arrivalDay));
        addEvent(next, `${label} is already ordered. Delivery arrives ${formatGameDate(earliestArrival)}.`);
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
    addEvent(next, `${label} ordered for EUR ${cost}. Arrives ${formatGameDate(next.day + orderLeadDays)} in ${orderLeadDays} days${overflowAfterOrder > 6 ? '; storage will be tight.' : '.'}`);
    return next;
};
const sellCases = (next, requestedCases, channelOverride) => {
    const lot = next.finishedBeerLots[0];
    const channel = salesChannels[channelOverride ?? next.demand.channelId];
    const invoiceRequired = next.demand.invoiceRequired || (channel.formal && next.visibilityRisk >= channel.invoiceAfter);
    if (invoiceRequired && !next.canInvoice) {
        next.complianceRisk += 8;
        next.householdPressure += 3;
        addEvent(next, `${channel.name} needs an invoice and traceability details. The order is blocked until the garage goes formal or you choose safer sales.`);
        return next;
    }
    const remainingDemand = channelOverride ? channel.cases : Math.max(0, next.demand.casesRequested - next.demand.casesSold);
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
    next.visibilityRisk += Math.max(1, Math.round(cases * lot.marketAppeal * channel.risk));
    next.complianceRisk += channel.formal ? Math.max(1, Math.round(cases / 2)) : cases >= 8 ? 2 : 0;
    next.householdPressure += cases >= 10 ? 2 : 1;
    const repGain = (activeOwnedEquipment(next, 'bottler').tier >= 2 ? 2 : 1) + (next.demand.casesSold >= next.demand.casesRequested ? next.demand.reputationReward : 0);
    next.reputation += repGain;
    addEvent(next, `Sold ${caseCountLabel(cases)} of ${lot.recipeName} through ${channel.name} for EUR ${revenue}. Reputation +${repGain}.`);
    if (next.visibilityRisk >= 20)
        addEvent(next, 'Garage visibility is high. Bars and restaurants may now ask for invoices, traceability, and legal release status.');
    if (next.complianceRisk >= 30)
        addEvent(next, 'Compliance pressure is severe: pause public sales, prepare paperwork, or risk blocked orders and fines.');
    return next;
};
export const reduceGame = (state, action) => {
    const next = cloneState(state);
    if (action.type === 'tick') {
        return next;
    }
    if (action.type === 'end-day') {
        endDay(next);
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
        if (action.equipmentId === 'mill') {
            addEvent(next, `${stateEquipmentName(next, 'mill')} inspected. Milling actions are coming in a future production pass.`);
            return next;
        }
        if (action.equipmentId === 'fermenter') {
            const waiting = next.batches.find((item) => item.step === 'awaiting-transfer');
            if (waiting)
                return transferAwaitingBatch(next, waiting.id);
            const batch = next.batches.find((item) => item.step === 'fermenting' || item.step === 'awaiting-packaging');
            const effectiveRisk = batch ? Math.max(3, batch.contaminationRisk + fermentationTemperatureEffect(getRecipe(batch.recipeId), next.fermenterTemperatureC).risk) : 0;
            addEvent(next, batch ? `${batch.recipeName} ${batch.step === 'awaiting-packaging' ? 'is ready to package' : `fermenting at ${next.fermenterTemperatureC} C. Effective contamination risk ${effectiveRisk}%.`}` : `Fermenter set to ${next.fermenterTemperatureC} C. Mash something in the kettle first.`);
            return next;
        }
        if (action.equipmentId === 'bottler')
            return packageAwaitingBatch(next);
    }
    if (action.type === 'start-batch')
        return startBatch(next, action.recipeId);
    if (action.type === 'transfer-batch')
        return transferAwaitingBatch(next, action.batchId);
    if (action.type === 'start-packaging')
        return packageAwaitingBatch(next, action.batchId);
    if (action.type === 'ready-batch') {
        const batch = next.batches.find((item) => item.id === action.batchId && item.step === 'ready');
        if (batch)
            finishConditionedBatch(next, batch);
        return next;
    }
    if (action.type === 'order-recipe') {
        const recipe = getRecipe(action.recipeId);
        return orderItems(next, recipeOrderItems(next, recipe, action.mode), action.mode === 'extra' ? `Extra ${recipe.name} supplies` : `Missing ${recipe.name} supplies`);
    }
    if (action.type === 'order-ingredient') {
        const ingredient = getIngredient(action.ingredientId);
        return orderItems(next, [{ ingredientId: action.ingredientId, amount: ingredient.packSize * action.packs }], `${ingredient.name} x${action.packs}`);
    }
    if (action.type === 'package-batch')
        return packageAwaitingBatch(next, action.batchId);
    if (action.type === 'sell-cases')
        return sellCases(next, action.cases);
    if (action.type === 'sell-channel')
        return sellCases(next, action.cases, action.channelId);
    if (action.type === 'buy-equipment') {
        const item = getEquipmentCatalogItem(action.equipmentItemId);
        const sameOwned = next.ownedEquipment.filter((owned) => owned.itemId === item.id).length;
        if (item.maxOwned && sameOwned >= item.maxOwned) {
            addEvent(next, `${item.name} limit reached for this garage.`);
            return next;
        }
        if (!item.maxOwned && sameOwned > 0) {
            addEvent(next, `${item.name} is already installed.`);
            return next;
        }
        if (next.cash < item.cost) {
            addEvent(next, `Not enough cash for ${item.name}. Need EUR ${item.cost}.`);
            return next;
        }
        if (garageSpaceAvailable(next) < item.spaceUsed) {
            addEvent(next, `No garage space for ${item.name}. Free space or move out of the garage.`);
            return next;
        }
        next.cash -= item.cost;
        const owned = createOwnedEquipment(item.id, sameOwned + 1, true);
        next.ownedEquipment.push(owned);
        next.activeEquipment[item.equipmentId] = owned.instanceId;
        next.garageSpaceUsed += owned.spaceUsed;
        const current = next.equipment[item.equipmentId];
        next.equipment[item.equipmentId] = {
            ...current,
            itemId: item.id,
            name: item.name,
            description: item.description,
            tier: item.tier,
            cost: item.cost,
            capacityCaseBonus: 0,
            qualityBonus: item.qualityBonus,
            riskModifier: item.riskModifier,
            speedModifier: item.speedModifier,
            capacityLiters: item.capacityLiters,
            spaceUsed: item.spaceUsed,
            visualClass: item.visualClass,
            operonTypeKey: item.operonTypeKey,
            condition: Math.max(current.condition, 78 + item.tier * 5)
        };
        if (item.tier >= 3 || next.garageSpaceUsed >= next.garageSpaceLimit - 2) {
            next.householdPressure += 6;
            next.visibilityRisk += 4;
        }
        addEvent(next, `${item.name} installed. ${item.description}`);
        const garageMaxed = Object.values(next.equipment).every((equipment) => next.ownedEquipment.some((owned) => owned.equipmentId === equipment.id) && equipment.tier >= topGarageTier(equipment.id)) ||
            next.ownedEquipment.some((ownedItem) => ownedItem.tier >= 3);
        if (garageMaxed)
            addEvent(next, 'Garage ceiling reached: this setup is too professional for the garage. The next milestone is moving into a real brewery space.');
        return next;
    }
    if (action.type === 'crisis-action') {
        if (action.actionId === 'pause-public-sales') {
            next.visibilityRisk = Math.max(0, next.visibilityRisk - 10);
            next.householdPressure = Math.max(0, next.householdPressure - 4);
            addEvent(next, 'You paused public sales and kept beer for private buyers. Visibility and household pressure cooled down.');
        }
        if (action.actionId === 'discount-informal') {
            const cases = Math.min(4, next.inventory.cases);
            if (cases <= 0)
                addEvent(next, 'No packaged beer to discount right now.');
            else {
                next.inventory.cases -= cases;
                next.cash += cases * 8;
                next.visibilityRisk = Math.max(0, next.visibilityRisk - 3);
                addEvent(next, `Discounted ${cases} cases informally to clear space. Cash improved, but margin was poor.`);
            }
        }
        if (action.actionId === 'paperwork-prep') {
            const cost = 260;
            if (next.cash < cost)
                addEvent(next, `Paperwork prep needs EUR ${cost}.`);
            else {
                next.cash -= cost;
                next.canInvoice = true;
                next.complianceRisk = Math.max(0, next.complianceRisk - 14);
                addEvent(next, 'Invoice and traceability prep started. Formal orders are now possible, but the garage is still not a licensed brewery.');
            }
        }
        return next;
    }
    if (action.type === 'set-fermenter-temperature') {
        const previous = next.fermenterTemperatureC;
        next.fermenterTemperatureC = clampFermenterTemperature(action.temperatureC);
        if (next.fermenterTemperatureC !== previous) {
            const activeBatch = next.batches.find((batch) => batch.step === 'fermenting');
            const activeRecipe = activeBatch ? getRecipe(activeBatch.recipeId) : null;
            const effect = activeRecipe ? fermentationTemperatureEffect(activeRecipe, next.fermenterTemperatureC) : null;
            addEvent(next, effect ? `Fermenter set to ${next.fermenterTemperatureC} C for ${activeRecipe?.name}: ${effect.label}.` : `Fermenter set to ${next.fermenterTemperatureC} C.`);
        }
        return next;
    }
    if (action.type === 'clean-equipment') {
        const equipment = next.equipment[action.equipmentId];
        const cost = 18;
        const minutes = action.equipmentId === 'fermenter' ? (equipment.tier >= 2 ? 105 : 55) : action.equipmentId === 'bottler' ? 75 : 45;
        const energyCost = action.equipmentId === 'bottler' ? 18 : action.equipmentId === 'fermenter' ? 22 : 16;
        if (next.energy < energyCost) {
            addEvent(next, 'Not enough energy to clean properly. End the day first.');
            return next;
        }
        if (next.cash < cost) {
            addEvent(next, 'Cleaning supplies are too expensive right now.');
            return next;
        }
        next.cash -= cost;
        advanceGameTime(next, minutes, energyCost);
        equipment.condition = Math.min(100, equipment.condition + 26);
        const owned = next.ownedEquipment.find((item) => item.instanceId === next.activeEquipment[action.equipmentId]);
        if (owned)
            owned.condition = equipment.condition;
        const equipmentName = equipment.id === 'bottler' ? 'Bottling station' : equipment.name;
        addEvent(next, `${equipmentName} cleaned. Lower dirt means better quality and less contamination risk.`);
        return next;
    }
    return next;
};
//# sourceMappingURL=simulation.js.map