import { starterEquipment, starterOwnedEquipment } from '../data/equipment.js';
import { createIngredientStock } from '../data/ingredients.js';
import { starterUpgrades } from '../data/upgrades.js';
import { initialCampaignState } from './campaign.js';
import type { EquipmentId, GameState } from './schema.js';

const initialIdentityScores = (): GameState['identityScores'] => ({
  'clean-lager-specialist': 0,
  'farmhouse-saison-brewer': 0,
  'hype-ipa-brewery': 0,
  'event-supplier': 0,
  'local-pub-workhorse': 0,
  'experimental-belgian': 0,
  'regional-consistency': 0
});

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
  inventoryMovements: [],
  visibilityRisk: 0,
  householdPressure: 4,
  complianceRisk: 0,
  canInvoice: false,
  fermenterTemperatureC: 18,
  campaign: initialCampaignState(),
  customerMemory: {
    samira: { customerId: 'samira', trust: 2, notes: ['Asked for 4 cases of Garage Blonde for the barbecue.'] },
    rudy: { customerId: 'rudy', trust: 1, notes: ['Homebrew shop connection.'] },
    nico: { customerId: 'nico', trust: 1, notes: ['Wedding order pressure waiting in the wings.'] },
    mira: { customerId: 'mira', trust: 0, notes: ['Local bar owner; quality-sensitive.'] },
    festival: { customerId: 'festival', trust: 0, notes: ['Festival organizer; presentation and timing matter.'] },
    restaurant: { customerId: 'restaurant', trust: 0, notes: ['Formal buyer; consistency and traceability matter.'] }
  },
  breweryIdentityTags: [],
  batches: [],
  equipment: Object.fromEntries(starterEquipment.map((item) => [item.id, { ...item }])) as GameState['equipment'],
  ownedEquipment: starterOwnedEquipment.map((item) => ({ ...item })),
  activeEquipment: {
    kettle: 'stock-pot-20l-1',
    fermenter: 'plastic-bucket-1',
    mill: '',
    bottler: 'wand-capper-1'
  },
  garageSpaceUsed: starterOwnedEquipment.reduce((total, item) => total + item.spaceUsed, 0),
  garageSpaceLimit: 16,
  upgrades: Object.fromEntries(starterUpgrades.map((item) => [item.id, { ...item }])) as GameState['upgrades'],
  demand: {
    accountName: "Samira's barbecue",
    channelId: 'friends-family',
    channelName: 'Friends and family',
    customerId: 'samira',
    casesRequested: 4,
    casesSold: 0,
    reputationReward: 1,
    invoiceRequired: false,
    formalOrder: false,
    deadlineDay: 42,
    minimumQualityBand: 'solid',
    packagingExpectation: 'any',
    promiseLocked: true
  },
  sanitationDebt: {
    brewhouse: 8,
    fermentation: 10,
    packaging: 10,
    transferPath: 8,
    generalGarage: 12
  },
  breweryHistory: [
    {
      id: 'history-start',
      day: 1,
      kind: 'promise',
      title: "Samira's barbecue promise",
      detail: 'Four cases of Garage Blonde for a forgiving first customer.',
      customerId: 'samira'
    }
  ],
  flagshipRecipeIds: [],
  customerPromises: [
    {
      id: 'promise-samira-42-4',
      customerId: 'samira',
      customerName: 'Samira',
      requestedCases: 4,
      deliveredCases: 0,
      preferredStyles: ['Blonde'],
      deadlineDay: 42,
      minimumQualityBand: 'solid',
      packagingExpectation: 'any',
      status: 'open',
      trustAtStake: 2
    }
  ],
  identityScores: initialIdentityScores(),
  breweryTier: 'garage',
  awards: [],
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
