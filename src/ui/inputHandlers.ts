import type { BrewdayApproach, BreweryPromiseId, EquipmentId, EquipmentItemId, GameAction, GameState, IngredientId, PackagingMode, RecipeCategoryId, SalesChannelId, TransferMode } from '../game/schema.js';
import type { FocusOverlay, SceneTarget, ShopSection } from './types.js';

type InputHandlerContext = {
  getState: () => GameState;
  setAudioAllowed: () => void;
  dispatch: (action: GameAction) => void;
  render: () => void;
  resetGame: () => void;
  handleLayoutInput: (event: Event) => void;
  dismissGuidance: () => void;
  restoreGuidance: () => void;
  getExpandedTarget: () => SceneTarget | null;
  setExpandedTarget: (target: SceneTarget | null) => void;
  setExpandedEquipmentInstanceId: (instanceId: string | null) => void;
  getExpandedEquipmentInstanceId: () => string | null;
  getMissionsOpen: () => boolean;
  setMissionsOpen: (open: boolean) => void;
  getNotificationsOpen: () => boolean;
  setNotificationsOpen: (open: boolean) => void;
  getOpsOpen: () => boolean;
  setOpsOpen: (open: boolean) => void;
  getActiveOverlay: () => FocusOverlay | null;
  setActiveOverlay: (overlay: FocusOverlay | null) => void;
  getRecipePanelOpen: () => boolean;
  setRecipePanelOpen: (open: boolean) => void;
  setSelectedRecipeCategoryId: (categoryId: RecipeCategoryId | null) => void;
  setSelectedShopSection: (section: ShopSection | null) => void;
  getRecipePage: () => number;
  setRecipePage: (page: number) => void;
};

type CrisisActionId = Extract<GameAction, { type: 'crisis-action' }>['actionId'];
type RecoveryActionId = Extract<GameAction, { type: 'recovery-action' }>['actionId'];

const resetRecipeSelection = (context: InputHandlerContext) => {
  context.setSelectedRecipeCategoryId(null);
  context.setRecipePage(0);
};

const clearExpandedStation = (context: InputHandlerContext) => {
  context.setExpandedTarget(null);
  context.setExpandedEquipmentInstanceId(null);
};

const closePopovers = (context: InputHandlerContext) => {
  context.setMissionsOpen(false);
  context.setNotificationsOpen(false);
  context.setOpsOpen(false);
};

export const installRootEventHandlers = (root: HTMLElement, context: InputHandlerContext) => {
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
    context.handleLayoutInput(event);
  });

  root.addEventListener('click', (event) => {
    context.setAudioAllowed();
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) {
      const clickTarget = event.target as HTMLElement;
      const isInsideOpenSurface = Boolean(
        clickTarget.closest('.equipment-object, .equipment-hotspot, .sell-point-object, .case-hotspot, .supply-hotspot, .workshop-hotspot, .event-ticker, .missions-control, .notification-control, .ops-control, .layout-debug-panel, .focus-overlay, button')
      );
      if (
        (context.getExpandedTarget() ||
          context.getMissionsOpen() ||
          context.getNotificationsOpen() ||
          context.getOpsOpen() ||
          context.getActiveOverlay() ||
          context.getRecipePanelOpen()) &&
        !isInsideOpenSurface
      ) {
        clearExpandedStation(context);
        closePopovers(context);
        context.setActiveOverlay(null);
        context.setRecipePanelOpen(false);
        context.setSelectedShopSection(null);
        resetRecipeSelection(context);
        context.render();
      }
      return;
    }

    const action = target.dataset.action;
    if (action === 'close-overlay') {
      context.setActiveOverlay(null);
      context.setRecipePanelOpen(false);
      context.setSelectedShopSection(null);
      resetRecipeSelection(context);
      context.setOpsOpen(false);
      context.render();
      return;
    }

    if (action === 'open-overlay') {
      const requestedOverlay = target.dataset.overlay;
      if (requestedOverlay === 'recipes') {
        context.setRecipePanelOpen(true);
        resetRecipeSelection(context);
        context.setActiveOverlay(null);
      } else {
        context.setActiveOverlay(requestedOverlay as FocusOverlay);
        context.setRecipePanelOpen(false);
        resetRecipeSelection(context);
        const missionId = context.getState().campaign.missionId;
        context.setSelectedShopSection(
          requestedOverlay === 'upgrades' && missionId === 'empty-shelf'
            ? 'supplies'
            : requestedOverlay === 'upgrades' && missionId === 'bucket-empire'
              ? 'equipment'
              : null
        );
      }
      clearExpandedStation(context);
      closePopovers(context);
      context.render();
      return;
    }

    if (action === 'dismiss-guidance') {
      context.dismissGuidance();
      context.render();
      return;
    }

    if (action === 'restore-guidance') {
      context.restoreGuidance();
      context.setOpsOpen(false);
      context.render();
      return;
    }

    if (action === 'dismiss-story-card') {
      context.dispatch({ type: 'dismiss-story-card' });
      return;
    }

    if (action === 'close-station-panel') {
      clearExpandedStation(context);
      context.setRecipePanelOpen(false);
      resetRecipeSelection(context);
      context.render();
      return;
    }

    if (action === 'select-recipe-category') {
      context.setRecipePanelOpen(true);
      context.setSelectedRecipeCategoryId(target.dataset.categoryId as RecipeCategoryId);
      context.setRecipePage(0);
      context.render();
      return;
    }

    if (action === 'back-to-categories') {
      context.setRecipePanelOpen(true);
      resetRecipeSelection(context);
      context.render();
      return;
    }

    if (action === 'recipes-next-page') {
      context.setRecipePage(context.getRecipePage() + 1);
      context.render();
      return;
    }

    if (action === 'recipes-prev-page') {
      context.setRecipePage(Math.max(0, context.getRecipePage() - 1));
      context.render();
      return;
    }

    if (action === 'select-shop-section') {
      context.setSelectedShopSection(target.dataset.shopSection as ShopSection);
      context.render();
      return;
    }

    if (action === 'back-shop-sections') {
      context.setSelectedShopSection(null);
      context.render();
      return;
    }

    if (action === 'toggle-ops') {
      context.setOpsOpen(!context.getOpsOpen());
      context.setMissionsOpen(false);
      context.setNotificationsOpen(false);
      clearExpandedStation(context);
      context.setActiveOverlay(null);
      context.setRecipePanelOpen(false);
      context.setSelectedShopSection(null);
      resetRecipeSelection(context);
      context.render();
      return;
    }

    if (action === 'reset-save') {
      context.resetGame();
      return;
    }

    if (action === 'end-day') {
      context.setOpsOpen(false);
      context.dispatch({ type: 'end-day' });
      return;
    }

    if (action === 'toggle-missions') {
      context.setMissionsOpen(!context.getMissionsOpen());
      context.setNotificationsOpen(false);
      clearExpandedStation(context);
      context.setActiveOverlay(null);
      context.setOpsOpen(false);
      context.render();
      return;
    }

    if (action === 'toggle-notifications') {
      context.setNotificationsOpen(!context.getNotificationsOpen());
      context.setMissionsOpen(false);
      clearExpandedStation(context);
      context.setActiveOverlay(null);
      context.setOpsOpen(false);
      context.render();
      return;
    }

    if (action === 'toggle-target') {
      const nextTarget = target.dataset.target as SceneTarget;
      const nextInstanceId = target.dataset.equipmentInstanceId ?? null;
      const collapseSameTarget = context.getExpandedTarget() === nextTarget && context.getExpandedEquipmentInstanceId() === nextInstanceId;
      context.setExpandedTarget(collapseSameTarget ? null : nextTarget);
      context.setExpandedEquipmentInstanceId(collapseSameTarget ? null : nextInstanceId);
      context.setMissionsOpen(false);
      context.setNotificationsOpen(false);
      context.setActiveOverlay(null);
      context.setOpsOpen(false);
      context.render();
      return;
    }

    if (action === 'use-equipment') {
      context.dispatch({ type: 'use-equipment', equipmentId: target.dataset.equipmentId as EquipmentId });
      return;
    }

    if (action === 'start-batch') {
      context.setActiveOverlay(null);
      context.setOpsOpen(false);
      context.setRecipePanelOpen(false);
      context.setExpandedTarget('kettle');
      context.setExpandedEquipmentInstanceId(null);
      context.dispatch({
        type: 'start-batch',
        recipeId: target.dataset.recipeId ?? 'garage-blonde',
        brewdayApproach: (target.dataset.brewdayApproach as BrewdayApproach) ?? 'standard',
        allowSubstitutions: target.dataset.allowSubstitutions === 'true'
      });
      return;
    }

    if (action === 'wait-until-ready') {
      const batch = context.getState().batches.find((item) => item.id === (target.dataset.batchId ?? ''));
      if (batch?.step === 'packaging') {
        context.setExpandedTarget('bottler');
        context.setExpandedEquipmentInstanceId(null);
      }
      if (batch?.step === 'bottle-conditioning') {
        context.setExpandedTarget('cases');
        context.setExpandedEquipmentInstanceId(null);
      }
      context.dispatch({ type: 'wait-until-ready', batchId: target.dataset.batchId });
      return;
    }

    if (action === 'order-recipe') {
      context.setOpsOpen(false);
      context.dispatch({ type: 'order-recipe', recipeId: target.dataset.recipeId ?? 'garage-blonde', mode: target.dataset.orderMode === 'extra' ? 'extra' : 'missing' });
      return;
    }

    if (action === 'order-ingredient') {
      context.dispatch({ type: 'order-ingredient', ingredientId: target.dataset.ingredientId as IngredientId, packs: 1 });
      return;
    }

    if (action === 'transfer-batch') {
      const batch = context.getState().batches.find((item) => item.id === (target.dataset.batchId ?? ''));
      context.setExpandedTarget('fermenter');
      context.setExpandedEquipmentInstanceId(batch?.fermenterInstanceId ?? null);
      context.dispatch({ type: 'transfer-batch', batchId: target.dataset.batchId ?? '', transferMode: (target.dataset.transferMode as TransferMode) ?? 'careful' });
      return;
    }

    if (action === 'check-gravity') {
      context.setExpandedTarget('fermenter');
      context.dispatch({ type: 'check-gravity', batchId: target.dataset.batchId ?? '' });
      return;
    }

    if (action === 'package-early') {
      context.setExpandedTarget('fermenter');
      context.dispatch({ type: 'package-early', batchId: target.dataset.batchId ?? '' });
      return;
    }

    if (action === 'start-packaging') {
      context.setExpandedTarget('bottler');
      context.setExpandedEquipmentInstanceId(null);
      context.dispatch({ type: 'start-packaging', batchId: target.dataset.batchId ?? '', packagingMode: (target.dataset.packagingMode as PackagingMode) ?? 'standard' });
      return;
    }

    if (action === 'ready-batch') {
      context.setExpandedTarget('cases');
      context.setExpandedEquipmentInstanceId(null);
      context.dispatch({ type: 'ready-batch', batchId: target.dataset.batchId ?? '' });
      return;
    }

    if (action === 'sell-cases') {
      context.setActiveOverlay(null);
      context.setOpsOpen(false);
      context.dispatch({ type: 'sell-cases', cases: Math.min(6, context.getState().inventory.cases) });
      return;
    }

    if (action === 'sell-channel') {
      context.setActiveOverlay(null);
      context.setOpsOpen(false);
      clearExpandedStation(context);
      context.dispatch({ type: 'sell-channel', channelId: target.dataset.channelId as SalesChannelId, cases: Number(target.dataset.cases ?? 0) });
      return;
    }

    if (action === 'choose-promise') {
      context.setMissionsOpen(false);
      context.dispatch({ type: 'choose-promise', promiseId: target.dataset.promiseId as BreweryPromiseId });
      return;
    }

    if (action === 'crisis-action') {
      context.setOpsOpen(false);
      context.dispatch({ type: 'crisis-action', actionId: target.dataset.crisisActionId as CrisisActionId });
      return;
    }

    if (action === 'recovery-action') {
      context.setOpsOpen(false);
      context.dispatch({ type: 'recovery-action', actionId: target.dataset.recoveryActionId as RecoveryActionId, lotId: target.dataset.recoveryLotId });
      return;
    }

    if (action === 'competition-entry') {
      context.setOpsOpen(false);
      context.dispatch({ type: 'competition-entry', lotId: target.dataset.lotId });
      return;
    }

    if (action === 'buy-equipment') context.dispatch({ type: 'buy-equipment', equipmentItemId: target.dataset.equipmentItemId as EquipmentItemId });
    if (action === 'set-fermenter-temperature') context.dispatch({ type: 'set-fermenter-temperature', temperatureC: Number(target.dataset.temperature ?? context.getState().fermenterTemperatureC) });
    if (action === 'clean-equipment') context.dispatch({ type: 'clean-equipment', equipmentId: target.dataset.equipmentId as EquipmentId });
  });
};
