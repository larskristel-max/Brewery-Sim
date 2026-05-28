import type { Equipment, EquipmentId, EquipmentItemId, GameState, OwnedEquipment } from '../game/schema.js';
import type { GarageEquipmentSlotId } from '../data/garageLayout.js';
import type { GarageSceneEquipmentInstance, StoreStation } from './types.js';

export const stationLabels: Record<StoreStation, string> = {
  kettle: 'Brewhouse',
  fermenter: 'Fermentation',
  mill: 'Milling',
  bottler: 'Packaging'
};

export const stationNouns: Record<StoreStation, string> = {
  kettle: 'brewhouse',
  fermenter: 'fermenter',
  mill: 'grain mill',
  bottler: 'packaging station'
};

export const displayEquipmentName = (equipment: Equipment): string => equipment.name;

export const activeEquipmentItemId = (equipment: Equipment): EquipmentItemId | null => equipment.itemId ?? null;

export const stationSlotId = (equipmentId: EquipmentId): GarageEquipmentSlotId => {
  if (equipmentId === 'bottler') return 'packaging';
  if (equipmentId === 'mill') return 'milling';
  return 'brewhouse';
};

export const fermenterSlotId = (index: number): GarageEquipmentSlotId =>
  `fermenter-slot-${Math.min(index + 1, 5)}` as GarageEquipmentSlotId;

export const activeOwnedInstance = (state: GameState, equipmentId: EquipmentId): OwnedEquipment | null => {
  const activeId = state.activeEquipment[equipmentId];
  return state.ownedEquipment.find((item) => item.instanceId === activeId) ?? null;
};

export const garageSceneEquipmentInstances = (state: GameState): GarageSceneEquipmentInstance[] => {
  const stationInstances: (GarageSceneEquipmentInstance | null)[] = (['kettle', 'mill', 'bottler'] as const)
    .map((equipmentId) => {
      const equipment = state.equipment[equipmentId];
      const owned = activeOwnedInstance(state, equipmentId);
      const itemId = activeEquipmentItemId(equipment);
      if (!itemId || (equipmentId === 'mill' && !owned?.installed)) return null;
      return {
        equipmentId,
        itemId,
        instanceId: owned?.instanceId ?? `${equipmentId}-active`,
        slotId: stationSlotId(equipmentId),
        label: stationLabels[equipmentId],
        name: displayEquipmentName(equipment),
        condition: equipment.condition,
        capacityLiters: equipment.capacityLiters,
        spaceUsed: equipment.spaceUsed,
        occupiedBatchId: owned?.occupiedBatchId
      } satisfies GarageSceneEquipmentInstance;
    })
    .filter(Boolean) as GarageSceneEquipmentInstance[];

  const fermenters = state.ownedEquipment
    .filter((item) => item.equipmentId === 'fermenter' && item.installed)
    .map(
      (item, index): GarageSceneEquipmentInstance => ({
        equipmentId: 'fermenter',
        itemId: item.itemId,
        instanceId: item.instanceId,
        slotId: fermenterSlotId(index),
        label: `Fermenter ${index + 1}`,
        name: item.name,
        condition: item.condition,
        capacityLiters: item.capacityLiters,
        spaceUsed: item.spaceUsed,
        occupiedBatchId: item.occupiedBatchId
      })
    );

  return [stationInstances[0], stationInstances[1], ...fermenters, stationInstances[2]].filter(
    (item): item is GarageSceneEquipmentInstance => Boolean(item)
  );
};
