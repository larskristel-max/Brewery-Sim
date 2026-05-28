import { caseCountLabel, caseDefinitionExplanation, cleaningPlanForEquipment, formatClock, formatCurrency, formatGameDate, recipeCanStart, recipeCategories, saleCasesForChannel, salesChannels, saleValueForChannel, visibleRecipes } from '../game/selectors.js';
import { garageSceneEquipmentInstances } from './sceneEquipment.js';
const salesOfferModels = (state) => [
    { id: 'friends-family', risk: 'Very low visibility', invoice: 'No invoice' },
    { id: 'private-event', risk: 'Medium visibility', invoice: 'Informal receipt' },
    { id: 'local-bar', risk: 'High formal risk', invoice: state.canInvoice ? 'Invoice ready' : 'May ask for invoice' }
];
export const renderSalesOffers = (state) => `
  <div class="hotspot-actions sales-offers">
    ${salesOfferModels(state)
    .map((offer) => {
    const channel = salesChannels[offer.id];
    const cases = saleCasesForChannel(state, offer.id);
    const payout = saleValueForChannel(state, offer.id);
    const invoiceBlocked = (state.demand.invoiceRequired || (channel.formal && state.visibilityRisk >= channel.invoiceAfter)) && !state.canInvoice;
    const disabled = cases <= 0 || invoiceBlocked;
    return `<button data-action="sell-channel" data-channel-id="${offer.id}" data-cases="${cases}" type="button" ${disabled ? 'disabled' : ''}>
          ${channel.name}<small>Selling ${caseCountLabel(cases)} / offer max ${caseCountLabel(channel.cases)} - ${formatCurrency(payout)} payout - ${offer.risk} - ${invoiceBlocked ? 'Invoice blocked' : offer.invoice}</small>
        </button>`;
})
    .join('')}
    <div class="temperature-note"><strong>Gameplay case definition</strong><span>${caseDefinitionExplanation}</span></div>
  </div>
`;
export const renderEquipmentActions = (context, equipmentId, instance) => {
    const { state } = context;
    const cleanPlan = cleaningPlanForEquipment(state, equipmentId);
    const canClean = state.cash >= cleanPlan.cost;
    const cleanButton = `<button data-action="clean-equipment" data-equipment-id="${equipmentId}" type="button" ${canClean ? '' : `disabled title="Need ${formatCurrency(cleanPlan.cost)}"`}>Clean<small>${canClean ? cleanPlan.duration : 'Need cash'}</small></button>`;
    if (equipmentId === 'kettle') {
        const recipe = visibleRecipes().find((item) => item.id === 'garage-blonde');
        const canBrew = recipe ? recipeCanStart(state, recipe) && context.recipeStartBlocker(recipe) === '' : false;
        const blocker = recipe ? context.recipeStartBlocker(recipe) : 'Recipe unavailable';
        const brewing = state.batches.find((batch) => batch.step === 'brewing');
        const waitingTransfer = state.batches.find((batch) => batch.step === 'awaiting-transfer');
        if (waitingTransfer) {
            return `
        <div class="hotspot-actions">
          <button data-action="transfer-batch" data-batch-id="${waitingTransfer.id}" type="button">Transfer to fermenter<small>${waitingTransfer.recipeName}</small></button>
          <button data-action="open-overlay" data-overlay="recipes" type="button">Other recipes</button>
          ${cleanButton}
        </div>
      `;
        }
        if (brewing) {
            return `
        <div class="hotspot-actions">
          <button data-action="wait-until-ready" data-batch-id="${brewing.id}" type="button">Skip to transfer<small>${context.batchRemainingLabel(brewing)}</small></button>
          <button data-action="open-overlay" data-overlay="recipes" type="button">Other recipes</button>
          ${cleanButton}
        </div>
      `;
        }
        return `
      <div class="hotspot-actions">
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
          <button data-action="set-fermenter-temperature" data-temperature="${state.fermenterTemperatureC - 1}" type="button">Cool<small>${state.fermenterTemperatureC - 1} C</small></button>
          <button data-action="set-fermenter-temperature" data-temperature="${state.fermenterTemperatureC + 1}" type="button">Warm<small>${state.fermenterTemperatureC + 1} C</small></button>
          ${cleanButton}
        </div>
      `;
        }
        if (batch?.step === 'fermenting') {
            return `
        <div class="hotspot-actions">
          <button data-action="wait-until-ready" data-batch-id="${batch.id}" type="button">Skip to packaging<small>${context.batchRemainingLabel(batch)}</small></button>
          <button data-action="set-fermenter-temperature" data-temperature="${state.fermenterTemperatureC - 1}" type="button">Cool<small>${state.fermenterTemperatureC - 1} C</small></button>
          <button data-action="set-fermenter-temperature" data-temperature="${state.fermenterTemperatureC + 1}" type="button">Warm<small>${state.fermenterTemperatureC + 1} C</small></button>
          ${cleanButton}
          <div class="temperature-note"><strong>${state.fermenterTemperatureC} C - ${context.fermenterTemperatureHint()}</strong><span>Clean equipment and fresh ingredients reduce contamination.</span></div>
        </div>
      `;
        }
        if (batch?.step === 'awaiting-packaging') {
            return `
        <div class="hotspot-actions">
          <button data-action="start-packaging" data-batch-id="${batch.id}" type="button">Transfer to bottling<small>${batch.recipeName} - ${caseCountLabel(batch.casesExpected)}</small></button>
          <button data-action="set-fermenter-temperature" data-temperature="${state.fermenterTemperatureC - 1}" type="button">Cool<small>${state.fermenterTemperatureC - 1} C</small></button>
          <button data-action="set-fermenter-temperature" data-temperature="${state.fermenterTemperatureC + 1}" type="button">Warm<small>${state.fermenterTemperatureC + 1} C</small></button>
          ${cleanButton}
        </div>
      `;
        }
        return `
      <div class="hotspot-actions">
        <button type="button" disabled>Empty fermenter<small>${state.fermenterTemperatureC} C</small></button>
        <button data-action="set-fermenter-temperature" data-temperature="${state.fermenterTemperatureC - 1}" type="button">Cool<small>${state.fermenterTemperatureC - 1} C</small></button>
        <button data-action="set-fermenter-temperature" data-temperature="${state.fermenterTemperatureC + 1}" type="button">Warm<small>${state.fermenterTemperatureC + 1} C</small></button>
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
        <div class="temperature-note"><strong>Gameplay case definition</strong><span>${caseDefinitionExplanation}</span></div>
        ${cleanButton}
        <button data-action="open-overlay" data-overlay="production" type="button">Flow state<small>Fallback</small></button>
      </div>
    `;
    }
    if (packagingBatch) {
        return `
      <div class="hotspot-actions">
        <button data-action="wait-until-ready" data-batch-id="${packagingBatch.id}" type="button">Skip to pallet<small>${context.batchRemainingLabel(packagingBatch)}</small></button>
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
export const renderStationPanel = (context) => {
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
    if (!context.expandedTarget)
        return '';
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
    const equipment = garageSceneEquipmentInstances(state);
    const selected = equipment.find((item) => item.instanceId === context.expandedEquipmentInstanceId && item.equipmentId === context.expandedTarget) ??
        equipment.find((item) => item.equipmentId === context.expandedTarget);
    if (!selected)
        return '';
    const status = context.equipmentInstanceStatus(selected);
    const batch = context.batchForEquipmentInstance(selected);
    return `
    <div class="station-panel-layer">
      <button class="station-panel-scrim" data-action="close-station-panel" type="button" aria-label="Close station panel"></button>
      <aside class="glass-panel station-panel" aria-label="Station panel">
        <button class="station-panel-close" data-action="close-station-panel" type="button" aria-label="Close station panel"></button>
        <header class="station-panel-header"><span class="eyebrow gold">${selected.label}</span><h2>${selected.name}</h2><p>${status.label}</p></header>
        <section class="station-panel-body"><p>${status.detail}</p>${batch ? `<p>Batch: ${batch.recipeName} - ${context.stepLabel(batch.step)} - ${context.batchRemainingLabel(batch)}</p>` : '<p>No active batch.</p>'}<p>Time: ${formatGameDate(state.day)} - ${formatClock(state.minute)}</p></section>
        ${renderEquipmentActions(context, selected.equipmentId, selected)}
      </aside>
    </div>
  `;
};
//# sourceMappingURL=stationPanel.js.map