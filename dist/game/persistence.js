import { createInitialState } from './initialState.js';
export const SAVE_VERSION = 1;
export const STORAGE_KEY = 'brewery-sim-save-v1';
const getBrowserStorage = () => {
    if (typeof globalThis.localStorage === 'undefined')
        return null;
    return globalThis.localStorage;
};
const isRecord = (value) => typeof value === 'object' && value !== null;
const hasNumber = (value, key) => typeof value[key] === 'number' && Number.isFinite(value[key]);
const isSavedGameState = (value) => {
    if (!isRecord(value))
        return false;
    return (hasNumber(value, 'cash') &&
        hasNumber(value, 'reputation') &&
        hasNumber(value, 'day') &&
        hasNumber(value, 'dayElapsedSeconds') &&
        hasNumber(value, 'minute') &&
        isRecord(value.inventory) &&
        Array.isArray(value.batches) &&
        isRecord(value.equipment) &&
        isRecord(value.upgrades) &&
        isRecord(value.demand) &&
        typeof value.selectedEquipmentId === 'string' &&
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
        return parseSavedGame(rawSave) ?? createInitialState();
    }
    catch {
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