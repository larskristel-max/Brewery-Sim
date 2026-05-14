import type { Equipment } from '../game/schema.js';

export const starterEquipment: Equipment[] = [
  {
    id: 'kettle',
    name: '10 gal mash kettle',
    description: 'Where every batch begins. Keep it clean to protect quality.',
    level: 1,
    condition: 92,
    x: 17,
    y: 42
  },
  {
    id: 'fermenter',
    name: 'Plastic fermenter',
    description: 'A humble vessel where wort becomes beer.',
    level: 1,
    condition: 88,
    x: 50,
    y: 35
  },
  {
    id: 'bottler',
    name: 'Bench capper',
    description: 'Slow packaging with a satisfying clink.',
    level: 1,
    condition: 83,
    x: 76,
    y: 56
  }
];
