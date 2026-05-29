import { equipmentByStation } from '../data/equipment.js';
import { ingredients, getIngredient } from '../data/ingredients.js';
import type { EquipmentCatalogItem, GameState, IngredientId } from '../game/schema.js';
import { campaignAllowsCleaning, campaignAllowsFormalBuyers } from '../game/campaign.js';
import {
  caseCountLabel,
  caseDefinitionExplanation,
  formatClock,
  formatCurrency,
  formatGameDate,
  garageSpaceAvailable,
  ingredientAmountLabel,
  orderCost,
  recipeMissingIngredients,
  recipeMissingOrderSummary,
  recipeRequirementSummary,
  recipeSupplyBreakdown,
  storageCapacityByArea,
  storageOverflowByArea,
  storageUseByArea,
  visibleRecipes
} from '../game/selectors.js';
import { displayEquipmentName, stationLabels } from './sceneEquipment.js';
import { renderSalesOffers } from './stationPanel.js';
import { equipmentCapacityLabel } from './stationViewModel.js';
import type { FocusOverlay, ShopSection, StoreStation } from './types.js';

type OverlayContext = {
  state: GameState;
  activeOverlay: FocusOverlay | null;
  selectedShopSection: ShopSection | null;
  batchRemainingLabel: (batch: GameState['batches'][number]) => string;
  stepLabel: (step: string) => string;
};

const garageSpaceUsed = (state: GameState): number => state.garageSpaceUsed;
const garageSpaceLimit = (state: GameState): number => state.garageSpaceLimit;

const incomingForIngredient = (state: GameState, ingredientId: IngredientId): { amount: number; arrivalDay: number | null } =>
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

const garageBlondeRecipe = () => visibleRecipes().find((recipe) => recipe.id === 'garage-blonde') ?? visibleRecipes()[0];

const renderBatchBoard = ({ state, batchRemainingLabel, stepLabel }: OverlayContext) => {
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

const renderStorageStatus = (state: GameState) => {
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

const renderInventory = (state: GameState) => `
  <section class="overlay-section inventory-overlay-detail">
    <div class="panel-heading"><span class="eyebrow gold">Supplies</span><h2>Inventory detail</h2></div>
    ${renderStorageStatus(state)}
    <div class="inventory-list">
      <div><span>Water</span><strong>${state.inventory.water} L</strong></div>
      <div><span>Cases</span><strong>${caseCountLabel(state.inventory.cases)}</strong></div>
      <div><span>Garage equipment space</span><strong>${garageSpaceUsed(state)}/${garageSpaceLimit(state)}</strong></div>
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

const equipmentStoreButtonState = (state: GameState, item: EquipmentCatalogItem): { disabled: boolean; label: string; reason: string; className: string } => {
  const current = state.equipment[item.equipmentId];
  const ownedCount = state.ownedEquipment.filter((owned) => owned.itemId === item.id).length;
  const canOwnMore = Boolean(item.maxOwned && ownedCount < item.maxOwned);
  const projectedSpace = garageSpaceUsed(state) + item.spaceUsed;
  if (ownedCount > 0 && item.id === current.itemId && !canOwnMore) return { disabled: true, label: 'Installed', reason: 'On the garage floor now', className: 'upgrade-installed' };
  if (!item.maxOwned && ownedCount > 0) return { disabled: true, label: 'Owned', reason: 'Already installed', className: 'upgrade-installed' };
  if (item.maxOwned && ownedCount >= item.maxOwned) return { disabled: true, label: 'Limit', reason: `${ownedCount}/${item.maxOwned} owned`, className: 'upgrade-locked' };
  if (state.cash < item.cost) return { disabled: true, label: 'Need cash', reason: `Need ${formatCurrency(item.cost)}`, className: 'upgrade-locked' };
  if (projectedSpace > garageSpaceLimit(state)) return { disabled: true, label: 'No space', reason: `${projectedSpace}/${garageSpaceLimit(state)} garage space`, className: 'upgrade-locked' };
  return { disabled: false, label: canOwnMore ? 'Add another' : 'Buy', reason: `${formatCurrency(item.cost)} - ${projectedSpace}/${garageSpaceLimit(state)} space after purchase`, className: '' };
};

const renderEquipmentStoreCard = (state: GameState, item: EquipmentCatalogItem) => {
  const buttonState = equipmentStoreButtonState(state, item);
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

const ingredientCartButtonState = (state: GameState, ingredient: (typeof ingredients)[number]): { disabled: boolean; label: string; reason: string; className: string } => {
  const incoming = incomingForIngredient(state, ingredient.id);
  if (state.cash < ingredient.packPrice) return { disabled: true, label: 'Need cash', reason: `Need ${formatCurrency(ingredient.packPrice)}`, className: 'upgrade-locked' };
  if (incoming.amount > 0 && incoming.arrivalDay) return { disabled: false, label: 'Order more', reason: `${ingredientAmountLabel(ingredient.id, incoming.amount)} incoming ${formatGameDate(incoming.arrivalDay)}`, className: 'cart-incoming' };
  const packLabel = ingredient.id === 'bottles' ? `${ingredient.packSize} bottle pack` : `${ingredientAmountLabel(ingredient.id, ingredient.packSize)} pack`;
  return { disabled: false, label: 'Add to cart', reason: `${packLabel} - ${formatCurrency(ingredient.packPrice)}`, className: '' };
};

const renderIngredientCartCard = (state: GameState, ingredient: (typeof ingredients)[number]) => {
  const stock = state.inventory.ingredients[ingredient.id];
  const buttonState = ingredientCartButtonState(state, ingredient);
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

const renderCampaignSupplyHint = (state: GameState) => {
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

const renderIngredientCart = (state: GameState) => `
  <section class="equipment-store-group ingredient-cart-group">
    <div class="store-group-heading">
      <span class="eyebrow">Supplies</span>
      <strong>Ingredients and packaging</strong>
      <small>${state.pendingOrders.length} incoming order${state.pendingOrders.length === 1 ? '' : 's'}</small>
    </div>
    ${renderCampaignSupplyHint(state)}
    <div class="ingredient-cart-grid">
      ${ingredients.map((ingredient) => renderIngredientCartCard(state, ingredient)).join('')}
    </div>
  </section>
`;

const renderShopSectionCards = (state: GameState) => {
  const lowSupplyCount = ingredients.filter((ingredient) => {
    const stock = state.inventory.ingredients[ingredient.id];
    return stock.amount <= ingredient.packSize;
  }).length;
  const incomingCount = state.pendingOrders.length;
  const availableEquipmentCount = equipmentByStation('kettle')
    .concat(equipmentByStation('fermenter'), equipmentByStation('mill'), equipmentByStation('bottler'))
    .filter((item) => !equipmentStoreButtonState(state, item).disabled).length;
  return `
    <section class="recipe-category-screen shop-section-screen">
      <div class="panel-heading recipe-flow-heading">
        <span class="eyebrow gold">Shop cart</span>
        <h2>Choose cart</h2>
        <small>${formatCurrency(state.cash)} cash - ${garageSpaceUsed(state)}/${garageSpaceLimit(state)} garage space</small>
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

const renderEquipmentStore = ({ state, selectedShopSection }: OverlayContext) => `
  <section class="overlay-section upgrade-shop workshop-overlay shop-cart-overlay">
    ${
      selectedShopSection === null
        ? renderShopSectionCards(state)
        : selectedShopSection === 'supplies'
          ? `
            <div class="panel-heading store-heading">
              <button class="back-button" data-action="back-shop-sections" type="button">Back</button>
              <span class="eyebrow gold">Supplies</span>
              <h2>Ingredients and packaging</h2>
              <small>${formatCurrency(state.cash)} cash - ${state.pendingOrders.length} incoming order${state.pendingOrders.length === 1 ? '' : 's'}</small>
            </div>
            ${renderIngredientCart(state)}
          `
          : `
            <div class="panel-heading store-heading">
              <button class="back-button" data-action="back-shop-sections" type="button">Back</button>
              <span class="eyebrow gold">Equipment</span>
              <h2>Garage equipment</h2>
              <small>${formatCurrency(state.cash)} cash - ${garageSpaceUsed(state)}/${garageSpaceLimit(state)} garage space</small>
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
                      ${equipmentByStation(station).map((item) => renderEquipmentStoreCard(state, item)).join('')}
                    </div>
                  </section>
                `
              )
              .join('')}
          `
    }
  </section>
`;

const renderEventLog = (state: GameState) => `
  <section class="overlay-section clipboard-popover">
    <div class="panel-heading"><span class="eyebrow gold">Clipboard</span><h2>Floor notes</h2></div>
    <ol>
      ${state.events.map((event) => `<li><time>${formatClock(event.minute)}</time><span>${event.message}</span></li>`).join('')}
    </ol>
  </section>
`;

const overlayContent = (context: OverlayContext) => {
  if (context.activeOverlay === 'production') return renderBatchBoard(context);
  if (context.activeOverlay === 'inventory') return renderInventory(context.state);
  if (context.activeOverlay === 'upgrades') return renderEquipmentStore(context);
  if (context.activeOverlay === 'log') return renderEventLog(context.state);
  return '';
};

const overlayTitle = (activeOverlay: FocusOverlay | null) =>
  ({ production: 'Production', inventory: 'Inventory detail', upgrades: 'Shop cart', log: 'Clipboard log' })[activeOverlay ?? 'production'];

export const renderFocusOverlay = (context: OverlayContext) =>
  context.activeOverlay
    ? `
      <div class="focus-layer" role="dialog" aria-modal="true" aria-label="${overlayTitle(context.activeOverlay)}">
        <button class="focus-scrim" data-action="close-overlay" type="button" aria-label="Dismiss overlay background"></button>
        <aside class="glass-panel focus-overlay focus-${context.activeOverlay}">
          <button class="overlay-close" data-action="close-overlay" type="button" aria-label="Close overlay"></button>
          ${overlayContent(context)}
        </aside>
      </div>
    `
    : '';
