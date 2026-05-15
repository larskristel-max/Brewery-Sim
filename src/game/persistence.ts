import { ingredients } from '../data/ingredients.js';
import { createInitialState } from './initialState.js';
import type { Batch, Equipment, EquipmentId, FinishedBeerLot, GameState, IngredientId, IngredientStock, Inventory, LocalDemand, StorageState, SupplyOrder, Upgrade, UpgradeId } from './schema.js';

export const SAVE_VERSION = 2;
export const STORAGE_KEY = 'brewery-sim-save-v2';

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type SaveEnvelope = {
  version: typeof SAVE_VERSION;
  state: GameState;
};

const equipmentIds: EquipmentId[] = ['kettle', 'fermenter', 'bottler'];
const upgradeIds: UpgradeId[] = ['larger-kettle', 'temp-control', 'labeler'];
const ingredientIds = ingredients.map((ingredient) => ingredient.id);
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

const isIngredientStock = (value: unknown): value is IngredientStock => isRecord(value) && hasNumber(value, 'amount') && hasNumber(value, 'condition');

const isIngredientRecord = (value: unknown): value is Record<IngredientId, IngredientStock> =>
  isRecord(value) && ingredientIds.every((id) => isIngredientStock(value[id]));

const isInventory = (value: unknown): value is Inventory =>
  isRecord(value) && hasNumber(value, 'water') && hasNumber(value, 'cases') && isIngredientRecord(value.ingredients);

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
  hasNumber(value, 'contaminationRisk') &&
  hasNumber(value, 'faultRisk') &&
  hasNumber(value, 'storagePenalty') &&
  Array.isArray(value.faultEventsTriggered);

const isFinishedBeerLot = (value: unknown): value is FinishedBeerLot =>
  isRecord(value) && hasString(value, 'id') && hasString(value, 'recipeId') && hasString(value, 'recipeName') && hasNumber(value, 'cases') && hasNumber(value, 'quality') && hasNumber(value, 'marketAppeal');

const isSupplyOrder = (value: unknown): value is SupplyOrder =>
  isRecord(value) &&
  hasString(value, 'id') &&
  hasNumber(value, 'dayOrdered') &&
  hasNumber(value, 'arrivalDay') &&
  hasNumber(value, 'cost') &&
  Array.isArray(value.items) &&
  value.items.every((item) => isRecord(item) && ingredientIds.includes(item.ingredientId as IngredientId) && hasNumber(item, 'amount') && hasNumber(item, 'packs'));

const isStorageState = (value: unknown): value is StorageState =>
  isRecord(value) && hasNumber(value, 'dryShelfCapacity') && hasNumber(value, 'coldBoxCapacity') && hasNumber(value, 'utilityShelfCapacity');

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
    Array.isArray(value.finishedBeerLots) &&
    value.finishedBeerLots.every(isFinishedBeerLot) &&
    Array.isArray(value.pendingOrders) &&
    value.pendingOrders.every(isSupplyOrder) &&
    isStorageState(value.storage) &&
    isEquipmentRecord(value.equipment) &&
    isUpgradeRecord(value.upgrades) &&
    isLocalDemand(value.demand) &&
    equipmentIds.includes(value.selectedEquipmentId as EquipmentId) &&
    hasNumber(value, 'salesToday') &&
    hasNumber(value, 'visibilityRisk')
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
