import { createInitialState } from './game/initialState.js';
import { resetSavedGame, saveGameState } from './game/persistence.js';
import { caseCountLabel, formatClock, formatCurrency } from './game/selectors.js';
import { reduceGame } from './game/simulation.js';
import { createBootState, createTier2PreviewState } from './ui/appBoot.js';
import { renderGarage } from './ui/garageScene.js';
import { renderTopHud } from './ui/hud.js';
import { installRootEventHandlers } from './ui/inputHandlers.js';
import { createLayoutDebugModel, handleLayoutDebugInput } from './ui/layoutDebug.js';
import { renderFocusOverlay } from './ui/overlays.js';
import { renderEquipmentActions, renderStationPanel } from './ui/stationPanel.js';
import { createStationViewModel } from './ui/stationViewModel.js';
import { renderStoryIntroCard } from './ui/storyPanels.js';
const root = document.querySelector('#root');
if (!root) {
    throw new Error('Missing #root element');
}
const boot = createBootState();
const { layoutDebugEnabled, tier2PreviewEnabled, activeGarageLayoutTier } = boot.config;
let state = boot.state;
let saveStatus = boot.saveStatus;
let expandedTarget = null;
let expandedEquipmentInstanceId = null;
let missionsOpen = false;
let notificationsOpen = false;
let opsOpen = false;
let activeOverlay = null;
let recipePanelOpen = false;
let selectedRecipeCategoryId = null;
let selectedShopSection = null;
let recipePage = 0;
let audioAllowed = false;
let scenePayoff = null;
let scenePayoffTimer = null;
let scenePayoffKey = 0;
const GUIDANCE_DISMISSED_KEY = 'brewery-sim-guidance-dismissed';
let guidanceDismissed = false;
try {
    guidanceDismissed = globalThis.localStorage?.getItem(GUIDANCE_DISMISSED_KEY) === '1';
}
catch {
    guidanceDismissed = false;
}
const layoutDebugModel = createLayoutDebugModel(activeGarageLayoutTier, layoutDebugEnabled);
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
const showScenePayoff = (kind, title, detail) => {
    scenePayoffKey += 1;
    scenePayoff = { kind, title, detail, key: scenePayoffKey };
    if (scenePayoffTimer !== null)
        globalThis.clearTimeout(scenePayoffTimer);
    scenePayoffTimer = globalThis.setTimeout(() => {
        scenePayoff = null;
        scenePayoffTimer = null;
        render();
    }, 2400);
};
const dispatch = (action) => {
    const previousEventId = state.events[0]?.id;
    const previousCash = state.cash;
    const previousReputation = state.reputation;
    const previousCases = state.inventory.cases;
    const overlayScrollTop = document.querySelector('.focus-overlay')?.scrollTop ?? 0;
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
        guidanceDismissed = false;
        saveStatus = 'Tier 2 layout preview reset - not saved';
        render();
        return;
    }
    resetSavedGame();
    try {
        globalThis.localStorage?.removeItem(GUIDANCE_DISMISSED_KEY);
    }
    catch { }
    guidanceDismissed = false;
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
const render = () => {
    const stationViewModel = createStationViewModel({
        state,
        recipePanelOpen,
        selectedRecipeCategoryId,
        expandedTarget,
        expandedEquipmentInstanceId,
        recipePage,
        setRecipePage: (page) => {
            recipePage = page;
        }
    });
    const shellStateClass = `${activeOverlay ? 'focus-open' : ''} ${recipePanelOpen || expandedTarget ? 'station-open' : ''}`.trim();
    root.innerHTML = `
    <main class="game-shell ${shellStateClass}">
      ${renderTopHud(state, notificationsOpen)}
      ${renderGarage({
        state,
        layoutDebugEnabled,
        layoutDebugModel,
        expandedTarget,
        expandedEquipmentInstanceId,
        missionsOpen,
        opsOpen,
        guidanceDismissed,
        saveStatus,
        scenePayoff,
        activeForEquipment: stationViewModel.activeForEquipment,
        activeForEquipmentInstance: stationViewModel.activeForEquipmentInstance,
        equipmentInstanceStatus: stationViewModel.equipmentInstanceStatus,
        isNextTapTarget: stationViewModel.isNextTapTarget,
        isNextTapTargetForInstance: stationViewModel.isNextTapTargetForInstance,
        renderExpandedEquipmentActions: (equipmentId, equipment) => renderEquipmentActions(stationViewModel.stationPanelContext(), equipmentId, equipment),
        renderStationPanel: () => renderStationPanel(stationViewModel.stationPanelContext())
    })}
      ${renderFocusOverlay({ state, activeOverlay, selectedShopSection, batchRemainingLabel: stationViewModel.batchRemainingLabel, stepLabel: stationViewModel.stepLabel })}
      ${renderStoryIntroCard(state)}
      <div class="rotate-blocker" role="dialog" aria-modal="true" aria-label="Rotate device">
        <strong>Brewery-Sim is played in landscape mode.</strong>
        <span>Rotate your device to continue brewing.</span>
      </div>
    </main>
  `;
};
installRootEventHandlers(root, {
    getState: () => state,
    setAudioAllowed: () => {
        audioAllowed = true;
    },
    dispatch,
    render,
    resetGame,
    handleLayoutInput: (event) => {
        handleLayoutDebugInput(root, layoutDebugModel, event);
    },
    dismissGuidance: () => {
        guidanceDismissed = true;
        try {
            globalThis.localStorage?.setItem(GUIDANCE_DISMISSED_KEY, '1');
        }
        catch { }
    },
    restoreGuidance: () => {
        guidanceDismissed = false;
        try {
            globalThis.localStorage?.removeItem(GUIDANCE_DISMISSED_KEY);
        }
        catch { }
    },
    getExpandedTarget: () => expandedTarget,
    setExpandedTarget: (target) => {
        expandedTarget = target;
    },
    getExpandedEquipmentInstanceId: () => expandedEquipmentInstanceId,
    setExpandedEquipmentInstanceId: (instanceId) => {
        expandedEquipmentInstanceId = instanceId;
    },
    getMissionsOpen: () => missionsOpen,
    setMissionsOpen: (open) => {
        missionsOpen = open;
    },
    getNotificationsOpen: () => notificationsOpen,
    setNotificationsOpen: (open) => {
        notificationsOpen = open;
    },
    getOpsOpen: () => opsOpen,
    setOpsOpen: (open) => {
        opsOpen = open;
    },
    getActiveOverlay: () => activeOverlay,
    setActiveOverlay: (overlay) => {
        activeOverlay = overlay;
    },
    getRecipePanelOpen: () => recipePanelOpen,
    setRecipePanelOpen: (open) => {
        recipePanelOpen = open;
    },
    setSelectedRecipeCategoryId: (categoryId) => {
        selectedRecipeCategoryId = categoryId;
    },
    setSelectedShopSection: (section) => {
        selectedShopSection = section;
    },
    getRecipePage: () => recipePage,
    setRecipePage: (page) => {
        recipePage = page;
    }
});
render();
//# sourceMappingURL=main.js.map