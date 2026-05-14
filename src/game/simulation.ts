import { getRecipe } from '../data/recipes.js';
import type { Batch, BatchStep, EquipmentId, GameAction, GameState, LocalDemand } from './schema.js';
import { saleValue } from './selectors.js';

const dayLengthSeconds = 60;
const orderedSteps: BatchStep[] = ['mashing', 'fermenting', 'packaging', 'ready'];

const stepEquipment: Record<Exclude<BatchStep, 'ready'>, EquipmentId> = {
  mashing: 'kettle',
  fermenting: 'fermenter',
  packaging: 'bottler'
};

const accountNames = ['Corner Café', 'Canal Bar', 'Market Taproom', 'Station Bistro', 'Old Town Pub'];

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
  demand: { ...state.demand },
  batches: state.batches.map((batch) => ({ ...batch })),
  events: [...state.events]
});

const addEvent = (state: GameState, message: string): void => {
  state.events = [{ id: `${state.day}-${state.minute}-${state.events.length}`, minute: state.minute, message }, ...state.events].slice(0, 10);
};

const demandForDay = (state: GameState, day: number): LocalDemand => {
  const busyWeekend = day % 5 === 0;
  const casesRequested = 8 + ((day * 3 + state.reputation) % 7) + Math.floor(state.reputation / 10) + (busyWeekend ? 6 : 0);
  return {
    accountName: accountNames[day % accountNames.length],
    casesRequested,
    casesSold: 0,
    reputationReward: busyWeekend ? 3 : 2
  };
};

const randomEventForDay = (state: GameState): string => {
  const eventIndex = (state.day * 7 + state.reputation + state.salesToday) % 6;
  if (eventIndex === 0) return 'Local café requests extra cases for a tasting board.';
  if (eventIndex === 1) {
    state.inventory.grain += 5;
    return 'Ingredient delivery discount: +5 kg grain from the malt supplier.';
  }
  if (eventIndex === 2) return 'Fermentation temperature warning: clean gear and temp control keep the batch safer.';
  if (eventIndex === 3) return 'Contamination warning: dirty fermenters will drag quality down fast.';
  if (eventIndex === 4) {
    state.reputation = Math.max(0, state.reputation - 1);
    return 'Neighbor complaint about early keg washing. Reputation slips by 1.';
  }
  state.demand.casesRequested += 4;
  return 'Busy weekend demand: nearby bars want 4 extra cases today.';
};

const durationForStep = (state: GameState, batch: Batch, step: Exclude<BatchStep, 'ready'>): number => {
  const recipe = getRecipe(batch.recipeId);
  let duration = recipe.stepDurations[step];
  if (step === 'mashing' && state.upgrades['larger-kettle'].purchased) duration *= 0.7;
  if (step === 'fermenting' && state.upgrades['temp-control'].purchased) duration *= 0.7;
  if (step === 'packaging' && state.upgrades.labeler.purchased) duration *= 0.6;
  const equipment = state.equipment[stepEquipment[step]];
  return Math.max(4, duration * (1.2 - equipment.condition / 500));
};

const contaminationRisk = (state: GameState): number => {
  const fermenterDirt = 100 - state.equipment.fermenter.condition;
  const tempControlReduction = state.upgrades['temp-control'].purchased ? 12 : 0;
  return Math.max(3, Math.round(8 + fermenterDirt * 0.45 - tempControlReduction));
};

const applyStepQuality = (state: GameState, batch: Batch, completedStep: Exclude<BatchStep, 'ready'>): void => {
  const equipment = state.equipment[stepEquipment[completedStep]];
  const dirtPenalty = Math.round((100 - equipment.condition) / (completedStep === 'fermenting' ? 4 : 7));
  batch.quality = Math.max(35, batch.quality - dirtPenalty);

  if (completedStep === 'fermenting') {
    const risk = batch.contaminationRisk;
    if (risk >= 25) {
      batch.quality = Math.max(30, batch.quality - 12);
      addEvent(state, `Contamination scare in ${batch.recipeName}: quality dropped. Clean the fermenter to lower risk.`);
    } else if (risk >= 15) {
      batch.quality = Math.max(35, batch.quality - 5);
      addEvent(state, `Slight fermentation off-note in ${batch.recipeName}. Risk was ${risk}%.`);
    }
  }
};

const advanceBatch = (state: GameState, batch: Batch, seconds: number): void => {
  if (batch.step === 'ready') return;

  batch.stepProgress += (seconds / durationForStep(state, batch, batch.step)) * 100;

  while (batch.step !== 'ready' && batch.stepProgress >= 100) {
    batch.stepProgress -= 100;
    const completedStep = batch.step;
    applyStepQuality(state, batch, completedStep);
    const currentIndex = orderedSteps.indexOf(batch.step);
    batch.step = orderedSteps[currentIndex + 1];

    if (completedStep === 'mashing') addEvent(state, `${batch.recipeName} is ready to transfer. Tap the 18°C fermenter.`);
    if (completedStep === 'fermenting') addEvent(state, `${batch.recipeName} finished fermenting. Tap the bench capper to package.`);
    if (completedStep === 'packaging') addEvent(state, `${batch.recipeName} is boxed and ready. Tap cases to sell into demand.`);
  }
};

const degradeEquipment = (state: GameState, seconds: number): void => {
  state.batches.forEach((batch) => {
    if (batch.step === 'ready') return;
    const equipmentId = stepEquipment[batch.step];
    state.equipment[equipmentId].condition = Math.max(25, state.equipment[equipmentId].condition - seconds * 0.08);
  });
};

const rolloverDay = (state: GameState): void => {
  while (state.dayElapsedSeconds >= dayLengthSeconds) {
    state.dayElapsedSeconds -= dayLengthSeconds;
    const fulfilled = state.demand.casesSold >= state.demand.casesRequested;
    if (fulfilled) {
      state.reputation += state.demand.reputationReward;
      addEvent(state, `Day ${state.day} demand fulfilled. Reputation +${state.demand.reputationReward}.`);
    } else if (state.demand.casesSold < Math.floor(state.demand.casesRequested / 2)) {
      state.reputation = Math.max(0, state.reputation - 1);
      addEvent(state, `${state.demand.accountName} still needed cases yesterday. Reputation -1.`);
    }

    state.day += 1;
    state.minute = 8 * 60;
    state.salesToday = 0;
    state.demand = demandForDay(state, state.day);
    addEvent(state, `Day ${state.day}: ${state.demand.accountName} requests ${state.demand.casesRequested} cases.`);
    addEvent(state, randomEventForDay(state));
  }
};

const startBatch = (next: GameState, recipeId: string): GameState => {
  const recipe = getRecipe(recipeId);
  const kettleBusy = next.batches.some((batch) => batch.step === 'mashing');
  const canAffordIngredients =
    next.inventory.grain >= recipe.grainCost &&
    next.inventory.hops >= recipe.hopCost &&
    next.inventory.yeast >= recipe.yeastCost &&
    next.inventory.water >= recipe.waterCost;

  if (kettleBusy || !canAffordIngredients) {
    addEvent(next, 'The kettle is busy or supplies are short for another mash.');
    return next;
  }

  const extraCases = next.upgrades['larger-kettle'].purchased ? 6 : 0;
  const tempQuality = next.upgrades['temp-control'].purchased ? 5 : 0;
  const kettlePenalty = Math.round((100 - next.equipment.kettle.condition) / 6);
  const risk = contaminationRisk(next);

  next.inventory.grain -= recipe.grainCost;
  next.inventory.hops -= recipe.hopCost;
  next.inventory.yeast -= recipe.yeastCost;
  next.inventory.water -= recipe.waterCost;
  next.batches.push({
    id: `${recipeId}-${next.day}-${next.minute}-${next.batches.length}`,
    recipeId: recipe.id,
    recipeName: recipe.name,
    step: 'mashing',
    stepProgress: 0,
    quality: Math.max(45, recipe.qualityBase + tempQuality - kettlePenalty),
    casesExpected: recipe.batchSizeCases + extraCases,
    contaminationRisk: risk
  });
  addEvent(next, `${recipe.name} started in the kettle: ${recipe.grainCost} kg grain, ${recipe.waterCost} L water, risk ${risk}%.`);
  return next;
};

const packageReadyBatch = (next: GameState): GameState => {
  const batch = next.batches.find((item) => item.step === 'ready');
  if (!batch) {
    addEvent(next, 'No boxed batch is waiting at the capper yet.');
    return next;
  }
  next.inventory.cases += batch.casesExpected;
  next.batches = next.batches.filter((item) => item.id !== batch.id);
  addEvent(next, `${batch.casesExpected} cases of ${batch.recipeName} stacked by the garage door at Q${batch.quality}.`);
  return next;
};

export const reduceGame = (state: GameState, action: GameAction): GameState => {
  const next = cloneState(state);

  if (action.type === 'tick') {
    next.dayElapsedSeconds += action.seconds;
    next.minute += Math.floor(action.seconds / 6);
    next.batches.forEach((batch) => advanceBatch(next, batch, action.seconds));
    degradeEquipment(next, action.seconds);
    rolloverDay(next);
    return next;
  }

  if (action.type === 'select-equipment') {
    next.selectedEquipmentId = action.equipmentId;
    return next;
  }

  if (action.type === 'use-equipment') {
    next.selectedEquipmentId = action.equipmentId;
    if (action.equipmentId === 'kettle') return startBatch(next, 'garage-pale');
    if (action.equipmentId === 'fermenter') {
      const batch = next.batches.find((item) => item.step === 'fermenting');
      addEvent(next, batch ? `${batch.recipeName} fermenting at 18°C. Contamination risk ${batch.contaminationRisk}%.` : 'No batch is fermenting yet. Mash something in the kettle first.');
      return next;
    }
    if (action.equipmentId === 'bottler') return packageReadyBatch(next);
  }

  if (action.type === 'start-batch') return startBatch(next, action.recipeId);

  if (action.type === 'package-batch') return packageReadyBatch(next);

  if (action.type === 'sell-cases') {
    const remainingDemand = Math.max(0, next.demand.casesRequested - next.demand.casesSold);
    const cases = Math.min(action.cases, next.inventory.cases, remainingDemand || action.cases);
    if (cases <= 0) {
      addEvent(next, 'No sellable cases or open local demand right now.');
      return next;
    }
    const revenue = saleValue(next, cases);
    next.inventory.cases -= cases;
    next.cash += revenue;
    next.demand.casesSold += cases;
    next.salesToday += cases;
    const repGain = (next.upgrades.labeler.purchased ? 2 : 1) + (next.demand.casesSold >= next.demand.casesRequested ? next.demand.reputationReward : 0);
    next.reputation += repGain;
    addEvent(next, `Sold ${cases} cases to ${next.demand.accountName} for €${revenue}. Reputation +${repGain}.`);
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
    addEvent(next, `${upgrade.name} installed. Its benefit applies to the next matching step immediately.`);
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
    equipment.condition = Math.min(100, equipment.condition + 26);
    addEvent(next, `${equipment.name} cleaned. Lower dirt means better quality and less contamination risk.`);
    return next;
  }

  return next;
};
