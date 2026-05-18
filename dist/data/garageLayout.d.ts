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
export type GarageEquipmentSlotId = 'brewhouse' | 'fermenter-slot-1' | 'fermenter-slot-2' | 'fermenter-slot-3' | 'fermenter-slot-4' | 'fermenter-slot-5' | 'milling' | 'packaging';
export declare const garageEquipmentAssetPath: (tier: GarageEquipmentTier, filename: string) => GarageEquipmentSpritePath;
export declare const garageSellPointAssetPath: (filename: string) => GarageSellPointSpritePath;
export type GarageEquipmentSlotLayout = Record<GarageEquipmentSlotId, GarageEquipmentPlacement>;
export declare const garageEquipmentLayoutByTier: Record<GarageEquipmentLayoutTier, GarageEquipmentSlotLayout>;
export declare const garageEquipmentLayoutBySlot: GarageEquipmentSlotLayout;
export declare const garageSellPointLayout: Record<GarageSellPointId, GarageSellPointVisual>;
export declare const garageEquipmentLayoutByItem: Record<EquipmentItemId, GarageEquipmentVisual>;
