import type { EquipmentId, GameState } from '../game/schema.js';
import { type LayoutDebugModel } from './layoutDebug.js';
import type { GarageSceneEquipmentInstance, SceneTarget } from './types.js';
type ScenePayoff = {
    kind: 'pallet' | 'sale';
    title: string;
    detail: string;
    key: number;
} | null;
type EquipmentStatus = {
    label: string;
    detail: string;
    toneClass: string;
};
type GarageSceneContext = {
    state: GameState;
    layoutDebugEnabled: boolean;
    layoutDebugModel: LayoutDebugModel;
    expandedTarget: SceneTarget | null;
    expandedEquipmentInstanceId: string | null;
    missionsOpen: boolean;
    opsOpen: boolean;
    guidanceDismissed: boolean;
    saveStatus: string;
    scenePayoff: ScenePayoff;
    activeForEquipment: (equipmentId: EquipmentId) => boolean;
    activeForEquipmentInstance: (equipment: GarageSceneEquipmentInstance) => boolean;
    equipmentInstanceStatus: (equipment: GarageSceneEquipmentInstance) => EquipmentStatus;
    isNextTapTarget: (target: SceneTarget) => boolean;
    isNextTapTargetForInstance: (equipment: GarageSceneEquipmentInstance) => boolean;
    renderExpandedEquipmentActions: (equipmentId: EquipmentId, equipment: GarageSceneEquipmentInstance) => string;
    renderStationPanel: () => string;
};
export declare const renderGarage: (context: GarageSceneContext) => string;
export {};
