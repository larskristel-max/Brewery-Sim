import type { Batch, EquipmentId, GameState, Recipe } from '../game/schema.js';
import { getRecipe } from '../data/recipes.js';
import { campaignAllowsCleaning, campaignAllowsFormalBuyers, campaignAllowsTemperature, campaignVisibleSalesChannels } from '../game/campaign.js';
import {
  caseCountLabel,
  caseDefinitionExplanation,
  cleaningPlanForEquipment,
  formatClock,
  formatCurrency,
  formatGameDate,
  recipeCanStart,
  recipeCategories,
  recipeIngredientCost,
  saleConsequencePreview,
  saleCasesForChannel,
  salesChannels,
  saleValueForChannel,
  visibleRecipes
} from '../game/selectors.js';
import { renderBrewDayNotes, renderBrewExplainer } from './brewNotes.js';
import { garageSceneEquipmentInstances } from './sceneEquipment.js';
import type { GarageSceneEquipmentInstance, SceneTarget } from './types.js';

export type EquipmentStatus = {
  label: string;
  detail: string;
  toneClass: string;
};

export type StationPanelContext = {
  state: GameState;
  recipePanelOpen: boolean;
  selectedRecipeCategoryId: string | null;
  expandedTarget: SceneTarget | null;
  expandedEquipmentInstanceId: string | null;
  renderRecipeSelectionPanel: () => string;
  recipeStartBlocker: (recipe: Recipe) => string;
  fermenterTemperatureHint: () => string;
  equipmentInstanceStatus: (equipment: GarageSceneEquipmentInstance) => EquipmentStatus;
  batchForEquipmentInstance: (equipment: GarageSceneEquipmentInstance) => Batch | undefined;
  batchRemainingLabel: (batch: Batch) => string;
  stepLabel: (step: string) => string;
};

const salesOfferModels = (state: GameState) =>
  [
    { id: 'friends-family' as const, risk: 'Very low visibility', invoice: 'No invoice' },
    { id: 'private-event' as const, risk: 'Medium visibility', invoice: 'Informal receipt' },
    { id: 'local-bar' as const, risk: 'High formal risk', invoice: state.canInvoice ? 'Invoice ready' : 'May ask for invoice' }
  ].filter((offer) => campaignVisibleSalesChannels(state).includes(offer.id));

const finishedBeerCostBasis = (state: GameState, cases: number): number => {
  const totalCases = state.finishedBeerLots.reduce((total, lot) => total + lot.cases, 0);
  if (totalCases <= 0 || cases <= 0) return 0;
  const ingredientCost = state.finishedBeerLots.reduce((total, lot) => total + recipeIngredientCost(getRecipe(lot.recipeId)), 0);
  return Math.round((ingredientCost / totalCases) * cases);
};

const renderSaleConsequencePreview = (state: GameState, channelId: ReturnType<typeof salesOfferModels>[number]['id'], cases: number): string => {
  if (cases <= 0) return 'No sellable cases';
  const preview = saleConsequencePreview(state, channelId, cases);
  const riskRelevant = campaignAllowsFormalBuyers(state) || state.visibilityRisk > 0 || state.complianceRisk > 0 || state.householdPressure > 0 || preview.complianceDelta > 0;
  const simple = `Cash +${formatCurrency(preview.cashDelta)} - Rep +${preview.reputationDelta}`;
  if (!riskRelevant) return simple;
  return `${simple} - Visibility +${preview.visibilityDelta} - Compliance +${preview.complianceDelta} - Household +${preview.householdPressureDelta}`;
};

export const renderSalesOffers = (state: GameState) => `
  <div class="hotspot-actions sales-offers">
    ${salesOfferModels(state)
      .map((offer) => {
        const channel = salesChannels[offer.id];
        const cases = saleCasesForChannel(state, offer.id);
        const payout = saleValueForChannel(state, offer.id);
        const costBasis = finishedBeerCostBasis(state, cases);
        const margin = payout - costBasis;
        const consequencePreview = renderSaleConsequencePreview(state, offer.id, cases);
        const invoiceBlocked = (state.demand.invoiceRequired || (channel.formal && state.visibilityRisk >= channel.invoiceAfter)) && !state.canInvoice;
        const disabled = cases <= 0 || invoiceBlocked;
        return `<button data-action="sell-channel" data-channel-id="${offer.id}" data-cases="${cases}" type="button" ${disabled ? 'disabled' : ''}>
          ${channel.name}<small>${caseCountLabel(cases)} - payout ${formatCurrency(payout)} - ingredients about ${formatCurrency(costBasis)} - margin about ${formatCurrency(margin)} - preview: ${invoiceBlocked ? 'Invoice blocked' : consequencePreview} - ${offer.invoice}</small>
        </button>`;
      })
      .join('')}
    <div class="temperature-note"><strong>Case size</strong><span>${caseDefinitionExplanation}</span></div>
  </div>
`;

export const renderEquipmentActions = (context: StationPanelContext, equipmentId: EquipmentId, instance?: GarageSceneEquipmentInstance) => {
  const { state } = context;
  const cleanPlan = cleaningPlanForEquipment(state, equipmentId);
  const hasBeerInStation =
    equipmentId === 'kettle'
      ? state.batches.some((batch) => batch.step === 'brewing' || batch.step === 'awaiting-transfer')
      : equipmentId === 'fermenter'
        ? state.batches.some((batch) => batch.fermenterInstanceId === instance?.instanceId && (batch.step === 'fermenting' || batch.step === 'awaiting-packaging'))
        : equipmentId === 'bottler'
          ? state.batches.some((batch) => batch.step === 'packaging' || batch.step === 'bottle-conditioning')
          : false;
  const canClean = state.cash >= cleanPlan.cost && !hasBeerInStation;
  const cleanDisabledReason = hasBeerInStation ? 'Beer inside' : `Need ${formatCurrency(cleanPlan.cost)}`;
  const cleanButton = campaignAllowsCleaning(state)
    ? `<button data-action="clean-equipment" data-equipment-id="${equipmentId}" type="button" ${canClean ? '' : `disabled title="${cleanDisabledReason}"`}>Clean & sanitize<small>${canClean ? cleanPlan.duration : hasBeerInStation ? 'Beer inside' : 'Need cash'}</small></button>`
    : '';
  const temperatureButtons = campaignAllowsTemperature(state)
    ? `
          <button data-action="set-fermenter-temperature" data-temperature="${state.fermenterTemperatureC - 1}" type="button">Cool<small>${state.fermenterTemperatureC - 1} C</small></button>
          <button data-action="set-fermenter-temperature" data-temperature="${state.fermenterTemperatureC + 1}" type="button">Warm<small>${state.fermenterTemperatureC + 1} C</small></button>
      `
    : '';
  if (equipmentId === 'kettle') {
    const recipe = visibleRecipes().find((item) => item.id === 'garage-blonde');
    const canBrew = recipe ? recipeCanStart(state, recipe) && context.recipeStartBlocker(recipe) === '' : false;
    const blocker = recipe ? context.recipeStartBlocker(recipe) : 'Recipe unavailable';
    const brewing = state.batches.find((batch) => batch.step === 'brewing');
    const waitingTransfer = state.batches.find((batch) => batch.step === 'awaiting-transfer');
    if (waitingTransfer) {
      const waitingRecipe = getRecipe(waitingTransfer.recipeId);
      return `
        <div class="hotspot-actions">
          ${renderBrewDayNotes(waitingRecipe)}
          <button data-action="transfer-batch" data-batch-id="${waitingTransfer.id}" type="button">Transfer to fermenter<small>${waitingTransfer.recipeName}</small></button>
          <button data-action="open-overlay" data-overlay="recipes" type="button">Other recipes</button>
          ${cleanButton}
        </div>
      `;
    }
    if (brewing) {
      return `
        <div class="hotspot-actions">
          <button data-action="wait-until-ready" data-batch-id="${brewing.id}" type="button">Skip ahead<small>${context.batchRemainingLabel(brewing)} to transfer</small></button>
          <button data-action="open-overlay" data-overlay="recipes" type="button">Other recipes</button>
          ${cleanButton}
        </div>
      `;
    }
    return `
      <div class="hotspot-actions">
        ${recipe ? renderBrewExplainer(recipe) : ''}
        <button data-action="start-batch" data-recipe-id="garage-blonde" type="button" ${canBrew ? '' : `disabled title="${blocker || 'Blocked'}"`}>Brew Garage Blonde${canBrew ? '<small>First batch</small>' : `<small>${blocker}</small>`}</button>
        <button data-action="open-overlay" data-overlay="recipes" type="button">Other recipes</button>
        ${cleanButton}
      </div>
    `;
  }

  if (equipmentId === 'fermenter') {
    const batch = instance ? context.batchForEquipmentInstance(instance) : state.batches.find((item) => item.step === 'fermenting' || item.step === 'awaiting-packaging');
    const waitingTransfer = state.batches.find((item) => item.step === 'awaiting-transfer');
    const canTransferHere = waitingTransfer && (!instance || waitingTransfer.fermenterInstanceId === instance.instanceId);
    if ((!batch || batch.step === 'awaiting-transfer') && canTransferHere) {
      return `
        <div class="hotspot-actions">
          <button type="button" disabled>Ready at kettle<small>Use stock pot</small></button>
          ${temperatureButtons}
          ${cleanButton}
        </div>
      `;
    }
    if (batch?.step === 'fermenting') {
      return `
        <div class="hotspot-actions">
          <button data-action="wait-until-ready" data-batch-id="${batch.id}" type="button">Skip ahead<small>${context.batchRemainingLabel(batch)} to bottling</small></button>
          ${temperatureButtons}
          ${cleanButton}
          ${campaignAllowsTemperature(state) ? `<div class="temperature-note"><strong>${state.fermenterTemperatureC} C - ${context.fermenterTemperatureHint()}</strong><span>Temperature affects flavor when you skip time.</span></div>` : ''}
        </div>
      `;
    }
    if (batch?.step === 'awaiting-packaging') {
      return `
        <div class="hotspot-actions">
          <button data-action="start-packaging" data-batch-id="${batch.id}" type="button">Move to bottling bench<small>${batch.recipeName} - ${caseCountLabel(batch.casesExpected)}</small></button>
          ${cleanButton}
        </div>
      `;
    }
    return `
      <div class="hotspot-actions">
        <button type="button" disabled>Empty fermenter<small>${state.fermenterTemperatureC} C</small></button>
        ${temperatureButtons}
        ${cleanButton}
      </div>
    `;
  }

  if (equipmentId === 'mill') {
    return `
      <div class="hotspot-actions">
        <button data-action="use-equipment" data-equipment-id="mill" type="button">Inspect<small>Prep flow</small></button>
        ${cleanButton}
        <button type="button" disabled title="Milling actions are planned for a future pass">Mill<small>Coming later</small></button>
        <button data-action="open-overlay" data-overlay="upgrades" type="button">Store<small>Equipment</small></button>
      </div>
    `;
  }

  const readyBatch = state.batches.find((batch) => batch.step === 'awaiting-packaging');
  const packagingBatch = state.batches.find((batch) => batch.step === 'packaging' || batch.step === 'bottle-conditioning');
  if (readyBatch) {
    return `
      <div class="hotspot-actions">
        <button type="button" disabled>Ready at fermenter<small>${caseCountLabel(readyBatch.casesExpected)} - transfer from fermenter</small></button>
        <div class="temperature-note"><strong>Case size</strong><span>${caseDefinitionExplanation}</span></div>
        ${cleanButton}
        <button data-action="open-overlay" data-overlay="production" type="button">Flow state<small>Fallback</small></button>
      </div>
    `;
  }
  if (packagingBatch) {
    return `
      <div class="hotspot-actions">
        <button data-action="wait-until-ready" data-batch-id="${packagingBatch.id}" type="button">Skip ahead<small>${context.batchRemainingLabel(packagingBatch)} to pallet</small></button>
        ${cleanButton}
      </div>
    `;
  }
  return `
    <div class="hotspot-actions">
      <button type="button" disabled>Idle<small>No batch ready</small></button>
      ${cleanButton}
      <button data-action="open-overlay" data-overlay="upgrades" type="button">Store<small>Equipment</small></button>
    </div>
  `;
};

export const renderStationPanel = (context: StationPanelContext) => {
  const { state } = context;
  if (context.recipePanelOpen) {
    return `
      <div class="station-panel-layer">
        <button class="station-panel-scrim" data-action="close-overlay" type="button" aria-label="Close station panel"></button>
        <aside class="glass-panel station-panel recipe-station-panel" aria-label="Recipe station panel">
          <button class="station-panel-close" data-action="close-overlay" type="button" aria-label="Close station panel"></button>
          <header class="station-panel-header"><span class="eyebrow gold">Recipe / Brew</span><h2>${context.selectedRecipeCategoryId ? (recipeCategories.find((item) => item.id === context.selectedRecipeCategoryId)?.name ?? 'Choose recipe') : 'Choose style'}</h2><p>Choose a style, then brew.</p></header>
          ${context.renderRecipeSelectionPanel()}
        </aside>
      </div>
    `;
  }
  if (!context.expandedTarget) return '';
  const selectedEquipment = context.expandedTarget === 'cases'
    ? null
    : garageSceneEquipmentInstances(state).find((item) => item.instanceId === context.expandedEquipmentInstanceId && item.equipmentId === context.expandedTarget) ??
      garageSceneEquipmentInstances(state).find((item) => item.equipmentId === context.expandedTarget);
  const compactBody = (status: EquipmentStatus, batch?: Batch): string => {
    const duplicateBatchLine = batch && status.detail.includes(batch.recipeName) && status.detail.includes(context.batchRemainingLabel(batch));
    return `<section class="station-panel-body"><p>${status.detail}</p>${batch && !duplicateBatchLine ? `<p>Batch: ${batch.recipeName} - ${context.stepLabel(batch.step)} - ${context.batchRemainingLabel(batch)}</p>` : ''}<p>Time: ${formatGameDate(state.day)} - ${formatClock(state.minute)}</p></section>`;
  };
  if (context.expandedTarget === 'cases') {
    return `
      <div class="station-panel-layer">
        <button class="station-panel-scrim" data-action="close-station-panel" type="button" aria-label="Close station panel"></button>
        <aside class="glass-panel station-panel" aria-label="Station panel">
          <button class="station-panel-close" data-action="close-station-panel" type="button" aria-label="Close station panel"></button>
          <header class="station-panel-header"><span class="eyebrow gold">Pallet</span><h2>Finished beer pallet</h2><p>${caseCountLabel(state.inventory.cases)} ready</p></header>
          <section class="station-panel-body"><p>${caseDefinitionExplanation}</p><p>${state.inventory.cases > 0 ? 'Select an offer to sell cases.' : 'Package beer to fill the pallet.'}</p></section>
          ${renderSalesOffers(state)}
        </aside>
      </div>
    `;
  }
  const selected = selectedEquipment;
  if (!selected) return '';
  const status = context.equipmentInstanceStatus(selected);
  const batch = context.batchForEquipmentInstance(selected);
  return `
    <div class="station-panel-layer">
      <button class="station-panel-scrim" data-action="close-station-panel" type="button" aria-label="Close station panel"></button>
      <aside class="glass-panel station-panel" aria-label="Station panel">
        <button class="station-panel-close" data-action="close-station-panel" type="button" aria-label="Close station panel"></button>
        <header class="station-panel-header"><span class="eyebrow gold">${selected.label}</span><h2>${selected.name}</h2><p>${status.label}</p></header>
        ${compactBody(status, batch)}
        ${renderEquipmentActions(context, selected.equipmentId, selected)}
      </aside>
    </div>
  `;
};
