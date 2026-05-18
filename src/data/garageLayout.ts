import type { EquipmentId, EquipmentItemId, EquipmentStation } from '../game/schema.js';

export interface GarageEquipmentPlacement {
  x: number;
  y: number;
  width: number;
}

export interface GarageEquipmentTapPadding {
  x: number;
  y: number;
}

export type GarageSellPointId = 'finished-beer-pallet';

export type GarageSellPointSpritePath = `assets/garage/sell-point/${string}`;

export interface GarageSellPointVisual {
  spriteByLevel: Record<0 | 1 | 2 | 3, GarageSellPointSpritePath>;
  placement: GarageEquipmentPlacement;
  tapPadding?: GarageEquipmentTapPadding;
  interactionPriority?: number;
}

export interface GarageEquipmentInteraction {
  action: 'toggle-target';
  equipmentId: EquipmentId;
}

export interface GarageEquipmentVisual {
  stationType: EquipmentStation;
  sprite: GarageEquipmentSpritePath | null;
  placement: GarageEquipmentPlacement;
  interaction: GarageEquipmentInteraction;
  tapPadding?: GarageEquipmentTapPadding;
  interactionPriority?: number;
}

export type GarageEquipmentTier = 'tier1' | 'tier2';
export type GarageEquipmentLayoutTier = GarageEquipmentTier;
export type GarageEquipmentSpritePath = `assets/garage/equipment/tier1/${string}` | `assets/garage/equipment/tier2/${string}`;
export type GarageEquipmentSlotId =
  | 'brewhouse'
  | 'fermenter-slot-1'
  | 'fermenter-slot-2'
  | 'fermenter-slot-3'
  | 'fermenter-slot-4'
  | 'fermenter-slot-5'
  | 'milling'
  | 'packaging';

export const garageEquipmentAssetPath = (tier: GarageEquipmentTier, filename: string): GarageEquipmentSpritePath =>
  `assets/garage/equipment/${tier}/${filename}` as GarageEquipmentSpritePath;

export const garageSellPointAssetPath = (filename: string): GarageSellPointSpritePath =>
  `assets/garage/sell-point/${filename}` as GarageSellPointSpritePath;

export type GarageEquipmentSlotLayout = Record<GarageEquipmentSlotId, GarageEquipmentPlacement>;

const defaultTapPadding: GarageEquipmentTapPadding = { x: 4, y: 8 };

const tier1GarageEquipmentLayout: GarageEquipmentSlotLayout = {
  brewhouse: { x: 23.6, y: 54.3, width: 17 },
  'fermenter-slot-1': { x: 38.6, y: 45.2, width: 14.5 },
  'fermenter-slot-2': { x: 49.4, y: 45.2, width: 14.5 },
  'fermenter-slot-3': { x: 60.2, y: 45.2, width: 14.5 },
  'fermenter-slot-4': { x: 50.5, y: 65, width: 12 },
  'fermenter-slot-5': { x: 61.5, y: 65, width: 12 },
  milling: { x: 18, y: 62, width: 10 },
  packaging: { x: 74.5, y: 62.4, width: 13.1 }
};

const tier2GarageEquipmentLayout: GarageEquipmentSlotLayout = {
  brewhouse: { x: 23.6, y: 54.3, width: 17 },
  'fermenter-slot-1': { x: 38.6, y: 45.2, width: 14.5 },
  'fermenter-slot-2': { x: 49.4, y: 45.2, width: 14.5 },
  'fermenter-slot-3': { x: 60.2, y: 45.2, width: 14.5 },
  'fermenter-slot-4': { x: 50.5, y: 65, width: 12 },
  'fermenter-slot-5': { x: 61.5, y: 65, width: 12 },
  milling: { x: 18, y: 76.5, width: 10 },
  packaging: { x: 74.5, y: 62.4, width: 13.1 }
};

export const garageEquipmentLayoutByTier: Record<GarageEquipmentLayoutTier, GarageEquipmentSlotLayout> = {
  tier1: tier1GarageEquipmentLayout,
  tier2: tier2GarageEquipmentLayout
};

export const garageEquipmentLayoutBySlot = garageEquipmentLayoutByTier.tier1;

export const garageSellPointLayout: Record<GarageSellPointId, GarageSellPointVisual> = {
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

export const garageEquipmentLayoutByItem: Record<EquipmentItemId, GarageEquipmentVisual> = {
  'stock-pot-20l': {
    stationType: 'brewhouse',
    sprite: garageEquipmentAssetPath('tier1', 'brewhouse-20l-biab.png'),
    placement: { x: 23.6, y: 54.3, width: 17 },
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
    placement: { x: 76, y: 70, width: 16 },
    interaction: { action: 'toggle-target', equipmentId: 'bottler' },
    tapPadding: defaultTapPadding,
    interactionPriority: 1
  }
};
