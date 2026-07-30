import { getIngredient } from '../data/ingredients.js';
import type { Recipe } from '../game/schema.js';
import { formatList, ingredientAmountLabel } from '../game/selectors.js';

const ingredientPhrase = (recipe: Recipe, category: 'malt' | 'hops' | 'sugar' | 'yeast'): string => {
  const items = recipe.ingredients.filter((item) => getIngredient(item.ingredientId).category === category);
  if (items.length === 0) {
    if (category === 'malt') return 'the grain';
    if (category === 'hops') return 'the hops';
    if (category === 'sugar') return 'the sugar';
    return 'yeast';
  }
  return formatList(
    items.map((item) => {
      const ingredient = getIngredient(item.ingredientId);
      return `${ingredientAmountLabel(item.ingredientId, item.amount)} ${ingredient.name}`;
    })
  );
};

export const renderBrewExplainer = (recipe: Recipe): string => {
  const malt = ingredientPhrase(recipe, 'malt');
  const hops = ingredientPhrase(recipe, 'hops');
  const sugarItems = recipe.ingredients.filter((item) => getIngredient(item.ingredientId).category === 'sugar');
  const sugar = sugarItems.length > 0 ? ingredientPhrase(recipe, 'sugar') : '';
  const yeast = ingredientPhrase(recipe, 'yeast');
  return `
    <div class="brew-explainer" aria-label="${recipe.name} brewing steps">
      <div><strong>Mash</strong><span>Hot water pulls sugars from ${malt}.</span></div>
      <div><strong>Boil</strong><span>${hops} balance the beer${sugar ? `; ${sugar} keeps the finish dry` : ''}.</span></div>
      <div><strong>Chill & transfer</strong><span>Cooled wort goes into the fermenter with ${yeast}.</span></div>
    </div>
  `;
};

export const renderBrewDayNotes = (recipe: Recipe): string => `
  <div class="brew-day-notes" aria-label="${recipe.name} brew day notes">
    <strong>Brew day notes</strong>
    <span>${recipe.wortNote ?? 'Clear, sweet wort is beer before yeast starts fermentation.'}</span>
    <span>Gravity ${recipe.originalGravity ?? 'target unknown'} - enough sugar for about ${recipe.expectedAbv ?? 'the expected'} ABV after fermentation.</span>
    <span>${recipe.brewNote ?? 'Next: transfer to the fermenter and pitch yeast.'}</span>
  </div>
`;
