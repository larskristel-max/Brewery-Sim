import { ingredients, getIngredient } from './data/ingredients.js';
import type { Equipment, EquipmentId, GameAction, IngredientId, UpgradeId } from './game/schema.js';
import { createInitialState } from './game/initialState.js';
import { loadSavedGame, resetSavedGame, saveGameState, STORAGE_KEY } from './game/persistence.js';
import {
  contaminationRiskTier,
  currentWorkflowStage,
  demandProgress,
  equipmentConditionLabel,
  equipmentConditionTier,
  formatClock,
  formatCurrency,
  ingredientAmountLabel,
  nextSuggestedAction,
  objectiveProgress,
  orderCost,
  recipeCanStart,
  recipeIngredientCost,
  recipeMissingIngredients,
  recipeOrderItems,
  storageCapacityByArea,
  storageOverflowByArea,
  storageUseByArea,
  visibleRecipes
} from './game/selectors.js';
import { reduceGame } from './game/simulation.js';

const root = document.querySelector<HTMLDivElement>('#root');

if (!root) {
  throw new Error('Missing #root element');
}

type SceneTarget = EquipmentId | 'cases';
type FocusOverlay = 'recipes' | 'production' | 'inventory' | 'upgrades' | 'log';

const hasBrowserSave = (): boolean => {
  try {
    return typeof globalThis.localStorage !== 'undefined' && globalThis.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

const hadBrowserSave = hasBrowserSave();
let state = loadSavedGame();
let saveStatus = hadBrowserSave ? 'Browser save loaded' : 'Autosave ready';
let expandedTarget: SceneTarget | null = null;
let missionsOpen = false;
let notificationsOpen = false;
let opsOpen = false;
let activeOverlay: FocusOverlay | null = null;
let audioAllowed = false;

const displayEquipmentName = (equipment: Equipment): string => {
  if (equipment.id === 'kettle') return equipment.level > 1 ? '60 L brew system' : '40 L brew system';
  if (equipment.id === 'fermenter') return '18 C fermenter';
  if (equipment.id === 'bottler') return 'Bottling station';
  return equipment.name;
};

const targetLabel = (target: SceneTarget): string => (target === 'cases' ? 'Cases' : displayEquipmentName(state.equipment[target]));

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

const dispatch = (action: GameAction) => {
  const previousEventId = state.events[0]?.id;
  state = reduceGame(state, action);
  saveGameState(state);
  saveStatus = `Saved locally ${formatClock(state.minute)}`;
  if (state.events[0]?.id && state.events[0]?.id !== previousEventId) playBell();
  render();
};

const resetGame = () => {
  resetSavedGame();
  state = createInitialState();
  expandedTarget = null;
  missionsOpen = false;
  notificationsOpen = false;
  opsOpen = false;
  activeOverlay = null;
  saveStatus = 'New game started. Browser save cleared.';
  render();
};

const stepLabel = (step: string) =>
  ({ mashing: 'Mashing', fermenting: 'Fermenting', packaging: 'Packaging', ready: 'Ready' })[step] ?? step;

const activeForEquipment = (equipmentId: EquipmentId) => {
  const stepByEquipment = { kettle: 'mashing', fermenter: 'fermenting', bottler: 'packaging' } as const;
  return state.batches.some((batch) => batch.step === stepByEquipment[equipmentId]);
};

const batchForEquipment = (equipmentId: EquipmentId) => {
  const stepByEquipment = { kettle: 'mashing', fermenter: 'fermenting', bottler: 'packaging' } as const;
  return state.batches.find((batch) => batch.step === stepByEquipment[equipmentId]);
};

const isNextTapTarget = (target: SceneTarget) => currentWorkflowStage(state).tapTarget === target;

const riskLabel = (risk: number): string => {
  const tier = contaminationRiskTier(risk);
  if (tier === 'low') return 'Low risk';
  if (tier === 'elevated') return 'Rising risk';
  if (tier === 'high') return 'High risk';
  return 'Severe risk';
};

const equipmentSceneStatus = (equipmentId: EquipmentId): { label: string; detail: string; toneClass: string } => {
  const equipment = state.equipment[equipmentId];
  const activeBatch = batchForEquipment(equipmentId);
  const conditionLabel = equipmentConditionLabel(equipment.condition);
  const conditionDetail = `${Math.round(equipment.condition)}% clean`;

  if (equipmentId === 'fermenter') {
    const fermenting = activeBatch ?? state.batches.find((batch) => batch.step === 'fermenting');
    if (fermenting) {
      const tier = contaminationRiskTier(fermenting.contaminationRisk);
      return {
        label: `${fermenting.contaminationRisk}% contamination`,
        detail: riskLabel(fermenting.contaminationRisk),
        toneClass: `risk-${tier}`
      };
    }
  }

  if (equipmentId === 'bottler') {
    const readyBatch = state.batches.find((batch) => batch.step === 'ready');
    const tier = equipmentConditionTier(equipment.condition);
    if (readyBatch) {
      return {
        label: `${readyBatch.casesExpected} cases waiting`,
        detail: tier === 'dirty' || tier === 'critical' ? 'Packaging loss risk' : 'Ready to bottle',
        toneClass: tier === 'dirty' || tier === 'critical' ? 'risk-high' : 'risk-low'
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
    detail: conditionDetail,
    toneClass: `condition-${equipmentConditionTier(equipment.condition)}`
  };
};

const hotspotPosition = (equipmentId: EquipmentId) =>
  ({
    kettle: { x: 24, y: 49 },
    fermenter: { x: 51, y: 29 },
    bottler: { x: 75, y: 48 }
  })[equipmentId];

const brewerPosition = () => {
  const focus = state.batches[0]?.step ?? 'idle';
  return {
    mashing: { left: '28%', top: '58%' },
    fermenting: { left: '52%', top: '51%' },
    packaging: { left: '76%', top: '63%' },
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
    <div class="hud-cluster hud-stat time-stat"><span class="eyebrow">Day ${state.day}</span><strong>${formatClock(state.minute)}</strong></div>
    <div class="hud-cluster hud-resources">
      <div><span class="eyebrow">Cash</span><strong>${formatCurrency(state.cash)}</strong></div>
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
      ${
        missionsOpen
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
          : ''
      }
    </div>
  `;
};

const renderNotificationControl = () => {
  const fermenting = state.batches.find((batch) => batch.step === 'fermenting');
  const bottlerTier = equipmentConditionTier(state.equipment.bottler.condition);
  const fermenterStatus = fermenting ? `${fermenting.contaminationRisk}% ${riskLabel(fermenting.contaminationRisk)}` : equipmentConditionLabel(state.equipment.fermenter.condition);
  const packagingStatus = bottlerTier === 'dirty' || bottlerTier === 'critical' ? 'Loss risk' : equipmentConditionLabel(state.equipment.bottler.condition);
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
              <div class="status-lines">
                <div><span>Fermenter</span><strong>${fermenterStatus}</strong></div>
                <div><span>Packaging</span><strong>${packagingStatus}</strong></div>
                <div><span>Cases</span><strong>${state.inventory.cases} ready</strong></div>
              </div>
              <ol>
                ${state.events.slice(0, 4).map((event) => `<li><time>${formatClock(event.minute)}</time><span>${event.message}</span></li>`).join('')}
              </ol>
            </aside>
          `
          : ''
      }
    </div>
  `;
};

const renderRecipeCards = () =>
  visibleRecipes()
    .map((recipe) => {
      const missing = recipeMissingIngredients(state, recipe);
      const missingCost = orderCost(missing);
      const extraCost = orderCost(recipeOrderItems(state, recipe, 'extra'));
      const canStart = recipeCanStart(state, recipe);
      return `
        <article class="batch-card recipe-card">
          <div><strong>${recipe.name}</strong><span>${recipe.style} · ${formatCurrency(recipe.salePricePerCase)}/case</span></div>
          <small>${recipe.challenge}</small>
          <small>Batch cost now ${formatCurrency(recipeIngredientCost(recipe))} · market ${Math.round(recipe.marketAppeal * 100)}%</small>
          ${
            missing.length > 0
              ? `<small>Missing ${missing.map((item) => `${getIngredient(item.ingredientId).name} ${ingredientAmountLabel(item.ingredientId, item.amount)}`).join(', ')}</small>`
              : '<small>Ingredients ready.</small>'
          }
          <div class="hotspot-actions">
            <button data-action="start-batch" data-recipe-id="${recipe.id}" type="button" ${canStart ? '' : 'disabled'}>${recipe.enabled ? 'Brew' : 'Coming later'}</button>
            <button data-action="order-recipe" data-order-mode="missing" data-recipe-id="${recipe.id}" type="button" ${recipe.enabled && missing.length > 0 && state.cash >= missingCost ? '' : 'disabled'}>Order missing ${formatCurrency(missingCost)}</button>
            <button data-action="order-recipe" data-order-mode="extra" data-recipe-id="${recipe.id}" type="button" ${recipe.enabled && state.cash >= extraCost ? '' : 'disabled'}>Order extra ${formatCurrency(extraCost)}</button>
          </div>
        </article>
      `;
    })
    .join('');

const renderEquipmentActions = (equipmentId: EquipmentId) => {
  if (equipmentId === 'kettle') {
    return `
      <div class="hotspot-actions">
        <button data-action="open-overlay" data-overlay="recipes" type="button">Brew</button>
        <button data-action="clean-equipment" data-equipment-id="kettle" type="button">Clean</button>
        <button type="button" disabled>Repair</button>
        <button type="button" disabled>Replace</button>
      </div>
    `;
  }

  if (equipmentId === 'fermenter') {
    return `
      <div class="hotspot-actions">
        <button data-action="use-equipment" data-equipment-id="fermenter" type="button">Inspect</button>
        <button data-action="clean-equipment" data-equipment-id="fermenter" type="button">Clean</button>
        <button type="button" disabled>Repair</button>
        <button type="button" disabled>Replace</button>
      </div>
    `;
  }

  return `
    <div class="hotspot-actions">
      <button data-action="use-equipment" data-equipment-id="bottler" type="button">Bottle</button>
      <button data-action="clean-equipment" data-equipment-id="bottler" type="button">Clean</button>
      <button type="button" disabled>Repair</button>
      <button type="button" disabled>Replace</button>
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

const sceneVisibility = () => ({
  hasActiveBatch: state.batches.length > 0,
  hasReadyCases: state.inventory.cases > 0,
  hasPendingOrders: state.pendingOrders.length > 0,
  showInstruction: state.batches.length === 0 && !expandedTarget,
  showNextTarget: Boolean(expandedTarget) || state.batches.length > 0,
  showFloorNoteTicker: notificationsOpen,
  showWorkshopHotspot: false
});

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


const renderActiveBatchSign = () => {
  const activeBatch = state.batches[0];
  if (!activeBatch) {
    return `
      <button class="active-batch-sign idle" data-action="open-overlay" data-overlay="recipes" type="button">
        <span class="eyebrow gold">Brew board</span>
        <strong>No active batch</strong>
        <small>Tap to choose a recipe</small>
      </button>
    `;
  }
  return `
    <button class="active-batch-sign risk-${contaminationRiskTier(activeBatch.contaminationRisk)}" data-action="open-overlay" data-overlay="production" type="button">
      <span class="eyebrow gold">Active batch</span>
      <strong>${activeBatch.recipeName}</strong>
      <small>${stepLabel(activeBatch.step)} · Q${activeBatch.quality} · ${activeBatch.contaminationRisk}% risk</small>
    </button>
  `;
};

const renderWorkshopHotspot = () => {
  const installed = Object.values(state.upgrades).filter((upgrade) => upgrade.purchased).length;
  const total = Object.values(state.upgrades).length;
  return `
    <button class="workshop-hotspot" data-action="open-overlay" data-overlay="upgrades" type="button" aria-label="Workshop upgrades">
      <span>Workshop</span><strong>${installed}/${total} installed</strong>
    </button>
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
    <button class="ops-button" data-action="toggle-ops" type="button" aria-expanded="${opsOpen}" aria-label="Open operations layer">OPS</button>
    ${
      opsOpen
        ? `
          <button class="ops-scrim" data-action="toggle-ops" type="button" aria-label="Close operations layer"></button>
          <aside class="glass-panel ops-menu" aria-label="Brewery operations layer">
            <div class="ops-menu-heading">
              <span class="eyebrow gold">Brewery tablet</span>
              <strong>Operations</strong>
              <small>${saveStatus}</small>
            </div>
            <div class="ops-actions">
              <button data-action="open-overlay" data-overlay="recipes" type="button"><span>Brew</span><strong>Recipes</strong></button>
              <button data-action="open-overlay" data-overlay="production" type="button"><span>Batch board</span><strong>Production</strong></button>
              <button data-action="open-overlay" data-overlay="inventory" type="button"><span>Stockroom</span><strong>Inventory</strong></button>
              <button data-action="open-overlay" data-overlay="upgrades" type="button"><span>Bench</span><strong>Workshop</strong></button>
              <button data-action="open-overlay" data-overlay="log" type="button"><span>Clipboard</span><strong>Floor notes</strong></button>
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
    ${state.inventory.cases > 0 ? `<div class="crate-stack" aria-label="${state.inventory.cases} finished cases"><span>${state.inventory.cases}</span></div>` : ''}
    ${pending ? `<div class="delivery-pallet" aria-label="${state.pendingOrders.length} incoming deliveries"><span>${state.pendingOrders.length}</span></div>` : ''}
    ${worstCondition < 62 ? '<div class="dirty-floor"></div>' : ''}
  `;
};

const renderGarage = () => {
  const position = brewerPosition();
  const workflow = currentWorkflowStage(state);
  const visibility = sceneVisibility();
  const expandedClass = expandedTarget ? `has-expanded expanded-${expandedTarget}` : '';
  const equipment = Object.values(state.equipment)
    .map((item) => {
      const pos = hotspotPosition(item.id);
      const conditionTier = equipmentConditionTier(item.condition);
      const status = equipmentSceneStatus(item.id);
      const expanded = expandedTarget === item.id;
      const obstructed =
        expandedTarget === 'fermenter'
          ? item.id === 'kettle' || item.id === 'bottler'
          : expandedTarget === 'bottler'
            ? item.id === 'fermenter'
            : false;
      return `
        <article
          class="equipment-hotspot hotspot-${item.id} ${expanded ? 'expanded' : ''} ${obstructed ? 'obstructed-by-card' : ''} condition-${conditionTier} ${status.toneClass} ${item.id === state.selectedEquipmentId ? 'selected' : ''} ${activeForEquipment(item.id) ? 'active' : ''} ${isNextTapTarget(item.id) ? 'next-tap' : ''}"
          style="--x: ${pos.x}%; --y: ${pos.y}%"
        >
          <button class="hotspot-toggle" data-action="toggle-target" data-target="${item.id}" type="button" aria-expanded="${expanded}" aria-label="${expanded ? 'Collapse' : 'Expand'} ${displayEquipmentName(item)}">
            <span class="hotspot-name">${displayEquipmentName(item)}</span>
            <strong>${status.label}</strong>
            ${expanded ? `<small>${status.detail}</small>` : ''}
          </button>
          ${expanded ? renderEquipmentActions(item.id) : ''}
        </article>
      `;
    })
    .join('');

  return `
    <section class="garage-scene ${expandedClass}" aria-label="Playable garage brewery floor">
      <div class="scene-vignette"></div>
      ${renderAtmosphere()}
      <div class="stage-summary" aria-label="Workflow overview">Mash · Ferment · Package · Sell</div>
      ${visibility.showInstruction ? `<div class="scene-instruction glass-panel"><span class="eyebrow gold">Next</span><strong>${nextSuggestedAction(state)}</strong></div>` : ''}
      ${renderMissionsControl()}
      ${renderSceneSupplyHotspots()}
      ${visibility.showWorkshopHotspot ? renderWorkshopHotspot() : ''}
      ${renderActiveBatchSign()}
      ${visibility.showFloorNoteTicker ? renderEventTicker() : ''}
      ${equipment}
      ${visibility.hasReadyCases || isNextTapTarget('cases') ? `<article class="case-hotspot ${expandedTarget === 'cases' ? 'expanded' : ''} ${expandedTarget === 'bottler' ? 'obstructed-by-card' : ''} ${state.inventory.cases > 0 ? 'active' : ''} ${isNextTapTarget('cases') ? 'next-tap' : ''}">
        <button class="hotspot-toggle" data-action="toggle-target" data-target="cases" type="button" aria-expanded="${expandedTarget === 'cases'}" aria-label="Expand cases">
          <span class="hotspot-name">Cases</span>
          <strong>${state.inventory.cases}</strong>
          ${expandedTarget === 'cases' ? `<small>${state.inventory.cases > 0 ? 'Ready to sell' : 'Packaged'}</small>` : ''}
        </button>
        ${
          expandedTarget === 'cases'
            ? `<div class="hotspot-actions"><button data-action="sell-cases" type="button" ${state.inventory.cases > 0 ? '' : 'disabled'}>Sell</button></div>`
            : ''
        }
      </article>` : ''}
      <div class="brewer-avatar" style="left: ${position.left}; top: ${position.top}" aria-label="Brewer position"><span></span></div>
      ${visibility.showNextTarget ? `<div class="next-target-label">Next: ${targetLabel(workflow.tapTarget)}</div>` : ''}
      ${renderOpsControl()}
    </section>
  `;
};

const renderBatchBoard = () => `
  <section class="overlay-section">
    <div class="panel-heading"><span class="eyebrow gold">Production</span><h2>Batch board</h2></div>
    ${
      state.batches.length === 0
        ? '<p>No active batch. Tap the brew system to choose a recipe.</p>'
        : state.batches
            .map(
              (batch) => `
              <article class="batch-card">
                <div><strong>${batch.recipeName}</strong><span>${stepLabel(batch.step)} · Q${batch.quality}</span></div>
                <small>${batch.casesExpected} cases expected · contamination risk ${batch.contaminationRisk}% · storage penalty ${batch.storagePenalty}</small>
                <progress value="${batch.step === 'ready' ? 100 : batch.stepProgress}" max="100"></progress>
              </article>
            `
            )
            .join('')
    }
    ${
      state.finishedBeerLots.length > 0
        ? state.finishedBeerLots.map((lot) => `<article class="batch-card"><div><strong>${lot.recipeName}</strong><span>${lot.cases} cases · Q${lot.quality}</span></div><small>Market appeal ${Math.round(lot.marketAppeal * 100)}%</small></article>`).join('')
        : ''
    }
  </section>
`;

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
      <div><span>Garage visibility</span><strong>${state.visibilityRisk}</strong></div>
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
        .map((order) => `<div><span>Arrives day ${order.arrivalDay}</span><strong>${formatCurrency(order.cost)} · ${order.items.map((item) => `${getIngredient(item.ingredientId).name} x${item.packs}`).join(', ')}</strong></div>`)
        .join('')}
    </div>
  </section>
`;

const renderUpgrades = () => `
  <section class="overlay-section upgrade-shop workshop-overlay">
    <div class="panel-heading"><span class="eyebrow gold">Workshop corner</span><h2>Equipment pallets</h2></div>
    ${Object.values(state.upgrades)
      .map(
        (upgrade) => `
          <button class="upgrade-pallet ${upgrade.purchased ? 'upgrade-installed' : ''}" type="button" data-action="buy-upgrade" data-upgrade-id="${upgrade.id}" ${upgrade.purchased ? 'disabled' : ''}>
            <span>${upgrade.purchased ? 'Installed: ' : 'Install: '}${upgrade.name}</span>
            <small>${upgrade.purchased ? 'Bolted into the brewery floor' : formatCurrency(upgrade.cost)} · ${upgrade.description}</small>
          </button>
        `
      )
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
  if (activeOverlay === 'recipes') return `<div class="focus-grid recipe-overlay">${renderRecipeCards()}</div>`;
  if (activeOverlay === 'production') return renderBatchBoard();
  if (activeOverlay === 'inventory') return renderInventory();
  if (activeOverlay === 'upgrades') return renderUpgrades();
  if (activeOverlay === 'log') return renderEventLog();
  return '';
};

const overlayTitle = () =>
  ({ recipes: 'Recipe / Brew', production: 'Production', inventory: 'Inventory detail', upgrades: 'Workshop upgrades', log: 'Clipboard log' })[activeOverlay ?? 'production'];

const renderFocusOverlay = () =>
  activeOverlay
    ? `
      <div class="focus-layer" role="dialog" aria-modal="false" aria-label="${overlayTitle()}">
        <button class="focus-scrim" data-action="close-overlay" type="button" aria-label="Close overlay"></button>
        <aside class="glass-panel focus-overlay">
          <button class="overlay-close" data-action="close-overlay" type="button" aria-label="Close overlay">×</button>
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

root.addEventListener('click', (event) => {
  audioAllowed = true;
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if (!target) {
    const clickTarget = event.target as HTMLElement;
    const isInsideOpenSurface = Boolean(
      clickTarget.closest('.equipment-hotspot, .case-hotspot, .supply-hotspot, .workshop-hotspot, .active-batch-sign, .event-ticker, .missions-control, .notification-control, .ops-control, .focus-overlay, button')
    );
    if ((expandedTarget || missionsOpen || notificationsOpen || opsOpen || activeOverlay) && !isInsideOpenSurface) {
      expandedTarget = null;
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
    activeOverlay = target.dataset.overlay as FocusOverlay;
    expandedTarget = null;
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
    activeOverlay = null;
    render();
    return;
  }

  if (action === 'reset-save') {
    resetGame();
    return;
  }

  if (action === 'toggle-missions') {
    missionsOpen = !missionsOpen;
    notificationsOpen = false;
    expandedTarget = null;
    activeOverlay = null;
    opsOpen = false;
    render();
    return;
  }

  if (action === 'toggle-notifications') {
    notificationsOpen = !notificationsOpen;
    missionsOpen = false;
    expandedTarget = null;
    activeOverlay = null;
    opsOpen = false;
    render();
    return;
  }

  if (action === 'toggle-target') {
    const nextTarget = target.dataset.target as SceneTarget;
    expandedTarget = expandedTarget === nextTarget ? null : nextTarget;
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
    dispatch({ type: 'start-batch', recipeId: target.dataset.recipeId ?? 'garage-blonde' });
    return;
  }

  if (action === 'order-recipe') {
    activeOverlay = null;
    opsOpen = false;
    dispatch({ type: 'order-recipe', recipeId: target.dataset.recipeId ?? 'garage-blonde', mode: target.dataset.orderMode === 'extra' ? 'extra' : 'missing' });
    return;
  }

  if (action === 'order-ingredient') {
    dispatch({ type: 'order-ingredient', ingredientId: target.dataset.ingredientId as IngredientId, packs: 1 });
    return;
  }

  if (action === 'sell-cases') {
    activeOverlay = null;
    opsOpen = false;
    dispatch({ type: 'sell-cases', cases: Math.min(6, state.inventory.cases) });
    return;
  }

  if (action === 'buy-upgrade') dispatch({ type: 'buy-upgrade', upgradeId: target.dataset.upgradeId as UpgradeId });
  if (action === 'clean-equipment') dispatch({ type: 'clean-equipment', equipmentId: target.dataset.equipmentId as EquipmentId });
});

window.setInterval(() => dispatch({ type: 'tick', seconds: 1 }), 1000);

render();
