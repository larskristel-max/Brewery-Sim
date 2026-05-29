import type { Batch, Equipment, EquipmentId, GameState, RecipeCategoryId } from '../game/schema.js';
import type { EquipmentStatus, StationPanelContext } from './stationPanel.js';
import type { GarageSceneEquipmentInstance, SceneTarget } from './types.js';
type StationViewModelContext = {
    state: GameState;
    recipePanelOpen: boolean;
    selectedRecipeCategoryId: RecipeCategoryId | null;
    expandedTarget: SceneTarget | null;
    expandedEquipmentInstanceId: string | null;
    recipePage: number;
    setRecipePage: (page: number) => void;
};
export declare const equipmentCapacityLabel: (equipment: Equipment) => string;
export declare const createStationViewModel: (context: StationViewModelContext) => {
    activeForEquipment: (equipmentId: EquipmentId) => boolean;
    activeForEquipmentInstance: (equipment: GarageSceneEquipmentInstance) => boolean;
    batchForEquipmentInstance: (equipment: GarageSceneEquipmentInstance) => Batch | undefined;
    batchRemainingLabel: (batch: Batch) => string;
    equipmentInstanceStatus: (equipment: GarageSceneEquipmentInstance) => EquipmentStatus;
    isNextTapTarget: (target: SceneTarget) => boolean;
    isNextTapTargetForInstance: (equipment: GarageSceneEquipmentInstance) => boolean;
    stationPanelContext: () => StationPanelContext;
    stepLabel: (step: string) => string;
    garageSpaceUsed: () => number;
    garageSpaceLimit: () => number;
};
export {};
