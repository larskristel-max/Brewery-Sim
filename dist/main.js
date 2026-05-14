import { recipes } from './data/recipes.js';
import { createInitialState } from './game/initialState.js';
import { demandProgress, formatClock, formatCurrency, nextSuggestedAction, objectiveProgress } from './game/selectors.js';
import { reduceGame } from './game/simulation.js';
const root = document.querySelector('#root');
if (!root) {
    throw new Error('Missing #root element');
}
let state = createInitialState();
const dispatch = (action) => {
    state = reduceGame(state, action);
    render();
};
const stepLabel = (step) => ({ mashing: 'Mashing', fermenting: 'Fermenting', packaging: 'Packaging', ready: 'Ready' })[step] ?? step;
const equipmentIcon = (equipmentId) => ({ kettle: '♨️', fermenter: '🛢️', bottler: '📦' })[equipmentId];
const activeForEquipment = (equipmentId) => {
    const stepByEquipment = { kettle: 'mashing', fermenter: 'fermenting', bottler: 'packaging' };
    return state.batches.some((batch) => batch.step === stepByEquipment[equipmentId]);
};
const brewerPosition = () => {
    const focus = state.batches[0]?.step ?? 'idle';
    return {
        mashing: { left: '25%', top: '63%' },
        fermenting: { left: '50%', top: '60%' },
        packaging: { left: '74%', top: '70%' },
        ready: { left: '83%', top: '40%' },
        idle: { left: '37%', top: '72%' }
    }[focus];
};
const renderTopBar = () => {
    const objective = objectiveProgress(state);
    return `
    <header class="top-bar" aria-label="Brewery status">
      <div><span class="eyebrow">Garage Brewery</span><strong>Day ${state.day} · ${formatClock(state.minute)}</strong></div>
      <div><span class="eyebrow">Cash</span><strong>${formatCurrency(state.cash)}</strong></div>
      <div><span class="eyebrow">Rep</span><strong>${state.reputation}</strong></div>
      <div class="objective-card">
        <span class="eyebrow">Objective</span>
        <strong>${objective.label}</strong>
        <progress value="${objective.progress}" max="100"></progress>
      </div>
      <div class="objective-card">
        <span class="eyebrow">Local demand</span>
        <strong>${demandProgress(state)}</strong>
        <progress value="${state.demand.casesSold}" max="${state.demand.casesRequested}"></progress>
      </div>
    </header>
  `;
};
const renderGarage = () => {
    const position = brewerPosition();
    const equipment = Object.values(state.equipment)
        .map((item) => `
        <button
          class="equipment-node ${item.id === state.selectedEquipmentId ? 'selected' : ''} ${activeForEquipment(item.id) ? 'active' : ''}"
          style="left: ${item.x}%; top: ${item.y}%"
          data-action="use-equipment"
          data-equipment-id="${item.id}"
          type="button"
          aria-label="Use ${item.name}"
        >
          <span class="equipment-icon">${equipmentIcon(item.id)}</span>
          <span>${item.name}</span>
          <small>Lvl ${item.level} · ${Math.round(item.condition)}% clean</small>
        </button>
      `)
        .join('');
    return `
    <section class="garage-scene" aria-label="Playable garage brewery floor">
      <div class="scene-title"><span>Tap equipment directly: kettle → fermenter → capper → cases</span><strong>${state.inventory.cases} cases ready</strong></div>
      <div class="workbench"></div>
      <button class="case-stack ${state.inventory.cases > 0 ? 'active' : ''}" data-action="sell-cases" type="button" ${state.inventory.cases > 0 ? '' : 'disabled'}>
        <span>📦</span><strong>Cases</strong><small>Tap to sell</small>
      </button>
      <div class="floor-line floor-line-one"></div>
      <div class="floor-line floor-line-two"></div>
      ${equipment}
      <div class="brewer-avatar" style="left: ${position.left}; top: ${position.top}" aria-label="Brewer avatar"><span>🧢</span></div>
    </section>
  `;
};
const renderActions = () => {
    const selected = state.equipment[state.selectedEquipmentId];
    const recipeButtons = recipes
        .map((recipe) => `
        <button type="button" data-action="start-batch" data-recipe-id="${recipe.id}">
          Brew ${recipe.name}
          <small>${recipe.batchSizeCases} cases · ${recipe.grainCost} kg grain · ${recipe.waterCost} L water</small>
        </button>
      `)
        .join('');
    return `
    <section class="panel action-panel">
      <div class="panel-heading"><span class="eyebrow">Selected</span><h2>${selected.name}</h2></div>
      <p>${selected.description}</p>
      <div class="risk-card">
        <strong>Equipment risk</strong>
        <span>Low condition reduces quality. Dirty fermenter raises contamination risk. Cleaning costs €18.</span>
      </div>
      <div class="action-grid">
        ${recipeButtons}
        <button type="button" data-action="clean-equipment" data-equipment-id="${selected.id}">
          Clean selected gear
          <small>€18 · improves condition and lowers risk</small>
        </button>
      </div>
    </section>
  `;
};
const renderBatchBoard = () => `
  <section class="panel compact-panel">
    <div class="panel-heading"><span class="eyebrow">Production</span><h2>Batch board</h2></div>
    ${state.batches.length === 0
    ? '<p>No active batch. Tap the kettle to mash a 40 L brew.</p>'
    : state.batches
        .map((batch) => `
              <article class="batch-card">
                <div><strong>${batch.recipeName}</strong><span>${stepLabel(batch.step)} · Q${batch.quality}</span></div>
                <small>${batch.casesExpected} cases expected · contamination risk ${batch.contaminationRisk}%</small>
                <progress value="${batch.step === 'ready' ? 100 : batch.stepProgress}" max="100"></progress>
              </article>
            `)
        .join('')}
  </section>
`;
const renderInventory = () => `
  <section class="panel compact-panel">
    <div class="panel-heading"><span class="eyebrow">Supplies</span><h2>Metric inventory</h2></div>
    <div class="inventory-list">
      <div><span>Grain</span><strong>${state.inventory.grain} kg</strong></div>
      <div><span>Hops</span><strong>${state.inventory.hops} kg</strong></div>
      <div><span>Yeast</span><strong>${state.inventory.yeast} packs</strong></div>
      <div><span>Water</span><strong>${state.inventory.water} L</strong></div>
      <div><span>Cases</span><strong>${state.inventory.cases}</strong></div>
      <div><span>Fermentation</span><strong>18°C</strong></div>
    </div>
  </section>
`;
const renderUpgrades = () => `
  <section class="panel compact-panel upgrade-shop">
    <div class="panel-heading"><span class="eyebrow">Growth</span><h2>Upgrade shelf</h2></div>
    ${Object.values(state.upgrades)
    .map((upgrade) => `
          <button type="button" data-action="buy-upgrade" data-upgrade-id="${upgrade.id}" ${upgrade.purchased ? 'disabled' : ''}>
            <span>${upgrade.purchased ? '✓ ' : ''}${upgrade.name}</span>
            <small>${upgrade.purchased ? 'Installed' : formatCurrency(upgrade.cost)} · ${upgrade.description}</small>
          </button>
        `)
    .join('')}
  </section>
`;
const renderEventLog = () => `
  <section class="panel event-log">
    <div class="panel-heading"><span class="eyebrow">Floor chatter</span><h2>Event log</h2></div>
    <ol>
      ${state.events.map((event) => `<li><time>${formatClock(event.minute)}</time><span>${event.message}</span></li>`).join('')}
    </ol>
  </section>
`;
const render = () => {
    root.innerHTML = `
    <main class="game-shell">
      ${renderTopBar()}
      <aside class="toast">Next: ${nextSuggestedAction(state)}</aside>
      ${renderGarage()}
      <div class="dashboard-grid">
        ${renderActions()}
        ${renderBatchBoard()}
        ${renderInventory()}
        ${renderUpgrades()}
        ${renderEventLog()}
      </div>
    </main>
  `;
};
root.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-action]');
    if (!target)
        return;
    const action = target.dataset.action;
    if (action === 'select-equipment')
        dispatch({ type: 'select-equipment', equipmentId: target.dataset.equipmentId });
    if (action === 'use-equipment')
        dispatch({ type: 'use-equipment', equipmentId: target.dataset.equipmentId });
    if (action === 'start-batch')
        dispatch({ type: 'start-batch', recipeId: target.dataset.recipeId ?? 'garage-pale' });
    if (action === 'package-batch' && target.dataset.batchId)
        dispatch({ type: 'package-batch', batchId: target.dataset.batchId });
    if (action === 'sell-cases')
        dispatch({ type: 'sell-cases', cases: Math.min(6, state.inventory.cases) });
    if (action === 'buy-upgrade')
        dispatch({ type: 'buy-upgrade', upgradeId: target.dataset.upgradeId });
    if (action === 'clean-equipment')
        dispatch({ type: 'clean-equipment', equipmentId: target.dataset.equipmentId });
});
window.setInterval(() => dispatch({ type: 'tick', seconds: 1 }), 1000);
render();
//# sourceMappingURL=main.js.map