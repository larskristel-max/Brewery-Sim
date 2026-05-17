import type { EquipmentId, EquipmentItemId } from '../game/schema.js';
export interface GarageEquipmentPlacement {
    x: number;
    y: number;
    width: number;
}
export type GarageEquipmentTier = 'tier1' | 'tier2';
export type GarageEquipmentSpritePath = `/assets/garage/equipment/tier1/${string}` | `/assets/garage/equipment/tier2/${string}`;
export declare const garageEquipmentAssetPath: (tier: GarageEquipmentTier, filename: string) => GarageEquipmentSpritePath;
export declare const garageEquipmentLayout: Record<EquipmentId, GarageEquipmentPlacement>;
export declare const garageEquipmentSpriteByItem: Record<EquipmentItemId, GarageEquipmentSpritePath | null>;
