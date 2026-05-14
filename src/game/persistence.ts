import { createInitialState } from './initialState.js';
import type { Batch, Equipment, EquipmentId, GameState, Inventory, LocalDemand, Upgrade, UpgradeId } from './schema.js';

export const SAVE_VERSION = 1;
export const STORAGE_KEY = 'brewery-sim-save-v1';

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type SaveEnvelope = {
  version: typeof SAVE_VERSION;
  state: GameState;
};

const equipmentIds: EquipmentId[] = ['kettle', 'fermenter', 'bottler'];
const upgradeIds: UpgradeId[] = ['larger-kettle', 'temp-control', 'labeler'];
const batchSteps = ['mashing', 'fermenting', 'packaging', 'ready'];

const getBrowserStorage = (): BrowserStorage | null => {
  try {
    if (typeof globalThis.localStorage === 'undefined') return null;
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const hasNumber = (value: Record<string, unknown>, key: string): boolean => typeof value[key] === 'number' && Number.isFinite(value[key]);

const hasString = (value: Record<string, unknown>, key: string): boolean => typeof value[key] === 'string';

const hasBoolean = (value: Record<string, unknown>, key: string): boolean => typeof value[key] === 'boolean';

const isInventory = (value: unknown): value is Inventory =>
  isRecord(value) && hasNumber(value, 'grain') && hasNumber(value, 'hops') && hasNumber(value, 'yeast') && hasNumber(value, 'water') && hasNumber(value, 'cases');

const isEquipment = (value: unknown, id: EquipmentId): value is Equipment =>
  isRecord(value) &&
  value.id === id &&
  hasString(value, 'name') &&
  hasString(value, 'description') &&
  hasNumber(value, 'level') &&
  hasNumber(value, 'condition') &&
  hasNumber(value, 'x') &&
  hasNumber(value, 'y');

const isEquipmentRecord = (value: unknown): value is GameState['equipment'] =>
  isRecord(value) && equipmentIds.every((id) => isEquipment(value[id], id));

const isUpgrade = (value: unknown, id: UpgradeId): value is Upgrade =>
  isRecord(value) && value.id === id && hasString(value, 'name') && hasString(value, 'description') && hasNumber(value, 'cost') && hasBoolean(value, 'purchased');

const isUpgradeRecord = (value: unknown): value is GameState['upgrades'] =>
  isRecord(value) && upgradeIds.every((id) => isUpgrade(value[id], id));

const isBatch = (value: unknown): value is Batch =>
  isRecord(value) &&
  hasString(value, 'id') &&
  hasString(value, 'recipeId') &&
  hasString(value, 'recipeName') &&
  typeof value.step === 'string' &&
  batchSteps.includes(value.step) &&
  hasNumber(value, 'stepProgress') &&
  hasNumber(value, 'quality') &&
  hasNumber(value, 'casesExpected') &&
  hasNumber(value, 'contaminationRisk');

const isLocalDemand = (value: unknown): value is LocalDemand =>
  isRecord(value) && hasString(value, 'accountName') && hasNumber(value, 'casesRequested') && hasNumber(value, 'casesSold') && hasNumber(value, 'reputationReward');

const isSavedGameState = (value: unknown): value is GameState => {
  if (!isRecord(value)) return false;
  return (
    hasNumber(value, 'cash') &&
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
    equipmentIds.includes(value.selectedEquipmentId as EquipmentId) &&
    hasNumber(value, 'salesToday')
  );
};

const parseSavedGame = (rawSave: string): GameState | null => {
  const parsed = JSON.parse(rawSave) as unknown;
  if (!isRecord(parsed) || parsed.version !== SAVE_VERSION || !isSavedGameState(parsed.state)) return null;
  return parsed.state;
};

export const loadSavedGame = (storage: BrowserStorage | null = getBrowserStorage()): GameState => {
  if (!storage) return createInitialState();

  try {
    const rawSave = storage.getItem(STORAGE_KEY);
    if (!rawSave) return createInitialState();

    const savedState = parseSavedGame(rawSave);
    if (savedState) return savedState;
    storage.removeItem(STORAGE_KEY);
    return createInitialState();
  } catch {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore cleanup failures and still fall back safely.
    }
    return createInitialState();
  }
};

export const saveGameState = (state: GameState, storage: BrowserStorage | null = getBrowserStorage()): void => {
  if (!storage) return;

  try {
    const save: SaveEnvelope = { version: SAVE_VERSION, state };
    storage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Browser storage can be unavailable or full. The game should remain playable without persistence.
  }
};

export const resetSavedGame = (storage: BrowserStorage | null = getBrowserStorage()): void => {
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures so reset never breaks the local prototype.
  }
};
