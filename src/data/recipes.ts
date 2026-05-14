import type { Recipe } from '../game/schema.js';

export const recipes: Recipe[] = [
  {
    id: 'garage-pale',
    name: 'Garage Pale Ale',
    style: 'Pale Ale',
    grainCost: 5,
    hopCost: 1,
    yeastCost: 1,
    waterCost: 25,
    salePricePerCase: 18,
    batchSizeCases: 8,
    qualityBase: 68,
    stepDurations: { mashing: 10, fermenting: 10, packaging: 10 }
  },
  {
    id: 'amber-shift',
    name: 'Amber Shift',
    style: 'Amber Lager',
    grainCost: 6,
    hopCost: 1,
    yeastCost: 1,
    waterCost: 25,
    salePricePerCase: 22,
    batchSizeCases: 7,
    qualityBase: 74,
    stepDurations: { mashing: 10, fermenting: 10, packaging: 10 }
  }
];

export const getRecipe = (recipeId: string): Recipe => {
  const recipe = recipes.find((item) => item.id === recipeId);
  if (!recipe) {
    throw new Error(`Unknown recipe: ${recipeId}`);
  }
  return recipe;
};
