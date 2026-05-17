import type { EquipmentId, EquipmentItemId } from '../game/schema.js';

export interface GarageEquipmentPlacement {
  x: number;
  y: number;
  width: number;
}

export type GarageEquipmentSpritePath = `/assets/garage/equipment/tier1/${string}` | `/assets/garage/equipment/tier2/${string}`;

export const garageEquipmentLayout: Record<EquipmentId, GarageEquipmentPlacement> = {
  kettle: { x: 24, y: 69, width: 18 },
  fermenter: { x: 52, y: 64, width: 14 },
  bottler: { x: 76, y: 70, width: 16 }
};

export const garageEquipmentSpriteByItem: Record<EquipmentItemId, GarageEquipmentSpritePath | null> = {
  'stock-pot-20l': null,
  'all-in-one-40l': null,
  'three-vessel-60l': null,
  'nano-biab-150l': null,
  'plastic-bucket': null,
  'stainless-conical-50l': null,
  'unitank-150l': null,
  'wand-capper': null,
  'semi-auto-filler': null,
  'small-can-seamer': null
};
