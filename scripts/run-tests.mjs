import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createInitialState } from '../dist/game/initialState.js';
import { reduceGame } from '../dist/game/simulation.js';

let state = createInitialState();
state = reduceGame(state, { type: 'start-batch', recipeId: 'garage-pale' });
assert.equal(state.batches.length, 1, 'starting a batch should create one active batch');
assert.equal(state.inventory.grain, 52, 'starting a pale ale consumes grain');

state = reduceGame(state, { type: 'tick', seconds: 2600 });
assert.equal(state.batches[0].step, 'fermenting', 'batch should leave mashing after enough time');

state = reduceGame(state, { type: 'tick', seconds: 5000 });
assert.equal(state.batches[0].step, 'packaging', 'batch should leave fermentation after enough time');

state = reduceGame(state, { type: 'tick', seconds: 2400 });
assert.equal(state.batches[0].step, 'ready', 'batch should be ready after packaging');

state = reduceGame(state, { type: 'package-batch', batchId: state.batches[0].id });
assert.equal(state.inventory.cases, 8, 'packaging should add cases to inventory');

state = reduceGame(state, { type: 'sell-cases', cases: 6 });
assert.equal(state.inventory.cases, 2, 'selling should remove cases from inventory');
assert.ok(state.cash > 140, 'selling cases should increase cash');

let upgraded = createInitialState();
upgraded.cash = 500;
upgraded = reduceGame(upgraded, { type: 'buy-upgrade', upgradeId: 'larger-kettle' });
upgraded = reduceGame(upgraded, { type: 'start-batch', recipeId: 'garage-pale' });
assert.equal(upgraded.equipment.kettle.level, 2, 'larger kettle should increase kettle level');
assert.equal(upgraded.batches[0].casesExpected, 12, 'larger kettle should increase batch size');

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.match(index, /viewport-fit=cover/, 'index should include an iPhone safe-area viewport');
assert.match(index, /dist\/main\.js/, 'index should load compiled TypeScript output');

console.log('All Brewery Sim prototype checks passed.');
