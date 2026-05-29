import {
  garageEquipmentLayoutByItem,
  garageSellPointLayout,
  type GarageSellPointId
} from '../data/garageLayout.js';
import type { EquipmentId, GameState } from '../game/schema.js';
import { campaignAllowsPressure, campaignPrimaryTarget } from '../game/campaign.js';
import {
  currentWorkflowStage,
  equipmentConditionTier,
  formatClock,
  storageCapacityByArea,
  storageOverflowByArea,
  storageUseByArea
} from '../game/selectors.js';
import { renderLayoutDebugPanel, type LayoutDebugModel } from './layoutDebug.js';
import { garageSceneEquipmentInstances } from './sceneEquipment.js';
import { renderFirstLoopObjective, renderMissionsControl, renderStoryMissionCard } from './storyPanels.js';
import { renderNextTapBadge, renderTutorialLesson } from './tutorialGuidance.js';
import type { GarageSceneEquipmentInstance, SceneTarget } from './types.js';

type ScenePayoff = { kind: 'pallet' | 'sale'; title: string; detail: string; key: number } | null;
type EquipmentStatus = { label: string; detail: string; toneClass: string };

type GarageSceneContext = {
  state: GameState;
  layoutDebugEnabled: boolean;
  layoutDebugModel: LayoutDebugModel;
  expandedTarget: SceneTarget | null;
  expandedEquipmentInstanceId: string | null;
  missionsOpen: boolean;
  opsOpen: boolean;
  guidanceDismissed: boolean;
  saveStatus: string;
  scenePayoff: ScenePayoff;
  activeForEquipment: (equipmentId: EquipmentId) => boolean;
  activeForEquipmentInstance: (equipment: GarageSceneEquipmentInstance) => boolean;
  equipmentInstanceStatus: (equipment: GarageSceneEquipmentInstance) => EquipmentStatus;
  isNextTapTarget: (target: SceneTarget) => boolean;
  isNextTapTargetForInstance: (equipment: GarageSceneEquipmentInstance) => boolean;
  renderExpandedEquipmentActions: (equipmentId: EquipmentId, equipment: GarageSceneEquipmentInstance) => string;
  renderStationPanel: () => string;
};

const renderEquipmentObject = (context: GarageSceneContext, equipment: GarageSceneEquipmentInstance, content: string): string => {
  const visual = garageEquipmentLayoutByItem[equipment.itemId];
  if (!visual.sprite) return '';

  const placement = context.layoutDebugModel.equipmentDraft[equipment.slotId];
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

const hotspotPosition = (state: GameState, equipmentId: EquipmentId) => {
  if (equipmentId === 'fermenter' && state.equipment.fermenter.tier === 1) return { x: 56, y: 55 };
  return {
    kettle: { x: 24, y: 49 },
    fermenter: { x: 51, y: 29 },
    mill: { x: 35, y: 56 },
    bottler: { x: 75, y: 48 }
  }[equipmentId];
};

const brewerPosition = (state: GameState) => {
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

const storageToneClass = (used: number, capacity: number, overflow: number): string => {
  if (overflow > 0) return 'overflowing';
  if (capacity > 0 && used / capacity >= 0.82) return 'crowded';
  if (used <= 0) return 'low-stock';
  return 'stocked';
};

const shouldShowStorageHotspot = (state: GameState, area: 'dry-shelf' | 'cold-box' | 'utility-shelf', used: number, capacity: number, overflow: number): boolean => {
  if (overflow > 0 || (capacity > 0 && used / capacity >= 0.82)) return true;
  if (area === 'utility-shelf') return state.inventory.ingredients.bottles.amount <= 18;
  return false;
};

const sceneVisibility = (state: GameState) => {
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

const renderSceneSupplyHotspots = (state: GameState) => {
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
    .filter((card) => shouldShowStorageHotspot(state, card.area, use[card.area], capacity[card.area], overflow[card.area]))
    .map(
      (card) => `
        <button class="supply-hotspot ${card.className} ${card.tone}" data-action="open-overlay" data-overlay="inventory" type="button" aria-label="${card.label} inventory alert">
          <span>${card.label}</span><strong>${card.amount}</strong>
        </button>
      `
    )
    .join('');
};

const renderWorkshopHotspot = (state: GameState) => {
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

const renderGaragePressure = (state: GameState) => {
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

const renderScenePayoff = (scenePayoff: ScenePayoff) =>
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

const renderFinishedBeerPallet = (context: GarageSceneContext) => {
  const sellPointId: GarageSellPointId = 'finished-beer-pallet';
  const visual = garageSellPointLayout[sellPointId];
  const placement = context.layoutDebugModel.sellPointDraft[sellPointId];
  const palletLevel = getFinishedPalletLevel(context.state.inventory.cases);
  const src = visual.spriteByLevel[palletLevel];
  const tapPadding = visual.tapPadding ?? { x: 0, y: 0 };
  const priority = visual.interactionPriority ?? 0;
  const expanded = context.expandedTarget === 'cases';
  const active = context.state.inventory.cases > 0;
  const nextTap = context.isNextTapTarget('cases');

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
        ${renderNextTapBadge(nextTap, 'cases')}
      </button>

    </article>
  `;
};

const renderEventTicker = (state: GameState) => {
  const latest = state.events[0];
  return `
    <button class="event-ticker" data-action="open-overlay" data-overlay="log" type="button" aria-label="Open clipboard log">
      <span class="eyebrow gold">Floor note</span>
      <strong>${latest ? latest.message : 'No floor notes yet.'}</strong>
    </button>
  `;
};

const renderOpsControl = ({ opsOpen, saveStatus }: GarageSceneContext) => `
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
              <button data-action="restore-guidance" type="button"><span>Help</span><strong>Restore tutorial guidance</strong></button>
              <button data-action="reset-save" type="button"><span>Replay tutorial</span><strong>New Game / Reset Save</strong></button>
            </div>
          </aside>
        `
        : ''
    }
  </div>
`;

const renderAtmosphere = (context: GarageSceneContext) => {
  const anyActive = context.state.batches.length > 0;
  const worstCondition = Math.min(...Object.values(context.state.equipment).map((equipment) => equipment.condition));
  const pending = context.state.pendingOrders.length > 0;
  return `
    ${context.activeForEquipment('kettle') ? '<div class="steam-wisp kettle-steam"></div>' : ''}
    ${context.activeForEquipment('fermenter') ? '<div class="equipment-glow fermenter-glow"></div>' : ''}
    ${context.activeForEquipment('bottler') ? '<div class="equipment-glow bottler-glow"></div>' : ''}
    ${anyActive ? '<div class="hose-line"></div>' : ''}
    ${pending ? `<div class="delivery-pallet" aria-label="${context.state.pendingOrders.length} incoming deliveries"><span>${context.state.pendingOrders.length}</span><strong>Delivery</strong></div>` : ''}
    ${worstCondition < 62 ? '<div class="dirty-floor"></div>' : ''}
  `;
};

export const renderGarage = (context: GarageSceneContext) => {
  const position = brewerPosition(context.state);
  const visibility = sceneVisibility(context.state);
  const expandedClass = context.expandedTarget ? `has-expanded expanded-${context.expandedTarget}` : '';
  const sceneEquipment = garageSceneEquipmentInstances(context.state);
  const equipment = sceneEquipment
    .map((item) => {
      const visual = garageEquipmentLayoutByItem[item.itemId];
      const conditionTier = equipmentConditionTier(item.condition);
      const status = context.equipmentInstanceStatus(item);
      const active = context.activeForEquipmentInstance(item);
      const nextTap = context.isNextTapTargetForInstance(item);
      const expanded = context.expandedTarget === item.equipmentId && context.expandedEquipmentInstanceId === item.instanceId;
      const contextual = item.equipmentId === visibility.spotlightTarget || active || expanded || nextTap;
      const silent = !contextual && visibility.modeClass !== 'mode-idle';
      const obstructed =
        context.expandedTarget === 'fermenter'
          ? item.equipmentId === 'kettle' || item.equipmentId === 'bottler'
          : context.expandedTarget === 'bottler'
            ? item.equipmentId === 'fermenter'
            : false;

      if (!visual?.sprite) {
        const pos = context.layoutDebugModel.equipmentDraft[item.slotId] ?? hotspotPosition(context.state, item.equipmentId);
        return `
          <article
            class="equipment-hotspot hotspot-${item.equipmentId} ${expanded ? 'expanded' : ''} ${contextual ? 'contextual' : ''} ${silent ? 'scene-silent' : ''} ${obstructed ? 'obstructed-by-card' : ''} condition-${conditionTier} ${status.toneClass} ${item.equipmentId === context.state.selectedEquipmentId ? 'selected' : ''} ${active ? 'active' : ''} ${nextTap ? 'next-tap' : ''}"
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
            ${expanded ? context.renderExpandedEquipmentActions(item.equipmentId, item) : ''}
          </article>
        `;
      }

      return renderEquipmentObject(
        context,
        item,
        `
          <button
            class="equipment-object-toggle hotspot-${item.equipmentId} ${expanded ? 'expanded' : ''} ${contextual ? 'contextual' : ''} ${silent ? 'scene-silent' : ''} condition-${conditionTier} ${status.toneClass} ${item.equipmentId === context.state.selectedEquipmentId ? 'selected' : ''} ${active ? 'active' : ''} ${nextTap ? 'next-tap' : ''}"
            data-action="${visual.interaction.action}"
            data-target="${visual.interaction.equipmentId}"
            data-equipment-instance-id="${item.instanceId}"
            type="button"
            aria-expanded="${expanded}"
            aria-label="${expanded ? 'Collapse' : 'Expand'} ${item.name}"
          >
            <img class="equipment-sprite equipment-sprite-${item.equipmentId}" src="${visual.sprite}" alt="${item.name}" draggable="false" />
            ${renderNextTapBadge(nextTap, item.equipmentId)}
          </button>

        `
      );
    })
    .join('');

  return `
    <section class="garage-scene ${expandedClass} ${visibility.modeClass} ${context.layoutDebugEnabled ? 'layout-debug-enabled' : ''}" aria-label="Playable garage brewery floor">
      <div class="scene-vignette"></div>
      ${renderAtmosphere(context)}
      ${renderScenePayoff(context.scenePayoff)}
      <div class="stage-summary" aria-label="Workflow overview">Mash · Ferment · Package · Sell</div>
      ${renderStoryMissionCard(context.state)}
      ${renderFirstLoopObjective(context.state, context.guidanceDismissed)}
      ${renderTutorialLesson(context.state, context.guidanceDismissed)}
      ${renderMissionsControl(context.state, context.missionsOpen)}
      ${renderGaragePressure(context.state)}
      ${visibility.showWorkshopHotspot ? renderWorkshopHotspot(context.state) : ''}
      ${visibility.showFloorNoteTicker ? renderEventTicker(context.state) : ''}
      ${equipment}
      ${renderFinishedBeerPallet(context)}
      ${context.renderStationPanel()}
      <div class="brewer-avatar" style="left: ${position.left}; top: ${position.top}" aria-label="Brewer position"><span></span></div>
      ${renderOpsControl(context)}
      ${renderLayoutDebugPanel(context.layoutDebugModel, sceneEquipment)}
    </section>
  `;
};
