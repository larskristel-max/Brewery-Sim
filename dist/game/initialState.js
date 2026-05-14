import { starterEquipment } from '../data/equipment.js';
import { starterUpgrades } from '../data/upgrades.js';
export const createInitialState = () => ({
    cash: 140,
    reputation: 8,
    minute: 8 * 60,
    inventory: {
        grain: 60,
        hops: 40,
        yeast: 20,
        water: 85,
        cases: 0
    },
    batches: [],
    equipment: Object.fromEntries(starterEquipment.map((item) => [item.id, item])),
    upgrades: Object.fromEntries(starterUpgrades.map((item) => [item.id, item])),
    events: [
        {
            id: 'welcome',
            minute: 8 * 60,
            message: 'Garage doors up. Start a batch, watch it move, then sell cases for your first upgrade.'
        }
    ],
    selectedEquipmentId: 'kettle',
    salesToday: 0
});
//# sourceMappingURL=initialState.js.map