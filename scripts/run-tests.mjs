import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
assert.ok(blonde && ipa && pils && wheat && saison && stout, 'starter recipes should include Blonde, IPA, Pils, Wheat, Saison and Stout');
assert.ok(recipes.some((recipe) => recipe.id === 'custom-recipe' && recipe.enabled === false), 'custom recipe should exist as disabled placeholder');
assert.ok(ingredients.some((ingredient) => ingredient.id === 'pilsner-malt'), 'ingredient catalog should include named malt');

assert.equal(recipeCanStart(state, blonde), true, 'starter stock should allow the Blonde');
state = reduceGame(state, { type: 'start-batch', recipeId: 'garage-blonde' });
assert.equal(state.batches.length, 1, 'starting a batch should create one active batch');
assert.equal(state.inventory.ingredients['pilsner-malt'].amount, 5.8, 'starting a Blonde consumes named pilsner malt');
assert.equal(currentWorkflowStage(state).stage, 'Mash', 'started batch should show Mash stage');

state = reduceGame(state, { type: 'tick', seconds: 12 });
assert.equal(state.batches[0].step, 'fermenting', 'batch should leave mashing after prototype timing');
assert.equal(currentWorkflowStage(state).tapTarget, 'fermenter', 'fermenting stage should point at the fermenter');

state = reduceGame(state, { type: 'tick', seconds: 12 });
assert.equal(state.batches[0].step, 'packaging', 'batch should leave fermentation after prototype timing');

state = reduceGame(state, { type: 'tick', seconds: 12 });
assert.equal(state.batches[0].step, 'ready', 'batch should be ready after prototype packaging');
assert.equal(currentWorkflowStage(state).tapTarget, 'bottler', 'ready batches should point at the bottler for packaging');

state = reduceGame(state, { type: 'package-batch', batchId: state.batches[0].id });
assert.equal(state.inventory.cases, 8, 'packaging should add cases to inventory');
assert.equal(state.finishedBeerLots.length, 1, 'packaging should create a recipe-specific finished lot');

state = reduceGame(state, { type: 'sell-cases', cases: 6 });
assert.equal(state.inventory.cases, 2, 'selling should remove cases from inventory');
assert.equal(state.demand.casesSold, 6, 'selling should fulfill local demand progress');
assert.equal(currentWorkflowStage(state).stage, 'Sell', 'remaining cases and demand should keep the flow on Sell');
assert.ok(state.cash > 140, 'selling cases should increase cash');
assert.ok(state.visibilityRisk > 0, 'garage sales should increase visibility risk');

const storage = createMemoryStorage();
saveGameState(state, storage);
assert.match(storage.getItem(STORAGE_KEY), /\"version\":2/, 'save should use the v2 storage envelope');
const restored = loadSavedGame(storage);
assert.deepEqual(restored, state, 'saved state should restore after refresh');
storage.setItem(STORAGE_KEY, '{bad json');
assert.deepEqual(loadSavedGame(storage), createInitialState(), 'bad save data should fall back to a new game');
assert.equal(storage.getItem(STORAGE_KEY), null, 'bad save data should be cleared after fallback');
storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, state: { cash: 10 } }));
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
orderState = reduceGame(orderState, { type: 'tick', seconds: 60 });
orderState = reduceGame(orderState, { type: 'tick', seconds: 60 });
assert.equal(orderState.pendingOrders.length, 1, 'order should not arrive before three day rollovers');
orderState = reduceGame(orderState, { type: 'tick', seconds: 60 });
assert.equal(orderState.pendingOrders.length, 0, 'order should arrive after three day rollovers');
assert.equal(recipeMissingIngredients(orderState, ipa).length, 0, 'delivered ingredients should unblock the IPA');

let overflowState = createInitialState();
overflowState.cash = 500;
overflowState = reduceGame(overflowState, { type: 'order-ingredient', ingredientId: 'pilsner-malt', packs: 8 });
overflowState = reduceGame(overflowState, { type: 'tick', seconds: 180 });
assert.ok(storageOverflowByArea(overflowState)['dry-shelf'] > 0, 'large ingredient orders should create dry shelf overflow');
const pilsenCondition = overflowState.inventory.ingredients['pilsner-malt'].condition;
overflowState = reduceGame(overflowState, { type: 'tick', seconds: 60 });
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
dirtyIpa = reduceGame(dirtyIpa, { type: 'tick', seconds: 40 });
assert.ok(dirtyIpa.events.some((event) => /Polyphenols|hop creep|Contamination/.test(event.message)), 'IPA should trigger hop or contamination fault events under bad conditions');

let dirtyPils = createInitialState();
dirtyPils.inventory.ingredients['lager-yeast'].amount = 2;
dirtyPils.inventory.ingredients['saaz-hops'].amount = 200;
dirtyPils.inventory.ingredients.bottles.amount = 40;
dirtyPils.inventory.ingredients['pilsner-malt'].condition = 50;
dirtyPils.equipment.kettle.condition = 30;
dirtyPils.equipment.fermenter.condition = 30;
dirtyPils = reduceGame(dirtyPils, { type: 'start-batch', recipeId: 'basement-pils' });
dirtyPils = reduceGame(dirtyPils, { type: 'tick', seconds: 45 });
assert.ok(dirtyPils.events.some((event) => /dimethyl sulfide|hydrogen sulfide|Contamination/.test(event.message)), 'Pils should trigger DMS or sulfur-style events under bad conditions');

let dirtyBottler = createInitialState();
dirtyBottler.equipment.bottler.condition = 50;
dirtyBottler = reduceGame(dirtyBottler, { type: 'start-batch', recipeId: 'garage-blonde' });
dirtyBottler = reduceGame(dirtyBottler, { type: 'tick', seconds: 36 });
dirtyBottler = reduceGame(dirtyBottler, { type: 'package-batch', batchId: dirtyBottler.batches[0].id });
assert.equal(dirtyBottler.inventory.cases, 7, 'dirty bottler should lose one case during packaging');
assert.match(dirtyBottler.events[0].message, /Dirty bottling station lost 1 case/, 'dirty packaging should produce a plain-language warning');

let nextDay = createInitialState();
nextDay = reduceGame(nextDay, { type: 'tick', seconds: 60 });
assert.equal(nextDay.day, 2, 'one minute of real time should roll over to a new game day');
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
