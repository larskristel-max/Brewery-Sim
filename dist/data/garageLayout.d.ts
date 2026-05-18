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
export type GarageEquipmentSlotId = 'brewhouse' | 'fermenter-slot-1' | 'fermenter-slot-2' | 'fermenter-slot-3' | 'fermenter-slot-4' | 'fermenter-slot-5' | 'packaging';
export declare const garageEquipmentAssetPath: (tier: GarageEquipmentTier, filename: string) => GarageEquipmentSpritePath;
export declare const garageEquipmentLayoutBySlot: Record<GarageEquipmentSlotId, GarageEquipmentPlacement>;
export declare const garageEquipmentLayoutByItem: Record<EquipmentItemId, GarageEquipmentVisual>;
