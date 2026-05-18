import { equipmentByStation } from './data/equipment.js';
import { garageEquipmentLayoutByItem, garageEquipmentLayoutBySlot, garageEquipmentLayoutByTier } from './data/garageLayout.js';
import { ingredients, getIngredient } from './data/ingredients.js';
import { createInitialState } from './game/initialState.js';
import { loadSavedGame, resetSavedGame, saveGameState, STORAGE_KEY } from './game/persistence.js';
import { contaminationRiskTier, currentWorkflowStage, demandProgress, equipmentConditionLabel, equipmentConditionTier, formatGameDate, formatClock, formatCurrency, ingredientAmountLabel, objectiveProgress, orderCost, recipeCanStart, recipeIngredientCost, recipeMissingIngredients, recipeOrderItems, storageCapacityByArea, storageOverflowByArea, storageUseByArea, visibleRecipes } from './game/selectors.js';
import { reduceGame } from './game/simulation.js';
const root = document.querySelector('#root');
if (!root) {
    throw new Error('Missing #root element');
}
const hasBrowserSave = () => {
    try {
        return typeof globalThis.localStorage !== 'undefined' && globalThis.localStorage.getItem(STORAGE_KEY) !== null;
    }
    catch {
        return false;
    }
};
const hadBrowserSave = hasBrowserSave();
const urlParams = new URLSearchParams(globalThis.location.search);
const layoutDebugEnabled = urlParams.get('layoutDebug') === '1';
const tierPreview = layoutDebugEnabled ? urlParams.get('tierPreview') : null;
const tier2PreviewEnabled = tierPreview === '2';
const activeGarageLayoutTier = tier2PreviewEnabled ? 'tier2' : 'tier1';
const createTier2PreviewState = () => {
    let preview = createInitialState();
    preview.cash = 5000;
    preview.garageSpaceLimit = 48;
    ['all-in-one-40l', 'grain-mill-tier2', 'stainless-conical-50l', 'stainless-conical-50l', 'stainless-conical-50l', 'semi-auto-filler'].forEach((equipmentItemId) => {
        preview = reduceGame(preview, { type: 'buy-equipment', equipmentItemId });
    });
    preview.ownedEquipment = preview.ownedEquipment.filter((item) => item.itemId !== 'plastic-bucket');
    preview.garageSpaceUsed = preview.ownedEquipment.reduce((total, item) => total + item.spaceUsed, 0);
    preview.cash = 180;
    preview.events = [
        {
            id: 'tier-2-preview',
            minute: preview.minute,
            message: 'Tier 2 layout preview loaded for visual placement. This debug state is not saved.'
        },
        ...preview.events
    ];
    preview.selectedEquipmentId = 'kettle';
    return preview;
};
let state = tier2PreviewEnabled ? createTier2PreviewState() : loadSavedGame();
let saveStatus = tier2PreviewEnabled ? 'Tier 2 layout preview - not saved' : hadBrowserSave ? 'Browser save loaded' : 'Autosave ready';
let expandedTarget = null;
let expandedEquipmentInstanceId = null;
let missionsOpen = false;
let notificationsOpen = false;
let opsOpen = false;
let activeOverlay = null;
let audioAllowed = false;
const garageLayoutDraft = Object.fromEntries(Object.entries(garageEquipmentLayoutByTier[activeGarageLayoutTier] ?? garageEquipmentLayoutBySlot).map(([slotId, placement]) => [
    slotId,
    structuredClone(placement)
]));
const stationLabels = {
    kettle: 'Brewhouse',
    fermenter: 'Fermentation',
    mill: 'Milling',
    bottler: 'Packaging'
};
const stationNouns = {
    kettle: 'brewhouse',
    fermenter: 'fermenter',
    mill: 'grain mill',
    bottler: 'packaging station'
};
const garageLayoutJson = () => JSON.stringify(garageLayoutDraft, null, 2);
const applySpritePlacement = (slotId) => {
    const placement = garageLayoutDraft[slotId];
    root.querySelectorAll(`[data-layout-slot-id="${slotId}"]`).forEach((object) => {
        if (object.classList.contains('equipment-object')) {
            object.style.left = `${placement.x}%`;
            object.style.top = `${placement.y}%`;
            object.style.width = `${placement.width}%`;
            return;
        }
        object.style.setProperty('--x', `${placement.x}%`);
        object.style.setProperty('--y', `${placement.y}%`);
    });
};
const updateLayoutDebugJson = () => {
    const output = root.querySelector('[data-layout-json]');
    if (output)
        output.value = garageLayoutJson();
};
const activeEquipmentItemId = (equipment) => equipment.itemId ?? null;
const stationSlotId = (equipmentId) => {
    if (equipmentId === 'bottler')
        return 'packaging';
    if (equipmentId === 'mill')
        return 'milling';
    return 'brewhouse';
};
const fermenterSlotId = (index) => `fermenter-slot-${Math.min(index + 1, 5)}`;
const activeOwnedInstance = (equipmentId) => {
    const activeId = state.activeEquipment[equipmentId];
    return state.ownedEquipment.find((item) => item.instanceId === activeId) ?? null;
};
const garageSceneEquipmentInstances = () => {
    const stationInstances = ['kettle', 'mill', 'bottler']
        .map((equipmentId) => {
        const equipment = state.equipment[equipmentId];
        const owned = activeOwnedInstance(equipmentId);
        const itemId = activeEquipmentItemId(equipment);
        if (!itemId || (equipmentId === 'mill' && !owned?.installed))
            return null;
        return {
            equipmentId,
            itemId,
            instanceId: owned?.instanceId ?? `${equipmentId}-active`,
            slotId: stationSlotId(equipmentId),
            label: stationLabels[equipmentId],
            name: displayEquipmentName(equipment),
            condition: equipment.condition,
            capacityLiters: equipment.capacityLiters,
            spaceUsed: equipment.spaceUsed,
            occupiedBatchId: owned?.occupiedBatchId
        };
    })
        .filter(Boolean);
    const fermenters = state.ownedEquipment
        .filter((item) => item.equipmentId === 'fermenter' && item.installed)
        .map((item, index) => ({
        equipmentId: 'fermenter',
        itemId: item.itemId,
        instanceId: item.instanceId,
        slotId: fermenterSlotId(index),
        label: `Fermenter ${index + 1}`,
        name: item.name,
        condition: item.condition,
        capacityLiters: item.capacityLiters,
        spaceUsed: item.spaceUsed,
        occupiedBatchId: item.occupiedBatchId
    }));
    return [stationInstances[0], stationInstances[1], ...fermenters, stationInstances[2]].filter((item) => Boolean(item));
};
const renderEquipmentObject = (equipment, content) => {
    const visual = garageEquipmentLayoutByItem[equipment.itemId];
    if (!visual.sprite)
        return '';
    const placement = garageLayoutDraft[equipment.slotId];
    const tapPadding = visual.tapPadding ?? { x: 0, y: 0 };
    const priority = visual.interactionPriority ?? 0;
    return `
    <article
      class="equipment-object equipment-object-${equipment.equipmentId}"
      data-equipment-id="${equipment.equipmentId}"
      data-equipment-item-id="${equipment.itemId}"
      data-equipment-instance-id="${equipment.instanceId}"
      data-layout-slot-id="${equipment.slotId}"
      style="left: ${placement.x}%; top: ${placement.y}%; width: ${placement.width}%; --tap-padding-x: ${tapPadding.x}%; --tap-padding-y: ${tapPadding.y}%; --interaction-priority: ${priority}; z-index: ${20 + priority}"
    >
      ${content}
    </article>
  `;
};
const renderLayoutDebugPanel = () => layoutDebugEnabled
    ? `
      <aside class="layout-debug-panel" aria-label="Equipment sprite layout debugger">
        <div class="layout-debug-heading">
          <strong>Layout debug</strong>
          <span>Percent values inside .garage-scene</span>
        </div>
        <div class="layout-debug-controls">
          ${garageSceneEquipmentInstances()
        .map((equipment) => {
        const placement = garageLayoutDraft[equipment.slotId];
        const tapPadding = garageEquipmentLayoutByItem[equipment.itemId].tapPadding;
        return `
                <fieldset class="layout-debug-fieldset">
                  <legend>${equipment.label} / ${equipment.itemId}</legend>
                  ${['x', 'y', 'width']
            .map((field) => `
                        <label class="layout-debug-field-row">
                          <span>${field}</span>
                          <input
                            class="layout-debug-number"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value="${placement[field]}"
                            data-layout-slot-id="${equipment.slotId}"
                            data-layout-field="${field}"
                            aria-label="${equipment.label} ${field} value"
                          />
                          <input
                            class="layout-debug-slider"
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value="${placement[field]}"
                            data-layout-slot-id="${equipment.slotId}"
                            data-layout-field="${field}"
                            aria-label="${equipment.label} ${field} slider"
                          />
                        </label>
                      `)
            .join('')}
                  ${tapPadding ? `<small>Tap zone preview: +${tapPadding.x}% x, +${tapPadding.y}% y</small>` : ''}
                </fieldset>
              `;
    })
        .join('')}
        </div>
        <label class="layout-debug-json-label" for="layout-debug-json">Copyable JSON</label>
        <textarea id="layout-debug-json" data-layout-json readonly>${garageLayoutJson()}</textarea>
      </aside>
    `
    : '';
const displayEquipmentName = (equipment) => equipment.name;
const equipmentCapacityLabel = (equipment) => {
    const liters = equipment.capacityLiters;
    if (equipment.id === 'mill')
        return 'Milling prep station';
    if (equipment.id === 'bottler')
        return liters > 0 ? `${liters} L packaging run` : 'Packaging capacity pending';
    return liters > 0 ? `${liters} L capacity` : 'Capacity pending';
};
const garageSpaceUsed = () => state.garageSpaceUsed;
const garageSpaceLimit = () => state.garageSpaceLimit;
const fermenterReservation = () => {
    const openSlots = state.ownedEquipment.filter((item) => item.equipmentId === 'fermenter' && !item.occupiedBatchId).length;
    const occupyingBatch = state.batches.find((batch) => batch.step === 'fermenting' || batch.step === 'awaiting-packaging');
    if (occupyingBatch) {
        return {
            blocked: openSlots === 0,
            label: openSlots === 0 ? 'Fermenters occupied' : `${openSlots} fermenter slot open`,
            detail: `${occupyingBatch.recipeName} is ${stepLabel(occupyingBatch.step).toLowerCase()}.`
        };
    }
    const reservedBatch = state.batches.find((batch) => batch.step === 'brewing' || batch.step === 'awaiting-transfer');
    if (reservedBatch) {
        return {
            blocked: openSlots === 0,
            label: openSlots === 0 ? 'Fermenters reserved' : `${openSlots} fermenter slot open`,
            detail: `${reservedBatch.recipeName} has a fermenter reserved after mash.`
        };
    }
    return {
        blocked: false,
        label: `${openSlots} fermenter slot${openSlots === 1 ? '' : 's'} open`,
        detail: `${displayEquipmentName(state.equipment.fermenter)} ready for the next transfer.`
    };
};
const recipeStartBlocker = (recipe) => {
    const reservation = fermenterReservation();
    if (!recipe.enabled)
        return 'Recipe locked';
    if (state.inventory.water < recipe.waterCost)
        return `Need ${recipe.waterCost} L water`;
    if (recipeMissingIngredients(state, recipe).length > 0)
        return 'Missing ingredients';
    if (state.energy < 35)
        return 'Low energy';
    if (state.batches.some((batch) => batch.step === 'brewing'))
        return 'Brewhouse busy';
    if (reservation.blocked)
        return reservation.label;
    return '';
};
const incomingForIngredient = (ingredientId) => state.pendingOrders.reduce((summary, order) => {
    const amount = order.items.filter((item) => item.ingredientId === ingredientId).reduce((total, item) => total + item.amount, 0);
    if (amount <= 0)
        return summary;
    return {
        amount: summary.amount + amount,
        arrivalDay: summary.arrivalDay === null ? order.arrivalDay : Math.min(summary.arrivalDay, order.arrivalDay)
    };
}, { amount: 0, arrivalDay: null });
const missingOrderStatus = (missing) => {
    if (missing.length === 0)
        return { fullyIncoming: false, label: '', arrivalDay: null };
    const arrivals = missing.map((item) => incomingForIngredient(item.ingredientId));
    const fullyIncoming = missing.every((item, index) => arrivals[index].amount >= item.amount);
    const earliest = arrivals.map((arrival) => arrival.arrivalDay).filter((day) => day !== null).sort((a, b) => a - b)[0] ?? null;
    return {
        fullyIncoming,
        arrivalDay: earliest,
        label: fullyIncoming && earliest ? `Already ordered. Arrives ${formatGameDate(earliest)}.` : earliest ? `Some supplies arrive ${formatGameDate(earliest)}.` : ''
    };
};
const fermenterTemperatureHint = () => {
    const fermenting = state.batches.find((batch) => batch.step === 'fermenting');
    const recipe = fermenting ? visibleRecipes().find((item) => item.id === fermenting.recipeId) : null;
    if (!recipe)
        return 'Set for next batch';
    const ingredientIds = recipe.ingredients.map((ingredient) => ingredient.ingredientId);
    if (ingredientIds.includes('lager-yeast'))
        return 'Lager target 9-14 C';
    if (ingredientIds.includes('kveik-yeast') || recipe.style.toLowerCase().includes('kveik'))
        return 'Kveik target 28-40 C';
    if (ingredientIds.includes('saison-yeast'))
        return 'Saison target 20-30 C';
    if (ingredientIds.includes('wheat-yeast'))
        return 'Wheat target 18-24 C';
    return 'Ale target 17-22 C';
};
const playBell = () => {
    if (!audioAllowed)
        return;
    try {
        const audioGlobal = globalThis;
        const AudioContextClass = globalThis.AudioContext ?? audioGlobal.webkitAudioContext;
        if (!AudioContextClass)
            return;
        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(920, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(620, context.currentTime + 0.12);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.18);
    }
    catch {
        // Browser audio can be blocked; notification sound is optional.
    }
};
const dispatch = (action) => {
    const previousEventId = state.events[0]?.id;
    const overlayScrollTop = document.querySelector('.focus-overlay')?.scrollTop ?? 0;
    state = reduceGame(state, action);
    if (tier2PreviewEnabled) {
        saveStatus = 'Tier 2 layout preview - not saved';
    }
    else {
        saveGameState(state);
        saveStatus = `Saved locally ${formatClock(state.minute)}`;
    }
    if (state.events[0]?.id && state.events[0]?.id !== previousEventId)
        playBell();
    render();
    if (activeOverlay) {
        const overlay = document.querySelector('.focus-overlay');
        if (overlay)
            overlay.scrollTop = overlayScrollTop;
    }
};
const resetGame = () => {
    if (tier2PreviewEnabled) {
        state = createTier2PreviewState();
        expandedTarget = null;
        expandedEquipmentInstanceId = null;
        missionsOpen = false;
        notificationsOpen = false;
        opsOpen = false;
        activeOverlay = null;
        saveStatus = 'Tier 2 layout preview reset - not saved';
        render();
        return;
    }
    resetSavedGame();
    state = createInitialState();
    expandedTarget = null;
    expandedEquipmentInstanceId = null;
    missionsOpen = false;
    notificationsOpen = false;
    opsOpen = false;
    activeOverlay = null;
    saveStatus = 'New game started. Browser save cleared.';
    render();
};
const stepLabel = (step) => ({
    brewing: 'Brewing',
    'awaiting-transfer': 'Awaiting transfer',
    fermenting: 'Fermenting',
    'awaiting-packaging': 'Awaiting packaging',
    packaging: 'Packaging',
    'bottle-conditioning': 'Bottle conditioning',
    ready: 'Ready'
})[step] ?? step;
const activeForEquipment = (equipmentId) => {
    const stepByEquipment = { kettle: 'brewing', fermenter: 'fermenting', bottler: 'packaging' };
    const step = stepByEquipment[equipmentId];
    if (!step)
        return false;
    return state.batches.some((batch) => batch.step === step);
};
const batchForEquipment = (equipmentId) => {
    const stepByEquipment = { kettle: 'brewing', fermenter: 'fermenting', bottler: 'packaging' };
    const step = stepByEquipment[equipmentId];
    if (!step)
        return undefined;
    return state.batches.find((batch) => batch.step === step);
};
const isNextTapTarget = (target) => currentWorkflowStage(state).tapTarget === target;
const riskLabel = (risk) => {
    const tier = contaminationRiskTier(risk);
    if (tier === 'low')
        return 'Low risk';
    if (tier === 'elevated')
        return 'Rising risk';
    if (tier === 'high')
        return 'High risk';
    return 'Severe risk';
};
const equipmentMetaLine = (equipment) => `${equipmentCapacityLabel(equipment)} - ${equipment.spaceUsed || '?'} space`;
const equipmentSceneStatus = (equipmentId) => {
    const equipment = state.equipment[equipmentId];
    const activeBatch = batchForEquipment(equipmentId);
    const conditionLabel = equipmentConditionLabel(equipment.condition);
    const conditionDetail = `${Math.round(equipment.condition)}% clean`;
    if (equipmentId === 'fermenter') {
        const waitingTransfer = state.batches.find((batch) => batch.step === 'awaiting-transfer');
        if (waitingTransfer) {
            return {
                label: 'Transfer waiting',
                detail: `${waitingTransfer.recipeName} needs player input`,
                toneClass: 'risk-high'
            };
        }
        const fermenting = activeBatch ?? state.batches.find((batch) => batch.step === 'fermenting');
        if (fermenting) {
            const tier = contaminationRiskTier(fermenting.contaminationRisk);
            return {
                label: `${state.fermenterTemperatureC} C fermentation`,
                detail: `${riskLabel(fermenting.contaminationRisk)} - ${fermenterTemperatureHint()}`,
                toneClass: `risk-${tier}`
            };
        }
        return {
            label: `${state.fermenterTemperatureC} C`,
            detail: `${equipmentMetaLine(equipment)} - ${fermenterTemperatureHint()}`,
            toneClass: `condition-${equipmentConditionTier(equipment.condition)}`
        };
    }
    if (equipmentId === 'bottler') {
        const readyBatch = state.batches.find((batch) => batch.step === 'awaiting-packaging');
        const conditioningBatch = state.batches.find((batch) => batch.step === 'bottle-conditioning');
        const tier = equipmentConditionTier(equipment.condition);
        if (readyBatch) {
            return {
                label: `${readyBatch.casesExpected} cases waiting`,
                detail: tier === 'dirty' || tier === 'critical' ? 'Packaging loss risk' : 'Ready to bottle',
                toneClass: tier === 'dirty' || tier === 'critical' ? 'risk-high' : 'risk-low'
            };
        }
        if (conditioningBatch) {
            return {
                label: 'Conditioning',
                detail: `${Math.round(conditioningBatch.stepProgress)}% complete`,
                toneClass: 'risk-low'
            };
        }
        if (tier === 'dirty' || tier === 'critical') {
            return {
                label: 'Packaging loss risk',
                detail: conditionDetail,
                toneClass: 'risk-high'
            };
        }
    }
    if (activeBatch) {
        return {
            label: stepLabel(activeBatch.step),
            detail: `${Math.round(activeBatch.stepProgress)}% complete`,
            toneClass: 'risk-low'
        };
    }
    return {
        label: conditionLabel,
        detail: `${conditionDetail} - ${equipmentMetaLine(equipment)}`,
        toneClass: `condition-${equipmentConditionTier(equipment.condition)}`
    };
};
const batchForEquipmentInstance = (equipment) => {
    if (equipment.equipmentId !== 'fermenter')
        return batchForEquipment(equipment.equipmentId);
    return state.batches.find((batch) => batch.fermenterInstanceId === equipment.instanceId);
};
const activeForEquipmentInstance = (equipment) => {
    const batch = batchForEquipmentInstance(equipment);
    if (equipment.equipmentId === 'fermenter')
        return batch?.step === 'fermenting';
    return activeForEquipment(equipment.equipmentId);
};
const isNextTapTargetForInstance = (equipment) => {
    if (equipment.equipmentId !== 'fermenter')
        return isNextTapTarget(equipment.equipmentId);
    if (!isNextTapTarget('fermenter'))
        return false;
    const waitingTransfer = state.batches.find((batch) => batch.step === 'awaiting-transfer');
    if (waitingTransfer)
        return waitingTransfer.fermenterInstanceId === equipment.instanceId;
    const activeBatch = state.batches.find((batch) => batch.step === 'fermenting');
    return activeBatch ? activeBatch.fermenterInstanceId === equipment.instanceId : true;
};
const equipmentInstanceStatus = (equipment) => {
    if (equipment.equipmentId !== 'fermenter')
        return equipmentSceneStatus(equipment.equipmentId);
    const conditionTier = equipmentConditionTier(equipment.condition);
    const batch = batchForEquipmentInstance(equipment);
    const detailBase = `${equipment.capacityLiters} L capacity - ${equipment.spaceUsed || '?'} space`;
    if (batch?.step === 'awaiting-transfer') {
        return {
            label: 'Transfer waiting',
            detail: `${batch.recipeName} is reserved for this fermenter`,
            toneClass: 'risk-high'
        };
    }
    if (batch?.step === 'fermenting') {
        const tier = contaminationRiskTier(batch.contaminationRisk);
        return {
            label: `${state.fermenterTemperatureC} C fermentation`,
            detail: `${batch.recipeName} - ${riskLabel(batch.contaminationRisk)}`,
            toneClass: `risk-${tier}`
        };
    }
    if (batch?.step === 'awaiting-packaging') {
        return {
            label: 'Ready to package',
            detail: `${batch.recipeName} finished fermenting`,
            toneClass: 'risk-low'
        };
    }
    if (batch) {
        return {
            label: 'Reserved',
            detail: `${batch.recipeName} - ${stepLabel(batch.step)}`,
            toneClass: 'risk-low'
        };
    }
    return {
        label: 'Open fermenter',
        detail: `${Math.round(equipment.condition)}% clean - ${detailBase}`,
        toneClass: `condition-${conditionTier}`
    };
};
const hotspotPosition = (equipmentId) => {
    if (equipmentId === 'fermenter' && state.equipment.fermenter.tier === 1)
        return { x: 56, y: 55 };
    return {
        kettle: { x: 24, y: 49 },
        fermenter: { x: 51, y: 29 },
        mill: { x: 35, y: 56 },
        bottler: { x: 75, y: 48 }
    }[equipmentId];
};
const brewerPosition = () => {
    const focus = state.batches[0]?.step ?? 'idle';
    return {
        brewing: { left: '28%', top: '58%' },
        'awaiting-transfer': { left: '46%', top: '58%' },
        fermenting: { left: '52%', top: '51%' },
        'awaiting-packaging': { left: '70%', top: '60%' },
        packaging: { left: '76%', top: '63%' },
        'bottle-conditioning': { left: '82%', top: '70%' },
        ready: { left: '82%', top: '70%' },
        idle: { left: '38%', top: '68%' }
    }[focus];
};
const renderTopHud = () => `
  <header class="top-hud" aria-label="Brewery status">
    <div class="hud-cluster brand-lockup">
      <span class="brand-mark" aria-hidden="true">HH</span>
      <div><strong>HOP HAVEN</strong><span>Garage floor</span></div>
    </div>
    <div class="hud-cluster hud-stat time-stat"><span class="eyebrow">${formatGameDate(state.day)}</span><strong>${formatClock(state.minute)}</strong></div>
    <div class="hud-cluster hud-resources">
      <div><span class="eyebrow">Cash</span><strong>${formatCurrency(state.cash)}</strong></div>
      <div class="rep-stat"><span class="eyebrow">Energy</span><strong>${state.energy}</strong><span class="mini-meter"><i style="width: ${state.energy}%"></i></span></div>
      <div class="rep-stat"><span class="eyebrow">Rep</span><strong>${state.reputation}</strong><span class="mini-meter"><i style="width: ${Math.min(100, state.reputation * 8)}%"></i></span></div>
    </div>
    ${renderNotificationControl()}
  </header>
`;
const renderMissionsControl = () => {
    const objective = objectiveProgress(state);
    return `
    <div class="missions-control">
      <button class="scene-pill missions-button ${missionsOpen ? 'open' : ''}" data-action="toggle-missions" type="button" aria-expanded="${missionsOpen}">
        <span>Missions</span>
        <strong>${objective.progress}%</strong>
      </button>
      ${missionsOpen
        ? `
            <aside class="glass-panel popover mission-popover" aria-label="Missions">
              <span class="eyebrow gold">Current objective</span>
              <strong>${objective.label}</strong>
              <div class="objective-demand">
                <span>${demandProgress(state)}</span>
                <span>${state.demand.casesSold}/${state.demand.casesRequested}</span>
              </div>
              <progress value="${objective.progress}" max="100"></progress>
            </aside>
          `
        : ''}
    </div>
  `;
};
const renderNotificationControl = () => {
    const fermenting = state.batches.find((batch) => batch.step === 'fermenting');
    const bottlerTier = equipmentConditionTier(state.equipment.bottler.condition);
    const fermenterStatus = fermenting ? `${fermenting.contaminationRisk}% ${riskLabel(fermenting.contaminationRisk)}` : equipmentConditionLabel(state.equipment.fermenter.condition);
    const packagingStatus = bottlerTier === 'dirty' || bottlerTier === 'critical' ? 'Loss risk' : equipmentConditionLabel(state.equipment.bottler.condition);
    const storageOverflow = Object.values(storageOverflowByArea(state)).reduce((total, amount) => total + amount, 0);
    const eventCount = Math.min(9, state.events.length);
    return `
    <div class="notification-control">
      <button class="scene-pill bell-button ${notificationsOpen ? 'open' : ''}" data-action="toggle-notifications" type="button" aria-label="Notifications" aria-expanded="${notificationsOpen}">
        <span class="bell-icon" aria-hidden="true"></span>
        <strong class="notification-badge" aria-label="${eventCount} notifications">${eventCount}</strong>
      </button>
      ${notificationsOpen
        ? `
            <aside class="glass-panel popover notification-popover" aria-label="Notifications">
              <span class="eyebrow gold">Notifications</span>
              <div class="status-lines">
                <div><span>Fermenter</span><strong>${fermenterStatus}</strong></div>
                <div><span>Packaging</span><strong>${packagingStatus}</strong></div>
                <div><span>Cases</span><strong>${state.inventory.cases} ready</strong></div>
                <div><span>Channel</span><strong>${state.demand.accountName}</strong></div>
                <div><span>Compliance</span><strong>${state.visibilityRisk >= 30 ? 'Invoice pressure' : `${state.visibilityRisk}/30 visible`}</strong></div>
                <div><span>Garage space</span><strong>${garageSpaceUsed()}/${garageSpaceLimit()}${storageOverflow > 0 ? ' plus clutter' : ''}</strong></div>
              </div>
              <ol>
                ${state.events.slice(0, 4).map((event) => `<li><time>${formatClock(event.minute)}</time><span>${event.message}</span></li>`).join('')}
              </ol>
            </aside>
          `
        : ''}
    </div>
  `;
};
const renderRecipeCards = () => visibleRecipes()
    .map((recipe) => {
    const missing = recipeMissingIngredients(state, recipe);
    const incomingMissing = missingOrderStatus(missing);
    const missingCost = orderCost(missing);
    const extraCost = orderCost(recipeOrderItems(state, recipe, 'extra'));
    const startBlocker = recipeStartBlocker(recipe);
    const canStart = recipeCanStart(state, recipe) && startBlocker === '';
    const reservation = fermenterReservation();
    const batchLiters = Math.min(state.equipment.kettle.capacityLiters, state.equipment.fermenter.capacityLiters);
    const capStation = state.equipment.kettle.capacityLiters <= state.equipment.fermenter.capacityLiters ? stationNouns.kettle : stationNouns.fermenter;
    const capacityText = state.equipment.kettle.capacityLiters === state.equipment.fermenter.capacityLiters
        ? `${batchLiters} L garage batch with the current setup.`
        : `${batchLiters} L batch capped by the ${capStation}.`;
    const missingLabel = missing.map((item) => `${getIngredient(item.ingredientId).name} ${ingredientAmountLabel(item.ingredientId, item.amount)}`).join(', ');
    const missingOrderBlocker = missing.length === 0 ? 'Nothing missing' : incomingMissing.fullyIncoming ? incomingMissing.label : `Need ${formatCurrency(missingCost)}`;
    const extraOrderBlocker = `Need ${formatCurrency(extraCost)}`;
    const estimatedArrivalDay = state.day + 3;
    const estimatedDelivery = `Estimated delivery: ${formatGameDate(estimatedArrivalDay)}. Arrives in 3 days.`;
    return `
        <article class="batch-card recipe-card">
          <div><strong>${recipe.name}</strong><span>${recipe.style} · ${formatCurrency(recipe.salePricePerCase)}/case</span></div>
          <small>${recipe.challenge}</small>
          <div class="capacity-note ${reservation.blocked ? 'blocked' : ''}">
            <strong>${reservation.label}</strong>
            <span>${capacityText} ${reservation.detail}</span>
          </div>
          <small>Batch cost now ${formatCurrency(recipeIngredientCost(recipe))} · market ${Math.round(recipe.marketAppeal * 100)}%</small>
          ${missing.length > 0
        ? `<small class="button-reason">Missing ${missingLabel}${incomingMissing.label ? ` - ${incomingMissing.label}` : ''}</small>`
        : '<small>Ingredients ready.</small>'}
          <div class="hotspot-actions">
            <button data-action="start-batch" data-recipe-id="${recipe.id}" type="button" ${canStart ? '' : `disabled title="${startBlocker || 'Blocked'}"`}>${canStart ? 'Brew' : 'Blocked'}${!canStart && recipe.enabled ? `<small>${startBlocker}</small>` : ''}</button>
            <button data-action="order-recipe" data-order-mode="missing" data-recipe-id="${recipe.id}" type="button" ${recipe.enabled && missing.length > 0 && !incomingMissing.fullyIncoming && state.cash >= missingCost ? `title="${estimatedDelivery}"` : `disabled title="${missingOrderBlocker}"`}>${incomingMissing.fullyIncoming ? 'Ordered' : `Order missing ${formatCurrency(missingCost)}`}${missing.length === 0 ? '<small>Stock ready</small>' : incomingMissing.fullyIncoming ? `<small>Arrives ${formatGameDate(incomingMissing.arrivalDay ?? state.day)}</small>` : state.cash < missingCost ? '<small>Not enough cash</small>' : `<small>Arrives ${formatGameDate(estimatedArrivalDay)}</small>`}</button>
            <button data-action="order-recipe" data-order-mode="extra" data-recipe-id="${recipe.id}" type="button" ${recipe.enabled && state.cash >= extraCost ? `title="${estimatedDelivery}"` : `disabled title="${extraOrderBlocker}"`}>Order extra ${formatCurrency(extraCost)}${state.cash < extraCost ? '<small>Not enough cash</small>' : `<small>Arrives ${formatGameDate(estimatedArrivalDay)}</small>`}</button>
          </div>
        </article>
      `;
})
    .join('');
const renderEquipmentActions = (equipmentId) => {
    const cleanCost = 18;
    const canClean = state.cash >= cleanCost;
    if (equipmentId === 'kettle') {
        const reservation = fermenterReservation();
        return `
      <div class="hotspot-actions">
        <button data-action="open-overlay" data-overlay="recipes" type="button">Brew</button>
        <button data-action="clean-equipment" data-equipment-id="kettle" type="button" ${canClean ? '' : `disabled title="Need ${formatCurrency(cleanCost)}"`}>Clean${canClean ? '' : '<small>Need cash</small>'}</button>
        <button type="button" disabled title="${reservation.label}">Slot<small>${reservation.label}</small></button>
        <button data-action="open-overlay" data-overlay="upgrades" type="button">Store<small>Equipment</small></button>
      </div>
    `;
    }
    if (equipmentId === 'fermenter') {
        const waitingTransfer = state.batches.find((batch) => batch.step === 'awaiting-transfer');
        return `
      <div class="hotspot-actions">
        <button data-action="${waitingTransfer ? 'transfer-batch' : 'use-equipment'}" ${waitingTransfer ? `data-batch-id="${waitingTransfer.id}"` : 'data-equipment-id="fermenter"'} type="button">${waitingTransfer ? 'Transfer' : 'Inspect'}${waitingTransfer ? `<small>${waitingTransfer.recipeName}</small>` : ''}</button>
        <button data-action="set-fermenter-temperature" data-temperature="${state.fermenterTemperatureC - 1}" type="button">Cool<small>${state.fermenterTemperatureC - 1} C</small></button>
        <button data-action="set-fermenter-temperature" data-temperature="${state.fermenterTemperatureC + 1}" type="button">Warm<small>${state.fermenterTemperatureC + 1} C</small></button>
        <button data-action="clean-equipment" data-equipment-id="fermenter" type="button" ${canClean ? '' : `disabled title="Need ${formatCurrency(cleanCost)}"`}>Clean${canClean ? '' : '<small>Need cash</small>'}</button>
        <div class="temperature-note"><strong>${state.fermenterTemperatureC} C</strong><span>${fermenterTemperatureHint()}</span></div>
      </div>
    `;
    }
    if (equipmentId === 'mill') {
        return `
      <div class="hotspot-actions">
        <button data-action="use-equipment" data-equipment-id="mill" type="button">Inspect<small>Prep flow</small></button>
        <button data-action="clean-equipment" data-equipment-id="mill" type="button" ${canClean ? '' : `disabled title="Need ${formatCurrency(cleanCost)}"`}>Clean${canClean ? '' : '<small>Need cash</small>'}</button>
        <button type="button" disabled title="Milling actions are planned for a future pass">Mill<small>Coming later</small></button>
        <button data-action="open-overlay" data-overlay="upgrades" type="button">Store<small>Equipment</small></button>
      </div>
    `;
    }
    const readyBatch = state.batches.find((batch) => batch.step === 'awaiting-packaging');
    return `
    <div class="hotspot-actions">
      <button data-action="start-packaging" data-batch-id="${readyBatch?.id ?? ''}" type="button" ${readyBatch ? '' : 'disabled title="No fermented batch waiting"'}>Package${readyBatch ? `<small>${readyBatch.casesExpected} cases</small>` : '<small>No batch ready</small>'}</button>
      <button data-action="clean-equipment" data-equipment-id="bottler" type="button" ${canClean ? '' : `disabled title="Need ${formatCurrency(cleanCost)}"`}>Clean${canClean ? '' : '<small>Need cash</small>'}</button>
      <button type="button" disabled title="Use the store for equipment changes">Repair<small>No repair bench</small></button>
      <button data-action="open-overlay" data-overlay="upgrades" type="button">Store<small>Equipment</small></button>
    </div>
  `;
};
const storageToneClass = (used, capacity, overflow) => {
    if (overflow > 0)
        return 'overflowing';
    if (capacity > 0 && used / capacity >= 0.82)
        return 'crowded';
    if (used <= 0)
        return 'low-stock';
    return 'stocked';
};
const shouldShowStorageHotspot = (area, used, capacity, overflow) => {
    if (overflow > 0 || (capacity > 0 && used / capacity >= 0.82))
        return true;
    if (area === 'utility-shelf')
        return state.inventory.ingredients.bottles.amount <= 18;
    return false;
};
const sceneVisibility = () => {
    const workflow = currentWorkflowStage(state);
    const fermenting = state.batches.some((batch) => batch.step === 'fermenting');
    const packaging = state.batches.some((batch) => batch.step === 'awaiting-packaging' || batch.step === 'packaging' || batch.step === 'bottle-conditioning') || state.inventory.cases > 0;
    const hasSellableCases = state.inventory.cases > 0;
    return {
        showFloorNoteTicker: notificationsOpen,
        showWorkshopHotspot: true,
        showCases: hasSellableCases && workflow.tapTarget === 'cases',
        spotlightTarget: workflow.tapTarget,
        modeClass: packaging ? 'mode-packaging' : fermenting ? 'mode-fermentation' : state.batches.length > 0 ? 'mode-production' : 'mode-idle'
    };
};
const renderSceneSupplyHotspots = () => {
    const use = storageUseByArea(state);
    const capacity = storageCapacityByArea(state);
    const overflow = storageOverflowByArea(state);
    const supplyCards = [
        { area: 'dry-shelf', label: 'Dry shelf', className: 'dry-shelf-hotspot', amount: `${use['dry-shelf'].toFixed(1)}/${capacity['dry-shelf']} kg` },
        { area: 'cold-box', label: 'Cold box', className: 'cold-box-hotspot', amount: `${use['cold-box'].toFixed(2)}/${capacity['cold-box']} kg eq.` },
        { area: 'utility-shelf', label: 'Bottles', className: 'utility-shelf-hotspot', amount: `${use['utility-shelf'].toFixed(0)}/${capacity['utility-shelf']}` }
    ];
    return supplyCards
        .map((card) => ({ ...card, tone: storageToneClass(use[card.area], capacity[card.area], overflow[card.area]) }))
        .filter((card) => shouldShowStorageHotspot(card.area, use[card.area], capacity[card.area], overflow[card.area]))
        .map((card) => `
        <button class="supply-hotspot ${card.className} ${card.tone}" data-action="open-overlay" data-overlay="inventory" type="button" aria-label="${card.label} inventory alert">
          <span>${card.label}</span><strong>${card.amount}</strong>
        </button>
      `)
        .join('');
};
const renderWorkshopHotspot = () => {
    const installed = state.ownedEquipment.filter((item) => item.installed).reduce((total, equipment) => total + equipment.tier, 0);
    const total = Object.keys(stationLabels).reduce((sum, equipmentId) => sum + equipmentByStation(equipmentId).length, 0);
    return `
    <button class="workshop-hotspot" data-action="open-overlay" data-overlay="upgrades" type="button" aria-label="Equipment store">
      <span>Equipment</span><strong>${installed}/${total} tiers - ${garageSpaceUsed()}/${garageSpaceLimit()} space</strong>
    </button>
  `;
};
const renderGaragePressure = () => {
    const storageOverflow = Object.values(storageOverflowByArea(state)).reduce((total, amount) => total + amount, 0);
    const complianceTone = state.visibilityRisk >= 30 ? 'pressure-alert' : state.visibilityRisk >= 18 ? 'pressure-watch' : '';
    const householdTone = storageOverflow > 0 || state.pendingOrders.length > 1 ? 'pressure-watch' : '';
    return `
    <div class="garage-pressure-strip" aria-label="Garage pressure">
      <div><span>Channel</span><strong>${state.demand.accountName}</strong></div>
      <div class="${complianceTone}"><span>Compliance</span><strong>${state.visibilityRisk >= 30 ? 'Invoice risk' : `${state.visibilityRisk}/30`}</strong></div>
      <div class="${householdTone}"><span>Household</span><strong>${storageOverflow > 0 ? 'Clutter' : `${state.pendingOrders.length} deliveries`}</strong></div>
    </div>
  `;
};
const salesOffers = () => [
    { id: 'friends-family', name: 'Friends and family', cases: 4, price: 12, risk: 'Very low visibility', invoice: 'No invoice' },
    { id: 'private-event', name: 'Private event', cases: 8, price: 18, risk: 'Medium visibility', invoice: 'Informal receipt' },
    { id: 'local-bar', name: 'Local bar', cases: 12, price: 22, risk: 'High formal risk', invoice: state.canInvoice ? 'Invoice ready' : 'May ask for invoice' }
];
const renderSalesOffers = () => `
  <div class="hotspot-actions sales-offers">
    ${salesOffers()
    .map((offer) => {
    const cases = Math.min(offer.cases, state.inventory.cases);
    return `<button data-action="sell-channel" data-channel-id="${offer.id}" data-cases="${cases}" type="button" ${cases > 0 ? '' : 'disabled'}>
          ${offer.name}<small>${cases}/${offer.cases} cases - ${formatCurrency(cases * offer.price)} - ${offer.risk} - ${offer.invoice}</small>
        </button>`;
})
    .join('')}
  </div>
`;
const renderEventTicker = () => {
    const latest = state.events[0];
    return `
    <button class="event-ticker" data-action="open-overlay" data-overlay="log" type="button" aria-label="Open clipboard log">
      <span class="eyebrow gold">Floor note</span>
      <strong>${latest ? latest.message : 'No floor notes yet.'}</strong>
    </button>
  `;
};
const renderOpsControl = () => `
  <div class="ops-control ${opsOpen ? 'open' : ''}">
    <button class="ops-button" data-action="toggle-ops" type="button" aria-expanded="${opsOpen}" aria-label="Open operations layer"><span aria-hidden="true"></span></button>
    ${opsOpen
    ? `
          <button class="ops-scrim" data-action="toggle-ops" type="button" aria-label="Close operations layer"></button>
          <aside class="glass-panel ops-menu" aria-label="Brewery operations layer">
            <div class="ops-menu-heading">
              <span class="eyebrow gold">Operational layer</span>
              <strong>Floor controls</strong>
              <small>${saveStatus}</small>
            </div>
            <div class="ops-actions">
              <button data-action="open-overlay" data-overlay="recipes" type="button"><span>Brew</span><strong>Recipes</strong></button>
              <button data-action="open-overlay" data-overlay="production" type="button"><span>Flow state</span><strong>Production</strong></button>
              <button data-action="open-overlay" data-overlay="inventory" type="button"><span>Stockroom</span><strong>Inventory</strong></button>
              <button data-action="open-overlay" data-overlay="upgrades" type="button"><span>Bench</span><strong>Workshop</strong></button>
              <button data-action="open-overlay" data-overlay="log" type="button"><span>Clipboard</span><strong>Floor notes</strong></button>
              <button data-action="end-day" type="button"><span>Time</span><strong>End day</strong></button>
              <button data-action="reset-save" type="button"><span>Settings</span><strong>New Game / Reset Save</strong></button>
            </div>
          </aside>
        `
    : ''}
  </div>
`;
const renderAtmosphere = () => {
    const anyActive = state.batches.length > 0;
    const worstCondition = Math.min(...Object.values(state.equipment).map((equipment) => equipment.condition));
    const pending = state.pendingOrders.length > 0;
    return `
    ${activeForEquipment('kettle') ? '<div class="steam-wisp kettle-steam"></div>' : ''}
    ${activeForEquipment('fermenter') ? '<div class="equipment-glow fermenter-glow"></div>' : ''}
    ${activeForEquipment('bottler') ? '<div class="equipment-glow bottler-glow"></div>' : ''}
    ${anyActive ? '<div class="hose-line"></div>' : ''}
    ${state.inventory.cases > 0 ? `<div class="crate-stack" aria-label="${state.inventory.cases} finished cases"><span>${state.inventory.cases}</span></div>` : ''}
    ${pending ? `<div class="delivery-pallet" aria-label="${state.pendingOrders.length} incoming deliveries"><span>${state.pendingOrders.length}</span></div>` : ''}
    ${worstCondition < 62 ? '<div class="dirty-floor"></div>' : ''}
  `;
};
const renderGarage = () => {
    const position = brewerPosition();
    const visibility = sceneVisibility();
    const expandedClass = expandedTarget ? `has-expanded expanded-${expandedTarget}` : '';
    const equipment = garageSceneEquipmentInstances()
        .map((item) => {
        const visual = garageEquipmentLayoutByItem[item.itemId];
        const conditionTier = equipmentConditionTier(item.condition);
        const status = equipmentInstanceStatus(item);
        const active = activeForEquipmentInstance(item);
        const nextTap = isNextTapTargetForInstance(item);
        const expanded = expandedTarget === item.equipmentId && expandedEquipmentInstanceId === item.instanceId;
        const contextual = item.equipmentId === visibility.spotlightTarget || active || expanded || nextTap;
        const silent = !contextual && visibility.modeClass !== 'mode-idle';
        const obstructed = expandedTarget === 'fermenter'
            ? item.equipmentId === 'kettle' || item.equipmentId === 'bottler'
            : expandedTarget === 'bottler'
                ? item.equipmentId === 'fermenter'
                : false;
        if (!visual?.sprite) {
            const pos = garageLayoutDraft[item.slotId] ?? hotspotPosition(item.equipmentId);
            return `
          <article
            class="equipment-hotspot hotspot-${item.equipmentId} ${expanded ? 'expanded' : ''} ${contextual ? 'contextual' : ''} ${silent ? 'scene-silent' : ''} ${obstructed ? 'obstructed-by-card' : ''} condition-${conditionTier} ${status.toneClass} ${item.equipmentId === state.selectedEquipmentId ? 'selected' : ''} ${active ? 'active' : ''} ${nextTap ? 'next-tap' : ''}"
            style="--x: ${pos.x}%; --y: ${pos.y}%"
            data-action="toggle-target"
            data-target="${item.equipmentId}"
            data-equipment-item-id="${item.itemId}"
            data-equipment-instance-id="${item.instanceId}"
            data-layout-slot-id="${item.slotId}"
          >
            <button class="hotspot-toggle" data-action="toggle-target" data-target="${item.equipmentId}" data-equipment-instance-id="${item.instanceId}" type="button" aria-expanded="${expanded}" aria-label="${expanded ? 'Collapse' : 'Expand'} ${item.name}">
              <span class="hotspot-name">${item.label}</span>
              <strong>${status.label}</strong>
              ${expanded ? `<small>${status.detail}</small>` : ''}
            </button>
            ${expanded ? renderEquipmentActions(item.equipmentId) : ''}
          </article>
        `;
        }
        return renderEquipmentObject(item, `
          <button
            class="equipment-object-toggle hotspot-${item.equipmentId} ${expanded ? 'expanded' : ''} ${contextual ? 'contextual' : ''} ${silent ? 'scene-silent' : ''} condition-${conditionTier} ${status.toneClass} ${item.equipmentId === state.selectedEquipmentId ? 'selected' : ''} ${active ? 'active' : ''} ${nextTap ? 'next-tap' : ''}"
            data-action="${visual.interaction.action}"
            data-target="${visual.interaction.equipmentId}"
            data-equipment-instance-id="${item.instanceId}"
            type="button"
            aria-expanded="${expanded}"
            aria-label="${expanded ? 'Collapse' : 'Expand'} ${item.name}"
          >
            <img class="equipment-sprite equipment-sprite-${item.equipmentId}" src="${visual.sprite}" alt="${item.name}" draggable="false" />
          </button>
          <div class="equipment-object-card ${expanded ? 'expanded' : ''} ${obstructed ? 'obstructed-by-card' : ''}" ${expanded ? '' : 'hidden'}>
            <span class="hotspot-name">${item.label}</span>
            <strong>${status.label}</strong>
            <small>${status.detail}</small>
            ${renderEquipmentActions(item.equipmentId)}
          </div>
        `);
    })
        .join('');
    return `
    <section class="garage-scene ${expandedClass} ${visibility.modeClass} ${layoutDebugEnabled ? 'layout-debug-enabled' : ''}" aria-label="Playable garage brewery floor">
      <div class="scene-vignette"></div>
      ${renderAtmosphere()}
      <div class="stage-summary" aria-label="Workflow overview">Mash · Ferment · Package · Sell</div>
      ${renderMissionsControl()}
      ${renderGaragePressure()}
      ${renderSceneSupplyHotspots()}
      ${visibility.showWorkshopHotspot ? renderWorkshopHotspot() : ''}
      ${visibility.showFloorNoteTicker ? renderEventTicker() : ''}
      ${equipment}
      ${visibility.showCases ? `<article class="case-hotspot ${expandedTarget === 'cases' ? 'expanded' : ''} ${expandedTarget === 'bottler' ? 'obstructed-by-card' : ''} ${state.inventory.cases > 0 ? 'active' : ''} ${isNextTapTarget('cases') ? 'next-tap' : ''}" data-action="toggle-target" data-target="cases">
        <button class="hotspot-toggle" data-action="toggle-target" data-target="cases" type="button" aria-expanded="${expandedTarget === 'cases'}" aria-label="Expand cases">
          <span class="hotspot-name">Cases</span>
          <strong>${state.inventory.cases}</strong>
          ${expandedTarget === 'cases' ? `<small>${state.inventory.cases > 0 ? 'Ready to sell' : 'Packaged'}</small>` : ''}
        </button>
        ${expandedTarget === 'cases'
        ? renderSalesOffers()
        : ''}
      </article>` : ''}
      <div class="brewer-avatar" style="left: ${position.left}; top: ${position.top}" aria-label="Brewer position"><span></span></div>
      ${renderOpsControl()}
      ${renderLayoutDebugPanel()}
    </section>
  `;
};
const renderBatchBoard = () => {
    const batchCards = state.batches.length === 0
        ? '<p>No active batch. Tap the brew system to choose a recipe.</p>'
        : state.batches
            .map((batch) => {
            const recipe = visibleRecipes().find((item) => item.id === batch.recipeId);
            const duration = recipe && batch.step in recipe.stepDurations ? recipe.stepDurations[batch.step] : 0;
            const remaining = duration > 0 ? Math.max(0, Math.round(duration * (1 - batch.stepProgress / 100))) : 0;
            const progress = batch.step === 'awaiting-transfer' || batch.step === 'awaiting-packaging' ? 100 : batch.stepProgress;
            return `
              <article class="batch-card">
                <div><strong>${batch.recipeName}</strong><span>${stepLabel(batch.step)} - Q${batch.quality}</span></div>
                <small>${batch.casesExpected} cases expected - ${remaining > 0 ? `${remaining} in-game minutes remaining` : 'Waiting for player input'} - contamination risk ${batch.contaminationRisk}%</small>
                <progress value="${progress}" max="100"></progress>
                ${batch.step === 'awaiting-transfer'
                ? `<button data-action="transfer-batch" data-batch-id="${batch.id}" type="button">Transfer to fermenter</button>`
                : batch.step === 'awaiting-packaging'
                    ? `<button data-action="start-packaging" data-batch-id="${batch.id}" type="button">Package</button>`
                    : ''}
              </article>
            `;
        })
            .join('');
    const lotCards = state.finishedBeerLots.length > 0
        ? `${state.finishedBeerLots.map((lot) => `<article class="batch-card"><div><strong>${lot.recipeName}</strong><span>${lot.cases} cases - Q${lot.quality}</span></div><small>Market appeal ${Math.round(lot.marketAppeal * 100)}%</small></article>`).join('')}${renderSalesOffers()}`
        : '';
    return `
    <section class="overlay-section">
      <div class="panel-heading"><span class="eyebrow gold">Production</span><h2>Production flow</h2></div>
      ${batchCards}
      ${lotCards}
    </section>
  `;
};
const renderStorageStatus = () => {
    const use = storageUseByArea(state);
    const capacity = storageCapacityByArea(state);
    const overflow = storageOverflowByArea(state);
    return `
    <div class="inventory-list storage-detail-list">
      <div><span>Dry shelf</span><strong>${use['dry-shelf'].toFixed(1)}/${capacity['dry-shelf']} kg${overflow['dry-shelf'] > 0 ? ' overflow' : ''}</strong></div>
      <div><span>Cold box</span><strong>${use['cold-box'].toFixed(2)}/${capacity['cold-box']} kg eq.${overflow['cold-box'] > 0 ? ' overflow' : ''}</strong></div>
      <div><span>Utility shelf</span><strong>${use['utility-shelf'].toFixed(0)}/${capacity['utility-shelf']} units${overflow['utility-shelf'] > 0 ? ' overflow' : ''}</strong></div>
    </div>
  `;
};
const renderInventory = () => `
  <section class="overlay-section inventory-overlay-detail">
    <div class="panel-heading"><span class="eyebrow gold">Supplies</span><h2>Inventory detail</h2></div>
    ${renderStorageStatus()}
    <div class="inventory-list">
      <div><span>Water</span><strong>${state.inventory.water} L</strong></div>
      <div><span>Cases</span><strong>${state.inventory.cases}</strong></div>
      <div><span>Garage equipment space</span><strong>${garageSpaceUsed()}/${garageSpaceLimit()}</strong></div>
      <div><span>Sales channel</span><strong>${state.demand.accountName}</strong></div>
      <div><span>Compliance pressure</span><strong>${state.visibilityRisk >= 30 ? 'Invoice risk' : `${state.visibilityRisk}/30 visible`}</strong></div>
      ${ingredients
    .map((ingredient) => {
    const stock = state.inventory.ingredients[ingredient.id];
    const lowClass = stock.amount <= 0 ? 'low-stock-row' : '';
    return `<div class="${lowClass}"><span>${ingredient.name}</span><strong>${ingredientAmountLabel(ingredient.id, stock.amount)} · ${Math.round(stock.condition)}%</strong><button data-action="order-ingredient" data-ingredient-id="${ingredient.id}" type="button" ${state.cash >= ingredient.packPrice ? '' : 'disabled'}>Order ${formatCurrency(ingredient.packPrice)}</button></div>`;
})
    .join('')}
    </div>
    <div class="inventory-list incoming-list">
      <div><span>Incoming orders</span><strong>${state.pendingOrders.length}</strong></div>
      ${state.pendingOrders
    .map((order) => `<div><span>Ordered / Arrives ${formatGameDate(order.arrivalDay)}</span><strong>${formatCurrency(order.cost)} · ${order.items.map((item) => `${getIngredient(item.ingredientId).name} x${item.packs}`).join(', ')}</strong></div>`)
    .join('')}
    </div>
  </section>
`;
const equipmentStoreButtonState = (item) => {
    const current = state.equipment[item.equipmentId];
    const ownedCount = state.ownedEquipment.filter((owned) => owned.itemId === item.id).length;
    const canOwnMore = Boolean(item.maxOwned && ownedCount < item.maxOwned);
    const projectedSpace = garageSpaceUsed() + item.spaceUsed;
    if (ownedCount > 0 && item.id === current.itemId && !canOwnMore)
        return { disabled: true, label: 'Installed', reason: 'On the garage floor now', className: 'upgrade-installed' };
    if (!item.maxOwned && ownedCount > 0)
        return { disabled: true, label: 'Owned', reason: 'Already installed', className: 'upgrade-installed' };
    if (item.maxOwned && ownedCount >= item.maxOwned)
        return { disabled: true, label: 'Limit', reason: `${ownedCount}/${item.maxOwned} owned`, className: 'upgrade-locked' };
    if (state.cash < item.cost)
        return { disabled: true, label: 'Need cash', reason: `Need ${formatCurrency(item.cost)}`, className: 'upgrade-locked' };
    if (projectedSpace > garageSpaceLimit())
        return { disabled: true, label: 'No space', reason: `${projectedSpace}/${garageSpaceLimit()} garage space`, className: 'upgrade-locked' };
    return { disabled: false, label: canOwnMore ? 'Add another' : 'Buy', reason: `${formatCurrency(item.cost)} - ${projectedSpace}/${garageSpaceLimit()} space after purchase`, className: '' };
};
const renderEquipmentStoreCard = (item) => {
    const buttonState = equipmentStoreButtonState(item);
    const current = state.equipment[item.equipmentId];
    const ownedCount = state.ownedEquipment.filter((owned) => owned.itemId === item.id).length;
    const isCurrent = ownedCount > 0 && item.id === current.itemId;
    return `
    <button class="upgrade-pallet equipment-store-card tier-${item.tier} ${buttonState.className}" type="button" data-action="buy-equipment" data-equipment-item-id="${item.id}" ${buttonState.disabled ? `disabled title="${buttonState.reason}"` : ''}>
      <span>${isCurrent ? 'Installed: ' : ''}${item.name}</span>
      <small>Tier ${item.tier} ${stationLabels[item.equipmentId]} - ${item.capacityLiters} L - ${item.spaceUsed} space</small>
      <small>${item.description}</small>
      <strong>${buttonState.label}</strong>
      <em>${buttonState.reason}</em>
    </button>
  `;
};
const renderEquipmentStore = () => `
  <section class="overlay-section upgrade-shop workshop-overlay">
    <div class="panel-heading store-heading">
      <span class="eyebrow gold">Equipment store</span>
      <h2>Garage equipment</h2>
      <small>${garageSpaceUsed()}/${garageSpaceLimit()} garage space used</small>
    </div>
    ${Object.keys(stationLabels)
    .map((station) => `
          <section class="equipment-store-group">
            <div class="store-group-heading">
              <span class="eyebrow">${stationLabels[station]}</span>
              <strong>${displayEquipmentName(state.equipment[station])}</strong>
              <small>${equipmentCapacityLabel(state.equipment[station])} - ${state.equipment[station].spaceUsed} space</small>
            </div>
            <div class="equipment-store-grid">
              ${equipmentByStation(station).map(renderEquipmentStoreCard).join('')}
            </div>
          </section>
        `)
    .join('')}
  </section>
`;
const renderEventLog = () => `
  <section class="overlay-section clipboard-popover">
    <div class="panel-heading"><span class="eyebrow gold">Clipboard</span><h2>Floor notes</h2></div>
    <ol>
      ${state.events.map((event) => `<li><time>${formatClock(event.minute)}</time><span>${event.message}</span></li>`).join('')}
    </ol>
  </section>
`;
const overlayContent = () => {
    if (activeOverlay === 'recipes')
        return `<div class="focus-grid recipe-overlay">${renderRecipeCards()}</div>`;
    if (activeOverlay === 'production')
        return renderBatchBoard();
    if (activeOverlay === 'inventory')
        return renderInventory();
    if (activeOverlay === 'upgrades')
        return renderEquipmentStore();
    if (activeOverlay === 'log')
        return renderEventLog();
    return '';
};
const overlayTitle = () => ({ recipes: 'Recipe / Brew', production: 'Production', inventory: 'Inventory detail', upgrades: 'Equipment store', log: 'Clipboard log' })[activeOverlay ?? 'production'];
const renderFocusOverlay = () => activeOverlay
    ? `
      <div class="focus-layer" role="dialog" aria-modal="false" aria-label="${overlayTitle()}">
        <button class="focus-scrim" data-action="close-overlay" type="button" aria-label="Dismiss overlay background"></button>
        <aside class="glass-panel focus-overlay focus-${activeOverlay}">
          <button class="overlay-close" data-action="close-overlay" type="button" aria-label="Close overlay"></button>
          ${overlayContent()}
        </aside>
      </div>
    `
    : '';
const render = () => {
    root.innerHTML = `
    <main class="game-shell">
      ${renderTopHud()}
      ${renderGarage()}
      ${renderFocusOverlay()}
      <div class="rotate-blocker" role="dialog" aria-modal="true" aria-label="Rotate device">
        <strong>Brewery-Sim is played in landscape mode.</strong>
        <span>Rotate your device to continue brewing.</span>
      </div>
    </main>
  `;
};
root.addEventListener('error', (event) => {
    if (event.target instanceof HTMLImageElement && event.target.classList.contains('equipment-sprite')) {
        event.target.hidden = true;
    }
}, true);
root.addEventListener('input', (event) => {
    if (!layoutDebugEnabled)
        return;
    const input = event.target.closest('[data-layout-slot-id][data-layout-field]');
    if (!input)
        return;
    const slotId = input.dataset.layoutSlotId;
    const field = input.dataset.layoutField;
    const nextValue = input.valueAsNumber;
    if (!Number.isFinite(nextValue))
        return;
    const placementValue = Math.min(100, Math.max(0, nextValue));
    const displayValue = String(placementValue);
    garageLayoutDraft[slotId][field] = placementValue;
    root.querySelectorAll(`[data-layout-slot-id="${slotId}"][data-layout-field="${field}"]`).forEach((control) => {
        if (control.value !== displayValue)
            control.value = displayValue;
    });
    applySpritePlacement(slotId);
    updateLayoutDebugJson();
});
root.addEventListener('click', (event) => {
    audioAllowed = true;
    const target = event.target.closest('[data-action]');
    if (!target) {
        const clickTarget = event.target;
        const isInsideOpenSurface = Boolean(clickTarget.closest('.equipment-object, .equipment-hotspot, .case-hotspot, .supply-hotspot, .workshop-hotspot, .event-ticker, .missions-control, .notification-control, .ops-control, .layout-debug-panel, .focus-overlay, button'));
        if ((expandedTarget || missionsOpen || notificationsOpen || opsOpen || activeOverlay) && !isInsideOpenSurface) {
            expandedTarget = null;
            expandedEquipmentInstanceId = null;
            missionsOpen = false;
            notificationsOpen = false;
            opsOpen = false;
            activeOverlay = null;
            render();
        }
        return;
    }
    const action = target.dataset.action;
    if (action === 'close-overlay') {
        activeOverlay = null;
        opsOpen = false;
        render();
        return;
    }
    if (action === 'open-overlay') {
        activeOverlay = target.dataset.overlay;
        expandedTarget = null;
        expandedEquipmentInstanceId = null;
        missionsOpen = false;
        notificationsOpen = false;
        opsOpen = false;
        render();
        return;
    }
    if (action === 'toggle-ops') {
        opsOpen = !opsOpen;
        missionsOpen = false;
        notificationsOpen = false;
        expandedTarget = null;
        expandedEquipmentInstanceId = null;
        activeOverlay = null;
        render();
        return;
    }
    if (action === 'reset-save') {
        resetGame();
        return;
    }
    if (action === 'end-day') {
        opsOpen = false;
        dispatch({ type: 'end-day' });
        return;
    }
    if (action === 'toggle-missions') {
        missionsOpen = !missionsOpen;
        notificationsOpen = false;
        expandedTarget = null;
        expandedEquipmentInstanceId = null;
        activeOverlay = null;
        opsOpen = false;
        render();
        return;
    }
    if (action === 'toggle-notifications') {
        notificationsOpen = !notificationsOpen;
        missionsOpen = false;
        expandedTarget = null;
        expandedEquipmentInstanceId = null;
        activeOverlay = null;
        opsOpen = false;
        render();
        return;
    }
    if (action === 'toggle-target') {
        const nextTarget = target.dataset.target;
        const nextInstanceId = target.dataset.equipmentInstanceId ?? null;
        if (nextTarget === 'kettle') {
            activeOverlay = 'recipes';
            expandedTarget = null;
            expandedEquipmentInstanceId = null;
            missionsOpen = false;
            notificationsOpen = false;
            opsOpen = false;
            render();
            return;
        }
        const waitingTransfer = state.batches.find((batch) => batch.step === 'awaiting-transfer');
        if (nextTarget === 'fermenter' && waitingTransfer && (!nextInstanceId || nextInstanceId === waitingTransfer.fermenterInstanceId)) {
            dispatch({ type: 'transfer-batch', batchId: waitingTransfer.id });
            return;
        }
        if (nextTarget === 'bottler' && state.batches.some((batch) => batch.step === 'awaiting-packaging')) {
            dispatch({ type: 'use-equipment', equipmentId: 'bottler' });
            return;
        }
        const collapseSameTarget = expandedTarget === nextTarget && expandedEquipmentInstanceId === nextInstanceId;
        expandedTarget = collapseSameTarget ? null : nextTarget;
        expandedEquipmentInstanceId = collapseSameTarget ? null : nextInstanceId;
        missionsOpen = false;
        notificationsOpen = false;
        activeOverlay = null;
        opsOpen = false;
        render();
        return;
    }
    if (action === 'use-equipment') {
        dispatch({ type: 'use-equipment', equipmentId: target.dataset.equipmentId });
        return;
    }
    if (action === 'start-batch') {
        activeOverlay = null;
        opsOpen = false;
        dispatch({ type: 'start-batch', recipeId: target.dataset.recipeId ?? 'garage-blonde' });
        return;
    }
    if (action === 'order-recipe') {
        opsOpen = false;
        dispatch({ type: 'order-recipe', recipeId: target.dataset.recipeId ?? 'garage-blonde', mode: target.dataset.orderMode === 'extra' ? 'extra' : 'missing' });
        return;
    }
    if (action === 'order-ingredient') {
        dispatch({ type: 'order-ingredient', ingredientId: target.dataset.ingredientId, packs: 1 });
        return;
    }
    if (action === 'transfer-batch') {
        dispatch({ type: 'transfer-batch', batchId: target.dataset.batchId ?? '' });
        return;
    }
    if (action === 'start-packaging') {
        dispatch({ type: 'start-packaging', batchId: target.dataset.batchId ?? '' });
        return;
    }
    if (action === 'sell-cases') {
        activeOverlay = null;
        opsOpen = false;
        dispatch({ type: 'sell-cases', cases: Math.min(6, state.inventory.cases) });
        return;
    }
    if (action === 'sell-channel') {
        activeOverlay = null;
        opsOpen = false;
        dispatch({ type: 'sell-channel', channelId: target.dataset.channelId, cases: Number(target.dataset.cases ?? 0) });
        return;
    }
    if (action === 'buy-equipment')
        dispatch({ type: 'buy-equipment', equipmentItemId: target.dataset.equipmentItemId });
    if (action === 'set-fermenter-temperature')
        dispatch({ type: 'set-fermenter-temperature', temperatureC: Number(target.dataset.temperature ?? state.fermenterTemperatureC) });
    if (action === 'clean-equipment')
        dispatch({ type: 'clean-equipment', equipmentId: target.dataset.equipmentId });
});
render();
//# sourceMappingURL=main.js.map