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
    <div class="brand-lockup">
      <span class="brand-mark" aria-hidden="true">HH</span>
      <div><strong>HOP HAVEN</strong><span>Garage Brewery Co.</span></div>
    </div>
    <div class="hud-stat"><span class="eyebrow">Day ${state.day}</span><strong>${formatClock(state.minute)}</strong></div>
    <div class="hud-stat rep-stat">
      <span class="eyebrow">Reputation</span>
      <strong>${state.reputation}</strong>
      <span class="mini-meter"><i style="width: ${Math.min(100, state.reputation * 8)}%"></i></span>
    </div>
    <div class="hud-stat"><span class="eyebrow">Cash</span><strong>${formatCurrency(state.cash)}</strong></div>
    <div class="hud-save">
      <span>${saveStatus}</span>
      <button class="reset-save-button" data-action="reset-save" type="button" title="Clears this browser's local save">New Game / Reset Save</button>
    </div>
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
        <button data-action="use-equipment" data-equipment-id="kettle" type="button">Brew</button>
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

const renderGarage = () => {
  const position = brewerPosition();
  const workflow = currentWorkflowStage(state);
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
      <div class="stage-summary" aria-label="Workflow overview">Mash · Ferment · Package · Sell</div>
      <div class="scene-instruction glass-panel">
        <span class="eyebrow gold">Next</span>
        <strong>${nextSuggestedAction(state)}</strong>
      </div>
      ${renderMissionsControl()}
      ${renderNotificationControl()}
      ${equipment}
      <article class="case-hotspot ${expandedTarget === 'cases' ? 'expanded' : ''} ${expandedTarget === 'bottler' ? 'obstructed-by-card' : ''} ${state.inventory.cases > 0 ? 'active' : ''} ${isNextTapTarget('cases') ? 'next-tap' : ''}">
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
      </article>
      <div class="brewer-avatar" style="left: ${position.left}; top: ${position.top}" aria-label="Brewer position"><span></span></div>
      <div class="next-target-label">Next: ${targetLabel(workflow.tapTarget)}</div>
    </section>
  `;
};

const renderBatchBoard = () => `
  <section class="glass-panel compact-panel">
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
    <div class="inventory-list">
      <div><span>Dry shelf</span><strong>${use['dry-shelf'].toFixed(1)}/${capacity['dry-shelf']} kg${overflow['dry-shelf'] > 0 ? ' overflow' : ''}</strong></div>
      <div><span>Cold box</span><strong>${use['cold-box'].toFixed(2)}/${capacity['cold-box']} kg eq.${overflow['cold-box'] > 0 ? ' overflow' : ''}</strong></div>
      <div><span>Utility shelf</span><strong>${use['utility-shelf'].toFixed(0)}/${capacity['utility-shelf']} units${overflow['utility-shelf'] > 0 ? ' overflow' : ''}</strong></div>
    </div>
  `;
};

const renderInventory = () => `
  <section class="glass-panel compact-panel">
    <div class="panel-heading"><span class="eyebrow gold">Supplies</span><h2>Inventory</h2></div>
    ${renderStorageStatus()}
    <div class="inventory-list">
      <div><span>Water</span><strong>${state.inventory.water} L</strong></div>
      <div><span>Cases</span><strong>${state.inventory.cases}</strong></div>
      <div><span>Garage visibility</span><strong>${state.visibilityRisk}</strong></div>
      ${ingredients
        .map((ingredient) => {
          const stock = state.inventory.ingredients[ingredient.id];
          return `<div><span>${ingredient.name}</span><strong>${ingredientAmountLabel(ingredient.id, stock.amount)} · ${Math.round(stock.condition)}%</strong><button data-action="order-ingredient" data-ingredient-id="${ingredient.id}" type="button" ${state.cash >= ingredient.packPrice ? '' : 'disabled'}>Order ${formatCurrency(ingredient.packPrice)}</button></div>`;
        })
        .join('')}
    </div>
    <div class="inventory-list">
      <div><span>Incoming orders</span><strong>${state.pendingOrders.length}</strong></div>
      ${state.pendingOrders
        .map((order) => `<div><span>Arrives day ${order.arrivalDay}</span><strong>${formatCurrency(order.cost)} · ${order.items.map((item) => `${getIngredient(item.ingredientId).name} x${item.packs}`).join(', ')}</strong></div>`)
        .join('')}
    </div>
  </section>
`;

const renderUpgrades = () => `
  <section class="glass-panel compact-panel upgrade-shop">
    <div class="panel-heading"><span class="eyebrow gold">Growth</span><h2>Upgrade shelf</h2></div>
    ${Object.values(state.upgrades)
      .map(
        (upgrade) => `
          <button type="button" data-action="buy-upgrade" data-upgrade-id="${upgrade.id}" ${upgrade.purchased ? 'disabled' : ''}>
            <span>${upgrade.purchased ? 'Installed: ' : ''}${upgrade.name}</span>
            <small>${upgrade.purchased ? 'Already installed' : formatCurrency(upgrade.cost)} · ${upgrade.description}</small>
          </button>
        `
      )
      .join('')}
  </section>
`;

const renderEventLog = () => `
  <section class="glass-panel event-log">
    <div class="panel-heading"><span class="eyebrow gold">Floor log</span><h2>Recent activity</h2></div>
    <ol>
      ${state.events.map((event) => `<li><time>${formatClock(event.minute)}</time><span>${event.message}</span></li>`).join('')}
    </ol>
  </section>
`;

const render = () => {
  root.innerHTML = `
    <main class="game-shell">
      ${renderTopHud()}
      ${renderGarage()}
      <div class="lower-panels">
        ${renderBatchBoard()}
        ${renderInventory()}
        ${renderUpgrades()}
        ${renderEventLog()}
      </div>
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
      clickTarget.closest('.equipment-hotspot, .case-hotspot, .missions-control, .notification-control, button')
    );
    if ((expandedTarget || missionsOpen || notificationsOpen) && !isInsideOpenSurface) {
      expandedTarget = null;
      missionsOpen = false;
      notificationsOpen = false;
      render();
    }
    return;
  }

  const action = target.dataset.action;
  if (action === 'reset-save') {
    resetGame();
    return;
  }

  if (action === 'toggle-missions') {
    missionsOpen = !missionsOpen;
    notificationsOpen = false;
    expandedTarget = null;
    render();
    return;
  }

  if (action === 'toggle-notifications') {
    notificationsOpen = !notificationsOpen;
    missionsOpen = false;
    expandedTarget = null;
    render();
    return;
  }

  if (action === 'toggle-target') {
    const nextTarget = target.dataset.target as SceneTarget;
    expandedTarget = expandedTarget === nextTarget ? null : nextTarget;
    missionsOpen = false;
    notificationsOpen = false;
    render();
    return;
  }

  if (action === 'use-equipment') {
    dispatch({ type: 'use-equipment', equipmentId: target.dataset.equipmentId as EquipmentId });
    return;
  }

  if (action === 'start-batch') {
    dispatch({ type: 'start-batch', recipeId: target.dataset.recipeId ?? 'garage-blonde' });
    return;
  }

  if (action === 'order-recipe') {
    dispatch({ type: 'order-recipe', recipeId: target.dataset.recipeId ?? 'garage-blonde', mode: target.dataset.orderMode === 'extra' ? 'extra' : 'missing' });
    return;
  }

  if (action === 'order-ingredient') {
    dispatch({ type: 'order-ingredient', ingredientId: target.dataset.ingredientId as IngredientId, packs: 1 });
    return;
  }

  if (action === 'sell-cases') {
    dispatch({ type: 'sell-cases', cases: Math.min(6, state.inventory.cases) });
    return;
  }

  if (action === 'buy-upgrade') dispatch({ type: 'buy-upgrade', upgradeId: target.dataset.upgradeId as UpgradeId });
  if (action === 'clean-equipment') dispatch({ type: 'clean-equipment', equipmentId: target.dataset.equipmentId as EquipmentId });
});

window.setInterval(() => dispatch({ type: 'tick', seconds: 1 }), 1000);

render();
