import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { equipmentCatalog } from '../dist/data/equipment.js';
import { ingredients } from '../dist/data/ingredients.js';
import { garageEquipmentLayoutByTier } from '../dist/data/garageLayout.js';
import { recipes } from '../dist/data/recipes.js';
import { brewingRiskRuleSet, brewdayRiskForRecipe, packagingRiskForMode, transferRiskForRecipe } from '../dist/data/brewingRiskRules.js';
import { campaignMissionOrder, campaignNextStep, campaignView } from '../dist/game/campaign.js';
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
assert.equal(blonde.originalGravity, '1.062', 'Garage Blonde should define original gravity for brew notes');
assert.equal(blonde.expectedAbv, '6.4%', 'Garage Blonde should define expected ABV for brew notes');
assert.match(recipeRequirementSummary(blonde), /4\.7 kg Pilsner malt[\s\S]*0\.3 kg Aromatic malt[\s\S]*0\.5 kg Light candi sugar[\s\S]*50 g Styrian hops[\s\S]*1 belgian ale yeast pack[\s\S]*60 bottles/, 'Garage Blonde requirement summary should teach exact quantities');
const restockPreview = reduceGame(createInitialState(), { type: 'start-batch', recipeId: 'garage-blonde' });
assert.match(recipeMissingOrderSummary(restockPreview, blonde), /Need 48 bottles\. Order 4 x 12 bottle packs\./, 'restock summary should round missing bottles to shop packs');
assert.equal(recipeSupplyBreakdown(restockPreview, blonde).find((item) => item.ingredientId === 'bottles')?.packsToOrder, 4, 'supply breakdown should expose rounded packs to order');
assert.ok(recipes.some((recipe) => recipe.id === 'custom-recipe' && recipe.enabled === false), 'custom recipe should exist as disabled placeholder');
assert.ok(ingredients.some((ingredient) => ingredient.id === 'pilsner-malt'), 'ingredient catalog should include named malt');
assert.equal(brewingRiskRuleSet.validationStatus, 'brewer-approved', 'brewing risk rules should reflect brewer approval for the current prototype pass');
assert.match(brewingRiskRuleSet.validationSource, /brewing-risk-validation\.md/, 'brewing risk rules should point to the brewer validation sheet');
assert.equal(brewingRiskRuleSet.brewdayApproach.fastStyleRules.length >= 4, true, 'brewing risk data should include starter style-specific fast brew rules');
assert.equal(brewdayRiskForRecipe(blonde, 'fast').validationStatus, 'brewer-approved', 'fast Blonde rule should expose brewer-approved validation status');
assert.match(brewdayRiskForRecipe(pils, 'fast').validationQuestion, /DMS|garage Pils/i, 'fast Pils rule should expose the DMS validation question');
assert.match(transferRiskForRecipe(ipa, 'rough').validationQuestion, /IPA oxygen|aroma/i, 'rough IPA transfer rule should expose the brewer validation question');
assert.match(packagingRiskForMode('rush').validationQuestion, /rushed-packaging/i, 'rushed packaging rule should expose the brewer validation question');
assert.equal(state.fermenterTemperatureC, 18, 'new games should track fermenter temperature');
assert.equal(state.campaign.missionId, 'barbecue-text', 'new games should start on the barbecue storyline mission');
assert.equal(campaignView(state).title, 'The Barbecue Text', 'campaign view should expose the first storyline card');
assert.ok(campaignMissionOrder.includes('first-festival'), 'campaign should include the first festival mission');
assert.equal(state.customerPromises.length, 1, 'new games should start with Samira promise in the promise ledger');
assert.equal(state.customerPromises[0].status, 'open', 'Samira promise should start open');
assert.equal(state.identityScores['event-supplier'], 0, 'event supplier identity should start at zero');
assert.equal(state.breweryTier, 'garage', 'new breweries should start in the garage tier');
assert.deepEqual(state.awards, [], 'new breweries should not start with awards');
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

const makeFinishedLot = ({ id, qualityBand, sellAdvice = 'sell', stabilityRisk = 8, quality = 86, presentationScore = 82, sensoryNote = 'Clean enough to represent the brewery.' }) => ({
  id,
  sourceBatchId: `${id}-batch`,
  recipeId: 'garage-blonde',
  recipeName: 'Garage Blonde',
  cases: 4,
  volumeLiters: 16,
  quality,
  marketAppeal: 1,
  packagingState: 'packaged',
  saleState: 'available',
  verdict: {
    qualityBand,
    headline:
      qualityBand === 'excellent'
        ? 'Garage Blonde landed clean and memorable.'
        : qualityBand === 'flawed'
          ? 'Garage Blonde is sellable with a warning.'
          : qualityBand === 'unsafe'
            ? 'Do not sell. Package stability risk is severe.'
            : 'Garage Blonde is solid and sellable.',
    sensoryNotes: [sensoryNote],
    likelyCauses: ['Test fixture verdict.'],
    sellAdvice,
    stabilityRisk,
    presentationScore,
    legacyTags: qualityBand === 'excellent' ? ['flagship candidate'] : []
  }
});

const stateWithFinishedLot = (lot) => {
  const testState = createInitialState();
  testState.finishedBeerLots = [lot];
  testState.inventory.cases = lot.cases;
  return testState;
};

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
assert.equal(state.inventory.ingredients['pilsner-malt'].amount, 5.3, 'starting a Blonde consumes named pilsner malt');
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
const conditioningStart = reduceGame(state, { type: 'wait-until-ready', batchId: state.batches[0].id });
assert.equal(conditioningStart.batches[0].step, 'bottle-conditioning', 'waiting through packaging should move beer into conditioning instead of straight to inventory');
assert.equal(conditioningStart.inventory.cases, 0, 'packaged beer should not hit the pallet before release or conditioning completion');
assert.equal(conditioningStart.finishedBeerLots.length, 0, 'packaging alone should not create a finished lot');
const earlyRelease = reduceGame(conditioningStart, { type: 'ready-batch', batchId: conditioningStart.batches[0].id });
assert.equal(earlyRelease.batches.length, 0, 'release now should move conditioning beer to the finished pallet');
assert.ok(earlyRelease.finishedBeerLots[0].verdict.sensoryNotes.some((note) => /carbonation|CO2|young/i.test(note)), 'early release should preserve young conditioning notes');
state = reduceGame(conditioningStart, { type: 'wait-until-ready', batchId: conditioningStart.batches[0].id });
assert.equal(state.batches.length, 0, 'waiting through conditioning should finish the first-loop batch');
assert.equal(expectedCases, 5, 'first-loop 20 L Garage Blonde should expect five 12 bottle cases');
assert.equal(state.inventory.cases, expectedCases, 'conditioning completion should add the displayed expected cases to inventory');
assert.equal(state.finishedBeerLots.length, 1, 'conditioning completion should create a recipe-specific finished lot');
assert.ok(state.finishedBeerLots[0].verdict.stabilityRisk <= earlyRelease.finishedBeerLots[0].verdict.stabilityRisk, 'conditioning longer should not make stability worse than early release');
assert.ok(state.finishedBeerLots[0].verdict, 'packaging should create a sensory batch verdict');
assert.match(state.finishedBeerLots[0].verdict.headline, /Garage Blonde|Fast but clean|solid|sellable/i, 'batch verdict should explain the outcome in human language');
assert.ok(state.finishedBeerLots[0].verdict.sensoryNotes.length > 0, 'batch verdict should include sensory notes');
assert.ok(state.finishedBeerLots[0].verdict.likelyCauses.length > 0, 'batch verdict should include likely causes');
assert.equal(state.cash, packagingCashBefore, 'packaging should not secretly change cash');
assert.equal(firstLoopObjective(state), 'Tap the pallet to sell Garage Blonde.', 'cases-available objective should point at the pallet');

let fastBlonde = createInitialState();
fastBlonde = reduceGame(fastBlonde, { type: 'start-batch', recipeId: 'garage-blonde', brewdayApproach: 'fast' });
assert.equal(fastBlonde.batches[0].brewdayApproach, 'fast', 'brewday approach should be stored on the batch');
assert.match(fastBlonde.batches[0].brewdayNotes.join(' '), /forgiving style|Fast brew day/i, 'fast forgiving beer should explain why speed can be valid');

let standardPils = createInitialState();
stockRecipeIngredients(standardPils, pils);
standardPils = reduceGame(standardPils, { type: 'start-batch', recipeId: 'basement-pils', brewdayApproach: 'standard' });
let fastPils = createInitialState();
stockRecipeIngredients(fastPils, pils);
fastPils = reduceGame(fastPils, { type: 'start-batch', recipeId: 'basement-pils', brewdayApproach: 'fast' });
assert.ok(fastPils.batches[0].faultRisk > standardPils.batches[0].faultRisk, 'fast Pils should raise DMS/process risk instead of treating all fast brewing as equal');

let carefulIpaTransfer = createInitialState();
stockRecipeIngredients(carefulIpaTransfer, ipa);
carefulIpaTransfer = reduceGame(carefulIpaTransfer, { type: 'start-batch', recipeId: 'backyard-ipa' });
carefulIpaTransfer = reduceGame(carefulIpaTransfer, { type: 'wait-until-ready', batchId: carefulIpaTransfer.batches[0].id });
carefulIpaTransfer = reduceGame(carefulIpaTransfer, { type: 'transfer-batch', batchId: carefulIpaTransfer.batches[0].id, transferMode: 'careful' });
let roughIpaTransfer = createInitialState();
stockRecipeIngredients(roughIpaTransfer, ipa);
roughIpaTransfer = reduceGame(roughIpaTransfer, { type: 'start-batch', recipeId: 'backyard-ipa' });
roughIpaTransfer = reduceGame(roughIpaTransfer, { type: 'wait-until-ready', batchId: roughIpaTransfer.batches[0].id });
roughIpaTransfer = reduceGame(roughIpaTransfer, { type: 'transfer-batch', batchId: roughIpaTransfer.batches[0].id, transferMode: 'rough' });
assert.equal(roughIpaTransfer.batches[0].transferMode, 'rough', 'rough transfer choice should be stored on the batch');
assert.ok(roughIpaTransfer.batches[0].faultRisk > carefulIpaTransfer.batches[0].faultRisk, 'rough IPA transfer should raise oxygen/aroma risk');
assert.ok(roughIpaTransfer.batches[0].quality < carefulIpaTransfer.batches[0].quality, 'rough IPA transfer should damage aroma/quality compared with careful transfer');
assert.match(eventMessages(roughIpaTransfer), /hop aroma|oxygen risk/i, 'rough IPA transfer should explain the hop-aroma consequence');

let earlyPackage = createInitialState();
earlyPackage = reduceGame(earlyPackage, { type: 'start-batch', recipeId: 'garage-blonde' });
earlyPackage = reduceGame(earlyPackage, { type: 'wait-until-ready', batchId: earlyPackage.batches[0].id });
earlyPackage = reduceGame(earlyPackage, { type: 'transfer-batch', batchId: earlyPackage.batches[0].id });
earlyPackage.batches[0].stepProgress = 72;
const earlyQualityBefore = earlyPackage.batches[0].quality;
earlyPackage = reduceGame(earlyPackage, { type: 'package-early', batchId: earlyPackage.batches[0].id });
assert.equal(earlyPackage.batches[0].step, 'awaiting-packaging', 'package early should move an advanced fermentation to packaging decision');
assert.ok(earlyPackage.batches[0].conditioningState.packagePressureRisk > 0, 'early packaging should carry package pressure risk forward');
assert.ok(earlyPackage.batches[0].quality < earlyQualityBefore, 'early packaging should damage quality when FG is not stable');

let lastMinuteGravity = createInitialState();
lastMinuteGravity = reduceGame(lastMinuteGravity, { type: 'start-batch', recipeId: 'garage-blonde' });
lastMinuteGravity = reduceGame(lastMinuteGravity, { type: 'wait-until-ready', batchId: lastMinuteGravity.batches[0].id });
lastMinuteGravity = reduceGame(lastMinuteGravity, { type: 'transfer-batch', batchId: lastMinuteGravity.batches[0].id });
lastMinuteGravity.batches[0].stepProgress = 99.999;
lastMinuteGravity = reduceGame(lastMinuteGravity, { type: 'check-gravity', batchId: lastMinuteGravity.batches[0].id });
assert.equal(lastMinuteGravity.batches[0].step, 'awaiting-packaging', 'last-minute gravity check should preserve completed fermentation state');
assert.equal(lastMinuteGravity.batches[0].fermentationReadiness.fgConfidence, 'stable', 'last-minute gravity check should not reset FG confidence after fermentation completes');
assert.equal(lastMinuteGravity.batches[0].fermentationReadiness.apparentProgress, 100, 'last-minute gravity check should keep apparent fermentation progress complete');
lastMinuteGravity = reduceGame(lastMinuteGravity, { type: 'start-packaging', batchId: lastMinuteGravity.batches[0].id, packagingMode: 'standard' });
lastMinuteGravity = tickUntilStep(lastMinuteGravity, 'ready');
assert.equal(lastMinuteGravity.finishedBeerLots.length, 1, 'last-minute gravity checked beer should finish normally');
assert.equal(
  lastMinuteGravity.finishedBeerLots[0].verdict.likelyCauses.some((cause) => /Packaged before stable gravity/i.test(cause)),
  false,
  'last-minute gravity check should not create an early-packaging verdict cause'
);

let exactIpa = createInitialState();
stockRecipeIngredients(exactIpa, ipa);
exactIpa = reduceGame(exactIpa, { type: 'start-batch', recipeId: 'backyard-ipa' });
let substitutedIpa = createInitialState();
stockRecipeIngredients(substitutedIpa, ipa);
substitutedIpa.inventory.ingredients['ipa-hops'].amount = 0;
substitutedIpa.inventory.ingredients['styrian-hops'].amount = 220;
const blockedWithoutSubstitution = reduceGame(substitutedIpa, { type: 'start-batch', recipeId: 'backyard-ipa' });
assert.equal(blockedWithoutSubstitution.batches.length, 0, 'missing exact recipe supplies should still block normal brewing');
substitutedIpa = reduceGame(substitutedIpa, { type: 'start-batch', recipeId: 'backyard-ipa', allowSubstitutions: true });
assert.equal(substitutedIpa.batches.length, 1, 'substitution mode should allow brewing when a believable substitute is stocked');
assert.equal(substitutedIpa.batches[0].substitutions[0].missingIngredientId, 'ipa-hops', 'substitution should record the missing recipe ingredient');
assert.equal(substitutedIpa.batches[0].substitutions[0].substituteIngredientId, 'styrian-hops', 'substitution should record the supplier substitute ingredient');
assert.ok(substitutedIpa.batches[0].quality < exactIpa.batches[0].quality, 'substitution should carry a quality penalty against exact supplies');
assert.ok(substitutedIpa.batches[0].faultRisk > exactIpa.batches[0].faultRisk, 'substitution should carry extra process risk');
assert.match(eventMessages(substitutedIpa), /Supplier substitution/i, 'substitution brewing should explain the supplier decision in events');

const packagingBase = brewThroughFermentation(blonde, 18).state;
const carefulPackaging = reduceGame(packagingBase, { type: 'start-packaging', batchId: packagingBase.batches[0].id, packagingMode: 'careful' });
const rushPackaging = reduceGame(packagingBase, { type: 'start-packaging', batchId: packagingBase.batches[0].id, packagingMode: 'rush' });
assert.equal(carefulPackaging.batches[0].packagingMode, 'careful', 'careful packaging mode should be stored on the batch');
assert.ok(carefulPackaging.batches[0].packagingResult.presentationScore > rushPackaging.batches[0].packagingResult.presentationScore, 'careful packaging should improve presentation over rushed packaging');
assert.ok(carefulPackaging.batches[0].packagingResult.oxygenPickupRisk < rushPackaging.batches[0].packagingResult.oxygenPickupRisk, 'careful packaging should reduce oxygen pickup risk');

let identityState = createInitialState();
stockRecipeIngredients(identityState, saison);
identityState.equipment.kettle.condition = 100;
identityState.equipment.fermenter.condition = 100;
identityState.equipment.bottler.condition = 100;
identityState.ownedEquipment.find((item) => item.instanceId === identityState.activeEquipment.kettle).condition = 100;
identityState.ownedEquipment.find((item) => item.instanceId === identityState.activeEquipment.fermenter).condition = 100;
identityState.ownedEquipment.find((item) => item.instanceId === identityState.activeEquipment.bottler).condition = 100;
identityState.sanitationDebt = { brewhouse: 0, fermentation: 0, packaging: 0, transferPath: 0, generalGarage: 0 };
identityState = reduceGame(identityState, { type: 'set-fermenter-temperature', temperatureC: 24 });
identityState = reduceGame(identityState, { type: 'start-batch', recipeId: 'shed-saison', brewdayApproach: 'careful' });
identityState = tickUntilStep(identityState, undefined, 20);
assert.ok(identityState.identityScores['farmhouse-saison-brewer'] > 0, 'solid or excellent saison should increase farmhouse/saison identity score');

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
assert.ok(state.customerMemory.samira.notes.some((note) => /Friends and family|happy|excited|noticed|trust/i.test(note)), 'Samira/customer memory should record the first sale reaction');
const samiraPromises = state.customerPromises.filter((promise) => promise.customerId === 'samira' && promise.requestedCases === 4 && promise.deadlineDay === 42);
assert.equal(samiraPromises.length, 1, 'selling Samira cases should update the existing promise instead of duplicating it');
assert.equal(samiraPromises[0].deliveredCases, 4, 'Samira promise ledger should track delivered cases');
assert.equal(samiraPromises[0].status, 'fulfilled', 'Samira promise should be fulfilled after delivery');
assert.equal(state.campaign.missionId, 'empty-shelf', 'selling the first four cases should advance to the restock storyline mission');
assert.match(campaignNextStep(state), /4\.7 kg Pilsner malt[\s\S]*0\.3 kg Aromatic malt[\s\S]*0\.5 kg Light candi sugar[\s\S]*50 g Styrian hops[\s\S]*1 belgian ale yeast pack[\s\S]*Need 48 bottles[\s\S]*Order 4 x 12 bottle packs/i, 'post-sale campaign guidance should teach exact restock quantities before upgrades');
assert.ok(['Sell', 'Mash'].includes(currentWorkflowStage(state).stage), 'flow should either keep selling remaining cases or return to brewing after stock sells out');
assert.ok(state.cash > 140, 'selling cases should increase cash');
assert.ok(state.visibilityRisk > 0, 'garage sales should increase visibility risk');
assert.equal(firstLoopObjective(state), 'Tap the pallet to sell Garage Blonde.', 'remaining cases should keep the garage-floor objective on the pallet');
state = reduceGame(state, { type: 'sell-channel', channelId: 'friends-family', cases: state.inventory.cases });
assert.equal(state.campaign.missionId, 'empty-shelf', 'clearing leftover beer should not skip the restock lesson');
assert.match(demandProgress(state), /4\/4 cases/, 'completed demand progress should not display overfilled counts');
assert.ok(state.breweryHistory.some((entry) => /reacted|fulfilled|Garage Blonde/i.test(`${entry.title} ${entry.detail}`)), 'sales should write brewery history entries');

let lockedPromise = createInitialState();
lockedPromise = reduceGame(lockedPromise, { type: 'end-day' });
assert.equal(lockedPromise.demand.accountName, "Samira's barbecue", 'locked customer promises should persist across day rollover');
assert.equal(lockedPromise.demand.casesRequested, 4, 'ambient daily demand should not inflate a locked named promise');
assert.match(demandProgress(lockedPromise), /by Jun 26/, 'named promises should expose their deadline in demand progress');
let missedPromise = createInitialState();
for (let day = 0; day < 43; day += 1) missedPromise = reduceGame(missedPromise, { type: 'end-day' });
assert.equal(missedPromise.demand.missedPromise, true, 'named promises should mark missed after their deadline passes');
assert.equal(missedPromise.customerPromises.find((promise) => promise.customerId === 'samira')?.status, 'missed', 'promise ledger should mark missed promises');
assert.ok(missedPromise.customerMemory.samira.trust < createInitialState().customerMemory.samira.trust, 'missed promise should damage customer trust');
assert.ok(missedPromise.customerMemory.samira.notes.some((note) => /deadline was missed/i.test(note)), 'late Samira promises should record a distinct missed-deadline reaction');

let sanitationState = createInitialState();
const startingPackagingDebt = sanitationState.sanitationDebt.packaging;
sanitationState = reduceGame(sanitationState, { type: 'start-batch', recipeId: 'garage-blonde' });
assert.ok(sanitationState.sanitationDebt.brewhouse > createInitialState().sanitationDebt.brewhouse, 'brewday should add brewhouse sanitation debt');
sanitationState = tickUntilStep(sanitationState, 'awaiting-packaging');
sanitationState = reduceGame(sanitationState, { type: 'start-packaging', batchId: sanitationState.batches[0].id, packagingMode: 'rush' });
assert.ok(sanitationState.sanitationDebt.packaging > startingPackagingDebt, 'packaging should add packaging sanitation debt');
const packagingDebtBeforeClean = sanitationState.sanitationDebt.packaging;
sanitationState = reduceGame(sanitationState, { type: 'wait-until-ready', batchId: sanitationState.batches[0].id });
sanitationState = reduceGame(sanitationState, { type: 'wait-until-ready', batchId: sanitationState.batches[0].id });
sanitationState = reduceGame(sanitationState, { type: 'clean-equipment', equipmentId: 'bottler' });
assert.ok(sanitationState.sanitationDebt.packaging < packagingDebtBeforeClean, 'cleaning bottler should reduce packaging sanitation debt');

let recoveryState = createInitialState();
recoveryState.finishedBeerLots = [
  {
    id: 'risky-lot',
    sourceBatchId: 'risky-batch',
    recipeId: 'garage-blonde',
    recipeName: 'Garage Blonde',
    cases: 4,
    volumeLiters: 20,
    quality: 42,
    marketAppeal: 1,
    packagingState: 'packaged',
    saleState: 'available',
    verdict: {
      qualityBand: 'flawed',
      headline: 'Unstable package. FG confidence was low before bottling.',
      sensoryNotes: ['Young and unstable.'],
      likelyCauses: ['Packaged before stable gravity.'],
      sellAdvice: 'hold',
      stabilityRisk: 55,
      presentationScore: 62,
      legacyTags: []
    }
  }
];
recoveryState.inventory.cases = 4;
recoveryState = reduceGame(recoveryState, { type: 'recovery-action', actionId: 'hold-risky-lot' });
assert.ok(recoveryState.finishedBeerLots[0].verdict.stabilityRisk < 55, 'holding a risky lot should reduce stability risk');
recoveryState = reduceGame(recoveryState, { type: 'recovery-action', actionId: 'dump-risky-lot' });
assert.equal(recoveryState.inventory.cases, 0, 'dumping a risky lot should remove cases from inventory');
assert.ok(recoveryState.breweryHistory.some((entry) => /dumped|held/i.test(`${entry.title} ${entry.detail}`)), 'recovery actions should write brewery history');

let discountRecovery = createInitialState();
discountRecovery.finishedBeerLots = [
  {
    id: 'discount-lot',
    sourceBatchId: 'discount-batch',
    recipeId: 'garage-blonde',
    recipeName: 'Garage Blonde',
    cases: 3,
    volumeLiters: 12,
    quality: 55,
    marketAppeal: 1,
    packagingState: 'packaged',
    saleState: 'available',
    verdict: {
      qualityBand: 'flawed',
      headline: 'Garage Blonde is sellable with a warning.',
      sensoryNotes: ['A little young.'],
      likelyCauses: ['Rushed cleanup.'],
      sellAdvice: 'discount',
      stabilityRisk: 24,
      presentationScore: 64,
      legacyTags: []
    }
  }
];
discountRecovery.inventory.cases = 3;
const discountCashBefore = discountRecovery.cash;
discountRecovery = reduceGame(discountRecovery, { type: 'recovery-action', actionId: 'discount-risky-lot' });
assert.equal(discountRecovery.inventory.cases, 0, 'discounting a flawed lot should clear cases from inventory');
assert.ok(discountRecovery.cash > discountCashBefore, 'discounting a flawed lot should recover some cash');
assert.ok(discountRecovery.breweryHistory.some((entry) => /discounted/i.test(`${entry.title} ${entry.detail}`)), 'discount recovery should write brewery history');

let recallRecovery = createInitialState();
recallRecovery.cash = 120;
recallRecovery.finishedBeerLots = [
  {
    id: 'unsafe-lot',
    sourceBatchId: 'unsafe-batch',
    recipeId: 'garage-blonde',
    recipeName: 'Garage Blonde',
    cases: 4,
    volumeLiters: 16,
    quality: 25,
    marketAppeal: 1,
    packagingState: 'packaged',
    saleState: 'available',
    verdict: {
      qualityBand: 'unsafe',
      headline: 'Do not sell. Package stability risk is severe.',
      sensoryNotes: ['Gushing risk.'],
      likelyCauses: ['Unstable package.'],
      sellAdvice: 'recall',
      stabilityRisk: 82,
      presentationScore: 48,
      legacyTags: []
    }
  }
];
recallRecovery.inventory.cases = 4;
const recallCashBefore = recallRecovery.cash;
recallRecovery = reduceGame(recallRecovery, { type: 'recovery-action', actionId: 'recall-risky-lot' });
assert.equal(recallRecovery.inventory.cases, 0, 'recalling an unsafe lot should remove cases from inventory');
assert.ok(recallRecovery.cash < recallCashBefore, 'recalling an unsafe lot should cost cash');
assert.ok(recallRecovery.customerMemory.samira.notes.some((note) => /recalled/i.test(note)), 'recalling should record trust-protecting customer memory');
assert.ok(recallRecovery.breweryHistory.some((entry) => /recalled/i.test(`${entry.title} ${entry.detail}`)), 'recall recovery should write brewery history');

let targetedRecovery = createInitialState();
targetedRecovery.finishedBeerLots = [
  {
    id: 'unsafe-target-a',
    sourceBatchId: 'unsafe-target-batch',
    recipeId: 'garage-blonde',
    recipeName: 'Garage Blonde',
    cases: 4,
    volumeLiters: 16,
    quality: 28,
    marketAppeal: 1,
    packagingState: 'packaged',
    saleState: 'available',
    verdict: {
      qualityBand: 'unsafe',
      headline: 'Do not sell. Package stability risk is severe.',
      sensoryNotes: ['Package pressure.'],
      likelyCauses: ['Refermentation risk.'],
      sellAdvice: 'recall',
      stabilityRisk: 88,
      presentationScore: 40,
      legacyTags: []
    }
  },
  {
    id: 'flawed-target-b',
    sourceBatchId: 'flawed-target-batch',
    recipeId: 'garage-blonde',
    recipeName: 'Garage Blonde',
    cases: 2,
    volumeLiters: 8,
    quality: 58,
    marketAppeal: 1,
    packagingState: 'packaged',
    saleState: 'available',
    verdict: {
      qualityBand: 'flawed',
      headline: 'Garage Blonde is sellable with a warning.',
      sensoryNotes: ['A little rough.'],
      likelyCauses: ['Released young.'],
      sellAdvice: 'discount',
      stabilityRisk: 22,
      presentationScore: 61,
      legacyTags: []
    }
  }
];
targetedRecovery.inventory.cases = 6;
targetedRecovery = reduceGame(targetedRecovery, { type: 'recovery-action', actionId: 'discount-risky-lot', lotId: 'flawed-target-b' });
assert.ok(targetedRecovery.finishedBeerLots.some((lot) => lot.id === 'unsafe-target-a'), 'targeted discount should not affect the higher-risk recalled lot');
assert.equal(targetedRecovery.finishedBeerLots.some((lot) => lot.id === 'flawed-target-b'), false, 'targeted discount should clear the selected flawed lot');
assert.equal(targetedRecovery.inventory.cases, 4, 'targeted discount should remove only selected lot cases');

let blockedNormalSale = createInitialState();
blockedNormalSale.finishedBeerLots = [recallRecovery.finishedBeerLots[0] ?? {
  id: 'blocked-unsafe-lot',
  sourceBatchId: 'blocked-unsafe-batch',
  recipeId: 'garage-blonde',
  recipeName: 'Garage Blonde',
  cases: 4,
  volumeLiters: 16,
  quality: 25,
  marketAppeal: 1,
  packagingState: 'packaged',
  saleState: 'available',
  verdict: {
    qualityBand: 'unsafe',
    headline: 'Do not sell. Package stability risk is severe.',
    sensoryNotes: ['Gushing risk.'],
    likelyCauses: ['Unstable package.'],
    sellAdvice: 'recall',
    stabilityRisk: 82,
    presentationScore: 48,
    legacyTags: []
  }
}];
blockedNormalSale.inventory.cases = 4;
const blockedCashBefore = blockedNormalSale.cash;
blockedNormalSale = reduceGame(blockedNormalSale, { type: 'sell-channel', channelId: 'friends-family', cases: 4 });
assert.equal(blockedNormalSale.inventory.cases, 4, 'normal sale should not move recall-advice beer');
assert.equal(blockedNormalSale.cash, blockedCashBefore, 'normal sale should not pay for recall-advice beer');
assert.equal(blockedNormalSale.demand.casesSold, 0, 'normal sale should not count recall-advice beer toward promises');
assert.match(eventMessages(blockedNormalSale), /recovery action before selling/i, 'blocked normal sale should explain the required recovery action');
assert.ok(blockedNormalSale.customerMemory.samira.notes.some((note) => /not served unsafe beer/i.test(note)), 'unsafe Samira beer should create a distinct safety-blocked reaction');

let excellentSamiraSale = stateWithFinishedLot(makeFinishedLot({ id: 'samira-excellent-lot', qualityBand: 'excellent' }));
const excellentTrustBefore = excellentSamiraSale.customerMemory.samira.trust;
excellentSamiraSale = reduceGame(excellentSamiraSale, { type: 'sell-channel', channelId: 'friends-family', cases: 4 });
assert.ok(excellentSamiraSale.customerMemory.samira.trust > excellentTrustBefore, 'excellent Samira beer should raise trust');
assert.ok(excellentSamiraSale.customerMemory.samira.notes.some((note) => /excited: Garage Blonde landed clean and memorable/i.test(note)), 'excellent Samira beer should record an excited reaction');

let flagshipRepeat = createInitialState();
flagshipRepeat.flagshipRecipeIds = ['garage-blonde'];
flagshipRepeat.demand = {
  accountName: 'Friends and family',
  channelId: 'friends-family',
  channelName: 'Friends and family',
  casesRequested: 4,
  casesSold: 0,
  reputationReward: 1,
  invoiceRequired: false,
  formalOrder: false
};
flagshipRepeat = reduceGame(flagshipRepeat, { type: 'end-day' });
assert.equal(flagshipRepeat.demand.flagshipRequest, true, 'a flagship beer should generate a named repeat request on the next open demand day');
assert.equal(flagshipRepeat.demand.requestedRecipeId, 'garage-blonde', 'flagship repeat demand should ask for the flagship recipe by id');
assert.match(flagshipRepeat.demand.accountName, /Garage Blonde/, 'flagship repeat demand should name the beer customers remember');
assert.ok(flagshipRepeat.customerPromises.some((promise) => promise.preferredStyles.includes('Garage Blonde')), 'flagship repeat demand should enter the promise ledger with the beer name');
const wrongFlagshipLot = {
  ...makeFinishedLot({ id: 'wrong-flagship-lot', qualityBand: 'excellent' }),
  recipeId: 'backyard-ipa',
  recipeName: 'Backyard IPA'
};
flagshipRepeat.finishedBeerLots = [wrongFlagshipLot];
flagshipRepeat.inventory.cases = 4;
const flagshipCashBeforeWrongSale = flagshipRepeat.cash;
flagshipRepeat = reduceGame(flagshipRepeat, { type: 'sell-channel', channelId: 'friends-family', cases: 4 });
assert.equal(flagshipRepeat.inventory.cases, 4, 'substitute beer should not move inventory for a named flagship request');
assert.equal(flagshipRepeat.cash, flagshipCashBeforeWrongSale, 'substitute beer should not pay cash for a named flagship request');
assert.equal(flagshipRepeat.demand.casesSold, 0, 'substitute beer should not count toward a named flagship request');
assert.match(eventMessages(flagshipRepeat), /asked for Garage Blonde, not a substitute batch/i, 'substitute rejection should explain the named flagship request');
flagshipRepeat.finishedBeerLots = [makeFinishedLot({ id: 'right-flagship-lot', qualityBand: 'solid', quality: 76 })];
flagshipRepeat.inventory.cases = 4;
const flagshipCashBeforeRightSale = flagshipRepeat.cash;
flagshipRepeat = reduceGame(flagshipRepeat, { type: 'sell-channel', channelId: 'friends-family', cases: 4 });
assert.equal(flagshipRepeat.demand.casesSold, 4, 'requested flagship beer should satisfy the named repeat request');
assert.ok(flagshipRepeat.cash > flagshipCashBeforeRightSale, 'requested flagship sale should pay normally');

let substitutedFlagship = createInitialState();
substitutedFlagship.demand = {
  accountName: 'Samira asks for Garage Blonde again',
  channelId: 'friends-family',
  channelName: 'Friends and family',
  customerId: 'samira',
  casesRequested: 4,
  casesSold: 0,
  reputationReward: 2,
  invoiceRequired: false,
  formalOrder: false,
  deadlineDay: substitutedFlagship.day + 12,
  minimumQualityBand: 'solid',
  packagingExpectation: 'any',
  promiseLocked: true,
  requestedRecipeId: 'garage-blonde',
  requestedRecipeName: 'Garage Blonde',
  flagshipRequest: true
};
substitutedFlagship.finishedBeerLots = [
  {
    ...makeFinishedLot({ id: 'substituted-flagship-lot', qualityBand: 'solid', quality: 76 }),
    verdict: {
      ...makeFinishedLot({ id: 'substituted-flagship-lot', qualityBand: 'solid', quality: 76 }).verdict,
      likelyCauses: ['Supplier substitution: Styrian hops replaced Saaz hops.']
    }
  }
];
substitutedFlagship.inventory.cases = 4;
const substitutedFlagshipCashBefore = substitutedFlagship.cash;
substitutedFlagship = reduceGame(substitutedFlagship, { type: 'sell-channel', channelId: 'friends-family', cases: 4 });
assert.equal(substitutedFlagship.inventory.cases, 4, 'substituted flagship repeat should not move inventory');
assert.equal(substitutedFlagship.cash, substitutedFlagshipCashBefore, 'substituted flagship repeat should not pay cash');
assert.match(eventMessages(substitutedFlagship), /rejects the substituted batch/i, 'substituted flagship repeat should explain why the named beer did not count');

let competitionState = stateWithFinishedLot(makeFinishedLot({ id: 'competition-gold-lot', qualityBand: 'excellent' }));
const competitionCashBefore = competitionState.cash;
const competitionReputationBefore = competitionState.reputation;
competitionState = reduceGame(competitionState, { type: 'competition-entry', lotId: 'competition-gold-lot' });
assert.equal(competitionState.inventory.cases, 3, 'competition entry should consume one case as samples');
assert.equal(competitionState.cash, competitionCashBefore - 25, 'competition entry should charge the judging fee');
assert.ok(competitionState.reputation > competitionReputationBefore, 'award-worthy competition beer should increase reputation');
assert.ok(competitionState.awards.some((award) => /Local judges/.test(award.title)), 'award-worthy competition beer should create a judges award');
assert.ok(competitionState.breweryHistory.some((entry) => /won Local judges/.test(`${entry.title} ${entry.detail}`)), 'competition awards should write brewery history');

let competitionFeedback = stateWithFinishedLot(makeFinishedLot({
  id: 'competition-feedback-lot',
  qualityBand: 'flawed',
  sellAdvice: 'discount',
  quality: 50,
  stabilityRisk: 30,
  presentationScore: 55,
  sensoryNote: 'Oxidized edge and green finish.'
}));
competitionFeedback = reduceGame(competitionFeedback, { type: 'competition-entry', lotId: 'competition-feedback-lot' });
assert.equal(competitionFeedback.awards.length, 0, 'flawed competition beer should not create an award');
assert.ok(competitionFeedback.breweryHistory.some((entry) => /judging feedback/.test(`${entry.title} ${entry.detail}`)), 'flawed competition beer should create judge feedback history');

let competitionBlocked = stateWithFinishedLot(makeFinishedLot({ id: 'competition-unsafe-lot', qualityBand: 'unsafe', sellAdvice: 'recall', quality: 24, stabilityRisk: 86 }));
const competitionBlockedCashBefore = competitionBlocked.cash;
competitionBlocked = reduceGame(competitionBlocked, { type: 'competition-entry', lotId: 'competition-unsafe-lot' });
assert.equal(competitionBlocked.inventory.cases, 4, 'unsafe competition beer should not consume samples');
assert.equal(competitionBlocked.cash, competitionBlockedCashBefore, 'unsafe competition beer should not pay entry fees');
assert.match(eventMessages(competitionBlocked), /not competition-safe/i, 'unsafe competition beer should explain the public-showing blocker');

let flawedSamiraSale = stateWithFinishedLot(makeFinishedLot({
  id: 'samira-flawed-lot',
  qualityBand: 'flawed',
  sellAdvice: 'discount',
  quality: 58,
  stabilityRisk: 26,
  presentationScore: 64,
  sensoryNote: 'Green apple note and rough carbonation.'
}));
const flawedTrustBefore = flawedSamiraSale.customerMemory.samira.trust;
flawedSamiraSale = reduceGame(flawedSamiraSale, { type: 'sell-channel', channelId: 'friends-family', cases: 4 });
assert.ok(flawedSamiraSale.customerMemory.samira.trust < flawedTrustBefore, 'flawed Samira beer should reduce trust');
assert.ok(flawedSamiraSale.customerMemory.samira.notes.some((note) => /noticed the flaw: Green apple note/i.test(note)), 'flawed Samira beer should record a distinct sensory complaint');

const firstNinetyStoryText = [
  ...excellentSamiraSale.customerMemory.samira.notes,
  ...excellentSamiraSale.breweryHistory.map((entry) => `${entry.title} ${entry.detail}`),
  eventMessages(excellentSamiraSale)
].join('\n');
assert.match(firstNinetyStoryText, /Samira|Friends and family|Garage Blonde landed clean/i, 'first 90 minutes should produce a human-readable Samira success story');
const firstNinetyTradeoffText = await Promise.all([
  readFile(new URL('../src/ui/stationPanel.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/ui/overlays.ts', import.meta.url), 'utf8')
]).then((parts) => parts.join('\n'));
assert.match(firstNinetyTradeoffText, /Package early[\s\S]*Save time, keep the risk/i, 'first 90 minutes should expose package-early as an explicit time-vs-risk tradeoff');
assert.match(firstNinetyTradeoffText, /Careful transfer[\s\S]*Rough transfer/i, 'first 90 minutes should expose careful-vs-rough transfer as an explicit effort-vs-aroma tradeoff');
assert.match(firstNinetyTradeoffText, /Package carefully[\s\S]*Rush packaging/i, 'first 90 minutes should expose careful-vs-rushed packaging as an explicit quality-vs-speed tradeoff');
assert.match(firstNinetyTradeoffText, /Release now[\s\S]*Condition longer/i, 'first 90 minutes should expose young-release-vs-conditioning as an explicit deadline-vs-quality tradeoff');

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
let nicoState = createInitialState();
nicoState.cash = 100;
nicoState.campaign = { missionId: 'bucket-empire', completedMissionIds: ['barbecue-text', 'empty-shelf'], seenMissionIds: [] };
nicoState = reduceGame(nicoState, { type: 'buy-equipment', equipmentItemId: 'plastic-bucket' });
assert.equal(nicoState.campaign.missionId, 'uncle-nico-wedding', 'buying the second fermenter should unlock Uncle Nico as the first bigger promise');
assert.equal(nicoState.demand.customerId, 'nico', 'Uncle Nico promise should be tied to Nico customer memory');
assert.equal(nicoState.demand.promiseLocked, true, 'Uncle Nico order should persist as a locked promise');
assert.equal(nicoState.demand.minimumQualityBand, 'solid', 'Uncle Nico order should require at least solid beer');
assert.ok((nicoState.demand.deadlineDay ?? 0) > nicoState.day, 'Uncle Nico order should have a deadline');
const nicoPromise = nicoState.customerPromises.find((promise) => promise.customerId === 'nico');
assert.ok(nicoPromise, 'Uncle Nico order should be added to the promise ledger');
assert.equal(nicoPromise.requestedCases, 10, 'Nico promise should request 10 cases');
assert.equal(nicoPromise.minimumQualityBand, 'solid', 'Nico promise should require solid beer');
assert.equal(nicoPromise.packagingExpectation, 'presentable', 'Nico promise should require presentable packaging');
assert.equal(nicoPromise.status, 'open', 'Nico promise should start open');

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
assert.equal(campaignState.campaign.missionId, 'first-festival', 'private event sale should unlock the festival tutorial mission');
assert.equal(campaignState.demand.customerId, 'festival', 'festival mission should create a festival promise');
assert.equal(campaignState.awards.length, 0, 'the setup private event should not create the festival award before the festival mission');
const eventSupplierBeforeFestival = campaignState.identityScores['event-supplier'];
campaignState.inventory.cases = 8;
campaignState.finishedBeerLots = [
  {
    id: 'campaign-flawed-festival-lot',
    sourceBatchId: 'campaign-flawed-festival-batch',
    recipeId: 'garage-blonde',
    recipeName: 'Garage Blonde',
    cases: 8,
    volumeLiters: 32,
    quality: 50,
    marketAppeal: 1,
    packagingState: 'packaged',
    saleState: 'available'
  }
];
const rejectedFestivalCashBefore = campaignState.cash;
const rejectedFestivalInventoryBefore = campaignState.inventory.cases;
campaignState = reduceGame(campaignState, { type: 'sell-channel', channelId: 'private-event', cases: 8 });
assert.equal(campaignState.campaign.missionId, 'first-festival', 'flawed festival beer should not advance the festival promise');
assert.equal(campaignState.demand.casesSold, 0, 'rejected festival beer should not count toward the locked promise');
assert.equal(campaignState.cash, rejectedFestivalCashBefore, 'rejected festival beer should not pay cash before the buyer accepts it');
assert.equal(campaignState.inventory.cases, rejectedFestivalInventoryBefore, 'rejected festival beer should stay in inventory');
campaignState.inventory.cases = 8;
campaignState.finishedBeerLots = [
  {
    id: 'campaign-festival-lot',
    sourceBatchId: 'campaign-festival-batch',
    recipeId: 'garage-blonde',
    recipeName: 'Garage Blonde',
    cases: 8,
    volumeLiters: 32,
    quality: 84,
    marketAppeal: 1,
    packagingState: 'packaged',
    saleState: 'available'
  }
];
campaignState = reduceGame(campaignState, { type: 'sell-channel', channelId: 'private-event', cases: 8 });
assert.equal(campaignState.campaign.missionId, 'first-bar-account', 'festival sale should unlock the bar-account tutorial mission');
assert.equal(campaignState.demand.channelId, 'local-bar', 'bar-account mission should create a local bar demand');
assert.ok(campaignState.awards.some((award) => award.title === 'Festival table buzz'), 'successful festival beer should create an award record');
assert.ok(campaignState.identityScores['event-supplier'] > eventSupplierBeforeFestival, 'successful festival beer should increase event-supplier identity score');
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
    saleState: 'available',
    verdict: {
      qualityBand: 'excellent',
      headline: 'Garage Blonde landed clean and memorable.',
      sensoryNotes: ['Clean enough to represent the brewery.', 'Bottles look intentional instead of garage-random.'],
      likelyCauses: ['Good process discipline across brewday, fermentation and packaging.'],
      sellAdvice: 'sell',
      stabilityRisk: 8,
      presentationScore: 84,
      legacyTags: ['flagship candidate']
    }
  }
];
campaignState = reduceGame(campaignState, { type: 'sell-channel', channelId: 'local-bar', cases: 12 });
assert.equal(campaignState.campaign.missionId, 'household-summit', 'first bar sale should unlock the household-pressure tutorial mission');
campaignState = reduceGame(campaignState, { type: 'crisis-action', actionId: 'pause-public-sales' });
assert.equal(campaignState.campaign.missionId, 'sandbox-unlocked', 'household-pressure action should unlock the normal sandbox');

let promiseBoardState = createInitialState();
promiseBoardState.campaign = { missionId: 'sandbox-unlocked', completedMissionIds: campaignMissionOrder.filter((missionId) => missionId !== 'sandbox-unlocked'), seenMissionIds: [] };
promiseBoardState.demand = {
  accountName: 'Friends and family',
  channelId: 'friends-family',
  channelName: 'Friends and family',
  casesRequested: 4,
  casesSold: 0,
  reputationReward: 1,
  invoiceRequired: false,
  formalOrder: false
};
promiseBoardState = reduceGame(promiseBoardState, { type: 'choose-promise', promiseId: 'mira-regular-tap' });
assert.equal(promiseBoardState.demand.accountName, 'Mira regular tap', 'open promise board should create a named post-sandbox promise');
assert.equal(promiseBoardState.demand.promiseLocked, true, 'chosen identity promises should stay locked across days');
assert.equal(promiseBoardState.demand.minimumQualityBand, 'solid', 'Mira regular tap should require solid beer');
assert.equal(promiseBoardState.demand.packagingExpectation, 'clean-label', 'Mira regular tap should require clean-label packaging');
assert.ok(promiseBoardState.customerPromises.some((promise) => promise.customerId === 'mira' && promise.status === 'open'), 'chosen promise should enter the promise ledger');
assert.ok(promiseBoardState.identityScores['local-pub-workhorse'] > 0, 'choosing a regular tap should push local-pub identity');
const blockedSecondPromise = reduceGame(promiseBoardState, { type: 'choose-promise', promiseId: 'festival-saison-slot' });
assert.equal(blockedSecondPromise.demand.accountName, 'Mira regular tap', 'open promise board should block stacking named promises');
assert.match(eventMessages(blockedSecondPromise), /still open/i, 'blocked promise choice should explain the active promise');

let restaurantPromiseState = createInitialState();
restaurantPromiseState.campaign = { missionId: 'sandbox-unlocked', completedMissionIds: [], seenMissionIds: [] };
restaurantPromiseState.demand = {
  accountName: 'Friends and family',
  channelId: 'friends-family',
  channelName: 'Friends and family',
  casesRequested: 4,
  casesSold: 0,
  reputationReward: 1,
  invoiceRequired: false,
  formalOrder: false
};
restaurantPromiseState = reduceGame(restaurantPromiseState, { type: 'choose-promise', promiseId: 'restaurant-clean-lager' });
assert.notEqual(restaurantPromiseState.demand.accountName, 'Restaurant clean lager trial', 'restaurant promise should be blocked before paperwork');
assert.match(eventMessages(restaurantPromiseState), /invoice and traceability/i, 'restaurant promise block should explain paperwork');
restaurantPromiseState.cash = 400;
restaurantPromiseState = reduceGame(restaurantPromiseState, { type: 'crisis-action', actionId: 'paperwork-prep' });
restaurantPromiseState = reduceGame(restaurantPromiseState, { type: 'choose-promise', promiseId: 'restaurant-clean-lager' });
assert.equal(restaurantPromiseState.demand.accountName, 'Restaurant clean lager trial', 'paperwork should unlock restaurant clean lager promise');
assert.equal(restaurantPromiseState.demand.minimumQualityBand, 'excellent', 'restaurant clean lager should demand excellent quality');

let regionalPromiseState = createInitialState();
regionalPromiseState.campaign = { missionId: 'sandbox-unlocked', completedMissionIds: [], seenMissionIds: [] };
regionalPromiseState.demand = {
  accountName: 'Friends and family',
  channelId: 'friends-family',
  channelName: 'Friends and family',
  casesRequested: 4,
  casesSold: 0,
  reputationReward: 1,
  invoiceRequired: false,
  formalOrder: false
};
regionalPromiseState.canInvoice = true;
regionalPromiseState.breweryTier = 'nano';
regionalPromiseState = reduceGame(regionalPromiseState, { type: 'choose-promise', promiseId: 'regional-consistency-contract' });
assert.notEqual(regionalPromiseState.demand.accountName, 'Regional consistency contract', 'regional contract should require craft tier');
regionalPromiseState.breweryTier = 'craft';
regionalPromiseState = reduceGame(regionalPromiseState, { type: 'choose-promise', promiseId: 'regional-consistency-contract' });
assert.equal(regionalPromiseState.demand.accountName, 'Regional consistency contract', 'craft tier plus paperwork should unlock regional consistency contract');
assert.equal(regionalPromiseState.demand.casesRequested, 24, 'regional consistency contract should create a larger production responsibility');

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
assert.match(eventMessages(dirtyBottler), /Packaging standard lost \d+ cases? \(12 . 33 cl bottles\)/, 'dirty packaging should produce a plain-language warning with the case definition');
assert.ok(dirtyBottler.finishedBeerLots[0].verdict.stabilityRisk > 0, 'dirty packaging should feed into batch stability verdicts');

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
assert.match(`${stationPanelSource}\n${overlaysSource}`, /data-recovery-lot-id/, 'recovery buttons should target the selected finished lot');
assert.match(`${stationPanelSource}\n${overlaysSource}`, /discount-risky-lot/, 'UI should expose explicit discount recovery');
assert.match(`${stationPanelSource}\n${overlaysSource}`, /recall-risky-lot/, 'UI should expose explicit recall recovery');
assert.match(inputHandlersSource, /recoveryLotId/, 'input routing should pass the target lot into recovery actions');
assert.match(storyPanelsSource, /Promise board/, 'mission notebook should expose the post-sandbox promise board');
assert.match(storyPanelsSource, /data-action=\"choose-promise\"/, 'promise board should render choose-promise actions');
assert.match(inputHandlersSource, /choose-promise/, 'input routing should dispatch chosen brewery promises');
assert.match(recipePanelSource, /data-allow-substitutions=\"true\"/, 'recipe panel should expose substitution brewing when viable');
assert.match(inputHandlersSource, /allowSubstitutions/, 'input routing should dispatch substitution brewing intent');
assert.match(`${stationPanelSource}\n${overlaysSource}`, /competition-entry/, 'finished-lot UI should expose competition judging');
assert.match(inputHandlersSource, /competition-entry/, 'input routing should dispatch competition judging');

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
