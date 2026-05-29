import { ingredients } from '../data/ingredients.js';
import { campaignMissionOrder, initialCampaignState } from './campaign.js';
import { createInitialState } from './initialState.js';
export const SAVE_VERSION = 6;
export const STORAGE_KEY = 'brewery-sim-save-v6';
const persistedEquipmentIds = ['kettle', 'fermenter', 'bottler'];
const equipmentIds = ['kettle', 'fermenter', 'bottler', 'mill'];
const upgradeIds = ['larger-kettle', 'temp-control', 'labeler'];
const ingredientIds = ingredients.map((ingredient) => ingredient.id);
const batchSteps = ['brewing', 'awaiting-transfer', 'fermenting', 'awaiting-packaging', 'packaging', 'bottle-conditioning', 'ready'];
const inventoryMovementTypes = ['order-created', 'order-received', 'ingredients-consumed', 'beer-packaged', 'cases-sold', 'loss-recorded'];
const minFermenterTemperatureC = 8;
const maxFermenterTemperatureC = 40;
const getBrowserStorage = () => {
    try {
        if (typeof globalThis.localStorage === 'undefined')
            return null;
        return globalThis.localStorage;
    }
    catch {
        return null;
    }
};
const isRecord = (value) => typeof value === 'object' && value !== null;
const hasNumber = (value, key) => typeof value[key] === 'number' && Number.isFinite(value[key]);
const hasString = (value, key) => typeof value[key] === 'string';
const hasBoolean = (value, key) => typeof value[key] === 'boolean';
const clampFermenterTemperature = (temperatureC) => Math.min(maxFermenterTemperatureC, Math.max(minFermenterTemperatureC, Math.round(temperatureC)));
const isIngredientStock = (value) => isRecord(value) && hasNumber(value, 'amount') && hasNumber(value, 'condition');
const isIngredientRecord = (value) => isRecord(value) && ingredientIds.every((id) => isIngredientStock(value[id]));
const isInventory = (value) => isRecord(value) && hasNumber(value, 'water') && hasNumber(value, 'cases') && isIngredientRecord(value.ingredients);
const isEquipment = (value, id) => isRecord(value) &&
    value.id === id &&
    hasString(value, 'name') &&
    hasString(value, 'description') &&
    hasNumber(value, 'level') &&
    hasNumber(value, 'condition') &&
    hasNumber(value, 'x') &&
    hasNumber(value, 'y');
const isEquipmentRecord = (value) => isRecord(value) &&
    persistedEquipmentIds.every((id) => isEquipment(value[id], id)) &&
    (value.mill === undefined || isEquipment(value.mill, 'mill'));
const isOwnedEquipment = (value) => isRecord(value) &&
    hasString(value, 'instanceId') &&
    equipmentIds.includes(value.equipmentId) &&
    hasString(value, 'name') &&
    hasNumber(value, 'tier') &&
    hasNumber(value, 'condition') &&
    hasNumber(value, 'capacityLiters') &&
    hasNumber(value, 'spaceUsed') &&
    hasBoolean(value, 'installed');
const isUpgrade = (value, id) => isRecord(value) && value.id === id && hasString(value, 'name') && hasString(value, 'description') && hasNumber(value, 'cost') && hasBoolean(value, 'purchased');
const isUpgradeRecord = (value) => isRecord(value) && upgradeIds.every((id) => isUpgrade(value[id], id));
const isBatch = (value) => isRecord(value) &&
    hasString(value, 'id') &&
    hasString(value, 'recipeId') &&
    hasString(value, 'recipeName') &&
    typeof value.step === 'string' &&
    batchSteps.includes(value.step) &&
    hasNumber(value, 'stepProgress') &&
    hasNumber(value, 'quality') &&
    hasNumber(value, 'casesExpected') &&
    hasNumber(value, 'volumeLiters') &&
    hasString(value, 'fermenterInstanceId') &&
    hasNumber(value, 'contaminationRisk') &&
    hasNumber(value, 'faultRisk') &&
    hasNumber(value, 'storagePenalty') &&
    Array.isArray(value.faultEventsTriggered);
const isFinishedBeerLot = (value) => isRecord(value) && hasString(value, 'id') && hasString(value, 'recipeId') && hasString(value, 'recipeName') && hasNumber(value, 'cases') && hasNumber(value, 'quality') && hasNumber(value, 'marketAppeal');
const isInventoryMovement = (value) => isRecord(value) &&
    hasString(value, 'id') &&
    typeof value.type === 'string' &&
    inventoryMovementTypes.includes(value.type) &&
    hasNumber(value, 'day') &&
    hasNumber(value, 'minute') &&
    hasString(value, 'description') &&
    hasNumber(value, 'quantity') &&
    hasString(value, 'unit');
const isSupplyOrder = (value) => isRecord(value) &&
    hasString(value, 'id') &&
    hasNumber(value, 'dayOrdered') &&
    hasNumber(value, 'arrivalDay') &&
    hasNumber(value, 'cost') &&
    Array.isArray(value.items) &&
    value.items.every((item) => isRecord(item) && ingredientIds.includes(item.ingredientId) && hasNumber(item, 'amount') && hasNumber(item, 'packs'));
const isStorageState = (value) => isRecord(value) && hasNumber(value, 'dryShelfCapacity') && hasNumber(value, 'coldBoxCapacity') && hasNumber(value, 'utilityShelfCapacity');
const isLocalDemand = (value) => isRecord(value) &&
    hasString(value, 'accountName') &&
    hasString(value, 'channelId') &&
    hasString(value, 'channelName') &&
    hasNumber(value, 'casesRequested') &&
    hasNumber(value, 'casesSold') &&
    hasNumber(value, 'reputationReward') &&
    hasBoolean(value, 'invoiceRequired') &&
    hasBoolean(value, 'formalOrder');
const isCampaignState = (value) => isRecord(value) &&
    typeof value.missionId === 'string' &&
    campaignMissionOrder.includes(value.missionId) &&
    Array.isArray(value.completedMissionIds) &&
    value.completedMissionIds.every((missionId) => typeof missionId === 'string' && campaignMissionOrder.includes(missionId)) &&
    Array.isArray(value.seenMissionIds) &&
    value.seenMissionIds.every((missionId) => typeof missionId === 'string' && campaignMissionOrder.includes(missionId));
const isEventLogEntry = (value) => isRecord(value) && hasString(value, 'id') && hasNumber(value, 'minute') && hasString(value, 'message');
const legacyVerdict = (quality, recipeName) => ({
    qualityBand: quality >= 80 ? 'excellent' : quality >= 62 ? 'solid' : quality >= 45 ? 'flawed' : 'bad',
    headline: `${recipeName} is packaged.`,
    sensoryNotes: ['No detailed batch notes were recorded for this older lot.'],
    likelyCauses: ['Produced before batch verdict tracking was added.'],
    sellAdvice: quality >= 45 ? 'sell' : 'discount',
    stabilityRisk: quality >= 62 ? 8 : 18,
    presentationScore: 68,
    legacyTags: quality >= 80 ? ['promising flagship'] : []
});
const isSavedGameState = (value) => {
    if (!isRecord(value))
        return false;
    return (hasNumber(value, 'cash') &&
        hasNumber(value, 'reputation') &&
        hasNumber(value, 'day') &&
        hasNumber(value, 'dayElapsedSeconds') &&
        hasNumber(value, 'minute') &&
        hasNumber(value, 'energy') &&
        isInventory(value.inventory) &&
        Array.isArray(value.batches) &&
        value.batches.every(isBatch) &&
        Array.isArray(value.finishedBeerLots) &&
        value.finishedBeerLots.every(isFinishedBeerLot) &&
        (value.inventoryMovements === undefined || (Array.isArray(value.inventoryMovements) && value.inventoryMovements.every(isInventoryMovement))) &&
        Array.isArray(value.pendingOrders) &&
        value.pendingOrders.every(isSupplyOrder) &&
        isStorageState(value.storage) &&
        isEquipmentRecord(value.equipment) &&
        Array.isArray(value.ownedEquipment) &&
        value.ownedEquipment.every(isOwnedEquipment) &&
        isRecord(value.activeEquipment) &&
        persistedEquipmentIds.every((id) => hasString(value.activeEquipment, id)) &&
        hasNumber(value, 'garageSpaceUsed') &&
        hasNumber(value, 'garageSpaceLimit') &&
        isUpgradeRecord(value.upgrades) &&
        isLocalDemand(value.demand) &&
        Array.isArray(value.events) &&
        value.events.every(isEventLogEntry) &&
        equipmentIds.includes(value.selectedEquipmentId) &&
        hasNumber(value, 'salesToday') &&
        hasNumber(value, 'visibilityRisk') &&
        hasNumber(value, 'householdPressure') &&
        hasNumber(value, 'complianceRisk') &&
        hasBoolean(value, 'canInvoice') &&
        (value.campaign === undefined || isCampaignState(value.campaign)));
};
const parseSavedGame = (rawSave) => {
    const parsed = JSON.parse(rawSave);
    if (!isRecord(parsed) || parsed.version !== SAVE_VERSION || !isSavedGameState(parsed.state))
        return null;
    const savedState = parsed.state;
    const initialState = createInitialState();
    return {
        ...savedState,
        equipment: {
            ...initialState.equipment,
            ...savedState.equipment
        },
        activeEquipment: {
            ...initialState.activeEquipment,
            ...savedState.activeEquipment
        },
        batches: savedState.batches.map((batch) => ({
            ...batch,
            brewdayApproach: batch.brewdayApproach ?? 'standard',
            brewdayNotes: batch.brewdayNotes ?? ['Standard brew day kept the recipe on its expected path.'],
            substitutions: batch.substitutions ?? [],
            fermentationReadiness: batch.fermentationReadiness ?? {
                apparentProgress: batch.step === 'fermenting' ? Math.round(batch.stepProgress) : batch.step === 'awaiting-packaging' || batch.step === 'packaging' ? 100 : 0,
                fgConfidence: batch.step === 'awaiting-packaging' || batch.step === 'packaging' ? 'stable' : 'unknown',
                yeastCleanup: batch.step === 'awaiting-packaging' || batch.step === 'packaging' ? 'ready' : 'green',
                temperatureStress: 0,
                rushRisk: 0,
                gravityChecked: false
            },
            conditioningState: batch.conditioningState ?? {
                carbonationProgress: 0,
                co2Integration: 'rough',
                refermentationRisk: 0,
                packagePressureRisk: 0
            }
        })),
        finishedBeerLots: savedState.finishedBeerLots.map((lot) => ({
            ...lot,
            sourceBatchId: hasString(lot, 'sourceBatchId') ? lot.sourceBatchId : lot.id.replace(/-lot$/, ''),
            volumeLiters: hasNumber(lot, 'volumeLiters') ? lot.volumeLiters : lot.cases * 7.92,
            packagingState: lot.packagingState ?? 'packaged',
            saleState: lot.saleState ?? 'available',
            verdict: lot.verdict ? { ...lot.verdict, presentationScore: lot.verdict.presentationScore ?? 68 } : legacyVerdict(lot.quality, lot.recipeName)
        })),
        inventoryMovements: Array.isArray(savedState.inventoryMovements) ? savedState.inventoryMovements : [],
        fermenterTemperatureC: clampFermenterTemperature(hasNumber(savedState, 'fermenterTemperatureC') ? savedState.fermenterTemperatureC : initialState.fermenterTemperatureC),
        campaign: isCampaignState(savedState.campaign) ? savedState.campaign : initialCampaignState(),
        customerMemory: savedState.customerMemory ?? initialState.customerMemory,
        breweryIdentityTags: Array.isArray(savedState.breweryIdentityTags) ? savedState.breweryIdentityTags : initialState.breweryIdentityTags,
        sanitationDebt: isRecord(savedState.sanitationDebt) ? { ...initialState.sanitationDebt, ...savedState.sanitationDebt } : initialState.sanitationDebt,
        breweryHistory: Array.isArray(savedState.breweryHistory) ? savedState.breweryHistory : initialState.breweryHistory,
        flagshipRecipeIds: Array.isArray(savedState.flagshipRecipeIds) ? savedState.flagshipRecipeIds : initialState.flagshipRecipeIds,
        customerPromises: Array.isArray(savedState.customerPromises) ? savedState.customerPromises : initialState.customerPromises,
        identityScores: isRecord(savedState.identityScores) ? { ...initialState.identityScores, ...savedState.identityScores } : initialState.identityScores,
        breweryTier: typeof savedState.breweryTier === 'string' ? savedState.breweryTier : initialState.breweryTier,
        awards: Array.isArray(savedState.awards) ? savedState.awards : initialState.awards
    };
};
export const loadSavedGame = (storage = getBrowserStorage()) => {
    if (!storage)
        return createInitialState();
    try {
        const rawSave = storage.getItem(STORAGE_KEY);
        if (!rawSave)
            return createInitialState();
        const savedState = parseSavedGame(rawSave);
        if (savedState)
            return savedState;
        storage.removeItem(STORAGE_KEY);
        return createInitialState();
    }
    catch {
        try {
            storage.removeItem(STORAGE_KEY);
        }
        catch {
            // Ignore cleanup failures and still fall back safely.
        }
        return createInitialState();
    }
};
export const saveGameState = (state, storage = getBrowserStorage()) => {
    if (!storage)
        return;
    try {
        const save = { version: SAVE_VERSION, state };
        storage.setItem(STORAGE_KEY, JSON.stringify(save));
    }
    catch {
        // Browser storage can be unavailable or full. The game should remain playable without persistence.
    }
};
export const resetSavedGame = (storage = getBrowserStorage()) => {
    if (!storage)
        return;
    try {
        storage.removeItem(STORAGE_KEY);
    }
    catch {
        // Ignore storage failures so reset never breaks the local prototype.
    }
};
//# sourceMappingURL=persistence.js.map