import { getRecipe, recipes } from '../data/recipes.js';
import type { BatchStep, GameState, Recipe } from './schema.js';

export const formatClock = (minute: number): string => {
  const dayMinute = minute % (24 * 60);
  const hours = Math.floor(dayMinute / 60);
  const minutes = dayMinute % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${suffix}`;
};

export const formatCurrency = (amount: number): string => `€${amount}`;

export const recipeCanStart = (state: GameState, recipe: Recipe): boolean =>
  state.inventory.grain >= recipe.grainCost &&
  state.inventory.hops >= recipe.hopCost &&
  state.inventory.yeast >= recipe.yeastCost &&
  state.inventory.water >= recipe.waterCost &&
  !state.batches.some((batch) => batch.step === 'mashing');

export const readyToPackage = (state: GameState): boolean => state.batches.some((batch) => batch.step === 'ready');

export const activeBatchForStep = (state: GameState, step: BatchStep) => state.batches.find((batch) => batch.step === step);

export const objectiveProgress = (state: GameState): { label: string; progress: number; complete: boolean } => {
  const hasKettle = state.upgrades['larger-kettle'].purchased;
  const cashProgress = Math.min(state.cash, 500);
  return {
    label: hasKettle ? 'Objective complete: larger kettle installed.' : `Earn €500 and buy the larger kettle. €${cashProgress}/€500`,
    progress: hasKettle ? 100 : Math.round((cashProgress / 500) * 100),
    complete: hasKettle
  };
};

export const demandProgress = (state: GameState): string =>
  `${state.demand.accountName}: ${state.demand.casesSold}/${state.demand.casesRequested} cases`;

export const nextSuggestedAction = (state: GameState): string => {
  if (!state.upgrades['larger-kettle'].purchased && state.cash >= 500) {
    return 'Buy the larger kettle upgrade.';
  }
  if (state.batches.length === 0 && state.inventory.cases === 0) {
    return 'Tap the 40 L mash kettle to start a brew.';
  }
  if (readyToPackage(state)) {
    return 'Tap the bench capper to package the finished batch.';
  }
  if (state.inventory.cases > 0 && state.demand.casesSold < state.demand.casesRequested) {
    return 'Tap ready cases to sell into today’s local demand.';
  }
  return 'Let the batch progress or clean equipment to reduce risk.';
};

export const visibleRecipes = (): Recipe[] => recipes;

export const saleValue = (state: GameState, cases: number): number => {
  const recipe = getRecipe('garage-pale');
  const reputationBonus = 1 + Math.min(state.reputation, 30) / 100;
  return Math.round(cases * recipe.salePricePerCase * reputationBonus);
};
