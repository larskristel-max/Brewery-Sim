import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { equipmentCatalog } from '../dist/data/equipment.js';
import { ingredients } from '../dist/data/ingredients.js';
import { garageEquipmentLayoutByTier } from '../dist/data/garageLayout.js';
import { recipes } from '../dist/data/recipes.js';
import { campaignNextStep, campaignView } from '../dist/game/campaign.js';
import { createInitialState } from '../dist/game/initialState.js';
import { loadSavedGame, resetSavedGame, saveGameState, STORAGE_KEY } from '../dist/game/persistence.js';
import { reduceGame } from '../dist/game/simulation.js';
import {
  contaminationRiskTier,
  bottlesPerCase,
  currentWorkflowStage,
  demandProgress,
  equipmentConditionLabel,
  equipmentConditionTier,
  orderCost,
  firstLoopObjective,
  finishedBeerCaseCount,
  formatBatchRemainingTime,
  litersToBottles,
  litersToCases,
  recipeCanStart,
  recipeMissingOrderSummary,
  recipeMissingIngredients,
  recipeRequirementSummary,
  recipeSupplyBreakdown,
  saleConsequencePreview,
  saleValueForChannel,
  storageOverflowByArea
} from '../dist/game/selectors.js';

const createMemoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
};

let state = createInitialState();
const blonde = recipes.find((recipe) => recipe.id === 'garage-blonde');
const ipa = recipes.find((recipe) => recipe.id === 'backyard-ipa');
const pils = recipes.find((recipe) => recipe.id === 'basement-pils');
const wheat = recipes.find((recipe) => recipe.id === 'garage-wheat');
const saison = recipes.find((recipe) => recipe.id === 'shed-saison');
const stout = recipes.find((recipe) => recipe.id === 'midnight-stout');
const kveik = recipes.find((recipe) => recipe.id === 'hot-garage-kveik');
assert.ok(blonde && ipa && pils && wheat && saison && stout && kveik, 'starter recipes should include Blonde, IPA, Pils, Wheat, Saison, Stout and Kveik');
assert.equal(blonde.originalGravity, '1.045', 'Garage Blonde should define original gravity for brew notes');
assert.equal(blonde.expectedAbv, '4.6%', 'Garage Blonde should define expected ABV for brew notes');
assert.match(recipeRequirementSummary(blonde), /4\.2 kg Pilsner malt[\s\S]*45 g Saaz hops[\s\S]*1 ale yeast pack[\s\S]*60 bottles/, 'Garage Blonde requirement summary should teach exact quantities');
const restockPreview = reduceGame(createInitialState(), { type: 'start-batch', recipeId: 'garage-blonde' });
assert.match(recipeMissingOrderSummary(restockPreview, blonde), /Need 48 bottles\. Order 4 x 12 bottle packs\./, 'restock summary should round missing bottles to shop packs');
assert.equal(recipeSupplyBreakdown(restockPreview, blonde).find((item) => item.ingredientId === 'bottles')?.packsToOrder, 4, 'supply breakdown should expose rounded packs to order');
assert.ok(recipes.some((recipe) => recipe.id === 'custom-recipe' && recipe.enabled === false), 'custom recipe should exist as disabled placeholder');
assert.ok(ingredients.some((ingredient) => ingredient.id === 'pilsner-malt'), 'ingredient catalog should include named malt');
assert.equal(state.fermenterTemperatureC, 18, 'new games should track fermenter temperature');
assert.equal(state.campaign.missionId, 'barbecue-text', 'new games should start on the barbecue storyline mission');
assert.equal(campaignView(state).title, 'The Barbecue Text', 'campaign view should expose the first storyline card');
assert.deepEqual(
  garageEquipmentLayoutByTier.tier1,
  {
    brewhouse: { x: 24.6, y: 53.1, width: 17 },
    'fermenter-slot-1': { x: 38.6, y: 45.2, width: 14.5 },
    'fermenter-slot-2': { x: 49.4, y: 45.2, width: 14.5 },
    'fermenter-slot-3': { x: 60.2, y: 45.2, width: 14.5 },
    'fermenter-slot-4': { x: 50.5, y: 65, width: 12 },
    'fermenter-slot-5': { x: 61.5, y: 65, width: 12 },
    milling: { x: 18, y: 76.5, width: 10 },
    packaging: { x: 74.5, y: 62.4, width: 13.1 }
  },
  'tier1 garage layout should keep the locked cozy composition values'
);

let temperatureState = reduceGame(state, { type: 'set-fermenter-temperature', temperatureC: 23 });
assert.equal(temperatureState.fermenterTemperatureC, 23, 'fermenter temperature action should accept in-range values');
temperatureState = reduceGame(temperatureState, { type: 'set-fermenter-temperature', temperatureC: -5 });
assert.equal(temperatureState.fermenterTemperatureC, 8, 'fermenter temperature should clamp below the supported range');
temperatureState = reduceGame(temperatureState, { type: 'set-fermenter-temperature', temperatureC: 55 });
assert.equal(temperatureState.fermenterTemperatureC, 40, 'fermenter temperature should clamp above the supported range');

const stockRecipeIngredients = (targetState, recipe) => {
  recipe.ingredients.forEach((item) => {
    targetState.inventory.ingredients[item.ingredientId].amount = Math.max(targetState.inventory.ingredients[item.ingredientId].amount, item.amount + 1);
    targetState.inventory.ingredients[item.ingredientId].condition = 98;
  });
  targetState.inventory.water = Math.max(targetState.inventory.water, recipe.waterCost + 10);
};

const eventMessages = (targetState) => targetState.events.map((event) => event.message).join('\n');

const brewThroughFermentation = (recipe, temperatureC) => {
  let testState = createInitialState();
  stockRecipeIngredients(testState, recipe);
  testState.equipment.kettle.condition = 100;
  testState.equipment.fermenter.condition = 100;
  testState.ownedEquipment.find((item) => item.instanceId === testState.activeEquipment.kettle).condition = 100;
  testState.ownedEquipment.find((item) => item.instanceId === testState.activeEquipment.fermenter).condition = 100;
  testState = reduceGame(testState, { type: 'set-fermenter-temperature', temperatureC });
  testState = reduceGame(testState, { type: 'start-batch', recipeId: recipe.id });
  const startingBatch = testState.batches[0];
  assert.equal(testState.batches[0].step, 'brewing', `${recipe.name} should start with a timed brew day`);
  testState = reduceGame(testState, { type: 'wait-until-ready', batchId: testState.batches[0].id });
  assert.equal(testState.batches[0].step, 'awaiting-transfer', `${recipe.name} should wait for manual transfer after brew day`);
  testState = reduceGame(testState, { type: 'transfer-batch', batchId: testState.batches[0].id });
  assert.equal(testState.batches[0].step, 'fermenting', `${recipe.name} should reach fermentation in the temperature test`);

  for (let days = 0; days < 40 && testState.batches[0].step === 'fermenting'; days += 1) {
    testState = reduceGame(testState, { type: 'end-day' });
  }
  assert.equal(testState.batches[0].step, 'awaiting-packaging', `${recipe.name} should finish fermentation in the temperature test`);
  return { state: testState, startingBatch };
};

const tickUntilStep = (inputState, step, maxSeconds = 120) => {
  let testState = inputState;
  for (let elapsed = 0; elapsed < maxSeconds && testState.batches[0]?.step !== step; elapsed += 1) {
    if (testState.batches[0]?.step === 'awaiting-transfer' && step !== 'awaiting-transfer') {
      testState = reduceGame(testState, { type: 'transfer-batch', batchId: testState.batches[0].id });
    } else if (testState.batches[0]?.step === 'awaiting-packaging' && step !== 'awaiting-packaging') {
      testState = reduceGame(testState, { type: 'start-packaging', batchId: testState.batches[0].id });
    } else if (['brewing', 'fermenting', 'packaging', 'bottle-conditioning'].includes(testState.batches[0]?.step ?? '')) {
      testState = reduceGame(testState, { type: 'wait-until-ready', batchId: testState.batches[0].id });
    } else {
      testState = reduceGame(testState, { type: 'end-day' });
    }
  }
  return testState;
};

const coolLager = brewThroughFermentation(pils, 12);
const warmLager = brewThroughFermentation(pils, 30);
assert.ok(warmLager.state.batches[0].quality < coolLager.state.batches[0].quality, 'too-warm lager fermentation should reduce quality');
assert.ok(
  warmLager.state.events.some((event) => /warm|temperature|ester|fusel|diacetyl/i.test(event.message)),
  'too-warm lager fermentation should log a player-readable temperature consequence'
);

const warmSaison = brewThroughFermentation(saison, 30);
assert.ok(warmSaison.state.batches[0].quality > warmLager.state.batches[0].quality, 'warm-tolerant saison should keep more quality than lager at the same warm temperature');

const hotKveik = brewThroughFermentation(kveik, 35);
const coolKveik = brewThroughFermentation(kveik, 18);
assert.ok(hotKveik.state.batches[0].quality > coolKveik.state.batches[0].quality, 'kveik should prefer hot garage fermentation over cool ale temperatures');

assert.equal(recipeCanStart(state, blonde), true, 'starter stock should allow the Blonde');
assert.deepEqual(
  {
    kettle: state.equipment.kettle.itemId,
    fermenter: state.equipment.fermenter.itemId,
    bottler: state.equipment.bottler.itemId
  },
  {
    kettle: 'stock-pot-20l',
    fermenter: 'plastic-bucket',
    bottler: 'wand-capper'
  },
  'new games should start with BIAB stock pot, one plastic bucket and hand bottling gear'
);
assert.equal(state.equipment.kettle.name, '20 L stainless stock pot', 'starter brewhouse should be the Tier 1 stainless stock pot');
assert.equal(state.equipment.fermenter.name, 'Plastic fermentation bucket', 'starter fermentation should be one plastic bucket');
assert.equal(state.equipment.bottler.name, 'Bottle wand and hand capper', 'starter packaging should be the wand and hand capper');
assert.equal(firstLoopObjective(state), 'Tap the stock pot to brew Garage Blonde.', 'fresh first-loop objective should point at the stock pot');
assert.equal(campaignNextStep(state), 'Tap the stock pot to brew Garage Blonde.', 'fresh campaign guidance should point at the stock pot');
assert.equal(bottlesPerCase, 12, 'one in-game case should be a 12 bottle case');
assert.equal(litersToBottles(20), 61, '20 L should be about 61 Belgian 33 cl bottles before case rounding');
assert.equal(litersToCases(20), 5, '20 L should package as about five 12 bottle cases');
assert.equal(blonde.batchSizeCases, 5, 'Garage Blonde displayed batch size should match 20 L / 33 cl bottle case math');
assert.equal(blonde.ingredients.find((item) => item.ingredientId === 'bottles')?.amount, 60, 'Garage Blonde should require roughly 60 33 cl bottles');

state = reduceGame(state, { type: 'start-batch', recipeId: 'garage-blonde' });
assert.equal(state.batches.length, 1, 'starting a batch should create one active batch');
assert.equal(state.inventory.ingredients['pilsner-malt'].amount, 5.8, 'starting a Blonde consumes named pilsner malt');
assert.equal(state.inventory.ingredients.bottles.amount, 12, 'starting a Blonde consumes five 12 bottle cases from starter packaging stock');
assert.equal(state.batches[0].step, 'brewing', 'brew day should be an explicit timed step before transfer');
assert.equal(firstLoopObjective(state), 'Tap the stock pot to finish the brew day.', 'brewing objective should point at the kettle time skip');
const brewStartMinute = state.minute;
state = reduceGame(state, { type: 'wait-until-ready', batchId: state.batches[0].id });
assert.equal(state.batches[0].step, 'awaiting-transfer', 'brew day should stop at manual transfer');
assert.ok(state.minute > brewStartMinute, 'waiting through brew day should advance the clock');
assert.equal(currentWorkflowStage(state).tapTarget, 'kettle', 'finished brew should point at the source kettle for manual transfer');
assert.equal(firstLoopObjective(state), 'Tap the stock pot to transfer Garage Blonde.', 'awaiting-transfer objective should point at the stock pot');

state = tickUntilStep(state, 'fermenting');
assert.equal(state.batches[0].step, 'fermenting', 'batch should enter fermentation only after manual transfer');
assert.equal(currentWorkflowStage(state).tapTarget, 'fermenter', 'fermenting stage should point at the fermenter');
assert.equal(firstLoopObjective(state), 'Tap the fermenter to fast-forward fermentation.', 'fermenting objective should point at the fermenter time skip');
assert.doesNotMatch(formatBatchRemainingTime(state, state.batches[0], blonde), /in-game minutes/, 'remaining time should be player-readable');

state = tickUntilStep(state, 'awaiting-packaging');
assert.equal(state.batches[0].step, 'awaiting-packaging', 'batch should stop for manual packaging after fermentation');
assert.equal(currentWorkflowStage(state).tapTarget, 'fermenter', 'finished fermentation should point at the source fermenter for bottling transfer');
assert.equal(firstLoopObjective(state), 'Tap the fermenter to transfer Garage Blonde to bottling.', 'awaiting-packaging objective should point at the fermenter');

const packagingCashBefore = state.cash;
const expectedCases = state.batches[0].casesExpected;
state = reduceGame(state, { type: 'start-packaging', batchId: state.batches[0].id });
assert.equal(state.batches[0].step, 'packaging', 'packaging should become a timed bottling run');
state = reduceGame(state, { type: 'wait-until-ready', batchId: state.batches[0].id });
assert.equal(state.batches.length, 0, 'waiting through packaging should finish the first-loop batch');
assert.equal(expectedCases, 5, 'first-loop 20 L Garage Blonde should expect five 12 bottle cases');
assert.equal(state.inventory.cases, expectedCases, 'packaging should add the displayed expected cases to inventory');
assert.equal(state.finishedBeerLots.length, 1, 'packaging should create a recipe-specific finished lot');
assert.equal(state.cash, packagingCashBefore, 'packaging should not secretly change cash');
assert.equal(firstLoopObjective(state), 'Tap the pallet to sell Garage Blonde.', 'cases-available objective should point at the pallet');

const casesBeforeSale = state.inventory.cases;
const cashBeforeSale = state.cash;
const reputationBeforeSale = state.reputation;
const visibilityBeforeSale = state.visibilityRisk;
const complianceBeforeSale = state.complianceRisk;
const householdBeforeSale = state.householdPressure;
const displayedPayout = saleValueForChannel(state, 'friends-family');
const salePreview = saleConsequencePreview(state, 'friends-family', 4);
const oversizedSalePreview = saleConsequencePreview(state, 'friends-family', 999);
assert.equal(oversizedSalePreview.cases, 4, 'sale preview should clamp oversized requests to the channel offer size');
assert.equal(saleConsequencePreview(state, 'friends-family', 0).cashDelta, 0, 'sale preview should not invent cash for zero-case offers');
state = reduceGame(state, { type: 'sell-channel', channelId: 'friends-family', cases: 4 });
assert.equal(state.cash - cashBeforeSale, displayedPayout, 'displayed sale payout helper should match the reducer cash delta');
assert.equal(state.cash - cashBeforeSale, salePreview.cashDelta, 'sale consequence preview should match reducer cash delta');
assert.equal(state.reputation - reputationBeforeSale, salePreview.reputationDelta, 'sale consequence preview should match reducer reputation delta');
assert.equal(state.visibilityRisk - visibilityBeforeSale, salePreview.visibilityDelta, 'sale consequence preview should match reducer visibility delta');
assert.equal(state.complianceRisk - complianceBeforeSale, salePreview.complianceDelta, 'sale consequence preview should match reducer compliance delta');
assert.equal(state.householdPressure - householdBeforeSale, salePreview.householdPressureDelta, 'sale consequence preview should match reducer household pressure delta');
assert.ok(state.inventory.cases < casesBeforeSale, 'selling should remove cases from inventory');
assert.ok(state.demand.casesSold > 0, 'selling should fulfill local demand progress');
assert.equal(state.campaign.missionId, 'empty-shelf', 'selling the first four cases should advance to the restock storyline mission');
assert.match(campaignNextStep(state), /4\.2 kg Pilsner malt[\s\S]*Need 48 bottles[\s\S]*Order 4 x 12 bottle packs/i, 'post-sale campaign guidance should teach exact restock quantities before upgrades');
assert.ok(['Sell', 'Mash'].includes(currentWorkflowStage(state).stage), 'flow should either keep selling remaining cases or return to brewing after stock sells out');
assert.ok(state.cash > 140, 'selling cases should increase cash');
assert.ok(state.visibilityRisk > 0, 'garage sales should increase visibility risk');
assert.equal(firstLoopObjective(state), 'Tap the pallet to sell Garage Blonde.', 'remaining cases should keep the garage-floor objective on the pallet');
state = reduceGame(state, { type: 'sell-channel', channelId: 'friends-family', cases: state.inventory.cases });
assert.equal(state.campaign.missionId, 'empty-shelf', 'clearing leftover beer should not skip the restock lesson');
assert.match(demandProgress(state), /4\/4 cases/, 'completed demand progress should not display overfilled counts');

const storage = createMemoryStorage();
saveGameState(state, storage);
assert.match(storage.getItem(STORAGE_KEY), /\"version\":6/, 'save should use the v6 storage envelope');
const restored = loadSavedGame(storage);
assert.deepEqual(restored, state, 'saved state should restore after refresh');
storage.setItem(STORAGE_KEY, '{bad json');
assert.deepEqual(loadSavedGame(storage), createInitialState(), 'bad save data should fall back to a new game');
assert.equal(storage.getItem(STORAGE_KEY), null, 'bad save data should be cleared after fallback');
storage.setItem(STORAGE_KEY, JSON.stringify({ version: 4, state: { cash: 10 } }));
assert.deepEqual(loadSavedGame(storage), createInitialState(), 'incomplete save data should fall back to a new game');
assert.equal(storage.getItem(STORAGE_KEY), null, 'incomplete save data should be cleared after fallback');
const throwingStorage = {
  getItem: () => {
    throw new Error('storage blocked');
  },
  setItem: () => {
    throw new Error('storage blocked');
  },
  removeItem: () => undefined
};
assert.deepEqual(loadSavedGame(throwingStorage), createInitialState(), 'blocked storage should fall back to a new game');
saveGameState(state, storage);
resetSavedGame(storage);
assert.equal(storage.getItem(STORAGE_KEY), null, 'reset should clear browser-local save data');

let campaignState = createInitialState();
campaignState.campaign = { missionId: 'warm-garage-week', completedMissionIds: ['barbecue-text', 'empty-shelf', 'bucket-empire', 'uncle-nico-wedding'], seenMissionIds: [] };
campaignState = reduceGame(campaignState, { type: 'set-fermenter-temperature', temperatureC: 19 });
assert.equal(campaignState.campaign.missionId, 'sticky-bucket', 'temperature adjustment should advance the warm-garage tutorial mission');
campaignState = reduceGame(campaignState, { type: 'clean-equipment', equipmentId: 'fermenter' });
assert.equal(campaignState.campaign.missionId, 'labels-at-midnight', 'cleaning should advance the sticky-bucket tutorial mission');
assert.equal(campaignState.demand.channelId, 'private-event', 'packaging presentation mission should create a private event demand');
campaignState.inventory.cases = 8;
campaignState.finishedBeerLots = [
  {
    id: 'campaign-event-lot',
    sourceBatchId: 'campaign-event-batch',
    recipeId: 'garage-blonde',
    recipeName: 'Garage Blonde',
    cases: 8,
    volumeLiters: 32,
    quality: 80,
    marketAppeal: 1,
    packagingState: 'packaged',
    saleState: 'available'
  }
];
campaignState = reduceGame(campaignState, { type: 'sell-channel', channelId: 'private-event', cases: 8 });
assert.equal(campaignState.campaign.missionId, 'first-bar-account', 'private event sale should unlock the bar-account tutorial mission');
assert.equal(campaignState.demand.channelId, 'local-bar', 'bar-account mission should create a local bar demand');
campaignState.inventory.cases = 12;
campaignState.finishedBeerLots = [
  {
    id: 'campaign-bar-lot',
    sourceBatchId: 'campaign-bar-batch',
    recipeId: 'garage-blonde',
    recipeName: 'Garage Blonde',
    cases: 12,
    volumeLiters: 48,
    quality: 82,
    marketAppeal: 1,
    packagingState: 'packaged',
    saleState: 'available'
  }
];
campaignState = reduceGame(campaignState, { type: 'sell-channel', channelId: 'local-bar', cases: 12 });
assert.equal(campaignState.campaign.missionId, 'household-summit', 'first bar sale should unlock the household-pressure tutorial mission');
campaignState = reduceGame(campaignState, { type: 'crisis-action', actionId: 'pause-public-sales' });
assert.equal(campaignState.campaign.missionId, 'sandbox-unlocked', 'household-pressure action should unlock the normal sandbox');

assert.equal(equipmentConditionTier(92), 'clean', 'high condition should be clean');
assert.equal(equipmentConditionTier(70), 'worn', 'mid condition should be worn');
assert.equal(equipmentConditionTier(50), 'dirty', 'low condition should be dirty');
assert.equal(equipmentConditionTier(25), 'critical', 'very low condition should be critical');
assert.equal(equipmentConditionLabel(50), 'Needs cleaning', 'condition labels should be player-readable');
assert.equal(contaminationRiskTier(13), 'low', 'low contamination risk should be labeled low');
assert.equal(contaminationRiskTier(35), 'severe', 'high contamination risk should be labeled severe');

let orderState = createInitialState();
assert.ok(recipeMissingIngredients(orderState, ipa).length > 0, 'IPA should need extra stock at game start');
const missingCost = orderCost(recipeMissingIngredients(orderState, ipa));
orderState.cash = missingCost + 20;
orderState = reduceGame(orderState, { type: 'order-recipe', recipeId: 'backyard-ipa', mode: 'missing' });
assert.equal(orderState.pendingOrders.length, 1, 'ordering missing recipe ingredients should create a pending order');
assert.equal(orderState.cash, 20, 'ordering should charge cash immediately');
orderState = reduceGame(orderState, { type: 'end-day' });
orderState = reduceGame(orderState, { type: 'end-day' });
assert.equal(orderState.pendingOrders.length, 1, 'order should not arrive before three day rollovers');
orderState = reduceGame(orderState, { type: 'end-day' });
assert.equal(orderState.pendingOrders.length, 0, 'order should arrive after three day rollovers');
assert.equal(recipeMissingIngredients(orderState, ipa).length, 0, 'delivered ingredients should unblock the IPA');

let unaffordableEquipment = createInitialState();
unaffordableEquipment.cash = 259;
unaffordableEquipment = reduceGame(unaffordableEquipment, { type: 'buy-equipment', equipmentItemId: 'all-in-one-40l' });
assert.equal(unaffordableEquipment.equipment.kettle.itemId, 'stock-pot-20l', 'unaffordable brewhouse equipment should not install');
assert.equal(unaffordableEquipment.cash, 259, 'unaffordable equipment should not spend cash');
assert.match(eventMessages(unaffordableEquipment), /Not enough cash for 40 L all-in-one electric system/, 'unaffordable equipment should explain the cash blocker');

let equipmentState = createInitialState();
equipmentState.cash = 1000;
equipmentState = reduceGame(equipmentState, { type: 'buy-equipment', equipmentItemId: 'stainless-conical-50l' });
assert.equal(equipmentState.equipment.fermenter.itemId, 'stainless-conical-50l', 'buying the next fermenter step should install it');
assert.ok(equipmentState.equipment.fermenter.riskModifier < createInitialState().equipment.fermenter.riskModifier, 'better fermenter should reduce contamination risk pressure');
const afterConicalCash = equipmentState.cash;
equipmentState = reduceGame(equipmentState, { type: 'buy-equipment', equipmentItemId: 'plastic-bucket' });
assert.equal(equipmentState.equipment.fermenter.itemId, 'plastic-bucket', 'buying another bucket should add a usable low-tier fermenter slot');
assert.ok(equipmentState.cash < afterConicalCash, 'extra plastic fermenters should cost cash');

let capacityState = createInitialState();
capacityState.cash = 1000;
capacityState = reduceGame(capacityState, { type: 'buy-equipment', equipmentItemId: 'stainless-conical-50l' });
stockRecipeIngredients(capacityState, blonde);
capacityState = reduceGame(capacityState, { type: 'start-batch', recipeId: 'garage-blonde' });
assert.equal(
  capacityState.batches[0].casesExpected,
  litersToCases(20),
  'fermenter upgrades should not inflate batch output without matching brewhouse capacity'
);

let garageCeiling = createInitialState();
garageCeiling.cash = 5000;
for (const itemId of [
  'all-in-one-40l',
  'three-vessel-60l',
  'stainless-conical-50l',
  'unitank-150l',
  'semi-auto-filler',
  'small-can-seamer'
]) {
  garageCeiling = reduceGame(garageCeiling, { type: 'buy-equipment', equipmentItemId: itemId });
}
assert.match(eventMessages(garageCeiling), /Garage ceiling reached/, 'maxed garage equipment should signal that the next milestone is a real brewery space');

let riskSale = createInitialState();
riskSale.inventory.cases = 40;
riskSale.demand.casesRequested = 40;
riskSale.finishedBeerLots = [
  {
    id: 'risk-lot',
    recipeId: 'garage-blonde',
    recipeName: 'Garage Blonde',
    cases: 40,
    quality: 80,
    marketAppeal: 1
  }
];
riskSale.demand.channelId = 'local-bar';
riskSale.demand.channelName = 'Local bar';
riskSale.demand.accountName = 'Local bar';
riskSale = reduceGame(riskSale, { type: 'sell-channel', channelId: 'local-bar', cases: 30 });
assert.ok(riskSale.visibilityRisk >= 20, 'large bar sales should push visibility risk into invoice-warning territory');
assert.match(eventMessages(riskSale), /invoice|traceability|visibility/i, 'high visibility sales should surface invoice risk before formal channels exist');

let mixedLots = createInitialState();
mixedLots.inventory.cases = 9;
mixedLots.finishedBeerLots = [
  {
    id: 'mixed-blonde',
    recipeId: 'garage-blonde',
    recipeName: 'Garage Blonde',
    sourceBatchId: 'mixed-blonde-batch',
    volumeLiters: 20,
    cases: 3,
    quality: 70,
    marketAppeal: 1,
    packagingState: 'packaged',
    saleState: 'available'
  },
  {
    id: 'mixed-ipa',
    recipeId: 'backyard-ipa',
    recipeName: 'Backyard IPA',
    sourceBatchId: 'mixed-ipa-batch',
    volumeLiters: 22,
    cases: 6,
    quality: 74,
    marketAppeal: 1.08,
    packagingState: 'packaged',
    saleState: 'available'
  }
];
const mixedPayout = saleValueForChannel(mixedLots, 'friends-family', 6);
mixedLots = reduceGame(mixedLots, { type: 'sell-channel', channelId: 'friends-family', cases: 6 });
assert.equal(finishedBeerCaseCount(mixedLots), 5, 'selling across the pallet should consume cases across multiple finished lots');
assert.equal(mixedLots.finishedBeerLots.length, 1, 'multi-lot sale should remove the depleted first finished lot');
assert.equal(mixedLots.inventory.cases, 5, 'multi-lot sale should keep inventory case count aligned with finished lots');
assert.equal(mixedLots.cash - 180, mixedPayout, 'multi-lot displayed payout should match reducer cash delta');

let overflowState = createInitialState();
overflowState.cash = 500;
overflowState = reduceGame(overflowState, { type: 'order-ingredient', ingredientId: 'pilsner-malt', packs: 8 });
overflowState = reduceGame(reduceGame(reduceGame(overflowState, { type: 'end-day' }), { type: 'end-day' }), { type: 'end-day' });
assert.ok(storageOverflowByArea(overflowState)['dry-shelf'] > 0, 'large ingredient orders should create dry shelf overflow');
const pilsenCondition = overflowState.inventory.ingredients['pilsner-malt'].condition;
overflowState = reduceGame(overflowState, { type: 'end-day' });
assert.ok(overflowState.inventory.ingredients['pilsner-malt'].condition < pilsenCondition, 'overflow should degrade stored malt condition');

let dirtyIpa = createInitialState();
dirtyIpa.cash = 500;
dirtyIpa.inventory.ingredients['pale-malt'].amount = 10;
dirtyIpa.inventory.ingredients['crystal-malt'].amount = 1;
dirtyIpa.inventory.ingredients['ipa-hops'].amount = 300;
dirtyIpa.inventory.ingredients['ale-yeast'].amount = 3;
dirtyIpa.inventory.ingredients.bottles.amount = 80;
dirtyIpa.inventory.ingredients['ipa-hops'].condition = 55;
dirtyIpa.equipment.fermenter.condition = 35;
dirtyIpa.ownedEquipment.find((item) => item.instanceId === dirtyIpa.activeEquipment.fermenter).condition = 35;
dirtyIpa = reduceGame(dirtyIpa, { type: 'start-batch', recipeId: 'backyard-ipa' });
dirtyIpa = tickUntilStep(dirtyIpa, 'awaiting-packaging', 20);
assert.ok(dirtyIpa.events.some((event) => /Polyphenols|hop creep|Sanitation|Infection/.test(event.message)), 'IPA should trigger hop or infection fault events under bad conditions');

let dirtyPils = createInitialState();
dirtyPils.inventory.ingredients['lager-yeast'].amount = 2;
dirtyPils.inventory.ingredients['saaz-hops'].amount = 200;
dirtyPils.inventory.ingredients.bottles.amount = 72;
dirtyPils.inventory.ingredients['pilsner-malt'].condition = 50;
dirtyPils.equipment.kettle.condition = 30;
dirtyPils.equipment.fermenter.condition = 30;
dirtyPils.ownedEquipment.find((item) => item.instanceId === dirtyPils.activeEquipment.kettle).condition = 30;
dirtyPils.ownedEquipment.find((item) => item.instanceId === dirtyPils.activeEquipment.fermenter).condition = 30;
dirtyPils = reduceGame(dirtyPils, { type: 'start-batch', recipeId: 'basement-pils' });
dirtyPils = tickUntilStep(dirtyPils, 'awaiting-packaging', 25);
assert.ok(dirtyPils.events.some((event) => /dimethyl sulfide|hydrogen sulfide|Sanitation|Infection/.test(event.message)), 'Pils should trigger DMS or sulfur-style events under bad conditions');

let dirtyBottler = createInitialState();
dirtyBottler.equipment.bottler.condition = 50;
dirtyBottler.ownedEquipment.find((item) => item.instanceId === dirtyBottler.activeEquipment.bottler).condition = 50;
dirtyBottler = reduceGame(dirtyBottler, { type: 'start-batch', recipeId: 'garage-blonde' });
dirtyBottler = tickUntilStep(dirtyBottler, undefined, 20);
assert.ok(dirtyBottler.inventory.cases > 0, 'dirty bottler should still package some cases');
assert.match(eventMessages(dirtyBottler), /Dirty bottling station lost \d+ cases? \(12 . 33 cl bottles\)/, 'dirty packaging should produce a plain-language warning with the case definition');

let nextDay = createInitialState();
nextDay = reduceGame(nextDay, { type: 'end-day' });
assert.equal(nextDay.day, 2, 'ending the day should roll over to a new game day');
assert.equal(nextDay.demand.casesSold, 0, 'new day should reset demand fulfillment');

const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const appBootSource = await readFile(new URL('../src/ui/appBoot.ts', import.meta.url), 'utf8');
const garageSceneSource = await readFile(new URL('../src/ui/garageScene.ts', import.meta.url), 'utf8');
const inputHandlersSource = await readFile(new URL('../src/ui/inputHandlers.ts', import.meta.url), 'utf8');
const overlaysSource = await readFile(new URL('../src/ui/overlays.ts', import.meta.url), 'utf8');
const recipePanelSource = await readFile(new URL('../src/ui/recipePanel.ts', import.meta.url), 'utf8');
const stationPanelSource = await readFile(new URL('../src/ui/stationPanel.ts', import.meta.url), 'utf8');
const stationViewModelSource = await readFile(new URL('../src/ui/stationViewModel.ts', import.meta.url), 'utf8');
const storyPanelsSource = await readFile(new URL('../src/ui/storyPanels.ts', import.meta.url), 'utf8');
assert.match(`${recipePanelSource}\n${stationPanelSource}`, /data-action=\"start-batch\"/, 'UI should render recipe brew buttons');
assert.match(recipePanelSource, /data-action=\"order-recipe\"/, 'UI should render recipe order buttons');
assert.match(overlaysSource, /data-action=\"order-ingredient\"/, 'UI should allow proactive ingredient ordering');
assert.match(overlaysSource, /Incoming orders/, 'UI should show pending deliveries');
assert.match(garageSceneSource, /Mash.*Ferment.*Package.*Sell/s, 'UI should show clear stage labels');
assert.match(appBootSource, /loadSavedGame/, 'UI should load browser-local saves on startup');
assert.match(mainSource, /saveGameState/, 'UI should save browser-local progress after actions and ticks');
assert.match(garageSceneSource, /New Game \/ Reset Save/, 'UI should expose a reset save button');
assert.match(overlaysSource, /caseDefinitionExplanation/, 'UI should reuse the persistent case explanation');
assert.match(stationPanelSource, /caseCountLabel\(readyBatch\.casesExpected\)/, 'bottling bench should show case counts with the 12 bottle definition');
assert.match(`${mainSource}\n${stationPanelSource}\n${overlaysSource}`, /caseCountLabel\(state\.inventory\.cases\)/, 'pallet and inventory surfaces should show case counts with definition');
assert.match(overlaysSource, /caseCountLabel\(lot\.cases\)/, 'finished lot cards should show case counts with definition');

assert.match(mainSource, /selectedRecipeCategoryId/, 'recipe flow should keep a category-selection state');
assert.match(recipePanelSource, /data-action="select-recipe-category"/, 'recipe panel should render category-selection actions');
assert.match(recipePanelSource, /recipeStockBatchCount/, 'recipe panel should show how many batches current stock supports');
assert.match(storyPanelsSource, /story-phone/, 'mission intros should render as a phone screen');
assert.match(storyPanelsSource, /phone-reply-button/, 'mission phone should use a reply button');
assert.doesNotMatch(storyPanelsSource, /Start the shift/, 'mission intro should not use shift wording');
assert.match(recipePanelSource, /renderBrewExplainer/, 'recipe panel should explain mash, boil and transfer before brewing');
assert.match(stationPanelSource, /renderBrewDayNotes/, 'kettle panel should show brew day notes after brewing');
assert.match(garageSceneSource, /<svg class="shop-cart-icon"/, 'shop cart hotspot should render as a recognizable SVG cart icon');
assert.match(overlaysSource, /select-shop-section/, 'shop cart should first ask whether to shop supplies or equipment');
assert.doesNotMatch(`${mainSource}\n${garageSceneSource}`, /\$\{renderSceneSupplyHotspots\(/, 'garage scene should not render floating inventory alert badges');
assert.match(recipePanelSource, /recipes-next-page/, 'recipe panel should expose pagination controls');
assert.match(stationPanelSource, /station-panel recipe-station-panel/, 'recipe selection should use the shared station-panel shell');
assert.match(garageSceneSource, /export const renderGarage/, 'garage scene rendering should live outside main');
assert.match(overlaysSource, /export const renderFocusOverlay/, 'focus overlay rendering should live outside main');
assert.match(inputHandlersSource, /root\.addEventListener\('click'/, 'root click routing should live outside main');
assert.doesNotMatch(mainSource, /root\.addEventListener\('click'/, 'main should not own root click routing');
assert.match(stationViewModelSource, /export const createStationViewModel/, 'station view-model helpers should live outside main');
assert.match(stationViewModelSource, /export const equipmentCapacityLabel/, 'equipment capacity copy should be shared from station view-models');
assert.match(overlaysSource, /import \{ equipmentCapacityLabel \} from '\.\/stationViewModel\.js'/, 'overlays should reuse the shared equipment capacity label');
assert.doesNotMatch(mainSource, /const (equipmentCapacityLabel|equipmentSceneStatus|stationPanelContext|renderRecipePanelContent)/, 'main should not own station view-model helpers');
assert.ok(mainSource.split('\n').length < 350, 'main should stay a thin app orchestrator');

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const garageLayoutSource = await readFile(new URL('../src/data/garageLayout.ts', import.meta.url), 'utf8');
const garageCssManifest = await readFile(new URL('../src/styles/garage.css', import.meta.url), 'utf8');
const garageCss = (
  await Promise.all(
    [
      '../src/styles/garage-core.css',
      '../src/styles/garage-scene.css',
      '../src/styles/garage-overlays.css',
      '../src/styles/garage-controls.css',
      '../src/styles/garage-story-stations.css',
      '../src/styles/garage-responsive.css'
    ].map((path) => readFile(new URL(path, import.meta.url), 'utf8'))
  )
).join('\n');
const hasLowOpacityInSelectorBlocks = (cssSource, selectorPatterns, maxOpacityExclusive = 0.9) => {
  const selectorGroup = selectorPatterns.map((pattern) => pattern.source).join('|');
  const blockRegex = new RegExp(`(?:${selectorGroup})[\\s\\S]*?\\{([\\s\\S]*?)\\}`, 'g');
  let blockMatch;
  while ((blockMatch = blockRegex.exec(cssSource)) !== null) {
    const blockBody = blockMatch[1];
    const opacityRegex = /opacity:\s*([01](?:\.\d+)?)/g;
    let opacityMatch;
    while ((opacityMatch = opacityRegex.exec(blockBody)) !== null) {
      if (Number(opacityMatch[1]) < maxOpacityExclusive) {
        return true;
      }
    }
  }
  return false;
};
assert.match(index, /viewport-fit=cover/, 'index should include an iPhone safe-area viewport');
assert.match(index, /src="\.\/dist\/main\.js"/, 'index should load compiled TypeScript output with a relative path');
assert.match(index, /href="\.\/src\/styles\/globals\.css"/, 'index should load global CSS with a relative path');
assert.match(index, /href="\.\/src\/styles\/garage\.css"/, 'index should load garage CSS with a relative path');
assert.doesNotMatch(index, /(?:href|src)="\//, 'index asset references should not use root-relative paths');
assert.match(garageCssManifest, /garage-scene\.css[\s\S]*garage-overlays\.css[\s\S]*garage-controls\.css[\s\S]*garage-responsive\.css/, 'garage CSS should be split into scene, overlay, control, and responsive sections');
assert.match(garageCss, /public\/assets\/garage\/backgrounds\/garage-background\.png/, 'garage background should load from public/assets for simple static previews');
assert.match(garageLayoutSource, /public\/assets\/garage\/equipment/, 'equipment sprites should load from public/assets for simple static previews');
assert.doesNotMatch(`${garageCss}\n${garageLayoutSource}`, /(?<!public\/)assets\/garage/, 'garage art should not depend on a custom /assets server alias');
assert.equal(
  hasLowOpacityInSelectorBlocks(garageCss, [/\.mode-idle\b/, /\.mode-fermentation\b/, /\.mode-packaging\b/]),
  false,
  'gameplay mode styling should not reduce mode-targeted visibility below 0.9'
);
assert.equal(
  hasLowOpacityInSelectorBlocks(garageCss, [/\.scene-silent\b/]),
  false,
  'scene-silent selectors should not dim gameplay visibility below 0.9'
);
assert.doesNotMatch(garageCss, /\.(?:equipment-hotspot|equipment-object-toggle)\.active::after[\s\S]{0,140}dashed/, 'active gameplay highlights should avoid debug-style dashed outlines');
assert.match(garageCss, /\.layout-debug-enabled[\s\S]{0,180}dashed/, 'dashed outlines should be scoped to layout-debug-enabled mode only');
assert.doesNotMatch(garageCss, /\.garage-scene\.has-expanded\s+\.obstructed-by-card/, 'expanded-card state should not hide or disable obstructed equipment');
assert.equal(
  hasLowOpacityInSelectorBlocks(garageCss, [/\.obstructed-by-card\b/], 0.01),
  false,
  'obstructed-by-card selectors should not hide equipment with zero opacity'
);
assert.doesNotMatch(garageCss, /\.(?:equipment-object|equipment-object-toggle|equipment-hotspot|case-hotspot)[^{]*\.expanded[\s\S]{0,220}opacity:\s*0(?:[;\s}])/, 'expanded-card styling should not set equipment or hotspots to opacity 0');
assert.match(garageCss, /first-loop-objective[\s\S]*top:\s*64%/, 'guidance pill should be positioned lower in the scene');

console.log('All Brewery Sim prototype checks passed.');
