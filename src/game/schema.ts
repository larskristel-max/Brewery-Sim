export type BatchStep =
  | 'brewing'
  | 'awaiting-transfer'
  | 'fermenting'
  | 'awaiting-packaging'
  | 'packaging'
  | 'bottle-conditioning'
  | 'ready';
export type TimedBatchStep = 'brewing' | 'fermenting' | 'packaging' | 'bottle-conditioning';
export type EquipmentId = 'kettle' | 'fermenter' | 'bottler' | 'mill';
export type EquipmentItemId =
  | 'stock-pot-20l'
  | 'all-in-one-40l'
  | 'three-vessel-60l'
  | 'nano-biab-150l'
  | 'plastic-bucket'
  | 'stainless-conical-50l'
  | 'unitank-150l'
  | 'grain-mill-tier2'
  | 'wand-capper'
  | 'semi-auto-filler'
  | 'small-can-seamer';
export type EquipmentTier = 1 | 2 | 3;
export type UpgradeId = 'larger-kettle' | 'temp-control' | 'labeler';
export type EquipmentStation = 'brewhouse' | 'fermentation' | 'milling' | 'packaging';
export type SalesChannelId = 'friends-family' | 'private-event' | 'local-bar' | 'restaurant';
export type IngredientCategory = 'malt' | 'hops' | 'yeast' | 'sugar' | 'packaging' | 'cleaning';
export type StorageArea = 'dry-shelf' | 'cold-box' | 'utility-shelf';
export type IngredientCondition = 'fresh' | 'stressed' | 'damp' | 'stale' | 'weak';
export type IngredientUnit = 'kg' | 'g' | 'pack' | 'unit';
export type OrderMode = 'missing' | 'extra';
export type IngredientId =
  | 'pilsner-malt'
  | 'pale-malt'
  | 'wheat-malt'
  | 'crystal-malt'
  | 'black-malt'
  | 'saaz-hops'
  | 'ipa-hops'
  | 'styrian-hops'
  | 'fuggles-hops'
  | 'ale-yeast'
  | 'lager-yeast'
  | 'wheat-yeast'
  | 'saison-yeast'
  | 'kveik-yeast'
  | 'stout-yeast'
  | 'bottles'
  | 'cleaner';

export interface Ingredient {
  id: IngredientId;
  name: string;
  category: IngredientCategory;
  unit: IngredientUnit;
  storageArea: StorageArea;
  packSize: number;
  packPrice: number;
  sourceNote: string;
}

export interface IngredientStock {
  amount: number;
  condition: number;
}

export interface RecipeIngredient {
  ingredientId: IngredientId;
  amount: number;
}

export interface BeerFaultEvent {
  id: string;
  stage: TimedBatchStep;
  minRisk: number;
  qualityPenalty: number;
  message: string;
}

export interface Recipe {
  id: string;
  name: string;
  style: string;
  description: string;
  ingredients: RecipeIngredient[];
  waterCost: number;
  salePricePerCase: number;
  marketAppeal: number;
  batchSizeCases: number;
  targetBatchLiters: number;
  qualityBase: number;
  difficulty: number;
  storageSensitivity: number;
  riskTags: string[];
  challenge: string;
  enabled: boolean;
  stepDurations: Record<TimedBatchStep, number>;
  faultEvents: BeerFaultEvent[];
}

export interface Inventory {
  water: number;
  cases: number;
  ingredients: Record<IngredientId, IngredientStock>;
}

export interface Batch {
  id: string;
  recipeId: string;
  recipeName: string;
  step: BatchStep;
  stepProgress: number;
  quality: number;
  casesExpected: number;
  volumeLiters: number;
  fermenterInstanceId: string;
  contaminationRisk: number;
  faultRisk: number;
  storagePenalty: number;
  faultEventsTriggered: string[];
}

export interface FinishedBeerLot {
  id: string;
  recipeId: string;
  recipeName: string;
  cases: number;
  quality: number;
  marketAppeal: number;
}

export interface SupplyOrderItem {
  ingredientId: IngredientId;
  amount: number;
  packs: number;
}

export interface SupplyOrder {
  id: string;
  dayOrdered: number;
  arrivalDay: number;
  cost: number;
  items: SupplyOrderItem[];
}

export interface StorageState {
  dryShelfCapacity: number;
  coldBoxCapacity: number;
  utilityShelfCapacity: number;
}

export interface Equipment {
  id: EquipmentId;
  itemId?: EquipmentItemId;
  name: string;
  description: string;
  tier: EquipmentTier;
  level: number;
  condition: number;
  cost: number;
  capacityCaseBonus: number;
  qualityBonus: number;
  riskModifier: number;
  speedModifier: number;
  capacityLiters: number;
  spaceUsed: number;
  visualClass: string;
  operonTypeKey: string;
  x: number;
  y: number;
}

export interface EquipmentCatalogItem {
  id: EquipmentItemId;
  equipmentId: EquipmentId;
  station: EquipmentStation;
  name: string;
  description: string;
  tier: EquipmentTier;
  cost: number;
  spaceUsed: number;
  capacityLiters: number;
  batchTimeModifier: number;
  attentionModifier: number;
  lossModifier: number;
  visualClass: string;
  operonTypeKey: string;
  maxOwned?: number;
  qualityBonus: number;
  riskModifier: number;
  speedModifier: number;
}

export interface OwnedEquipment {
  instanceId: string;
  itemId: EquipmentItemId;
  equipmentId: EquipmentId;
  station: EquipmentStation;
  name: string;
  tier: EquipmentTier;
  condition: number;
  capacityLiters: number;
  spaceUsed: number;
  batchTimeModifier: number;
  attentionModifier: number;
  qualityBonus: number;
  riskModifier: number;
  lossModifier: number;
  visualClass: string;
  operonTypeKey: string;
  occupiedBatchId?: string;
  installed: boolean;
}

export interface Upgrade {
  id: UpgradeId;
  name: string;
  description: string;
  cost: number;
  purchased: boolean;
}

export interface LocalDemand {
  accountName: string;
  channelId: SalesChannelId;
  channelName: string;
  casesRequested: number;
  casesSold: number;
  reputationReward: number;
  invoiceRequired: boolean;
  formalOrder: boolean;
}

export interface EventLogEntry {
  id: string;
  minute: number;
  message: string;
}

export interface GameState {
  cash: number;
  reputation: number;
  day: number;
  dayElapsedSeconds: number;
  minute: number;
  energy: number;
  inventory: Inventory;
  batches: Batch[];
  equipment: Record<EquipmentId, Equipment>;
  ownedEquipment: OwnedEquipment[];
  activeEquipment: Record<EquipmentId, string>;
  garageSpaceUsed: number;
  garageSpaceLimit: number;
  upgrades: Record<UpgradeId, Upgrade>;
  demand: LocalDemand;
  events: EventLogEntry[];
  selectedEquipmentId: EquipmentId;
  salesToday: number;
  pendingOrders: SupplyOrder[];
  storage: StorageState;
  finishedBeerLots: FinishedBeerLot[];
  visibilityRisk: number;
  householdPressure: number;
  complianceRisk: number;
  canInvoice: boolean;
  fermenterTemperatureC: number;
}

export type GameAction =
  | { type: 'tick'; seconds: number }
  | { type: 'end-day' }
  | { type: 'select-equipment'; equipmentId: EquipmentId }
  | { type: 'use-equipment'; equipmentId: EquipmentId }
  | { type: 'start-batch'; recipeId: string }
  | { type: 'transfer-batch'; batchId: string }
  | { type: 'start-packaging'; batchId: string }
  | { type: 'ready-batch'; batchId: string }
  | { type: 'order-ingredient'; ingredientId: IngredientId; packs: number }
  | { type: 'order-recipe'; recipeId: string; mode: OrderMode }
  | { type: 'package-batch'; batchId: string }
  | { type: 'sell-cases'; cases: number }
  | { type: 'sell-channel'; channelId: SalesChannelId; cases: number }
  | { type: 'buy-upgrade'; upgradeId: UpgradeId }
  | { type: 'buy-equipment'; equipmentItemId: EquipmentItemId }
  | { type: 'crisis-action'; actionId: 'pause-public-sales' | 'discount-informal' | 'paperwork-prep' }
  | { type: 'set-fermenter-temperature'; temperatureC: number }
  | { type: 'clean-equipment'; equipmentId: EquipmentId };
