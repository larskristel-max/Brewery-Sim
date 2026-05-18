export const garageEquipmentAssetPath = (tier, filename) => `/assets/garage/equipment/${tier}/${filename}`;
const defaultTapPadding = { x: 4, y: 8 };
export const garageEquipmentLayoutBySlot = {
    brewhouse: { x: 26.9, y: 47, width: 17 },
    'fermenter-slot-1': { x: 38.6, y: 45.1, width: 14.5 },
    'fermenter-slot-2': { x: 49.4, y: 46.3, width: 14.5 },
    'fermenter-slot-3': { x: 60.2, y: 47.5, width: 14.5 },
    'fermenter-slot-4': { x: 50.5, y: 65, width: 12 },
    'fermenter-slot-5': { x: 61.5, y: 65, width: 12 },
    packaging: { x: 74.5, y: 62.4, width: 13.1 }
};
export const garageEquipmentLayoutByItem = {
    'stock-pot-20l': {
        stationType: 'brewhouse',
        sprite: garageEquipmentAssetPath('tier1', 'brewhouse-20l-biab.png'),
        placement: { x: 26.9, y: 47, width: 17 },
        interaction: { action: 'toggle-target', equipmentId: 'kettle' },
        tapPadding: { x: 5, y: 5 },
        interactionPriority: 2
    },
    'all-in-one-40l': {
        stationType: 'brewhouse',
        sprite: garageEquipmentAssetPath('tier2', 'brewhouse-50l-kettle.png'),
        placement: { x: 24, y: 78.5, width: 14 },
        interaction: { action: 'toggle-target', equipmentId: 'kettle' },
        tapPadding: { x: 5, y: 5 },
        interactionPriority: 2
    },
    'three-vessel-60l': {
        stationType: 'brewhouse',
        sprite: null,
        placement: { x: 24, y: 69, width: 18 },
        interaction: { action: 'toggle-target', equipmentId: 'kettle' },
        tapPadding: defaultTapPadding,
        interactionPriority: 1
    },
    'nano-biab-150l': {
        stationType: 'brewhouse',
        sprite: null,
        placement: { x: 24, y: 69, width: 18 },
        interaction: { action: 'toggle-target', equipmentId: 'kettle' },
        tapPadding: defaultTapPadding,
        interactionPriority: 1
    },
    'plastic-bucket': {
        stationType: 'fermentation',
        sprite: garageEquipmentAssetPath('tier1', 'fermenter-plastic-bucket.png'),
        placement: { x: 38.6, y: 45.1, width: 14.5 },
        interaction: { action: 'toggle-target', equipmentId: 'fermenter' },
        tapPadding: defaultTapPadding,
        interactionPriority: 3
    },
    'stainless-conical-50l': {
        stationType: 'fermentation',
        sprite: garageEquipmentAssetPath('tier2', 'fermenter-stainless-conical-50l.png'),
        placement: { x: 52, y: 72.4, width: 12 },
        interaction: { action: 'toggle-target', equipmentId: 'fermenter' },
        tapPadding: defaultTapPadding,
        interactionPriority: 3
    },
    'unitank-150l': {
        stationType: 'fermentation',
        sprite: null,
        placement: { x: 52, y: 64, width: 14 },
        interaction: { action: 'toggle-target', equipmentId: 'fermenter' },
        tapPadding: defaultTapPadding,
        interactionPriority: 1
    },
    'wand-capper': {
        stationType: 'packaging',
        sprite: garageEquipmentAssetPath('tier1', 'packaging-bottle-wand-capper.png'),
        placement: { x: 74.5, y: 62.4, width: 13.1 },
        interaction: { action: 'toggle-target', equipmentId: 'bottler' },
        tapPadding: { x: 6, y: 5 },
        interactionPriority: 4
    },
    'semi-auto-filler': {
        stationType: 'packaging',
        sprite: garageEquipmentAssetPath('tier2', 'packaging-enolmatic-station.png'),
        placement: { x: 78, y: 73, width: 12 },
        interaction: { action: 'toggle-target', equipmentId: 'bottler' },
        tapPadding: { x: 6, y: 5 },
        interactionPriority: 4
    },
    'small-can-seamer': {
        stationType: 'packaging',
        sprite: null,
        placement: { x: 76, y: 70, width: 16 },
        interaction: { action: 'toggle-target', equipmentId: 'bottler' },
        tapPadding: defaultTapPadding,
        interactionPriority: 1
    }
};
//# sourceMappingURL=garageLayout.js.map