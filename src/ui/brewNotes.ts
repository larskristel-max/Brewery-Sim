import { getIngredient } from '../data/ingredients.js';
import type { Recipe } from '../game/schema.js';
import { formatList, ingredientAmountLabel } from '../game/selectors.js';

const ingredientPhrase = (recipe: Recipe, category: 'malt' | 'hops'): string => {
  const items = recipe.ingredients.filter((item) => getIngredient(item.ingredientId).category === category);
  if (items.length === 0) return category === 'malt' ? 'the grain' : 'the hops';
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
  return `
    <div class="brew-explainer" aria-label="${recipe.name} brewing steps">
      <div><strong>Mash</strong><span>Hot water pulls sugars from ${malt}.</span></div>
      <div><strong>Boil</strong><span>${hops} add bitterness and aroma.</span></div>
      <div><strong>Chill & transfer</strong><span>Cooled wort goes into the fermenter with yeast.</span></div>
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
