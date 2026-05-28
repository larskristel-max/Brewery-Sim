import type { Upgrade } from '../game/schema.js';

export const starterUpgrades: Upgrade[] = [
  {
    id: 'larger-kettle',
    name: 'Larger kettle',
    description: '+4 cases per batch and faster mashing.',
    cost: 500,
    purchased: false
  },
  {
    id: 'temp-control',
    name: 'Fermentation temp control',
    description: 'Faster fermentation, higher quality and lower infection chance.',
    cost: 380,
    purchased: false
  },
  {
    id: 'labeler',
    name: 'Hand labeler',
    description: 'Packages faster and lifts reputation from sales.',
    cost: 240,
    purchased: false
  }
];
