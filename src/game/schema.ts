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
export type SalesRiskCategory = 'informal' | 'semi-formal' | 'formal';
export type IngredientCategory = 'malt' | 'hops' | 'yeast' | 'sugar' | 'packaging' | 'cleaning';
export type StorageArea = 'dry-shelf' | 'cold-box' | 'utility-shelf';
export type IngredientCondition = 'fresh' | 'stressed' | 'damp' | 'stale' | 'weak';
export type IngredientUnit = 'kg' | 'g' | 'pack' | 'unit';
export type OrderMode = 'missing' | 'extra';
export type RecipeCategoryId = 'starter' | 'hop-forward' | 'cool-fermentation' | 'farmhouse-wheat' | 'dark' | 'experimental';
export type PackagingState = 'packaged';
export type SaleState = 'available' | 'partially-sold' | 'sold-out';
export type BrewdayApproach = 'careful' | 'standard' | 'fast';
export type TransferMode = 'careful' | 'rough';
export type PackagingMode = 'careful' | 'standard' | 'rush';
export type FgConfidence = 'unknown' | 'moving' | 'nearly-stable' | 'stable';
export type YeastCleanup = 'green' | 'cleaning-up' | 'ready';
export type Co2Integration = 'rough' | 'improving' | 'integrated';
export type QualityBand = 'excellent' | 'solid' | 'flawed' | 'bad' | 'unsafe';
export type SellAdvice = 'sell' | 'discount' | 'hold' | 'dump' | 'recall';
export type CustomerId = 'samira' | 'rudy' | 'nico' | 'mira' | 'festival' | 'restaurant';
export type PackagingExpectation = 'any' | 'presentable' | 'clean-label' | 'cans' | 'kegs';
export type SanitationArea = 'brewhouse' | 'fermentation' | 'packaging' | 'transferPath' | 'generalGarage';
export type BreweryHistoryKind = 'promise' | 'verdict' | 'customer' | 'recovery' | 'award' | 'flagship' | 'identity';
export type CustomerPromiseStatus = 'open' | 'fulfilled' | 'missed' | 'replaced' | 'lost';
export type IdentityPathId =
  | 'clean-lager-specialist'
  | 'farmhouse-saison-brewer'
  | 'hype-ipa-brewery'
  | 'event-supplier'
  | 'local-pub-workhorse'
  | 'experimental-belgian'
  | 'regional-consistency';
export type BreweryTier = 'garage' | 'nano' | 'craft' | 'regional';
export type BreweryPromiseId =
  | 'mira-regular-tap'
  | 'festival-saison-slot'
  | 'restaurant-clean-lager'
  | 'regional-consistency-contract';
export type CampaignMissionId =
  | 'barbecue-text'
  | 'empty-shelf'
  | 'bucket-empire'
  | 'uncle-nico-wedding'
  | 'warm-garage-week'
  | 'sticky-bucket'
  | 'labels-at-midnight'
  | 'first-festival'
  | 'first-bar-account'
  | 'household-summit'
  | 'sandbox-unlocked';
export type InventoryMovementType =
  | 'order-created'
  | 'order-received'
  | 'ingredients-consumed'
  | 'beer-packaged'
  | 'cases-sold'
  | 'loss-recorded';
export type IngredientId =
  | 'pilsner-malt'
  | 'pale-malt'
  | 'wheat-malt'
  | 'aromatic-malt'
  | 'crystal-malt'
  | 'black-malt'
  | 'saaz-hops'
  | 'ipa-hops'
  | 'styrian-hops'
  | 'fuggles-hops'
  | 'ale-yeast'
  | 'lager-yeast'
  | 'wheat-yeast'
  | 'belgian-yeast'
  | 'saison-yeast'
  | 'kveik-yeast'
  | 'stout-yeast'
  | 'bottles'
  | 'candi-sugar'
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
  originalGravity?: string;
  expectedAbv?: string;
  wortNote?: string;
  brewNote?: string;
  enabled: boolean;
  stepDurations: Record<TimedBatchStep, number>;
  faultEvents: BeerFaultEvent[];
}

export interface Inventory {
  water: number;
  cases: number;
  ingredients: Record<IngredientId, IngredientStock>;
}

export interface FermentationReadiness {
  apparentProgress: number;
  fgConfidence: FgConfidence;
  yeastCleanup: YeastCleanup;
  temperatureStress: number;
  rushRisk: number;
  gravityChecked: boolean;
}

export interface ConditioningState {
  carbonationProgress: number;
  co2Integration: Co2Integration;
  refermentationRisk: number;
  packagePressureRisk: number;
}

export interface PackagingResult {
  oxygenPickupRisk: number;
  sanitationRisk: number;
  fillOrCapRisk: number;
  presentationScore: number;
  packageStability: number;
  missedCriticalItem?: string;
}

export interface BatchVerdict {
  qualityBand: QualityBand;
  headline: string;
  sensoryNotes: string[];
  likelyCauses: string[];
  sellAdvice: SellAdvice;
  stabilityRisk: number;
  presentationScore: number;
  legacyTags: string[];
}

export interface BatchSubstitution {
  missingIngredientId: IngredientId;
  substituteIngredientId: IngredientId;
  amount: number;
  qualityPenalty: number;
  riskPenalty: number;
  note: string;
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
  brewdayApproach: BrewdayApproach;
  brewdayNotes: string[];
  transferMode?: TransferMode;
  substitutions: BatchSubstitution[];
  fermentationReadiness: FermentationReadiness;
  conditioningState: ConditioningState;
  packagingMode?: PackagingMode;
  packagingResult?: PackagingResult;
  contaminationRisk: number;
  faultRisk: number;
  storagePenalty: number;
  faultEventsTriggered: string[];
}

export interface FinishedBeerLot {
  id: string;
  sourceBatchId: string;
  recipeId: string;
  recipeName: string;
  cases: number;
  volumeLiters: number;
  quality: number;
  marketAppeal: number;
  packagingState: PackagingState;
  saleState: SaleState;
  verdict: BatchVerdict;
  customerReaction?: string;
}

export interface CustomerMemory {
  customerId: CustomerId;
  trust: number;
  notes: string[];
}

export interface CustomerPromise {
  id: string;
  customerId: CustomerId;
  customerName: string;
  requestedCases: number;
  deliveredCases: number;
  preferredStyles: string[];
  deadlineDay: number;
  minimumQualityBand: QualityBand;
  packagingExpectation: PackagingExpectation;
  status: CustomerPromiseStatus;
  trustAtStake: number;
  bestDeliveredQualityBand?: QualityBand;
  bestPresentationScore?: number;
}

export interface BreweryAward {
  id: string;
  day: number;
  title: string;
  recipeId: string;
  customerId?: CustomerId;
  reputationDelta: number;
  identityPath: IdentityPathId;
}

export interface BreweryHistoryEntry {
  id: string;
  day: number;
  kind: BreweryHistoryKind;
  title: string;
  detail: string;
  recipeId?: string;
  customerId?: CustomerId;
}

export interface InventoryMovement {
  id: string;
  type: InventoryMovementType;
  day: number;
  minute: number;
  description: string;
  quantity: number;
  unit: 'case' | 'liter' | 'ingredient' | 'order';
  batchId?: string;
  lotId?: string;
  recipeId?: string;
  channelId?: SalesChannelId;
  ingredientId?: IngredientId;
}

export interface SalesOffer {
  channelId: SalesChannelId;
  name: string;
  cases: number;
  requestedCases: number;
  revenue: number;
  reputationDelta: number;
  visibilityDelta: number;
  complianceDelta: number;
  householdPressureDelta: number;
  invoiceNote: string;
  complianceNote: string;
  riskCategory: SalesRiskCategory;
  disabledReason: string;
}

export interface PackagingReadiness {
  canPackage: boolean;
  batch?: Batch;
  requiredBottles: number;
  blockers: string[];
  summary: string;
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
  customerId?: CustomerId;
  casesRequested: number;
  casesSold: number;
  reputationReward: number;
  invoiceRequired: boolean;
  formalOrder: boolean;
  deadlineDay?: number;
  minimumQualityBand?: QualityBand;
  packagingExpectation?: PackagingExpectation;
  promiseLocked?: boolean;
  missedPromise?: boolean;
  requestedRecipeId?: string;
  requestedRecipeName?: string;
  flagshipRequest?: boolean;
}

export interface CampaignState {
  missionId: CampaignMissionId;
  completedMissionIds: CampaignMissionId[];
  seenMissionIds: CampaignMissionId[];
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
  inventoryMovements: InventoryMovement[];
  visibilityRisk: number;
  householdPressure: number;
  complianceRisk: number;
  canInvoice: boolean;
  fermenterTemperatureC: number;
  campaign: CampaignState;
  customerMemory: Record<CustomerId, CustomerMemory>;
  breweryIdentityTags: string[];
  sanitationDebt: Record<SanitationArea, number>;
  breweryHistory: BreweryHistoryEntry[];
  flagshipRecipeIds: string[];
  customerPromises: CustomerPromise[];
  identityScores: Record<IdentityPathId, number>;
  breweryTier: BreweryTier;
  awards: BreweryAward[];
}

export type GameAction =
  | { type: 'tick'; seconds: number }
  | { type: 'end-day' }
  | { type: 'select-equipment'; equipmentId: EquipmentId }
  | { type: 'use-equipment'; equipmentId: EquipmentId }
  | { type: 'start-batch'; recipeId: string; brewdayApproach?: BrewdayApproach; allowSubstitutions?: boolean }
  | { type: 'wait-until-ready'; batchId?: string }
  | { type: 'transfer-batch'; batchId: string; transferMode?: TransferMode }
  | { type: 'check-gravity'; batchId: string }
  | { type: 'package-early'; batchId: string }
  | { type: 'start-packaging'; batchId: string; packagingMode?: PackagingMode }
  | { type: 'ready-batch'; batchId: string }
  | { type: 'order-ingredient'; ingredientId: IngredientId; packs: number }
  | { type: 'order-recipe'; recipeId: string; mode: OrderMode }
  | { type: 'package-batch'; batchId: string }
  | { type: 'sell-cases'; cases: number }
  | { type: 'sell-channel'; channelId: SalesChannelId; cases: number }
  | { type: 'choose-promise'; promiseId: BreweryPromiseId }
  | { type: 'buy-upgrade'; upgradeId: UpgradeId }
  | { type: 'buy-equipment'; equipmentItemId: EquipmentItemId }
  | { type: 'competition-entry'; lotId?: string }
  | { type: 'crisis-action'; actionId: 'pause-public-sales' | 'discount-informal' | 'paperwork-prep' }
  | { type: 'recovery-action'; actionId: 'hold-risky-lot' | 'discount-risky-lot' | 'dump-risky-lot' | 'recall-risky-lot' | 'replacement-gesture'; lotId?: string }
  | { type: 'set-fermenter-temperature'; temperatureC: number }
  | { type: 'clean-equipment'; equipmentId: EquipmentId }
  | { type: 'dismiss-story-card' };
