import { getIngredient } from '../data/ingredients.js';
import { getRecipe, recipes } from '../data/recipes.js';
import type { Batch, BatchStep, EquipmentId, GameState, IngredientId, OwnedEquipment, Recipe, RecipeIngredient, SalesChannelId, StorageArea } from './schema.js';

const gameStartDateUtc = Date.UTC(2026, 4, 16);

export type EquipmentConditionTier = 'clean' | 'worn' | 'dirty' | 'critical';
export type ContaminationRiskTier = 'low' | 'elevated' | 'high' | 'severe';


export const salesChannels: Record<SalesChannelId, { name: string; cases: number; rep: number; invoiceAfter: number; risk: number; formal: boolean }> = {
  'friends-family': { name: 'Friends and family', cases: 4, rep: 1, invoiceAfter: 999, risk: 0.6, formal: false },
  'private-event': { name: 'Private event', cases: 8, rep: 2, invoiceAfter: 26, risk: 1.1, formal: false },
  'local-bar': { name: 'Local bar', cases: 12, rep: 3, invoiceAfter: 18, risk: 1.8, formal: true },
  restaurant: { name: 'Restaurant', cases: 16, rep: 4, invoiceAfter: 0, risk: 2.4, formal: true }
};

export const formatClock = (minute: number): string => {
  const dayMinute = minute % (24 * 60);
  const hours = Math.floor(dayMinute / 60);
  const minutes = dayMinute % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${suffix}`;
};

export const formatCurrency = (amount: number): string => `EUR ${amount}`;

export const formatGameDate = (day: number): string => {
  const date = new Date(gameStartDateUtc + Math.max(0, day - 1) * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
};

export const ingredientAmountLabel = (ingredientId: IngredientId, amount: number): string => {
  const ingredient = getIngredient(ingredientId);
  if (ingredient.unit === 'kg') return `${amount.toFixed(amount % 1 === 0 ? 0 : 1)} kg`;
  if (ingredient.unit === 'g') return `${Math.round(amount)} g`;
  if (ingredient.unit === 'pack') return `${amount} pack${amount === 1 ? '' : 's'}`;
  return `${amount} units`;
};

export const ingredientUnitCost = (ingredientId: IngredientId): number => {
  const ingredient = getIngredient(ingredientId);
  return ingredient.packPrice / ingredient.packSize;
};

export const recipeIngredientCost = (recipe: Recipe): number =>
  Math.round(recipe.ingredients.reduce((total, item) => total + ingredientUnitCost(item.ingredientId) * item.amount, 0));

export const recipeMissingIngredients = (state: GameState, recipe: Recipe): RecipeIngredient[] =>
  recipe.ingredients
    .map((item) => {
      const stock = state.inventory.ingredients[item.ingredientId]?.amount ?? 0;
      return { ingredientId: item.ingredientId, amount: Math.max(0, item.amount - stock) };
    })
    .filter((item) => item.amount > 0);

export const recipeCanStart = (state: GameState, recipe: Recipe): boolean =>
  recipe.enabled &&
  state.inventory.water >= recipe.waterCost &&
  recipeMissingIngredients(state, recipe).length === 0 &&
  state.energy >= 35 &&
  !state.batches.some((batch) => batch.step === 'brewing') &&
  availableFermenters(state).length > 0;

export const ownedByStation = (state: GameState, equipmentId: EquipmentId): OwnedEquipment[] =>
  state.ownedEquipment.filter((item) => item.equipmentId === equipmentId);

export const activeOwnedEquipment = (state: GameState, equipmentId: EquipmentId): OwnedEquipment => {
  const activeId = state.activeEquipment[equipmentId];
  const owned = state.ownedEquipment.find((item) => item.instanceId === activeId) ?? ownedByStation(state, equipmentId)[0];
  if (!owned) throw new Error(`No owned equipment for ${equipmentId}`);
  return owned;
};

export const availableFermenters = (state: GameState): OwnedEquipment[] =>
  ownedByStation(state, 'fermenter').filter((item) => !item.occupiedBatchId);

export const garageSpaceAvailable = (state: GameState): number => Math.max(0, state.garageSpaceLimit - state.garageSpaceUsed);

export const bottleVolumeMl = 330;
export const bottlesPerCase = 12;
export const caseDefinitionLabel = `${bottlesPerCase} × 33 cl bottles`;
export const caseDefinitionExplanation = `In Brewery-Sim, one gameplay case = ${caseDefinitionLabel}.`;
export const caseCountLabel = (cases: number): string => `${cases} gameplay case${cases === 1 ? '' : 's'} (${caseDefinitionLabel} each)`;

export const litersToBottles = (liters: number): number => Math.max(1, Math.round((liters * 1000) / bottleVolumeMl));

export const litersToCases = (liters: number): number => Math.max(1, Math.round(litersToBottles(liters) / bottlesPerCase));

export const recipeBatchCapacity = (state: GameState, recipe: Recipe): { liters: number; bottles: number; cases: number; reason: string; fermenter?: OwnedEquipment } => {
  const brewhouse = activeOwnedEquipment(state, 'kettle');
  const fermenter = availableFermenters(state).sort((a, b) => b.capacityLiters - a.capacityLiters)[0];
  if (!fermenter) return { liters: 0, bottles: 0, cases: 0, reason: 'Blocked: no empty fermenter.' };
  const liters = Math.min(recipe.targetBatchLiters, brewhouse.capacityLiters, fermenter.capacityLiters);
  const limit =
    liters === fermenter.capacityLiters && fermenter.capacityLiters < brewhouse.capacityLiters
      ? `${fermenter.name} caps the batch`
      : liters === brewhouse.capacityLiters && brewhouse.capacityLiters < recipe.targetBatchLiters
        ? `${brewhouse.name} caps the batch`
        : 'Can brew now';
  const bottles = litersToBottles(liters);
  const cases = litersToCases(liters);
  return { liters, bottles, cases, reason: `${limit}: ${liters} L into ${fermenter.name} ≈ ${bottles} bottles / ${caseCountLabel(cases)}.`, fermenter };
};

export const orderCost = (items: RecipeIngredient[]): number =>
  Math.round(
    items.reduce((total, item) => {
      const ingredient = getIngredient(item.ingredientId);
      const packs = Math.ceil(item.amount / ingredient.packSize);
      return total + packs * ingredient.packPrice;
    }, 0)
  );

export const recipeOrderItems = (state: GameState, recipe: Recipe, mode: 'missing' | 'extra'): RecipeIngredient[] => {
  if (mode === 'extra') return recipe.ingredients;
  return recipeMissingIngredients(state, recipe);
};

export const storageUseByArea = (state: GameState): Record<StorageArea, number> => {
  const use: Record<StorageArea, number> = { 'dry-shelf': 0, 'cold-box': 0, 'utility-shelf': 0 };
  Object.entries(state.inventory.ingredients).forEach(([ingredientId, stock]) => {
    const ingredient = getIngredient(ingredientId as IngredientId);
    if (ingredient.id === 'bottles') use[ingredient.storageArea] += stock.amount / bottlesPerCase;
    else if (ingredient.storageArea === 'cold-box' && ingredient.unit === 'g') use['cold-box'] += stock.amount / 1000;
    else if (ingredient.storageArea === 'cold-box' && ingredient.unit === 'pack') use['cold-box'] += stock.amount * 0.0115;
    else use[ingredient.storageArea] += stock.amount;
  });
  return use;
};

export const storageCapacityByArea = (state: GameState): Record<StorageArea, number> => ({
  'dry-shelf': state.storage.dryShelfCapacity,
  'cold-box': state.storage.coldBoxCapacity,
  'utility-shelf': state.storage.utilityShelfCapacity
});

export const storageOverflowByArea = (state: GameState): Record<StorageArea, number> => {
  const use = storageUseByArea(state);
  const capacity = storageCapacityByArea(state);
  return {
    'dry-shelf': Math.max(0, use['dry-shelf'] - capacity['dry-shelf']),
    'cold-box': Math.max(0, use['cold-box'] - capacity['cold-box']),
    'utility-shelf': Math.max(0, use['utility-shelf'] - capacity['utility-shelf'])
  };
};

export const totalStorageOverflow = (state: GameState): number => {
  const overflow = storageOverflowByArea(state);
  return overflow['dry-shelf'] + overflow['cold-box'] + overflow['utility-shelf'];
};

export const readyToPackage = (state: GameState): boolean => state.batches.some((batch) => batch.step === 'awaiting-packaging');

export const activeBatchForStep = (state: GameState, step: BatchStep) => state.batches.find((batch) => batch.step === step);

export const equipmentConditionTier = (condition: number): EquipmentConditionTier => {
  if (condition >= 85) return 'clean';
  if (condition >= 65) return 'worn';
  if (condition >= 40) return 'dirty';
  return 'critical';
};

export const equipmentConditionLabel = (condition: number): string => {
  const tier = equipmentConditionTier(condition);
  if (tier === 'clean') return 'Clean';
  if (tier === 'worn') return 'Worn';
  if (tier === 'dirty') return 'Dirty';
  return 'Critical';
};

export const contaminationRiskTier = (risk: number): ContaminationRiskTier => {
  if (risk <= 14) return 'low';
  if (risk <= 24) return 'elevated';
  if (risk <= 34) return 'high';
  return 'severe';
};


export const formatBatchRemainingTime = (state: GameState, batch: Batch, recipe: Recipe): string => {
  if (batch.step === 'awaiting-transfer' || batch.step === 'awaiting-packaging') return 'Waiting for player input';
  if (batch.step === 'ready') return 'Ready now';
  const duration = recipe.stepDurations[batch.step as keyof typeof recipe.stepDurations];
  if (!duration || batch.stepProgress >= 100) return 'Ready now';

  const remaining = Math.max(0, Math.round(duration * (1 - batch.stepProgress / 100)));
  if (remaining <= 0) return 'Ready now';
  if (remaining < 120) return `About ${Math.max(1, Math.ceil(remaining / 60))} hour${Math.ceil(remaining / 60) === 1 ? '' : 's'} remaining`;

  const startOfDayMinute = 7 * 60;
  if (remaining <= 24 * 60 && state.minute + remaining >= 24 * 60 + startOfDayMinute - 90) return 'Ready tomorrow morning';
  if (remaining <= 36 * 60 && state.minute + remaining >= 24 * 60) return 'Ready tomorrow morning';

  const days = Math.max(1, Math.ceil(remaining / (24 * 60)));
  if (days <= 1) return `About ${Math.ceil(remaining / 60)} hours remaining`;
  return `${days} days remaining`;
};

export const firstLoopObjective = (state: GameState): string => {
  const blondeBatch = state.batches.find((batch) => batch.recipeId === 'garage-blonde');
  const blondeCases = state.finishedBeerLots.some((lot) => lot.recipeId === 'garage-blonde' && lot.cases > 0) || state.inventory.cases > 0;
  if (blondeCases) return 'Tap the pallet to sell Garage Blonde.';
  if (!blondeBatch) return 'Tap the stock pot to brew Garage Blonde.';
  if (blondeBatch.step === 'awaiting-transfer') return 'Tap the fermenter to transfer Garage Blonde.';
  if (blondeBatch.step === 'fermenting') return 'Wait for fermentation, then tap the fermenter.';
  if (blondeBatch.step === 'awaiting-packaging') return 'Tap the bottling bench to package Garage Blonde.';
  if (blondeBatch.step === 'packaging' || blondeBatch.step === 'bottle-conditioning') return 'Tap the bottling bench to package Garage Blonde.';
  return 'Tap the stock pot to brew Garage Blonde.';
};

export const objectiveProgress = (state: GameState): { label: string; progress: number; complete: boolean } => {
  const soldFirstCases = state.demand.casesSold > 0 || state.salesToday > 0;
  const extraFermenter = ownedByStation(state, 'fermenter').length > 1;
  if (soldFirstCases && !extraFermenter) {
    const fermenterCost = 45;
    const labelerProgress = Math.min(state.cash, fermenterCost);
    return {
      label: `Next objective: add a second plastic fermenter. EUR ${labelerProgress}/EUR ${fermenterCost}`,
      progress: Math.round((labelerProgress / fermenterCost) * 100),
      complete: false
    };
  }

  return {
    label: soldFirstCases ? 'Objective complete: first private cases sold.' : 'Brew, bottle and sell the first Garage Blonde.',
    progress: soldFirstCases ? 100 : Math.round(Math.min(100, (state.batches.length > 0 ? 45 : 0) + (state.inventory.cases > 0 ? 35 : 0))),
    complete: soldFirstCases
  };
};

export const demandProgress = (state: GameState): string =>
  `${state.demand.accountName}: ${state.demand.casesSold}/${state.demand.casesRequested} cases`;

export type WorkflowStage = {
  stage: 'Mash' | 'Ferment' | 'Package' | 'Sell';
  tapTarget: 'kettle' | 'fermenter' | 'bottler' | 'cases';
  instruction: string;
};

export const currentWorkflowStage = (state: GameState): WorkflowStage => {
  const transferBatch = state.batches.find((batch) => batch.step === 'awaiting-transfer');
  if (transferBatch) {
    return {
      stage: 'Ferment',
      tapTarget: 'fermenter',
      instruction: `Tap Transfer to fermenter for ${transferBatch.recipeName}.`
    };
  }

  const packageBatch = state.batches.find((batch) => batch.step === 'awaiting-packaging');
  if (packageBatch) {
    return {
      stage: 'Package',
      tapTarget: 'bottler',
      instruction: `Tap Package to bottle ${packageBatch.recipeName}.`
    };
  }

  if (state.inventory.cases > 0 && state.demand.casesSold < state.demand.casesRequested) {
    return {
      stage: 'Sell',
      tapTarget: 'cases',
      instruction: `Tap the pallet to sell into ${state.demand.accountName}'s order.`
    };
  }

  const activeBatch = state.batches[0];
  if (!activeBatch) {
    return {
      stage: 'Mash',
      tapTarget: 'kettle',
      instruction: 'Tap the stock pot to brew Garage Blonde.'
    };
  }

  if (activeBatch.step === 'brewing') {
    return {
      stage: 'Mash',
      tapTarget: 'kettle',
      instruction: 'Brew day is underway.'
    };
  }

  if (activeBatch.step === 'fermenting') {
    return {
      stage: 'Ferment',
      tapTarget: 'fermenter',
      instruction: 'Fermentation is running. Tap the fermenter to check contamination risk.'
    };
  }

  if (activeBatch.step === 'bottle-conditioning') {
    return {
      stage: 'Package',
      tapTarget: 'bottler',
      instruction: 'Packaging is finishing. Tap the bottling bench to check cases.'
    };
  }

  return {
    stage: 'Package',
    tapTarget: 'bottler',
    instruction: 'Packaging is running. Watch the bottling station finish its stage.'
  };
};

export const nextSuggestedAction = (state: GameState): string => {
  if (ownedByStation(state, 'fermenter').length < 2 && state.cash >= 45) {
    return 'Add a second plastic fermenter.';
  }
  return currentWorkflowStage(state).instruction;
};

export const visibleRecipes = (): Recipe[] => recipes;

export const saleValue = (state: GameState, cases: number): number => {
  const lot = state.finishedBeerLots[0];
  const recipe = getRecipe(lot?.recipeId ?? 'garage-blonde');
  const qualityMultiplier = lot ? 0.75 + Math.max(35, lot.quality) / 200 : 1;
  const reputationBonus = 1 + Math.min(state.reputation, 30) / 100;
  return Math.round(cases * recipe.salePricePerCase * recipe.marketAppeal * qualityMultiplier * reputationBonus);
};

export const saleCasesForChannel = (state: GameState, channelId: SalesChannelId, requestedCases = salesChannels[channelId].cases): number => {
  const lot = state.finishedBeerLots[0];
  const channel = salesChannels[channelId];
  return Math.min(requestedCases, state.inventory.cases, lot?.cases ?? 0, channel.cases);
};

export const saleValueForChannel = (state: GameState, channelId: SalesChannelId, requestedCases = salesChannels[channelId].cases): number =>
  saleValue(state, saleCasesForChannel(state, channelId, requestedCases));
