import { ingredients } from '../data/ingredients.js';
import { campaignMissionOrder, initialCampaignState } from './campaign.js';
import { createInitialState } from './initialState.js';
import type { Batch, CampaignState, Equipment, EquipmentId, FinishedBeerLot, GameState, IngredientId, IngredientStock, Inventory, InventoryMovement, LocalDemand, OwnedEquipment, StorageState, SupplyOrder, Upgrade, UpgradeId } from './schema.js';

export const SAVE_VERSION = 6;
export const STORAGE_KEY = 'brewery-sim-save-v6';

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type SaveEnvelope = {
  version: typeof SAVE_VERSION;
  state: GameState;
};

const persistedEquipmentIds: EquipmentId[] = ['kettle', 'fermenter', 'bottler'];
const equipmentIds: EquipmentId[] = ['kettle', 'fermenter', 'bottler', 'mill'];
const upgradeIds: UpgradeId[] = ['larger-kettle', 'temp-control', 'labeler'];
const ingredientIds = ingredients.map((ingredient) => ingredient.id);
const batchSteps = ['brewing', 'awaiting-transfer', 'fermenting', 'awaiting-packaging', 'packaging', 'bottle-conditioning', 'ready'];
const inventoryMovementTypes = ['order-created', 'order-received', 'ingredients-consumed', 'beer-packaged', 'cases-sold', 'loss-recorded'];
const minFermenterTemperatureC = 8;
const maxFermenterTemperatureC = 40;

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

const clampFermenterTemperature = (temperatureC: number): number =>
  Math.min(maxFermenterTemperatureC, Math.max(minFermenterTemperatureC, Math.round(temperatureC)));

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
  isRecord(value) &&
  persistedEquipmentIds.every((id) => isEquipment(value[id], id)) &&
  (value.mill === undefined || isEquipment(value.mill, 'mill'));

const isOwnedEquipment = (value: unknown): value is OwnedEquipment =>
  isRecord(value) &&
  hasString(value, 'instanceId') &&
  equipmentIds.includes(value.equipmentId as EquipmentId) &&
  hasString(value, 'name') &&
  hasNumber(value, 'tier') &&
  hasNumber(value, 'condition') &&
  hasNumber(value, 'capacityLiters') &&
  hasNumber(value, 'spaceUsed') &&
  hasBoolean(value, 'installed');

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
  hasNumber(value, 'volumeLiters') &&
  hasString(value, 'fermenterInstanceId') &&
  hasNumber(value, 'contaminationRisk') &&
  hasNumber(value, 'faultRisk') &&
  hasNumber(value, 'storagePenalty') &&
  Array.isArray(value.faultEventsTriggered);

const isFinishedBeerLot = (value: unknown): value is FinishedBeerLot =>
  isRecord(value) && hasString(value, 'id') && hasString(value, 'recipeId') && hasString(value, 'recipeName') && hasNumber(value, 'cases') && hasNumber(value, 'quality') && hasNumber(value, 'marketAppeal');

const isInventoryMovement = (value: unknown): value is InventoryMovement =>
  isRecord(value) &&
  hasString(value, 'id') &&
  typeof value.type === 'string' &&
  inventoryMovementTypes.includes(value.type) &&
  hasNumber(value, 'day') &&
  hasNumber(value, 'minute') &&
  hasString(value, 'description') &&
  hasNumber(value, 'quantity') &&
  hasString(value, 'unit');

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
  isRecord(value) &&
  hasString(value, 'accountName') &&
  hasString(value, 'channelId') &&
  hasString(value, 'channelName') &&
  hasNumber(value, 'casesRequested') &&
  hasNumber(value, 'casesSold') &&
  hasNumber(value, 'reputationReward') &&
  hasBoolean(value, 'invoiceRequired') &&
    hasBoolean(value, 'formalOrder');

const isCampaignState = (value: unknown): value is CampaignState =>
  isRecord(value) &&
  typeof value.missionId === 'string' &&
  campaignMissionOrder.includes(value.missionId as CampaignState['missionId']) &&
  Array.isArray(value.completedMissionIds) &&
  value.completedMissionIds.every((missionId) => typeof missionId === 'string' && campaignMissionOrder.includes(missionId as CampaignState['missionId'])) &&
  Array.isArray(value.seenMissionIds) &&
  value.seenMissionIds.every((missionId) => typeof missionId === 'string' && campaignMissionOrder.includes(missionId as CampaignState['missionId']));

const isEventLogEntry = (value: unknown): boolean => isRecord(value) && hasString(value, 'id') && hasNumber(value, 'minute') && hasString(value, 'message');

const isSavedGameState = (value: unknown): value is GameState => {
  if (!isRecord(value)) return false;
  return (
    hasNumber(value, 'cash') &&
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
    persistedEquipmentIds.every((id) => hasString(value.activeEquipment as Record<string, unknown>, id)) &&
    hasNumber(value, 'garageSpaceUsed') &&
    hasNumber(value, 'garageSpaceLimit') &&
    isUpgradeRecord(value.upgrades) &&
    isLocalDemand(value.demand) &&
    Array.isArray(value.events) &&
    value.events.every(isEventLogEntry) &&
    equipmentIds.includes(value.selectedEquipmentId as EquipmentId) &&
    hasNumber(value, 'salesToday') &&
    hasNumber(value, 'visibilityRisk') &&
    hasNumber(value, 'householdPressure') &&
    hasNumber(value, 'complianceRisk') &&
    hasBoolean(value, 'canInvoice') &&
    (value.campaign === undefined || isCampaignState(value.campaign))
  );
};

const parseSavedGame = (rawSave: string): GameState | null => {
  const parsed = JSON.parse(rawSave) as unknown;
  if (!isRecord(parsed) || parsed.version !== SAVE_VERSION || !isSavedGameState(parsed.state)) return null;
  const savedState = parsed.state as GameState & Record<string, unknown>;
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
    finishedBeerLots: savedState.finishedBeerLots.map((lot) => ({
      ...lot,
      sourceBatchId: hasString(lot as unknown as Record<string, unknown>, 'sourceBatchId') ? lot.sourceBatchId : lot.id.replace(/-lot$/, ''),
      volumeLiters: hasNumber(lot as unknown as Record<string, unknown>, 'volumeLiters') ? lot.volumeLiters : lot.cases * 7.92,
      packagingState: lot.packagingState ?? 'packaged',
      saleState: lot.saleState ?? 'available'
    })),
    inventoryMovements: Array.isArray(savedState.inventoryMovements) ? savedState.inventoryMovements : [],
    fermenterTemperatureC: clampFermenterTemperature(hasNumber(savedState, 'fermenterTemperatureC') ? savedState.fermenterTemperatureC : initialState.fermenterTemperatureC),
    campaign: isCampaignState(savedState.campaign) ? savedState.campaign : initialCampaignState()
  };
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
