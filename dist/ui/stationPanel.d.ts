import type { Batch, EquipmentId, GameState, Recipe } from '../game/schema.js';
import type { GarageSceneEquipmentInstance, SceneTarget } from './types.js';
export type EquipmentStatus = {
    label: string;
    detail: string;
    toneClass: string;
};
export type StationPanelContext = {
    state: GameState;
    recipePanelOpen: boolean;
    selectedRecipeCategoryId: string | null;
    expandedTarget: SceneTarget | null;
    expandedEquipmentInstanceId: string | null;
    renderRecipeSelectionPanel: () => string;
    recipeStartBlocker: (recipe: Recipe) => string;
    fermenterTemperatureHint: () => string;
    equipmentInstanceStatus: (equipment: GarageSceneEquipmentInstance) => EquipmentStatus;
    batchForEquipmentInstance: (equipment: GarageSceneEquipmentInstance) => Batch | undefined;
    batchRemainingLabel: (batch: Batch) => string;
    stepLabel: (step: string) => string;
};
export declare const renderSalesOffers: (state: GameState) => string;
export declare const renderEquipmentActions: (context: StationPanelContext, equipmentId: EquipmentId, instance?: GarageSceneEquipmentInstance) => string;
export declare const renderStationPanel: (context: StationPanelContext) => string;
