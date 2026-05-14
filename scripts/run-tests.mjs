import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createInitialState } from '../dist/game/initialState.js';
import { reduceGame } from '../dist/game/simulation.js';
import { loadSavedGame, resetSavedGame, saveGameState, STORAGE_KEY } from '../dist/game/persistence.js';
import { currentWorkflowStage } from '../dist/game/selectors.js';


const createMemoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
};

let state = createInitialState();
state = reduceGame(state, { type: 'start-batch', recipeId: 'garage-pale' });
assert.equal(state.batches.length, 1, 'starting a batch should create one active batch');
assert.equal(state.inventory.grain, 30, 'starting a pale ale consumes 5 kg grain');
assert.equal(state.batches[0].contaminationRisk, 13, 'batch should show early contamination risk');
assert.equal(currentWorkflowStage(state).stage, 'Mash', 'started batch should show Mash stage');

state = reduceGame(state, { type: 'tick', seconds: 11 });
assert.equal(state.batches[0].step, 'fermenting', 'batch should leave mashing after prototype timing');
assert.equal(currentWorkflowStage(state).tapTarget, 'fermenter', 'fermenting stage should point at the fermenter');

state = reduceGame(state, { type: 'tick', seconds: 11 });
assert.equal(state.batches[0].step, 'packaging', 'batch should leave fermentation after prototype timing');

state = reduceGame(state, { type: 'tick', seconds: 11 });
assert.equal(state.batches[0].step, 'ready', 'batch should be ready after prototype packaging');
assert.equal(currentWorkflowStage(state).tapTarget, 'bottler', 'ready batches should point at the bottler for packaging');

state = reduceGame(state, { type: 'package-batch', batchId: state.batches[0].id });
assert.equal(state.inventory.cases, 8, 'packaging should add cases to inventory');

state = reduceGame(state, { type: 'sell-cases', cases: 6 });
assert.equal(state.inventory.cases, 2, 'selling should remove cases from inventory');
assert.equal(state.demand.casesSold, 6, 'selling should fulfill local demand progress');
assert.equal(currentWorkflowStage(state).stage, 'Sell', 'remaining cases and demand should keep the flow on Sell');
assert.ok(state.cash > 140, 'selling cases should increase cash');

const storage = createMemoryStorage();
saveGameState(state, storage);
assert.match(storage.getItem(STORAGE_KEY), /\"version\":1/, 'save should use the v1 storage envelope');
const restored = loadSavedGame(storage);
assert.deepEqual(restored, state, 'saved state should restore after refresh');
storage.setItem(STORAGE_KEY, '{bad json');
assert.deepEqual(loadSavedGame(storage), createInitialState(), 'bad save data should fall back to a new game');
assert.equal(storage.getItem(STORAGE_KEY), null, 'bad save data should be cleared after fallback');
storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state: { cash: 10 } }));
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

let upgraded = createInitialState();
upgraded.cash = 500;
upgraded = reduceGame(upgraded, { type: 'buy-upgrade', upgradeId: 'larger-kettle' });
upgraded = reduceGame(upgraded, { type: 'start-batch', recipeId: 'garage-pale' });
assert.equal(upgraded.equipment.kettle.level, 2, 'larger kettle should increase kettle level');
assert.equal(upgraded.batches[0].casesExpected, 14, 'larger kettle should increase batch size');

let dirty = createInitialState();
dirty.equipment.fermenter.condition = 30;
dirty = reduceGame(dirty, { type: 'start-batch', recipeId: 'garage-pale' });
assert.ok(dirty.batches[0].contaminationRisk >= 35, 'dirty fermenter should create clear contamination risk');
dirty.cash = 200;
dirty = reduceGame(dirty, { type: 'clean-equipment', equipmentId: 'fermenter' });
dirty = reduceGame(dirty, { type: 'tick', seconds: 11 });
dirty = reduceGame(dirty, { type: 'start-batch', recipeId: 'amber-shift' });
assert.ok(dirty.batches[1].contaminationRisk < dirty.batches[0].contaminationRisk, 'cleaning should reduce contamination risk');

let nextDay = createInitialState();
nextDay = reduceGame(nextDay, { type: 'tick', seconds: 60 });
assert.equal(nextDay.day, 2, 'one minute of real time should roll over to a new game day');
assert.equal(nextDay.demand.casesSold, 0, 'new day should reset demand fulfillment');

const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
assert.doesNotMatch(mainSource, /data-action=\"start-batch\"/, 'UI should not render duplicate recipe buttons while kettle starts Garage Pale Ale');
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
