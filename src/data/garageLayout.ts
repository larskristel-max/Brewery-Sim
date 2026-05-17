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
