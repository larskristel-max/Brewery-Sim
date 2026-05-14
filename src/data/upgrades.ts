import type { Upgrade } from '../game/schema.js';

export const starterUpgrades: Upgrade[] = [
  {
    id: 'larger-kettle',
    name: 'Larger kettle',
    description: '+4 cases per batch and faster mashing.',
    cost: 260,
    purchased: false
  },
  {
    id: 'temp-control',
    name: 'Fermentation temp control',
    description: 'Improves quality and reduces fermentation time.',
    cost: 340,
    purchased: false
  },
  {
    id: 'labeler',
    name: 'Hand labeler',
    description: 'Packages faster and lifts reputation from sales.',
    cost: 220,
    purchased: false
  }
];
