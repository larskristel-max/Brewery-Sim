import { createInitialState } from '../game/initialState.js';
import { loadSavedGame, STORAGE_KEY } from '../game/persistence.js';
import { reduceGame } from '../game/simulation.js';
export const hasBrowserSave = () => {
    try {
        return typeof globalThis.localStorage !== 'undefined' && globalThis.localStorage.getItem(STORAGE_KEY) !== null;
    }
    catch {
        return false;
    }
};
export const readBootConfig = () => {
    const urlParams = new URLSearchParams(globalThis.location.search);
    const layoutDebugEnabled = urlParams.get('layoutDebug') === '1';
    const tierPreview = layoutDebugEnabled ? urlParams.get('tierPreview') : null;
    const tier2PreviewEnabled = tierPreview === '2';
    return {
        hadBrowserSave: hasBrowserSave(),
        layoutDebugEnabled,
        tier2PreviewEnabled,
        activeGarageLayoutTier: tier2PreviewEnabled ? 'tier2' : 'tier1'
    };
};
export const createTier2PreviewState = () => {
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
export const createBootState = () => {
    const config = readBootConfig();
    return {
        config,
        state: config.tier2PreviewEnabled ? createTier2PreviewState() : loadSavedGame(),
        saveStatus: config.tier2PreviewEnabled ? 'Tier 2 layout preview - not saved' : config.hadBrowserSave ? 'Browser save loaded' : 'Autosave ready'
    };
};
//# sourceMappingURL=appBoot.js.map