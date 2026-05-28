export const stationLabels = {
    kettle: 'Brewhouse',
    fermenter: 'Fermentation',
    mill: 'Milling',
    bottler: 'Packaging'
};
export const stationNouns = {
    kettle: 'brewhouse',
    fermenter: 'fermenter',
    mill: 'grain mill',
    bottler: 'packaging station'
};
export const displayEquipmentName = (equipment) => equipment.name;
export const activeEquipmentItemId = (equipment) => equipment.itemId ?? null;
export const stationSlotId = (equipmentId) => {
    if (equipmentId === 'bottler')
        return 'packaging';
    if (equipmentId === 'mill')
        return 'milling';
    return 'brewhouse';
};
export const fermenterSlotId = (index) => `fermenter-slot-${Math.min(index + 1, 5)}`;
export const activeOwnedInstance = (state, equipmentId) => {
    const activeId = state.activeEquipment[equipmentId];
    return state.ownedEquipment.find((item) => item.instanceId === activeId) ?? null;
};
export const garageSceneEquipmentInstances = (state) => {
    const stationInstances = ['kettle', 'mill', 'bottler']
        .map((equipmentId) => {
        const equipment = state.equipment[equipmentId];
        const owned = activeOwnedInstance(state, equipmentId);
        const itemId = activeEquipmentItemId(equipment);
        if (!itemId || (equipmentId === 'mill' && !owned?.installed))
            return null;
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
        };
    })
        .filter(Boolean);
    const fermenters = state.ownedEquipment
        .filter((item) => item.equipmentId === 'fermenter' && item.installed)
        .map((item, index) => ({
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
    }));
    return [stationInstances[0], stationInstances[1], ...fermenters, stationInstances[2]].filter((item) => Boolean(item));
};
//# sourceMappingURL=sceneEquipment.js.map