import { getRecipe } from '../data/recipes.js';
import type { Batch, BatchStep, EquipmentId, GameAction, GameState } from './schema.js';
import { saleValue } from './selectors.js';

const orderedSteps: BatchStep[] = ['mashing', 'fermenting', 'packaging', 'ready'];

const stepEquipment: Record<Exclude<BatchStep, 'ready'>, EquipmentId> = {
  mashing: 'kettle',
  fermenting: 'fermenter',
  packaging: 'bottler'
};

const cloneState = (state: GameState): GameState => ({
  ...state,
  inventory: { ...state.inventory },
  equipment: {
    kettle: { ...state.equipment.kettle },
    fermenter: { ...state.equipment.fermenter },
    bottler: { ...state.equipment.bottler }
  },
  upgrades: {
    'larger-kettle': { ...state.upgrades['larger-kettle'] },
    'temp-control': { ...state.upgrades['temp-control'] },
    labeler: { ...state.upgrades.labeler }
  },
  batches: state.batches.map((batch) => ({ ...batch })),
  events: [...state.events]
});

const addEvent = (state: GameState, message: string): void => {
  state.events = [{ id: `${state.minute}-${state.events.length}`, minute: state.minute, message }, ...state.events].slice(0, 8);
};

const durationForStep = (state: GameState, batch: Batch, step: Exclude<BatchStep, 'ready'>): number => {
  const recipe = getRecipe(batch.recipeId);
  let duration = recipe.stepDurations[step];
  if (step === 'mashing' && state.upgrades['larger-kettle'].purchased) duration *= 0.8;
  if (step === 'fermenting' && state.upgrades['temp-control'].purchased) duration *= 0.78;
  if (step === 'packaging' && state.upgrades.labeler.purchased) duration *= 0.7;
  const equipment = state.equipment[stepEquipment[step]];
  return Math.max(8, duration * (1.15 - equipment.condition / 500));
};

const advanceBatch = (state: GameState, batch: Batch, seconds: number): void => {
  if (batch.step === 'ready') return;

  batch.stepProgress += seconds / durationForStep(state, batch, batch.step);

  while (batch.step !== 'ready' && batch.stepProgress >= 60) {
    batch.stepProgress -= 60;
    const currentIndex = orderedSteps.indexOf(batch.step);
    const completedStep = batch.step;
    batch.step = orderedSteps[currentIndex + 1];

    if (completedStep === 'mashing') addEvent(state, `${batch.recipeName} moved into fermentation.`);
    if (completedStep === 'fermenting') addEvent(state, `${batch.recipeName} finished fermenting. Package it when ready.`);
    if (completedStep === 'packaging') addEvent(state, `${batch.recipeName} is boxed and ready to sell.`);
  }
};

const degradeEquipment = (state: GameState, seconds: number): void => {
  state.batches.forEach((batch) => {
    if (batch.step === 'ready') return;
    const equipmentId = stepEquipment[batch.step];
    state.equipment[equipmentId].condition = Math.max(35, state.equipment[equipmentId].condition - seconds * 0.004);
  });
};

export const reduceGame = (state: GameState, action: GameAction): GameState => {
  const next = cloneState(state);

  if (action.type === 'tick') {
    next.minute += Math.floor(action.seconds / 6);
    next.batches.forEach((batch) => advanceBatch(next, batch, action.seconds));
    degradeEquipment(next, action.seconds);
    return next;
  }

  if (action.type === 'select-equipment') {
    next.selectedEquipmentId = action.equipmentId;
    return next;
  }

  if (action.type === 'start-batch') {
    const recipe = getRecipe(action.recipeId);
    const kettleBusy = next.batches.some((batch) => batch.step === 'mashing');
    const canAffordIngredients =
      next.inventory.grain >= recipe.grainCost &&
      next.inventory.hops >= recipe.hopCost &&
      next.inventory.yeast >= recipe.yeastCost &&
      next.inventory.water >= recipe.waterCost;

    if (kettleBusy || !canAffordIngredients) {
      addEvent(next, 'The garage is not ready for another mash yet.');
      return next;
    }

    const extraCases = next.upgrades['larger-kettle'].purchased ? 4 : 0;
    const tempQuality = next.upgrades['temp-control'].purchased ? 6 : 0;
    const cleanlinessPenalty = Math.round((100 - next.equipment.kettle.condition) / 7);

    next.inventory.grain -= recipe.grainCost;
    next.inventory.hops -= recipe.hopCost;
    next.inventory.yeast -= recipe.yeastCost;
    next.inventory.water -= recipe.waterCost;
    next.batches.push({
      id: `${action.recipeId}-${next.minute}-${next.batches.length}`,
      recipeId: recipe.id,
      recipeName: recipe.name,
      step: 'mashing',
      stepProgress: 0,
      quality: Math.max(45, recipe.qualityBase + tempQuality - cleanlinessPenalty),
      casesExpected: recipe.batchSizeCases + extraCases
    });
    addEvent(next, `${recipe.name} started in the kettle.`);
    return next;
  }

  if (action.type === 'package-batch') {
    const batch = next.batches.find((item) => item.id === action.batchId && item.step === 'ready');
    if (!batch) return next;
    next.inventory.cases += batch.casesExpected;
    next.batches = next.batches.filter((item) => item.id !== action.batchId);
    next.reputation += batch.quality >= 75 ? 2 : 1;
    addEvent(next, `${batch.casesExpected} cases of ${batch.recipeName} stacked by the garage door.`);
    return next;
  }

  if (action.type === 'sell-cases') {
    const cases = Math.min(action.cases, next.inventory.cases);
    if (cases <= 0) return next;
    const revenue = saleValue(next, cases);
    next.inventory.cases -= cases;
    next.cash += revenue;
    next.reputation += next.upgrades.labeler.purchased ? 2 : 1;
    next.salesToday += cases;
    addEvent(next, `Sold ${cases} cases to neighborhood accounts for $${revenue}.`);
    return next;
  }

  if (action.type === 'buy-upgrade') {
    const upgrade = next.upgrades[action.upgradeId];
    if (upgrade.purchased || next.cash < upgrade.cost) {
      addEvent(next, 'Not enough cash for that upgrade yet.');
      return next;
    }
    next.cash -= upgrade.cost;
    upgrade.purchased = true;
    if (action.upgradeId === 'larger-kettle') next.equipment.kettle.level += 1;
    if (action.upgradeId === 'temp-control') next.equipment.fermenter.level += 1;
    if (action.upgradeId === 'labeler') next.equipment.bottler.level += 1;
    addEvent(next, `${upgrade.name} installed. The garage feels more professional.`);
    return next;
  }

  if (action.type === 'clean-equipment') {
    const equipment = next.equipment[action.equipmentId];
    const cost = 18;
    if (next.cash < cost) {
      addEvent(next, 'Cleaning supplies are too expensive right now.');
      return next;
    }
    next.cash -= cost;
    equipment.condition = Math.min(100, equipment.condition + 18);
    addEvent(next, `${equipment.name} cleaned and ready for work.`);
    return next;
  }

  return next;
};
