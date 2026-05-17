export const garageEquipmentAssetPath = (tier, filename) => `/assets/garage/equipment/${tier}/${filename}`;
const defaultTapPadding = { x: 4, y: 8 };
export const garageEquipmentLayoutByItem = {
    'stock-pot-20l': {
        stationType: 'brewhouse',
        sprite: null,
        placement: { x: 24, y: 69, width: 18 },
        interaction: { action: 'toggle-target', equipmentId: 'kettle' },
        tapPadding: defaultTapPadding,
        interactionPriority: 1
    },
    'all-in-one-40l': {
        stationType: 'brewhouse',
        sprite: null,
        placement: { x: 24, y: 69, width: 18 },
        interaction: { action: 'toggle-target', equipmentId: 'kettle' },
        tapPadding: defaultTapPadding,
        interactionPriority: 1
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
        sprite: null,
        placement: { x: 52, y: 64, width: 14 },
        interaction: { action: 'toggle-target', equipmentId: 'fermenter' },
        tapPadding: defaultTapPadding,
        interactionPriority: 1
    },
    'stainless-conical-50l': {
        stationType: 'fermentation',
        sprite: null,
        placement: { x: 52, y: 64, width: 14 },
        interaction: { action: 'toggle-target', equipmentId: 'fermenter' },
        tapPadding: defaultTapPadding,
        interactionPriority: 1
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
        sprite: null,
        placement: { x: 76, y: 70, width: 16 },
        interaction: { action: 'toggle-target', equipmentId: 'bottler' },
        tapPadding: defaultTapPadding,
        interactionPriority: 1
    },
    'semi-auto-filler': {
        stationType: 'packaging',
        sprite: null,
        placement: { x: 76, y: 70, width: 16 },
        interaction: { action: 'toggle-target', equipmentId: 'bottler' },
        tapPadding: defaultTapPadding,
        interactionPriority: 1
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