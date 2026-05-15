export type BatchStep = 'mashing' | 'fermenting' | 'packaging' | 'ready';
export type EquipmentId = 'kettle' | 'fermenter' | 'bottler';
export type UpgradeId = 'larger-kettle' | 'temp-control' | 'labeler';
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
  stage: Exclude<BatchStep, 'ready'>;
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
  qualityBase: number;
  difficulty: number;
  storageSensitivity: number;
  riskTags: string[];
  challenge: string;
  enabled: boolean;
  stepDurations: Record<Exclude<BatchStep, 'ready'>, number>;
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
  name: string;
  description: string;
  level: number;
  condition: number;
  x: number;
  y: number;
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
  casesRequested: number;
  casesSold: number;
  reputationReward: number;
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
  inventory: Inventory;
  batches: Batch[];
  equipment: Record<EquipmentId, Equipment>;
  upgrades: Record<UpgradeId, Upgrade>;
  demand: LocalDemand;
  events: EventLogEntry[];
  selectedEquipmentId: EquipmentId;
  salesToday: number;
  pendingOrders: SupplyOrder[];
  storage: StorageState;
  finishedBeerLots: FinishedBeerLot[];
  visibilityRisk: number;
}

export type GameAction =
  | { type: 'tick'; seconds: number }
  | { type: 'select-equipment'; equipmentId: EquipmentId }
  | { type: 'use-equipment'; equipmentId: EquipmentId }
  | { type: 'start-batch'; recipeId: string }
  | { type: 'order-ingredient'; ingredientId: IngredientId; packs: number }
  | { type: 'order-recipe'; recipeId: string; mode: OrderMode }
  | { type: 'package-batch'; batchId: string }
  | { type: 'sell-cases'; cases: number }
  | { type: 'buy-upgrade'; upgradeId: UpgradeId }
  | { type: 'clean-equipment'; equipmentId: EquipmentId };
