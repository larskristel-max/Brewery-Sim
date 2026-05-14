import { starterEquipment } from '../data/equipment.js';
import { starterUpgrades } from '../data/upgrades.js';
export const createInitialState = () => ({
    cash: 140,
    reputation: 8,
    day: 1,
    dayElapsedSeconds: 0,
    minute: 8 * 60,
    inventory: {
        grain: 35,
        hops: 10,
        yeast: 8,
        water: 150,
        cases: 0
    },
    batches: [],
    equipment: Object.fromEntries(starterEquipment.map((item) => [item.id, { ...item }])),
    upgrades: Object.fromEntries(starterUpgrades.map((item) => [item.id, { ...item }])),
    demand: {
        accountName: 'Corner Café',
        casesRequested: 10,
        casesSold: 0,
        reputationReward: 2
    },
    events: [
        {
            id: 'welcome',
            minute: 8 * 60,
            message: 'Garage doors up. Tap the 40 L mash kettle to brew, then ferment, package and sell to local accounts.'
        }
    ],
    selectedEquipmentId: 'kettle',
    salesToday: 0
});
//# sourceMappingURL=initialState.js.map