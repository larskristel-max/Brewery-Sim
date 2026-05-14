import type { Recipe } from '../game/schema.js';

export const recipes: Recipe[] = [
  {
    id: 'garage-pale',
    name: 'Garage Pale Ale',
    style: 'Pale Ale',
    grainCost: 8,
    hopCost: 6,
    yeastCost: 3,
    waterCost: 5,
    salePricePerCase: 18,
    batchSizeCases: 8,
    qualityBase: 68,
    stepDurations: { mashing: 35, fermenting: 65, packaging: 25 }
  },
  {
    id: 'amber-shift',
    name: 'Amber Shift',
    style: 'Amber Lager',
    grainCost: 10,
    hopCost: 4,
    yeastCost: 4,
    waterCost: 5,
    salePricePerCase: 22,
    batchSizeCases: 7,
    qualityBase: 74,
    stepDurations: { mashing: 40, fermenting: 80, packaging: 28 }
  }
];

export const getRecipe = (recipeId: string): Recipe => {
  const recipe = recipes.find((item) => item.id === recipeId);
  if (!recipe) {
    throw new Error(`Unknown recipe: ${recipeId}`);
  }
  return recipe;
};
