import { starterEquipment } from '../data/equipment.js';
import { createIngredientStock } from '../data/ingredients.js';
import { starterUpgrades } from '../data/upgrades.js';
import type { EquipmentId, GameState } from './schema.js';

export const createInitialState = (): GameState => ({
  cash: 140,
  reputation: 8,
  day: 1,
  dayElapsedSeconds: 0,
  minute: 8 * 60,
  inventory: {
    water: 150,
    cases: 0,
    ingredients: createIngredientStock()
  },
  pendingOrders: [],
  storage: {
    dryShelfCapacity: 35,
    coldBoxCapacity: 2.5,
    utilityShelfCapacity: 40
  },
  finishedBeerLots: [],
  visibilityRisk: 0,
  batches: [],
  equipment: Object.fromEntries(starterEquipment.map((item) => [item.id, { ...item }])) as GameState['equipment'],
  upgrades: Object.fromEntries(starterUpgrades.map((item) => [item.id, { ...item }])) as GameState['upgrades'],
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
      message: 'Garage doors up. Choose a recipe, keep ingredients stocked, then brew, package and sell through quiet local channels.'
    }
  ],
  selectedEquipmentId: 'kettle' as EquipmentId,
  salesToday: 0
});
