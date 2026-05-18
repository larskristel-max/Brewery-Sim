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
export type GarageEquipmentSpritePath = `/assets/garage/equipment/tier1/${string}` | `/assets/garage/equipment/tier2/${string}`;

export const garageEquipmentAssetPath = (tier: GarageEquipmentTier, filename: string): GarageEquipmentSpritePath =>
  `/assets/garage/equipment/${tier}/${filename}` as GarageEquipmentSpritePath;

const defaultTapPadding: GarageEquipmentTapPadding = { x: 4, y: 8 };

export const garageEquipmentLayoutByItem: Record<EquipmentItemId, GarageEquipmentVisual> = {
  'stock-pot-20l': {
    stationType: 'brewhouse',
    sprite: garageEquipmentAssetPath('tier1', 'brewhouse-20l-biab.png'),
    placement: { x: 23.2, y: 80, width: 17 },
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
    placement: { x: 52.1, y: 72.8, width: 13.5 },
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
    placement: { x: 35, y: 66.5, width: 9 },
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
