import { createInitialState } from './initialState.js';
export const SAVE_VERSION = 1;
export const STORAGE_KEY = 'brewery-sim-save-v1';
const equipmentIds = ['kettle', 'fermenter', 'bottler'];
const upgradeIds = ['larger-kettle', 'temp-control', 'labeler'];
const batchSteps = ['mashing', 'fermenting', 'packaging', 'ready'];
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
const isInventory = (value) => isRecord(value) && hasNumber(value, 'grain') && hasNumber(value, 'hops') && hasNumber(value, 'yeast') && hasNumber(value, 'water') && hasNumber(value, 'cases');
const isEquipment = (value, id) => isRecord(value) &&
    value.id === id &&
    hasString(value, 'name') &&
    hasString(value, 'description') &&
    hasNumber(value, 'level') &&
    hasNumber(value, 'condition') &&
    hasNumber(value, 'x') &&
    hasNumber(value, 'y');
const isEquipmentRecord = (value) => isRecord(value) && equipmentIds.every((id) => isEquipment(value[id], id));
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
    hasNumber(value, 'contaminationRisk');
const isLocalDemand = (value) => isRecord(value) && hasString(value, 'accountName') && hasNumber(value, 'casesRequested') && hasNumber(value, 'casesSold') && hasNumber(value, 'reputationReward');
const isSavedGameState = (value) => {
    if (!isRecord(value))
        return false;
    return (hasNumber(value, 'cash') &&
        hasNumber(value, 'reputation') &&
        hasNumber(value, 'day') &&
        hasNumber(value, 'dayElapsedSeconds') &&
        hasNumber(value, 'minute') &&
        isInventory(value.inventory) &&
        Array.isArray(value.batches) &&
        value.batches.every(isBatch) &&
        isEquipmentRecord(value.equipment) &&
        isUpgradeRecord(value.upgrades) &&
        isLocalDemand(value.demand) &&
        equipmentIds.includes(value.selectedEquipmentId) &&
        hasNumber(value, 'salesToday'));
};
const parseSavedGame = (rawSave) => {
    const parsed = JSON.parse(rawSave);
    if (!isRecord(parsed) || parsed.version !== SAVE_VERSION || !isSavedGameState(parsed.state))
        return null;
    return parsed.state;
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