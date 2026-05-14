import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createInitialState } from '../dist/game/initialState.js';
import { reduceGame } from '../dist/game/simulation.js';

let state = createInitialState();
state = reduceGame(state, { type: 'start-batch', recipeId: 'garage-pale' });
assert.equal(state.batches.length, 1, 'starting a batch should create one active batch');
assert.equal(state.inventory.grain, 30, 'starting a pale ale consumes 5 kg grain');
assert.equal(state.batches[0].contaminationRisk, 13, 'batch should show early contamination risk');

state = reduceGame(state, { type: 'tick', seconds: 11 });
assert.equal(state.batches[0].step, 'fermenting', 'batch should leave mashing after prototype timing');

state = reduceGame(state, { type: 'tick', seconds: 11 });
assert.equal(state.batches[0].step, 'packaging', 'batch should leave fermentation after prototype timing');

state = reduceGame(state, { type: 'tick', seconds: 11 });
assert.equal(state.batches[0].step, 'ready', 'batch should be ready after prototype packaging');

state = reduceGame(state, { type: 'package-batch', batchId: state.batches[0].id });
assert.equal(state.inventory.cases, 8, 'packaging should add cases to inventory');

state = reduceGame(state, { type: 'sell-cases', cases: 6 });
assert.equal(state.inventory.cases, 2, 'selling should remove cases from inventory');
assert.equal(state.demand.casesSold, 6, 'selling should fulfill local demand progress');
assert.ok(state.cash > 140, 'selling cases should increase cash');

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

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.match(index, /viewport-fit=cover/, 'index should include an iPhone safe-area viewport');
assert.match(index, /src="\.\/dist\/main\.js"/, 'index should load compiled TypeScript output with a relative path');
assert.match(index, /href="\.\/src\/styles\/globals\.css"/, 'index should load global CSS with a relative path');
assert.match(index, /href="\.\/src\/styles\/garage\.css"/, 'index should load garage CSS with a relative path');
assert.doesNotMatch(index, /(?:href|src)="\//, 'index asset references should not use root-relative paths');

console.log('All Brewery Sim prototype checks passed.');
