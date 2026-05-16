import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { equipmentCatalog } from '../dist/data/equipment.js';
import { ingredients } from '../dist/data/ingredients.js';
import { recipes } from '../dist/data/recipes.js';
import { createInitialState } from '../dist/game/initialState.js';
import { loadSavedGame, resetSavedGame, saveGameState, STORAGE_KEY } from '../dist/game/persistence.js';
import { reduceGame } from '../dist/game/simulation.js';
import {
  contaminationRiskTier,
  currentWorkflowStage,
  equipmentConditionLabel,
  equipmentConditionTier,
  orderCost,
  recipeCanStart,
  recipeMissingIngredients,
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
assert.ok(recipes.some((recipe) => recipe.id === 'custom-recipe' && recipe.enabled === false), 'custom recipe should exist as disabled placeholder');
assert.ok(ingredients.some((ingredient) => ingredient.id === 'pilsner-malt'), 'ingredient catalog should include named malt');
assert.equal(state.fermenterTemperatureC, 18, 'new games should track fermenter temperature');

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
  testState = reduceGame(testState, { type: 'set-fermenter-temperature', temperatureC });
  testState = reduceGame(testState, { type: 'start-batch', recipeId: recipe.id });
  const startingBatch = testState.batches[0];
  assert.equal(testState.batches[0].step, 'awaiting-transfer', `${recipe.name} should wait for manual transfer after brew day`);
  testState = reduceGame(testState, { type: 'transfer-batch', batchId: testState.batches[0].id });
  assert.equal(testState.batches[0].step, 'fermenting', `${recipe.name} should reach fermentation in the temperature test`);

  for (let days = 0; days < 20 && testState.batches[0].step === 'fermenting'; days += 1) {
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
assert.equal(state.equipment.kettle.name, '20 L enamel stock pot', 'starter brewhouse should be the Tier 1 enamel stock pot');
assert.equal(state.equipment.fermenter.name, 'Plastic fermentation bucket', 'starter fermentation should be one plastic bucket');
assert.equal(state.equipment.bottler.name, 'Bottle wand and hand capper', 'starter packaging should be the wand and hand capper');

state = reduceGame(state, { type: 'start-batch', recipeId: 'garage-blonde' });
assert.equal(state.batches.length, 1, 'starting a batch should create one active batch');
assert.equal(state.inventory.ingredients['pilsner-malt'].amount, 5.8, 'starting a Blonde consumes named pilsner malt');
assert.equal(state.batches[0].step, 'awaiting-transfer', 'brew day should stop at manual transfer');
assert.equal(currentWorkflowStage(state).tapTarget, 'fermenter', 'started batch should point at manual transfer');

state = tickUntilStep(state, 'fermenting');
assert.equal(state.batches[0].step, 'fermenting', 'batch should enter fermentation only after manual transfer');
assert.equal(currentWorkflowStage(state).tapTarget, 'fermenter', 'fermenting stage should point at the fermenter');

state = tickUntilStep(state, 'awaiting-packaging');
assert.equal(state.batches[0].step, 'awaiting-packaging', 'batch should stop for manual packaging after fermentation');

state = tickUntilStep(state, 'bottle-conditioning');
assert.equal(state.batches[0].step, 'bottle-conditioning', 'packaging should start bottle conditioning before beer is ready');
assert.equal(currentWorkflowStage(state).tapTarget, 'bottler', 'conditioning batches should keep the bottler/cases area in focus');

let bottlerActionState = reduceGame(state, { type: 'use-equipment', equipmentId: 'bottler' });
assert.equal(bottlerActionState.batches[0].step, 'bottle-conditioning', 'bottler should not auto-ready conditioning beer');

state = tickUntilStep(state, undefined, 8);
assert.ok(state.inventory.cases > 0, 'packaging should add cases to inventory');
assert.equal(state.finishedBeerLots.length, 1, 'packaging should create a recipe-specific finished lot');

const casesBeforeSale = state.inventory.cases;
state = reduceGame(state, { type: 'sell-cases', cases: 6 });
assert.ok(state.inventory.cases < casesBeforeSale, 'selling should remove cases from inventory');
assert.ok(state.demand.casesSold > 0, 'selling should fulfill local demand progress');
assert.ok(['Sell', 'Mash'].includes(currentWorkflowStage(state).stage), 'flow should either keep selling remaining cases or return to brewing after stock sells out');
assert.ok(state.cash > 140, 'selling cases should increase cash');
assert.ok(state.visibilityRisk > 0, 'garage sales should increase visibility risk');

const storage = createMemoryStorage();
saveGameState(state, storage);
assert.match(storage.getItem(STORAGE_KEY), /\"version\":4/, 'save should use the v4 storage envelope');
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

assert.equal(equipmentConditionTier(92), 'clean', 'high condition should be clean');
assert.equal(equipmentConditionTier(70), 'worn', 'mid condition should be worn');
assert.equal(equipmentConditionTier(50), 'dirty', 'low condition should be dirty');
assert.equal(equipmentConditionTier(25), 'critical', 'very low condition should be critical');
assert.equal(equipmentConditionLabel(50), 'Dirty', 'condition labels should be player-readable');
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
  2,
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
dirtyIpa.inventory.ingredients.bottles.amount = 40;
dirtyIpa.inventory.ingredients['ipa-hops'].condition = 55;
dirtyIpa.equipment.fermenter.condition = 35;
dirtyIpa = reduceGame(dirtyIpa, { type: 'start-batch', recipeId: 'backyard-ipa' });
dirtyIpa = tickUntilStep(dirtyIpa, 'awaiting-packaging', 20);
assert.ok(dirtyIpa.events.some((event) => /Polyphenols|hop creep|Contamination/.test(event.message)), 'IPA should trigger hop or contamination fault events under bad conditions');

let dirtyPils = createInitialState();
dirtyPils.inventory.ingredients['lager-yeast'].amount = 2;
dirtyPils.inventory.ingredients['saaz-hops'].amount = 200;
dirtyPils.inventory.ingredients.bottles.amount = 40;
dirtyPils.inventory.ingredients['pilsner-malt'].condition = 50;
dirtyPils.equipment.kettle.condition = 30;
dirtyPils.equipment.fermenter.condition = 30;
dirtyPils = reduceGame(dirtyPils, { type: 'start-batch', recipeId: 'basement-pils' });
dirtyPils = tickUntilStep(dirtyPils, 'awaiting-packaging', 25);
assert.ok(dirtyPils.events.some((event) => /dimethyl sulfide|hydrogen sulfide|Contamination/.test(event.message)), 'Pils should trigger DMS or sulfur-style events under bad conditions');

let dirtyBottler = createInitialState();
dirtyBottler.equipment.bottler.condition = 50;
dirtyBottler.ownedEquipment.find((item) => item.instanceId === dirtyBottler.activeEquipment.bottler).condition = 50;
dirtyBottler = reduceGame(dirtyBottler, { type: 'start-batch', recipeId: 'garage-blonde' });
dirtyBottler = tickUntilStep(dirtyBottler, undefined, 20);
assert.ok(dirtyBottler.inventory.cases > 0, 'dirty bottler should still package some cases');
assert.match(eventMessages(dirtyBottler), /Dirty bottling station lost \d+ cases?/, 'dirty packaging should produce a plain-language warning');

let nextDay = createInitialState();
nextDay = reduceGame(nextDay, { type: 'end-day' });
assert.equal(nextDay.day, 2, 'ending the day should roll over to a new game day');
assert.equal(nextDay.demand.casesSold, 0, 'new day should reset demand fulfillment');

const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
assert.match(mainSource, /data-action=\"start-batch\"/, 'UI should render recipe brew buttons');
assert.match(mainSource, /data-action=\"order-recipe\"/, 'UI should render recipe order buttons');
assert.match(mainSource, /data-action=\"order-ingredient\"/, 'UI should allow proactive ingredient ordering');
assert.match(mainSource, /Incoming orders/, 'UI should show pending deliveries');
assert.match(mainSource, /Mash.*Ferment.*Package.*Sell/s, 'UI should show clear stage labels');
assert.match(mainSource, /loadSavedGame/, 'UI should load browser-local saves on startup');
assert.match(mainSource, /saveGameState/, 'UI should save browser-local progress after actions and ticks');
assert.match(mainSource, /New Game \/ Reset Save/, 'UI should expose a reset save button');

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.match(index, /viewport-fit=cover/, 'index should include an iPhone safe-area viewport');
assert.match(index, /src="\.\/dist\/main\.js"/, 'index should load compiled TypeScript output with a relative path');
assert.match(index, /href="\.\/src\/styles\/globals\.css"/, 'index should load global CSS with a relative path');
assert.match(index, /href="\.\/src\/styles\/garage\.css"/, 'index should load garage CSS with a relative path');
assert.doesNotMatch(index, /(?:href|src)="\//, 'index asset references should not use root-relative paths');

console.log('All Brewery Sim prototype checks passed.');
