import { equipmentByStation } from './data/equipment.js';
import {
  garageEquipmentLayoutByItem,
  garageSellPointLayout,
  type GarageSellPointId
} from './data/garageLayout.js';
import { ingredients, getIngredient } from './data/ingredients.js';
import type { Batch, Equipment, EquipmentCatalogItem, EquipmentId, EquipmentItemId, GameAction, IngredientId, RecipeCategoryId, SalesChannelId } from './game/schema.js';
import { createInitialState } from './game/initialState.js';
import { resetSavedGame, saveGameState } from './game/persistence.js';
import {
  campaignAllowsCleaning,
  campaignAllowsFormalBuyers,
  campaignAllowsPressure,
  campaignAllowsTemperature,
  campaignNextStep,
  campaignPrimaryTarget,
  campaignView,
  isMissionSeen
} from './game/campaign.js';
import {
  caseCountLabel,
  caseDefinitionExplanation,
  contaminationRiskTier,
  currentWorkflowStage,
  equipmentConditionLabel,
  equipmentConditionTier,
  formatBatchRemainingTime,
  formatGameDate,
  formatClock,
  formatCurrency,
  garageSpaceAvailable,
  ingredientAmountLabel,
  objectiveProgress,
  orderCost,
  recipeMissingOrderSummary,
  recipeMissingIngredients,
  recipeRequirementSummary,
  recipeSupplyBreakdown,
  storageCapacityByArea,
  storageOverflowByArea,
  storageUseByArea,
  visibleRecipes
} from './game/selectors.js';
import { reduceGame } from './game/simulation.js';
import { createBootState, createTier2PreviewState } from './ui/appBoot.js';
import { createLayoutDebugModel, handleLayoutDebugInput, renderLayoutDebugPanel } from './ui/layoutDebug.js';
import { renderRecipeSelectionPanel } from './ui/recipePanel.js';
import { displayEquipmentName, garageSceneEquipmentInstances, stationLabels } from './ui/sceneEquipment.js';
import { renderEquipmentActions, renderSalesOffers, renderStationPanel } from './ui/stationPanel.js';
import type { FocusOverlay, GarageSceneEquipmentInstance, SceneTarget, ShopSection, StoreStation } from './ui/types.js';

const root = document.querySelector<HTMLDivElement>('#root');

if (!root) {
  throw new Error('Missing #root element');
}

const boot = createBootState();
const { layoutDebugEnabled, tier2PreviewEnabled, activeGarageLayoutTier } = boot.config;
let state = boot.state;
let saveStatus = boot.saveStatus;
let expandedTarget: SceneTarget | null = null;
let expandedEquipmentInstanceId: string | null = null;
let missionsOpen = false;
let notificationsOpen = false;
let opsOpen = false;
let activeOverlay: FocusOverlay | null = null;
let recipePanelOpen = false;
let selectedRecipeCategoryId: RecipeCategoryId | null = null;
let selectedShopSection: ShopSection | null = null;
let recipePage = 0;
let audioAllowed = false;
let scenePayoff: { kind: 'pallet' | 'sale'; title: string; detail: string; key: number } | null = null;
let scenePayoffTimer: number | null = null;
let scenePayoffKey = 0;
const GUIDANCE_DISMISSED_KEY = 'brewery-sim-guidance-dismissed';
let guidanceDismissed = false;

try {
  guidanceDismissed = globalThis.localStorage?.getItem(GUIDANCE_DISMISSED_KEY) === '1';
} catch {
  guidanceDismissed = false;
}

const layoutDebugModel = createLayoutDebugModel(activeGarageLayoutTier, layoutDebugEnabled);

const renderEquipmentObject = (equipment: GarageSceneEquipmentInstance, content: string): string => {
  const visual = garageEquipmentLayoutByItem[equipment.itemId];
  if (!visual.sprite) return '';

  const placement = layoutDebugModel.equipmentDraft[equipment.slotId];
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

const equipmentCapacityLabel = (equipment: Equipment): string => {
  const liters = equipment.capacityLiters;
  if (equipment.id === 'mill') return 'Milling prep station';
  if (equipment.id === 'bottler') return liters > 0 ? `${liters} L packaging run` : 'Packaging capacity pending';
  return liters > 0 ? `${liters} L capacity` : 'Capacity pending';
};

const garageSpaceUsed = (): number => state.garageSpaceUsed;
const garageSpaceLimit = (): number => state.garageSpaceLimit;

const fermenterReservation = (): { blocked: boolean; label: string; detail: string } => {
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

const recipeStartBlocker = (recipe: ReturnType<typeof visibleRecipes>[number]): string => {
  const reservation = fermenterReservation();
  if (!recipe.enabled) return 'Recipe locked';
  if (state.inventory.water < recipe.waterCost) return `Need ${recipe.waterCost} L water`;
  if (recipeMissingIngredients(state, recipe).length > 0) return 'Missing ingredients';
  if (state.energy < 35) return 'Low energy';
  if (state.batches.some((batch) => batch.step === 'brewing')) return 'Brewhouse busy';
  if (reservation.blocked) return reservation.label;
  return '';
};

const incomingForIngredient = (ingredientId: IngredientId): { amount: number; arrivalDay: number | null } =>
  state.pendingOrders.reduce(
    (summary, order) => {
      const amount = order.items.filter((item) => item.ingredientId === ingredientId).reduce((total, item) => total + item.amount, 0);
      if (amount <= 0) return summary;
      return {
        amount: summary.amount + amount,
        arrivalDay: summary.arrivalDay === null ? order.arrivalDay : Math.min(summary.arrivalDay, order.arrivalDay)
      };
    },
    { amount: 0, arrivalDay: null as number | null }
  );

const fermenterTemperatureHint = (): string => {
  const fermenting = state.batches.find((batch) => batch.step === 'fermenting');
  const recipe = fermenting ? visibleRecipes().find((item) => item.id === fermenting.recipeId) : null;
  if (!recipe) return 'Set for next batch';
  const ingredientIds = recipe.ingredients.map((ingredient) => ingredient.ingredientId);
  const target = ingredientIds.includes('lager-yeast')
    ? { label: 'lager', min: 9, max: 14 }
    : ingredientIds.includes('kveik-yeast') || recipe.style.toLowerCase().includes('kveik')
      ? { label: 'kveik', min: 28, max: 40 }
      : ingredientIds.includes('saison-yeast')
        ? { label: 'saison', min: 20, max: 30 }
        : ingredientIds.includes('wheat-yeast')
          ? { label: 'wheat ale', min: 18, max: 24 }
          : { label: 'ale', min: 17, max: 22 };
  if (state.fermenterTemperatureC < target.min) return `Too cool for ${target.label} - slower fermentation`;
  if (state.fermenterTemperatureC > target.max) return `Too warm for ${target.label} - off-flavor risk`;
  return `${target.label[0].toUpperCase()}${target.label.slice(1)} target ${target.min}-${target.max} C`;
};


const playBell = () => {
  if (!audioAllowed) return;
  try {
    const audioGlobal = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = globalThis.AudioContext ?? audioGlobal.webkitAudioContext;
    if (!AudioContextClass) return;
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
  } catch {
    // Browser audio can be blocked; notification sound is optional.
  }
};

const showScenePayoff = (kind: 'pallet' | 'sale', title: string, detail: string) => {
  scenePayoffKey += 1;
  scenePayoff = { kind, title, detail, key: scenePayoffKey };
  if (scenePayoffTimer !== null) globalThis.clearTimeout(scenePayoffTimer);
  scenePayoffTimer = globalThis.setTimeout(() => {
    scenePayoff = null;
    scenePayoffTimer = null;
    render();
  }, 2400);
};

const dispatch = (action: GameAction) => {
  const previousEventId = state.events[0]?.id;
  const previousCash = state.cash;
  const previousReputation = state.reputation;
  const previousCases = state.inventory.cases;
  const overlayScrollTop = document.querySelector<HTMLElement>('.focus-overlay')?.scrollTop ?? 0;
  state = reduceGame(state, action);
  const caseDelta = state.inventory.cases - previousCases;
  if (caseDelta > 0) {
    showScenePayoff('pallet', 'Pallet filled', `${caseCountLabel(caseDelta)} moved beside the garage door.`);
  }
  if ((action.type === 'sell-cases' || action.type === 'sell-channel') && (state.cash > previousCash || state.inventory.cases < previousCases)) {
    const cashDelta = state.cash - previousCash;
    const repDelta = state.reputation - previousReputation;
    showScenePayoff('sale', 'Cases sold', `${cashDelta > 0 ? `+${formatCurrency(cashDelta)}` : 'No cash'}${repDelta > 0 ? ` - Rep +${repDelta}` : ''}`);
  }
  if (tier2PreviewEnabled) {
    saveStatus = 'Tier 2 layout preview - not saved';
  } else {
    saveGameState(state);
    saveStatus = `Saved locally ${formatClock(state.minute)}`;
  }
  if (state.events[0]?.id && state.events[0]?.id !== previousEventId) playBell();
  render();
  if (activeOverlay) {
    const overlay = document.querySelector<HTMLElement>('.focus-overlay');
    if (overlay) overlay.scrollTop = overlayScrollTop;
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
  try { globalThis.localStorage?.removeItem(GUIDANCE_DISMISSED_KEY); } catch {}
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

const stepLabel = (step: string) =>
  ({
    brewing: 'Brewing',
    'awaiting-transfer': 'Awaiting transfer',
    fermenting: 'Fermenting',
    'awaiting-packaging': 'Awaiting packaging',
    packaging: 'Packaging',
    'bottle-conditioning': 'Bottle conditioning',
    ready: 'Ready'
  })[step] ?? step;


const recipeForBatch = (batch: Batch) => visibleRecipes().find((item) => item.id === batch.recipeId);

const batchRemainingLabel = (batch: Batch): string => {
  const recipe = recipeForBatch(batch);
  return recipe ? formatBatchRemainingTime(state, batch, recipe) : batch.stepProgress >= 100 ? 'Ready now' : 'Waiting for player input';
};

const brewingBatch = () => state.batches.find((batch) => batch.step === 'brewing');
const awaitingTransferBatch = () => state.batches.find((batch) => batch.step === 'awaiting-transfer');

const activeForEquipment = (equipmentId: EquipmentId) => {
  const stepByEquipment: Partial<Record<EquipmentId, string>> = { kettle: 'brewing', fermenter: 'fermenting', bottler: 'packaging' };
  const step = stepByEquipment[equipmentId];
  if (!step) return false;
  return state.batches.some((batch) => batch.step === step);
};

const batchForEquipment = (equipmentId: EquipmentId) => {
  const stepByEquipment: Partial<Record<EquipmentId, string>> = { kettle: 'brewing', fermenter: 'fermenting', bottler: 'packaging' };
  const step = stepByEquipment[equipmentId];
  if (!step) return undefined;
  return state.batches.find((batch) => batch.step === step);
};

const isNextTapTarget = (target: SceneTarget) => {
  const campaignTarget = campaignPrimaryTarget(state);
  if (campaignTarget === 'shop' || campaignTarget === 'ops' || campaignTarget === 'notebook') return false;
  return campaignTarget === target || currentWorkflowStage(state).tapTarget === target;
};

const equipmentMetaLine = (equipment: Equipment): string => `${equipmentCapacityLabel(equipment)} - ${equipment.spaceUsed || '?'} space`;

const equipmentSceneStatus = (equipmentId: EquipmentId): { label: string; detail: string; toneClass: string } => {
  const equipment = state.equipment[equipmentId];
  const activeBatch = batchForEquipment(equipmentId);
  const conditionLabel = equipmentConditionLabel(equipment.condition);
  const conditionDetail = `Cleanliness: ${conditionLabel}`;

  if (equipmentId === 'kettle') {
    const brewing = brewingBatch();
    const waitingTransfer = awaitingTransferBatch();
    if (waitingTransfer) {
      return {
        label: 'Ready to transfer',
        detail: `Brew check: clear wort, ${caseCountLabel(waitingTransfer.casesExpected)} expected. Transfer when the fermenter is ready.`,
        toneClass: 'risk-low'
      };
    }
    if (brewing) {
      return {
        label: 'Brewing',
        detail: `${brewing.recipeName} - ${batchRemainingLabel(brewing)}`,
        toneClass: 'risk-low'
      };
    }
    return {
      label: 'Idle',
      detail: `${conditionDetail} - ready to brew`,
      toneClass: `condition-${equipmentConditionTier(equipment.condition)}`
    };
  }

  if (equipmentId === 'fermenter') {
    const waitingTransfer = state.batches.find((batch) => batch.step === 'awaiting-transfer');
    if (waitingTransfer) {
      return {
        label: 'Waiting at kettle',
        detail: `${waitingTransfer.recipeName} is still in the stock pot`,
        toneClass: 'risk-high'
      };
    }
    const fermenting = activeBatch ?? state.batches.find((batch) => batch.step === 'fermenting');
    if (fermenting) {
      const tier = contaminationRiskTier(fermenting.contaminationRisk);
      const detailParts = [fermenting.recipeName, batchRemainingLabel(fermenting)];
      if (campaignAllowsTemperature(state)) detailParts.splice(1, 0, `${state.fermenterTemperatureC} C`);
      if (campaignAllowsCleaning(state)) detailParts.push(`infection chance ${fermenting.contaminationRisk}%`);
      return {
        label: 'Fermenting',
        detail: detailParts.join(' - '),
        toneClass: `risk-${tier}`
      };
    }
    return {
      label: 'Empty',
      detail: `${state.fermenterTemperatureC} C - ${equipmentMetaLine(equipment)}`,
      toneClass: `condition-${equipmentConditionTier(equipment.condition)}`
    };
  }

  if (equipmentId === 'bottler') {
    const readyBatch = state.batches.find((batch) => batch.step === 'awaiting-packaging');
    const packagingBatch = state.batches.find((batch) => batch.step === 'packaging' || batch.step === 'bottle-conditioning');
    const conditioningBatch = state.batches.find((batch) => batch.step === 'bottle-conditioning');
    const tier = equipmentConditionTier(equipment.condition);
    if (readyBatch) {
      return {
        label: 'Package available',
        detail: tier === 'dirty' || tier === 'critical' ? `${caseCountLabel(readyBatch.casesExpected)} - packaging loss risk` : `${caseCountLabel(readyBatch.casesExpected)} ready`,
        toneClass: tier === 'dirty' || tier === 'critical' ? 'risk-high' : 'risk-low'
      };
    }
    if (packagingBatch) {
      return {
        label: 'Bottling',
        detail: `${packagingBatch.recipeName} - ${batchRemainingLabel(packagingBatch)} - ${caseCountLabel(packagingBatch.casesExpected)} headed to the pallet`,
        toneClass: 'risk-low'
      };
    }
    if (conditioningBatch) {
      return {
        label: 'Packaging / conditioning complete',
        detail: `${conditioningBatch.recipeName} - ${batchRemainingLabel(conditioningBatch)}`, 
        toneClass: 'risk-low'
      };
    }
    if (state.inventory.cases > 0) {
      return {
        label: 'Packaging / conditioning complete',
        detail: `${caseCountLabel(state.inventory.cases)} on pallet`,
        toneClass: 'risk-low'
      };
    }
    if (tier !== 'dirty' && tier !== 'critical') {
      return {
        label: 'Idle',
        detail: `${conditionDetail} - no batch at the bottling bench`,
        toneClass: `condition-${tier}`
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

const batchForEquipmentInstance = (equipment: GarageSceneEquipmentInstance) => {
  if (equipment.equipmentId !== 'fermenter') return batchForEquipment(equipment.equipmentId);
  return state.batches.find((batch) => batch.fermenterInstanceId === equipment.instanceId);
};

const activeForEquipmentInstance = (equipment: GarageSceneEquipmentInstance): boolean => {
  const batch = batchForEquipmentInstance(equipment);
  if (equipment.equipmentId === 'fermenter') return batch?.step === 'fermenting';
  return activeForEquipment(equipment.equipmentId);
};

const isNextTapTargetForInstance = (equipment: GarageSceneEquipmentInstance): boolean => {
  if (equipment.equipmentId === 'kettle') return isNextTapTarget('kettle') && (state.batches.length === 0 || state.batches.some((batch) => batch.step === 'brewing' || batch.step === 'awaiting-transfer'));
  if (equipment.equipmentId === 'bottler') return isNextTapTarget('bottler') && state.batches.some((batch) => batch.step === 'packaging' || batch.step === 'bottle-conditioning');
  if (equipment.equipmentId !== 'fermenter') return isNextTapTarget(equipment.equipmentId);
  if (!isNextTapTarget('fermenter')) return false;
  const packageBatch = state.batches.find((batch) => batch.step === 'awaiting-packaging');
  if (packageBatch) return packageBatch.fermenterInstanceId === equipment.instanceId;
  return false;
};

const equipmentInstanceStatus = (equipment: GarageSceneEquipmentInstance): { label: string; detail: string; toneClass: string } => {
  if (equipment.equipmentId !== 'fermenter') return equipmentSceneStatus(equipment.equipmentId);

  const conditionTier = equipmentConditionTier(equipment.condition);
  const batch = batchForEquipmentInstance(equipment);
  const detailBase = `${equipment.capacityLiters} L capacity - ${equipment.spaceUsed || '?'} space`;

  if (batch?.step === 'awaiting-transfer') {
    return {
      label: 'Waiting for kettle',
      detail: `${batch.recipeName} is still at the stock pot`,
      toneClass: 'risk-high'
    };
  }

  if (batch?.step === 'fermenting') {
    const tier = contaminationRiskTier(batch.contaminationRisk);
    const detailParts = [batch.recipeName, batchRemainingLabel(batch)];
    if (campaignAllowsTemperature(state)) detailParts.splice(1, 0, `${state.fermenterTemperatureC} C`);
    if (campaignAllowsCleaning(state)) detailParts.push(`infection chance ${batch.contaminationRisk}%`);
    return {
      label: 'Fermenting',
      detail: detailParts.join(' - '),
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
    label: 'Empty',
    detail: `${equipmentConditionLabel(equipment.condition)} - ${detailBase}`,
    toneClass: `condition-${conditionTier}`
  };
};

const renderRecipePanelContent = (): string => {
  const result = renderRecipeSelectionPanel({
    state,
    selectedRecipeCategoryId,
    recipePage,
    recipeStartBlocker
  });
  recipePage = result.recipePage;
  return result.html;
};

const stationPanelContext = () => ({
  state,
  recipePanelOpen,
  selectedRecipeCategoryId,
  expandedTarget,
  expandedEquipmentInstanceId,
  renderRecipeSelectionPanel: renderRecipePanelContent,
  recipeStartBlocker,
  fermenterTemperatureHint,
  equipmentInstanceStatus,
  batchForEquipmentInstance,
  batchRemainingLabel,
  stepLabel
});

const hotspotPosition = (equipmentId: EquipmentId) => {
  if (equipmentId === 'fermenter' && state.equipment.fermenter.tier === 1) return { x: 56, y: 55 };
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

const renderFirstLoopObjective = () =>
  guidanceDismissed
    ? ''
    : `
  <div class="first-loop-objective scene-pill" aria-label="Current garage-floor objective">
    <span>Next step</span>
    <strong>${campaignNextStep(state)}</strong>
    <button class="guidance-close" data-action="dismiss-guidance" type="button" aria-label="Dismiss guidance"></button>
  </div>
`;

const renderStoryMissionCard = () => {
  const mission = campaignView(state);
  const speaker = mission.characterRole ? `${mission.character}, ${mission.characterRole.toLowerCase()}` : mission.character;
  return `
    <aside class="glass-panel story-mission-card" data-tutorial-mission-id="${mission.id}" aria-label="Story mission">
      <header class="story-mission-header">
        <span class="eyebrow gold">${mission.act}</span>
        <strong>${mission.title}</strong>
      </header>
      <p><b>${speaker}:</b> ${mission.message}</p>
      <div class="story-mission-progress">
        <span>${mission.progressLabel}</span>
        <progress value="${mission.progress}" max="100"></progress>
      </div>
      <button class="story-mission-action" data-action="toggle-missions" type="button">Open notebook</button>
    </aside>
  `;
};

const garageBlondeRecipe = () => visibleRecipes().find((recipe) => recipe.id === 'garage-blonde') ?? visibleRecipes()[0];

const renderPhoneSupplyCard = () => {
  if (state.campaign.missionId !== 'empty-shelf') return '';
  const recipe = garageBlondeRecipe();
  const missing = recipeSupplyBreakdown(state, recipe).filter((item) => item.missingAmount > 0);
  return `
    <div class="phone-recipe-card">
      <strong>Garage Blonde supply bill</strong>
      <span>${recipeRequirementSummary(recipe)}</span>
      <span>${recipeMissingOrderSummary(state, recipe)}</span>
      ${
        missing.length > 0
          ? `<em>${missing.map((item) => item.orderLabel).join(' + ')} - about ${formatCurrency(orderCost(recipeMissingIngredients(state, recipe)))}</em>`
          : '<em>Nothing to order right now.</em>'
      }
    </div>
  `;
};

const renderStoryIntroCard = () => {
  const mission = campaignView(state);
  if (isMissionSeen(state)) return '';
  const role = mission.characterRole ? `<span>${mission.characterRole}</span>` : '';
  return `
    <div class="story-intro-layer" data-tutorial-card="intro" data-tutorial-mission-id="${mission.id}" role="dialog" aria-modal="true" aria-label="${mission.title}">
      <button class="story-intro-scrim" data-action="dismiss-story-card" type="button" aria-label="Continue"></button>
      <article class="glass-panel story-phone">
        <header class="phone-header">
          <span class="phone-signal" aria-hidden="true"></span>
          <div>
            <strong>${mission.character}</strong>
            ${role}
          </div>
          <small>${mission.act}</small>
        </header>
        <div class="phone-thread">
          <p class="phone-thread-title">${mission.title}</p>
          ${mission.phoneThread.map((message) => `<p class="phone-bubble incoming">${message}</p>`).join('')}
          ${renderPhoneSupplyCard()}
          <div class="phone-task-card">
            <strong>Task</strong>
            <span>${mission.goal}</span>
            <em>${mission.reward}</em>
          </div>
        </div>
        <div class="phone-reply-bar">
          <button class="phone-reply-button" data-action="dismiss-story-card" type="button" aria-label="Reply: ${mission.replyText}">
            <span>Reply</span>
            <strong>${mission.replyText}</strong>
          </button>
        </div>
      </article>
    </div>
  `;
};

const renderMissionsControl = () => {
  const mission = campaignView(state);
  const objective = objectiveProgress(state);
  return `
    <div class="missions-control">
      <button class="scene-pill missions-button ${missionsOpen ? 'open' : ''}" data-action="toggle-missions" type="button" aria-expanded="${missionsOpen}">
        <span>Story</span>
        <strong>${mission.progress}%</strong>
      </button>
      ${
        missionsOpen
          ? `
            <aside class="glass-panel popover mission-popover" aria-label="Missions">
              <span class="eyebrow gold">${mission.act}</span>
              <strong>${mission.title}</strong>
              <p>${mission.character}${mission.characterRole ? `, ${mission.characterRole.toLowerCase()}` : ''}: ${mission.message}</p>
              <div class="story-goal compact"><strong>Goal</strong><span>${mission.goal}</span></div>
              <div class="objective-demand">
                <span>${mission.progressLabel}</span>
                <span>${Math.min(state.demand.casesSold, state.demand.casesRequested)}/${state.demand.casesRequested}</span>
              </div>
              <progress value="${mission.progress}" max="100"></progress>
              <small>${objective.label}</small>
            </aside>
          `
          : ''
      }
    </div>
  `;
};

const renderNotificationControl = () => {
  const eventCount = Math.min(9, state.events.length);
  return `
    <div class="notification-control">
      <button class="scene-pill bell-button ${notificationsOpen ? 'open' : ''}" data-action="toggle-notifications" type="button" aria-label="Notifications" aria-expanded="${notificationsOpen}">
        <span class="bell-icon" aria-hidden="true"></span>
        <strong class="notification-badge" aria-label="${eventCount} notifications">${eventCount}</strong>
      </button>
      ${
        notificationsOpen
          ? `
            <aside class="glass-panel popover notification-popover" aria-label="Notifications">
              <span class="eyebrow gold">Notifications</span>
              <ol>
                ${state.events.slice(0, 5).map((event) => `<li><time>${formatClock(event.minute)}</time><span>${event.message}</span></li>`).join('')}
              </ol>
              <button data-action="open-overlay" data-overlay="log" type="button">Open floor notes</button>
            </aside>
          `
          : ''
      }
    </div>
  `;
};


const storageToneClass = (used: number, capacity: number, overflow: number): string => {
  if (overflow > 0) return 'overflowing';
  if (capacity > 0 && used / capacity >= 0.82) return 'crowded';
  if (used <= 0) return 'low-stock';
  return 'stocked';
};

const shouldShowStorageHotspot = (area: 'dry-shelf' | 'cold-box' | 'utility-shelf', used: number, capacity: number, overflow: number): boolean => {
  if (overflow > 0 || (capacity > 0 && used / capacity >= 0.82)) return true;
  if (area === 'utility-shelf') return state.inventory.ingredients.bottles.amount <= 18;
  return false;
};

const sceneVisibility = () => {
  const workflow = currentWorkflowStage(state);
  const fermenting = state.batches.some((batch) => batch.step === 'fermenting');
  const packaging = state.batches.some((batch) => batch.step === 'awaiting-packaging' || batch.step === 'packaging' || batch.step === 'bottle-conditioning') || state.inventory.cases > 0;
  const hasSellableCases = state.inventory.cases > 0;

  return {
    showFloorNoteTicker: false,
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
    { area: 'dry-shelf' as const, label: 'Dry shelf', className: 'dry-shelf-hotspot', amount: `${use['dry-shelf'].toFixed(1)}/${capacity['dry-shelf']} kg` },
    { area: 'cold-box' as const, label: 'Cold box', className: 'cold-box-hotspot', amount: `${use['cold-box'].toFixed(2)}/${capacity['cold-box']} kg eq.` },
    { area: 'utility-shelf' as const, label: 'Bottles', className: 'utility-shelf-hotspot', amount: `${use['utility-shelf'].toFixed(0)}/${capacity['utility-shelf']}` }
  ];

  return supplyCards
    .map((card) => ({ ...card, tone: storageToneClass(use[card.area], capacity[card.area], overflow[card.area]) }))
    .filter((card) => shouldShowStorageHotspot(card.area, use[card.area], capacity[card.area], overflow[card.area]))
    .map(
      (card) => `
        <button class="supply-hotspot ${card.className} ${card.tone}" data-action="open-overlay" data-overlay="inventory" type="button" aria-label="${card.label} inventory alert">
          <span>${card.label}</span><strong>${card.amount}</strong>
        </button>
      `
    )
    .join('');
};


const renderWorkshopHotspot = () => {
  const nextTap = campaignPrimaryTarget(state) === 'shop';
  return `
    <button class="workshop-hotspot shop-cart-hotspot ${nextTap ? 'next-tap' : ''}" data-action="open-overlay" data-overlay="upgrades" type="button" aria-label="${nextTap ? 'Shop cart, next step' : 'Shop cart'}">
      <svg class="shop-cart-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
        <path d="M3 4h2.4l2.1 11.2h10.8l1.9-7.2H7.1" />
        <path d="M8.2 8h11.4" />
        <path d="M8.9 11.3h9.8" />
        <circle cx="9.2" cy="19" r="1.35" />
        <circle cx="17.2" cy="19" r="1.35" />
      </svg>
    </button>
  `;
};

const renderGaragePressure = () => {
  if (!campaignAllowsPressure(state)) return '';
  const storageOverflow = Object.values(storageOverflowByArea(state)).reduce((total, amount) => total + amount, 0);
  const firstSaleDone = state.demand.casesSold > 0 || state.salesToday > 0;
  if (!firstSaleDone && storageOverflow === 0 && state.visibilityRisk < 18) return '';
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

const renderScenePayoff = () =>
  scenePayoff
    ? `
      <div class="scene-payoff scene-payoff-${scenePayoff.kind}" data-payoff-key="${scenePayoff.key}" aria-live="polite">
        <span>${scenePayoff.kind === 'sale' ? 'Sold' : 'Ready'}</span>
        <strong>${scenePayoff.title}</strong>
        <small>${scenePayoff.detail}</small>
      </div>
    `
    : '';

const getFinishedPalletLevel = (cases: number): 0 | 1 | 2 | 3 => {
  if (cases <= 0) return 0;
  if (cases < 6) return 1;
  if (cases < 12) return 2;
  return 3;
};


const renderFinishedBeerPallet = () => {
  const sellPointId: GarageSellPointId = 'finished-beer-pallet';
  const visual = garageSellPointLayout[sellPointId];
  const placement = layoutDebugModel.sellPointDraft[sellPointId];
  const palletLevel = getFinishedPalletLevel(state.inventory.cases);
  const src = visual.spriteByLevel[palletLevel];
  const tapPadding = visual.tapPadding ?? { x: 0, y: 0 };
  const priority = visual.interactionPriority ?? 0;
  const expanded = expandedTarget === 'cases';
  const active = state.inventory.cases > 0;
  const nextTap = isNextTapTarget('cases');

  return `
    <article
      class="sell-point-object sell-point-${sellPointId} ${expanded ? 'expanded' : ''} ${active ? 'active' : ''} ${nextTap ? 'next-tap' : ''}"
      data-sell-point-id="${sellPointId}"
      data-action="toggle-target"
      data-target="cases"
      style="left: ${placement.x}%; top: ${placement.y}%; width: ${placement.width}%; --tap-padding-x: ${tapPadding.x}%; --tap-padding-y: ${tapPadding.y}%; z-index: ${18 + priority}"
    >
      <button
        class="sell-point-toggle"
        data-action="toggle-target"
        data-target="cases"
        type="button"
        aria-expanded="${expanded}"
        aria-label="${expanded ? 'Collapse' : 'Expand'} finished beer pallet"
      >
        <img class="sell-point-sprite" src="${src}" alt="Finished beer pallet" draggable="false" />
      </button>

    </article>
  `;
};

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
    ${
      opsOpen
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
              <button data-action="restore-guidance" type="button"><span>Help</span><strong>Restore next step</strong></button>
              <button data-action="reset-save" type="button"><span>Settings</span><strong>New Game / Reset Save</strong></button>
            </div>
          </aside>
        `
        : ''
    }
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
    ${pending ? `<div class="delivery-pallet" aria-label="${state.pendingOrders.length} incoming deliveries"><span>${state.pendingOrders.length}</span><strong>Delivery</strong></div>` : ''}
    ${worstCondition < 62 ? '<div class="dirty-floor"></div>' : ''}
  `;
};

const renderGarage = () => {
  const position = brewerPosition();
  const visibility = sceneVisibility();
  const expandedClass = expandedTarget ? `has-expanded expanded-${expandedTarget}` : '';
  const sceneEquipment = garageSceneEquipmentInstances(state);
  const equipment = sceneEquipment
    .map((item) => {
      const visual = garageEquipmentLayoutByItem[item.itemId];
      const conditionTier = equipmentConditionTier(item.condition);
      const status = equipmentInstanceStatus(item);
      const active = activeForEquipmentInstance(item);
      const nextTap = isNextTapTargetForInstance(item);
      const expanded = expandedTarget === item.equipmentId && expandedEquipmentInstanceId === item.instanceId;
      const contextual = item.equipmentId === visibility.spotlightTarget || active || expanded || nextTap;
      const silent = !contextual && visibility.modeClass !== 'mode-idle';
      const obstructed =
        expandedTarget === 'fermenter'
          ? item.equipmentId === 'kettle' || item.equipmentId === 'bottler'
          : expandedTarget === 'bottler'
            ? item.equipmentId === 'fermenter'
            : false;

      if (!visual?.sprite) {
        const pos = layoutDebugModel.equipmentDraft[item.slotId] ?? hotspotPosition(item.equipmentId);
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
            ${expanded ? renderEquipmentActions(stationPanelContext(), item.equipmentId, item) : ''}
          </article>
        `;
      }

      return renderEquipmentObject(
        item,
        `
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

        `
      );
    })
    .join('');

  return `
    <section class="garage-scene ${expandedClass} ${visibility.modeClass} ${layoutDebugEnabled ? 'layout-debug-enabled' : ''}" aria-label="Playable garage brewery floor">
      <div class="scene-vignette"></div>
      ${renderAtmosphere()}
      ${renderScenePayoff()}
      <div class="stage-summary" aria-label="Workflow overview">Mash · Ferment · Package · Sell</div>
      ${renderStoryMissionCard()}
      ${renderFirstLoopObjective()}
      ${renderMissionsControl()}
      ${renderGaragePressure()}
      ${visibility.showWorkshopHotspot ? renderWorkshopHotspot() : ''}
      ${visibility.showFloorNoteTicker ? renderEventTicker() : ''}
      ${equipment}
      ${renderFinishedBeerPallet()}
      ${renderStationPanel(stationPanelContext())}
      <div class="brewer-avatar" style="left: ${position.left}; top: ${position.top}" aria-label="Brewer position"><span></span></div>
      ${renderOpsControl()}
      ${renderLayoutDebugPanel(layoutDebugModel, sceneEquipment)}
    </section>
  `;
};

const renderBatchBoard = () => {
  const batchCards =
    state.batches.length === 0
      ? '<p>No active batch. Tap the brew system to choose a recipe.</p>'
      : state.batches
          .map((batch) => {
            const remainingLabel = batchRemainingLabel(batch);
            const progress = batch.step === 'awaiting-transfer' || batch.step === 'awaiting-packaging' ? 100 : batch.stepProgress;
            return `
              <article class="batch-card">
                <div><strong>${batch.recipeName}</strong><span>${stepLabel(batch.step)} - Q${batch.quality}</span></div>
                <small>${caseCountLabel(batch.casesExpected)} expected - ${remainingLabel}${campaignAllowsCleaning(state) ? ` - infection chance ${batch.contaminationRisk}%` : ''}</small>
                <progress value="${progress}" max="100"></progress>
                ${
                  batch.step === 'awaiting-transfer'
                    ? `<button data-action="transfer-batch" data-batch-id="${batch.id}" type="button">Transfer to fermenter</button>`
                    : batch.step === 'awaiting-packaging'
                      ? `<button data-action="start-packaging" data-batch-id="${batch.id}" type="button">Package</button>`
                      : ''
                }
              </article>
            `;
          })
          .join('');
  const lotCards =
    state.finishedBeerLots.length > 0
      ? `${state.finishedBeerLots.map((lot) => `<article class="batch-card"><div><strong>${lot.recipeName}</strong><span>${caseCountLabel(lot.cases)} - Q${lot.quality}</span></div><small>Market appeal ${Math.round(lot.marketAppeal * 100)}%</small></article>`).join('')}${renderSalesOffers(state)}`
      : '';
  return `
    <section class="overlay-section">
      <div class="panel-heading"><span class="eyebrow gold">Production</span><h2>Production flow</h2><p>${caseDefinitionExplanation}</p></div>
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
      <div><span>Cases</span><strong>${caseCountLabel(state.inventory.cases)}</strong></div>
      <div><span>Garage equipment space</span><strong>${garageSpaceUsed()}/${garageSpaceLimit()}</strong></div>
      <div><span>Sales channel</span><strong>${state.demand.accountName}</strong></div>
      ${campaignAllowsFormalBuyers(state) ? `<div><span>Compliance pressure</span><strong>${state.visibilityRisk >= 30 ? 'Invoice risk' : `${state.visibilityRisk}/30 visible`}</strong></div>` : ''}
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


const equipmentStoreButtonState = (item: EquipmentCatalogItem): { disabled: boolean; label: string; reason: string; className: string } => {
  const current = state.equipment[item.equipmentId];
  const ownedCount = state.ownedEquipment.filter((owned) => owned.itemId === item.id).length;
  const canOwnMore = Boolean(item.maxOwned && ownedCount < item.maxOwned);
  const projectedSpace = garageSpaceUsed() + item.spaceUsed;
  if (ownedCount > 0 && item.id === current.itemId && !canOwnMore) return { disabled: true, label: 'Installed', reason: 'On the garage floor now', className: 'upgrade-installed' };
  if (!item.maxOwned && ownedCount > 0) return { disabled: true, label: 'Owned', reason: 'Already installed', className: 'upgrade-installed' };
  if (item.maxOwned && ownedCount >= item.maxOwned) return { disabled: true, label: 'Limit', reason: `${ownedCount}/${item.maxOwned} owned`, className: 'upgrade-locked' };
  if (state.cash < item.cost) return { disabled: true, label: 'Need cash', reason: `Need ${formatCurrency(item.cost)}`, className: 'upgrade-locked' };
  if (projectedSpace > garageSpaceLimit()) return { disabled: true, label: 'No space', reason: `${projectedSpace}/${garageSpaceLimit()} garage space`, className: 'upgrade-locked' };
  return { disabled: false, label: canOwnMore ? 'Add another' : 'Buy', reason: `${formatCurrency(item.cost)} - ${projectedSpace}/${garageSpaceLimit()} space after purchase`, className: '' };
};

const renderEquipmentStoreCard = (item: EquipmentCatalogItem) => {
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

const ingredientCartButtonState = (ingredient: (typeof ingredients)[number]): { disabled: boolean; label: string; reason: string; className: string } => {
  const incoming = incomingForIngredient(ingredient.id);
  if (state.cash < ingredient.packPrice) return { disabled: true, label: 'Need cash', reason: `Need ${formatCurrency(ingredient.packPrice)}`, className: 'upgrade-locked' };
  if (incoming.amount > 0 && incoming.arrivalDay) return { disabled: false, label: 'Order more', reason: `${ingredientAmountLabel(ingredient.id, incoming.amount)} incoming ${formatGameDate(incoming.arrivalDay)}`, className: 'cart-incoming' };
  const packLabel = ingredient.id === 'bottles' ? `${ingredient.packSize} bottle pack` : `${ingredientAmountLabel(ingredient.id, ingredient.packSize)} pack`;
  return { disabled: false, label: 'Add to cart', reason: `${packLabel} - ${formatCurrency(ingredient.packPrice)}`, className: '' };
};

const renderIngredientCartCard = (ingredient: (typeof ingredients)[number]) => {
  const stock = state.inventory.ingredients[ingredient.id];
  const buttonState = ingredientCartButtonState(ingredient);
  const lowStock = stock.amount <= ingredient.packSize;
  return `
    <button class="upgrade-pallet ingredient-cart-card ${buttonState.className} ${lowStock ? 'low-stock-card' : ''}" type="button" data-action="order-ingredient" data-ingredient-id="${ingredient.id}" ${buttonState.disabled ? `disabled title="${buttonState.reason}"` : ''}>
      <span>${ingredient.name}</span>
      <small>${ingredient.category} - shelf ${ingredientAmountLabel(ingredient.id, stock.amount)} - ${Math.round(stock.condition)}%</small>
      <small>${ingredient.sourceNote}</small>
      <strong>${buttonState.label}</strong>
      <em>${buttonState.reason}</em>
    </button>
  `;
};

const renderCampaignSupplyHint = () => {
  if (state.campaign.missionId !== 'empty-shelf') return '';
  const recipe = garageBlondeRecipe();
  const missing = recipeMissingIngredients(state, recipe);
  const breakdown = recipeSupplyBreakdown(state, recipe).filter((item) => item.missingAmount > 0);
  if (missing.length === 0) return `<div class="campaign-shop-hint"><strong>Rudy's shop note</strong><span>Garage Blonde supplies are back. Start the second batch before somebody calls this a business.</span></div>`;
  return `
    <button class="campaign-shop-hint action" data-action="order-recipe" data-order-mode="missing" data-recipe-id="garage-blonde" type="button">
      <strong>Order Garage Blonde supplies</strong>
      <span>${recipeRequirementSummary(recipe)}</span>
      <span>${recipeMissingOrderSummary(state, recipe)}</span>
      <em>${breakdown.map((item) => item.orderLabel).join(' + ')} - ${formatCurrency(orderCost(missing))}</em>
    </button>
  `;
};

const renderIngredientCart = () => `
  <section class="equipment-store-group ingredient-cart-group">
    <div class="store-group-heading">
      <span class="eyebrow">Supplies</span>
      <strong>Ingredients and packaging</strong>
      <small>${state.pendingOrders.length} incoming order${state.pendingOrders.length === 1 ? '' : 's'}</small>
    </div>
    ${renderCampaignSupplyHint()}
    <div class="ingredient-cart-grid">
      ${ingredients.map(renderIngredientCartCard).join('')}
    </div>
  </section>
`;

const renderShopSectionCards = () => {
  const lowSupplyCount = ingredients.filter((ingredient) => {
    const stock = state.inventory.ingredients[ingredient.id];
    return stock.amount <= ingredient.packSize;
  }).length;
  const incomingCount = state.pendingOrders.length;
  const availableEquipmentCount = equipmentByStation('kettle')
    .concat(equipmentByStation('fermenter'), equipmentByStation('mill'), equipmentByStation('bottler'))
    .filter((item) => !equipmentStoreButtonState(item).disabled).length;
  return `
    <section class="recipe-category-screen shop-section-screen">
      <div class="panel-heading recipe-flow-heading">
        <span class="eyebrow gold">Shop cart</span>
        <h2>Choose cart</h2>
        <small>${formatCurrency(state.cash)} cash - ${garageSpaceUsed()}/${garageSpaceLimit()} garage space</small>
      </div>
      <div class="recipe-category-grid shop-section-grid">
        <button class="recipe-category-card shop-section-card" data-action="select-shop-section" data-shop-section="supplies" type="button">
          <span>Supplies</span>
          <strong>Ingredients and packaging</strong>
          <small>${lowSupplyCount} low supplies - ${incomingCount} incoming order${incomingCount === 1 ? '' : 's'}</small>
        </button>
        <button class="recipe-category-card shop-section-card" data-action="select-shop-section" data-shop-section="equipment" type="button">
          <span>Equipment</span>
          <strong>Brewhouse, fermenters and bottling</strong>
          <small>${availableEquipmentCount} buyable item${availableEquipmentCount === 1 ? '' : 's'} - ${garageSpaceAvailable(state)} space free</small>
        </button>
      </div>
    </section>
  `;
};

const renderEquipmentStore = () => `
  <section class="overlay-section upgrade-shop workshop-overlay shop-cart-overlay">
    ${
      selectedShopSection === null
        ? renderShopSectionCards()
        : selectedShopSection === 'supplies'
          ? `
            <div class="panel-heading store-heading">
              <button class="back-button" data-action="back-shop-sections" type="button">Back</button>
              <span class="eyebrow gold">Supplies</span>
              <h2>Ingredients and packaging</h2>
              <small>${formatCurrency(state.cash)} cash - ${state.pendingOrders.length} incoming order${state.pendingOrders.length === 1 ? '' : 's'}</small>
            </div>
            ${renderIngredientCart()}
          `
          : `
            <div class="panel-heading store-heading">
              <button class="back-button" data-action="back-shop-sections" type="button">Back</button>
              <span class="eyebrow gold">Equipment</span>
              <h2>Garage equipment</h2>
              <small>${formatCurrency(state.cash)} cash - ${garageSpaceUsed()}/${garageSpaceLimit()} garage space</small>
            </div>
            ${(Object.keys(stationLabels) as StoreStation[])
              .map(
                (station) => `
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
                `
              )
              .join('')}
          `
    }
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
  if (activeOverlay === 'production') return renderBatchBoard();
  if (activeOverlay === 'inventory') return renderInventory();
  if (activeOverlay === 'upgrades') return renderEquipmentStore();
  if (activeOverlay === 'log') return renderEventLog();
  return '';
};

const overlayTitle = () =>
  ({ production: 'Production', inventory: 'Inventory detail', upgrades: 'Shop cart', log: 'Clipboard log' })[activeOverlay ?? 'production'];

const renderFocusOverlay = () =>
  activeOverlay
    ? `
      <div class="focus-layer" role="dialog" aria-modal="true" aria-label="${overlayTitle()}">
        <button class="focus-scrim" data-action="close-overlay" type="button" aria-label="Dismiss overlay background"></button>
        <aside class="glass-panel focus-overlay focus-${activeOverlay}">
          <button class="overlay-close" data-action="close-overlay" type="button" aria-label="Close overlay"></button>
          ${overlayContent()}
        </aside>
      </div>
    `
    : '';

const render = () => {
  const shellStateClass = `${activeOverlay ? 'focus-open' : ''} ${recipePanelOpen || expandedTarget ? 'station-open' : ''}`.trim();
  root.innerHTML = `
    <main class="game-shell ${shellStateClass}">
      ${renderTopHud()}
      ${renderGarage()}
      ${renderFocusOverlay()}
      ${renderStoryIntroCard()}
      <div class="rotate-blocker" role="dialog" aria-modal="true" aria-label="Rotate device">
        <strong>Brewery-Sim is played in landscape mode.</strong>
        <span>Rotate your device to continue brewing.</span>
      </div>
    </main>
  `;
};

root.addEventListener(
  'error',
  (event) => {
    if (
      event.target instanceof HTMLImageElement &&
      (event.target.classList.contains('equipment-sprite') || event.target.classList.contains('sell-point-sprite'))
    ) {
      event.target.hidden = true;
    }
  },
  true
);

root.addEventListener('input', (event) => {
  handleLayoutDebugInput(root, layoutDebugModel, event);
});

root.addEventListener('click', (event) => {
  audioAllowed = true;
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target) {
    const clickTarget = event.target as HTMLElement;
    const isInsideOpenSurface = Boolean(
      clickTarget.closest('.equipment-object, .equipment-hotspot, .sell-point-object, .case-hotspot, .supply-hotspot, .workshop-hotspot, .event-ticker, .missions-control, .notification-control, .ops-control, .layout-debug-panel, .focus-overlay, button')
    );
    if ((expandedTarget || missionsOpen || notificationsOpen || opsOpen || activeOverlay || recipePanelOpen) && !isInsideOpenSurface) {
      expandedTarget = null;
      expandedEquipmentInstanceId = null;
      missionsOpen = false;
      notificationsOpen = false;
      opsOpen = false;
      activeOverlay = null;
      recipePanelOpen = false;
      selectedRecipeCategoryId = null;
      selectedShopSection = null;
      recipePage = 0;
      render();
    }
    return;
  }

  const action = target.dataset.action;
  if (action === 'close-overlay') {
    activeOverlay = null;
    recipePanelOpen = false;
    selectedRecipeCategoryId = null;
    selectedShopSection = null;
    recipePage = 0;
    opsOpen = false;
    render();
    return;
  }

  if (action === 'open-overlay') {
    const requestedOverlay = target.dataset.overlay;
    if (requestedOverlay === 'recipes') {
      recipePanelOpen = true;
      selectedRecipeCategoryId = null;
      recipePage = 0;
      activeOverlay = null;
    } else {
      activeOverlay = requestedOverlay as FocusOverlay;
      recipePanelOpen = false;
      selectedRecipeCategoryId = null;
      selectedShopSection =
        requestedOverlay === 'upgrades' && state.campaign.missionId === 'empty-shelf'
          ? 'supplies'
          : requestedOverlay === 'upgrades' && state.campaign.missionId === 'bucket-empire'
            ? 'equipment'
            : null;
      recipePage = 0;
    }
    expandedTarget = null;
    expandedEquipmentInstanceId = null;
    missionsOpen = false;
    notificationsOpen = false;
    opsOpen = false;
    render();
    return;
  }


  if (action === 'dismiss-guidance') {
    guidanceDismissed = true;
    try { globalThis.localStorage?.setItem(GUIDANCE_DISMISSED_KEY, '1'); } catch {}
    render();
    return;
  }

  if (action === 'restore-guidance') {
    guidanceDismissed = false;
    try { globalThis.localStorage?.removeItem(GUIDANCE_DISMISSED_KEY); } catch {}
    opsOpen = false;
    render();
    return;
  }

  if (action === 'dismiss-story-card') {
    dispatch({ type: 'dismiss-story-card' });
    return;
  }

  if (action === 'close-station-panel') {
    expandedTarget = null;
    expandedEquipmentInstanceId = null;
    recipePanelOpen = false;
    selectedRecipeCategoryId = null;
    recipePage = 0;
    render();
    return;
  }

  if (action === 'select-recipe-category') {
    recipePanelOpen = true;
    selectedRecipeCategoryId = target.dataset.categoryId as RecipeCategoryId;
    recipePage = 0;
    render();
    return;
  }

  if (action === 'back-to-categories') {
    recipePanelOpen = true;
    selectedRecipeCategoryId = null;
    recipePage = 0;
    render();
    return;
  }

  if (action === 'recipes-next-page') {
    recipePage += 1;
    render();
    return;
  }

  if (action === 'recipes-prev-page') {
    recipePage = Math.max(0, recipePage - 1);
    render();
    return;
  }

  if (action === 'select-shop-section') {
    selectedShopSection = target.dataset.shopSection as ShopSection;
    render();
    return;
  }

  if (action === 'back-shop-sections') {
    selectedShopSection = null;
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
    recipePanelOpen = false;
    selectedRecipeCategoryId = null;
    selectedShopSection = null;
    recipePage = 0;
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
    const nextTarget = target.dataset.target as SceneTarget;
    const nextInstanceId = target.dataset.equipmentInstanceId ?? null;
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
    dispatch({ type: 'use-equipment', equipmentId: target.dataset.equipmentId as EquipmentId });
    return;
  }

  if (action === 'start-batch') {
    activeOverlay = null;
    opsOpen = false;
    recipePanelOpen = false;
    expandedTarget = 'kettle';
    expandedEquipmentInstanceId = null;
    dispatch({ type: 'start-batch', recipeId: target.dataset.recipeId ?? 'garage-blonde' });
    return;
  }

  if (action === 'wait-until-ready') {
    const batch = state.batches.find((item) => item.id === (target.dataset.batchId ?? ''));
    if (batch?.step === 'packaging' || batch?.step === 'bottle-conditioning') {
      expandedTarget = 'cases';
      expandedEquipmentInstanceId = null;
    }
    dispatch({ type: 'wait-until-ready', batchId: target.dataset.batchId });
    return;
  }

  if (action === 'order-recipe') {
    opsOpen = false;
    dispatch({ type: 'order-recipe', recipeId: target.dataset.recipeId ?? 'garage-blonde', mode: target.dataset.orderMode === 'extra' ? 'extra' : 'missing' });
    return;
  }

  if (action === 'order-ingredient') {
    dispatch({ type: 'order-ingredient', ingredientId: target.dataset.ingredientId as IngredientId, packs: 1 });
    return;
  }

  if (action === 'transfer-batch') {
    const batch = state.batches.find((item) => item.id === (target.dataset.batchId ?? ''));
    expandedTarget = 'fermenter';
    expandedEquipmentInstanceId = batch?.fermenterInstanceId ?? null;
    dispatch({ type: 'transfer-batch', batchId: target.dataset.batchId ?? '' });
    return;
  }

  if (action === 'start-packaging') {
    expandedTarget = 'bottler';
    expandedEquipmentInstanceId = null;
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
    expandedTarget = null;
    expandedEquipmentInstanceId = null;
    dispatch({ type: 'sell-channel', channelId: target.dataset.channelId as SalesChannelId, cases: Number(target.dataset.cases ?? 0) });
    return;
  }

  if (action === 'buy-equipment') dispatch({ type: 'buy-equipment', equipmentItemId: target.dataset.equipmentItemId as EquipmentItemId });
  if (action === 'set-fermenter-temperature') dispatch({ type: 'set-fermenter-temperature', temperatureC: Number(target.dataset.temperature ?? state.fermenterTemperatureC) });
  if (action === 'clean-equipment') dispatch({ type: 'clean-equipment', equipmentId: target.dataset.equipmentId as EquipmentId });
});

render();
