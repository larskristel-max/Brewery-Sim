// Runtime URLs resolve from the canonical public/assets tree when served or opened from the repo root.
export const garageEquipmentAssetPath = (tier, filename) => `public/assets/garage/equipment/${tier}/${filename}`;
export const garageSellPointAssetPath = (filename) => `public/assets/garage/sell-point/${filename}`;
const defaultTapPadding = { x: 4, y: 8 };
const tier1GarageEquipmentLayout = {
    brewhouse: { x: 24.6, y: 53.1, width: 17 },
    'fermenter-slot-1': { x: 38.6, y: 45.2, width: 14.5 },
    'fermenter-slot-2': { x: 49.4, y: 45.2, width: 14.5 },
    'fermenter-slot-3': { x: 60.2, y: 45.2, width: 14.5 },
    'fermenter-slot-4': { x: 50.5, y: 65, width: 12 },
    'fermenter-slot-5': { x: 61.5, y: 65, width: 12 },
    milling: { x: 18, y: 76.5, width: 10 },
    packaging: { x: 74.5, y: 62.4, width: 13.1 }
};
const tier2GarageEquipmentLayout = {
    brewhouse: { x: 23.2, y: 55.4, width: 20 },
    'fermenter-slot-1': { x: 41.3, y: 47.4, width: 15.4 },
    'fermenter-slot-2': { x: 52.9, y: 47.1, width: 15.4 },
    'fermenter-slot-3': { x: 64.5, y: 47.4, width: 15.4 },
    'fermenter-slot-4': { x: 51.5, y: 66.2, width: 13.2 },
    'fermenter-slot-5': { x: 63.6, y: 66.2, width: 13.2 },
    milling: { x: 16.2, y: 76.8, width: 11.2 },
    packaging: { x: 77.1, y: 63.8, width: 14.8 }
};
export const garageEquipmentLayoutByTier = {
    tier1: tier1GarageEquipmentLayout,
    tier2: tier2GarageEquipmentLayout
};
export const garageEquipmentLayoutBySlot = garageEquipmentLayoutByTier.tier1;
export const garageSellPointLayout = {
    'finished-beer-pallet': {
        spriteByLevel: {
            0: garageSellPointAssetPath('pallet-finished-beer-empty.png'),
            1: garageSellPointAssetPath('pallet-finished-beer-level1.png'),
            2: garageSellPointAssetPath('pallet-finished-beer-level2.png'),
            3: garageSellPointAssetPath('pallet-finished-beer-level3.png')
        },
        placement: { x: 47.7, y: 96.5, width: 9.7 },
        tapPadding: { x: 4, y: 4 },
        interactionPriority: 2
    }
};
export const garageEquipmentLayoutByItem = {
    'stock-pot-20l': {
        stationType: 'brewhouse',
        sprite: garageEquipmentAssetPath('tier1', 'brewhouse-20l-biab.png'),
        placement: { x: 24.6, y: 53.1, width: 17 },
        interaction: { action: 'toggle-target', equipmentId: 'kettle' },
        tapPadding: { x: 5, y: 5 },
        interactionPriority: 2
    },
    'all-in-one-40l': {
        stationType: 'brewhouse',
        sprite: garageEquipmentAssetPath('tier2', 'brewhouse-50l-kettle.png'),
        placement: tier2GarageEquipmentLayout.brewhouse,
        interaction: { action: 'toggle-target', equipmentId: 'kettle' },
        tapPadding: { x: 5, y: 5 },
        interactionPriority: 2
    },
    'three-vessel-60l': {
        stationType: 'brewhouse',
        sprite: null,
        assetStatus: 'placeholder',
        artTodo: 'Needs tier 3 brewhouse sprite before this equipment appears as scene art.',
        placement: { x: 24, y: 69, width: 18 },
        interaction: { action: 'toggle-target', equipmentId: 'kettle' },
        tapPadding: defaultTapPadding,
        interactionPriority: 1
    },
    'nano-biab-150l': {
        stationType: 'brewhouse',
        sprite: null,
        assetStatus: 'placeholder',
        artTodo: 'Needs nano brewhouse sprite before this equipment appears as scene art.',
        placement: { x: 24, y: 69, width: 18 },
        interaction: { action: 'toggle-target', equipmentId: 'kettle' },
        tapPadding: defaultTapPadding,
        interactionPriority: 1
    },
    'plastic-bucket': {
        stationType: 'fermentation',
        sprite: garageEquipmentAssetPath('tier1', 'fermenter-plastic-bucket.png'),
        placement: { x: 38.6, y: 45.2, width: 14.5 },
        interaction: { action: 'toggle-target', equipmentId: 'fermenter' },
        tapPadding: defaultTapPadding,
        interactionPriority: 3
    },
    'stainless-conical-50l': {
        stationType: 'fermentation',
        sprite: garageEquipmentAssetPath('tier2', 'fermenter-stainless-conical-50l.png'),
        placement: tier2GarageEquipmentLayout['fermenter-slot-1'],
        interaction: { action: 'toggle-target', equipmentId: 'fermenter' },
        tapPadding: defaultTapPadding,
        interactionPriority: 3
    },
    'unitank-150l': {
        stationType: 'fermentation',
        sprite: null,
        assetStatus: 'placeholder',
        artTodo: 'Needs unitank sprite before this equipment appears as scene art.',
        placement: { x: 52, y: 64, width: 14 },
        interaction: { action: 'toggle-target', equipmentId: 'fermenter' },
        tapPadding: defaultTapPadding,
        interactionPriority: 1
    },
    'grain-mill-tier2': {
        stationType: 'milling',
        sprite: garageEquipmentAssetPath('tier2', 'malt-mill.png'),
        placement: tier2GarageEquipmentLayout.milling,
        interaction: { action: 'toggle-target', equipmentId: 'mill' },
        tapPadding: { x: 5, y: 5 },
        interactionPriority: 3
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
        placement: tier2GarageEquipmentLayout.packaging,
        interaction: { action: 'toggle-target', equipmentId: 'bottler' },
        tapPadding: { x: 6, y: 5 },
        interactionPriority: 4
    },
    'small-can-seamer': {
        stationType: 'packaging',
        sprite: null,
        assetStatus: 'placeholder',
        artTodo: 'Needs can seamer sprite before this equipment appears as scene art.',
        placement: { x: 76, y: 70, width: 16 },
        interaction: { action: 'toggle-target', equipmentId: 'bottler' },
        tapPadding: defaultTapPadding,
        interactionPriority: 1
    }
};
//# sourceMappingURL=garageLayout.js.map