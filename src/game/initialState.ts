import { starterEquipment } from '../data/equipment.js';
import { starterUpgrades } from '../data/upgrades.js';
import type { EquipmentId, GameState } from './schema.js';

export const createInitialState = (): GameState => ({
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
  equipment: Object.fromEntries(starterEquipment.map((item) => [item.id, item])) as GameState['equipment'],
  upgrades: Object.fromEntries(starterUpgrades.map((item) => [item.id, item])) as GameState['upgrades'],
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
  selectedEquipmentId: 'kettle' as EquipmentId,
  salesToday: 0
});
