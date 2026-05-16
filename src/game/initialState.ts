import { starterEquipment, starterOwnedEquipment } from '../data/equipment.js';
import { createIngredientStock } from '../data/ingredients.js';
import { starterUpgrades } from '../data/upgrades.js';
import type { EquipmentId, GameState } from './schema.js';

export const createInitialState = (): GameState => ({
  cash: 180,
  reputation: 0,
  day: 1,
  dayElapsedSeconds: 0,
  minute: 7 * 60,
  energy: 100,
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
  householdPressure: 4,
  complianceRisk: 0,
  canInvoice: false,
  fermenterTemperatureC: 18,
  batches: [],
  equipment: Object.fromEntries(starterEquipment.map((item) => [item.id, { ...item }])) as GameState['equipment'],
  ownedEquipment: starterOwnedEquipment.map((item) => ({ ...item })),
  activeEquipment: {
    kettle: 'stock-pot-20l-1',
    fermenter: 'plastic-bucket-1',
    bottler: 'wand-capper-1'
  },
  garageSpaceUsed: starterOwnedEquipment.reduce((total, item) => total + item.spaceUsed, 0),
  garageSpaceLimit: 16,
  upgrades: Object.fromEntries(starterUpgrades.map((item) => [item.id, { ...item }])) as GameState['upgrades'],
  demand: {
    accountName: 'Friends and family',
    channelId: 'friends-family',
    channelName: 'Friends and family',
    casesRequested: 4,
    casesSold: 0,
    reputationReward: 1,
    invoiceRequired: false,
    formalOrder: false
  },
  events: [
    {
      id: 'welcome',
      minute: 7 * 60,
      message: 'Garage doors up. Brew a 20 L BIAB batch, ferment it in the plastic bucket, bottle it by hand, then sell a few cases privately.'
    }
  ],
  selectedEquipmentId: 'kettle' as EquipmentId,
  salesToday: 0
});
