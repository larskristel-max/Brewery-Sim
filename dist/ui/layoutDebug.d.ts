import { type GarageEquipmentLayoutTier } from '../data/garageLayout.js';
import type { GarageLayoutDraft, GarageSceneEquipmentInstance, GarageSellPointLayoutDraft } from './types.js';
export type LayoutDebugModel = {
    enabled: boolean;
    equipmentDraft: GarageLayoutDraft;
    sellPointDraft: GarageSellPointLayoutDraft;
};
export declare const createLayoutDebugModel: (activeGarageLayoutTier: GarageEquipmentLayoutTier, enabled: boolean) => LayoutDebugModel;
export declare const garageLayoutJson: (model: LayoutDebugModel) => string;
export declare const handleLayoutDebugInput: (root: HTMLElement, model: LayoutDebugModel, event: Event) => boolean;
export declare const renderLayoutDebugPanel: (model: LayoutDebugModel, equipment: GarageSceneEquipmentInstance[]) => string;
