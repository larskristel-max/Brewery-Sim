import type { Recipe } from '../game/schema.js';

export const recipes: Recipe[] = [
  {
    id: 'garage-blonde',
    name: 'Garage Blonde',
    style: 'Blonde',
    description: 'A simple pale garage beer made for the first friends-and-family batch.',
    ingredients: [
      { ingredientId: 'pilsner-malt', amount: 4.2 },
      { ingredientId: 'saaz-hops', amount: 45 },
      { ingredientId: 'ale-yeast', amount: 1 },
      { ingredientId: 'bottles', amount: 60 }
    ],
    waterCost: 25,
    salePricePerCase: 18,
    marketAppeal: 1,
    batchSizeCases: 5,
    targetBatchLiters: 20,
    qualityBase: 82,
    difficulty: 8,
    storageSensitivity: 0.8,
    riskTags: ['young beer', 'rushed fermentation', 'low body'],
    challenge: 'Low-cost, approachable and quick to understand. Good for learning the garage loop.',
    originalGravity: '1.045',
    expectedAbv: '4.6%',
    wortNote: 'Pale, sweet wort. It should look mostly clear once the grain and hop bits settle.',
    brewNote: 'The mash pulled sugars from pilsner malt, the boil set the hop bite, and yeast will turn that sugar into beer.',
    enabled: true,
    stepDurations: { brewing: 360, fermenting: 10 * 1440, packaging: 120, 'bottle-conditioning': 1440 },
    faultEvents: [
      {
        id: 'blonde-acetaldehyde',
        stage: 'fermenting',
        minRisk: 34,
        qualityPenalty: 6,
        message: 'The Blonde tasted too young and unfinished. Give future batches more stable fermentation time. Quality -6.'
      },
      {
        id: 'blonde-diacetyl',
        stage: 'fermenting',
        minRisk: 42,
        qualityPenalty: 7,
        message: 'The Blonde picked up a soft slick note from rushed fermentation. Quality -7.'
      }
    ]
  },
  {
    id: 'backyard-ipa',
    name: 'Backyard IPA',
    style: 'IPA',
    description: 'Hop-forward and expensive, with strong upside if aroma stays bright.',
    ingredients: [
      { ingredientId: 'pale-malt', amount: 5.2 },
      { ingredientId: 'crystal-malt', amount: 0.35 },
      { ingredientId: 'ipa-hops', amount: 180 },
      { ingredientId: 'ale-yeast', amount: 1 },
      { ingredientId: 'bottles', amount: 72 }
    ],
    waterCost: 25,
    salePricePerCase: 26,
    marketAppeal: 1.08,
    batchSizeCases: 6,
    targetBatchLiters: 22,
    qualityBase: 74,
    difficulty: 18,
    storageSensitivity: 1.5,
    riskTags: ['oxidation', 'polyphenols', 'chlorophyll', 'hop creep'],
    challenge: 'High hop cost and high reward; old or warm hops can turn grassy and harsh.',
    enabled: true,
    stepDurations: { brewing: 360, fermenting: 11 * 1440, packaging: 120, 'bottle-conditioning': 1440 },
    faultEvents: [
      {
        id: 'ipa-grassy',
        stage: 'fermenting',
        minRisk: 22,
        qualityPenalty: 8,
        message: 'The IPA sat too long on stressed hops. Polyphenols and chlorophyll pushed it grassy and harsh. Quality -8.'
      },
      {
        id: 'ipa-hop-creep',
        stage: 'packaging',
        minRisk: 30,
        qualityPenalty: 7,
        message: 'Hop creep restarted fermentation in the IPA and left a buttery diacetyl edge. Quality -7.'
      }
    ]
  },
  {
    id: 'basement-pils',
    name: 'Basement Pils',
    style: 'Pils',
    description: 'Popular and crisp, but very unforgiving in a warm garage.',
    ingredients: [
      { ingredientId: 'pilsner-malt', amount: 4.8 },
      { ingredientId: 'saaz-hops', amount: 80 },
      { ingredientId: 'lager-yeast', amount: 1 },
      { ingredientId: 'bottles', amount: 60 }
    ],
    waterCost: 26,
    salePricePerCase: 21,
    marketAppeal: 1.1,
    batchSizeCases: 5,
    targetBatchLiters: 20,
    qualityBase: 72,
    difficulty: 22,
    storageSensitivity: 1.2,
    riskTags: ['DMS', 'diacetyl', 'hydrogen sulfide'],
    challenge: 'Broad demand, but pilsner malt and lager yeast punish weak temperature control.',
    enabled: true,
    stepDurations: { brewing: 360, fermenting: 16 * 1440, packaging: 120, 'bottle-conditioning': 1440 },
    faultEvents: [
      {
        id: 'pils-dms',
        stage: 'brewing',
        minRisk: 24,
        qualityPenalty: 8,
        message: 'The Pils picked up dimethyl sulfide (DMS): cooked corn and cabbage from a weak boil. Quality -8.'
      },
      {
        id: 'pils-sulfur',
        stage: 'fermenting',
        minRisk: 30,
        qualityPenalty: 6,
        message: 'Cold lager yeast struggled and left hydrogen sulfide sulfur notes. Quality -6.'
      }
    ]
  },
  {
    id: 'garage-wheat',
    name: 'Garage Wheat',
    style: 'Wheat',
    description: 'Fast and friendly, with yeast character that can swing too far.',
    ingredients: [
      { ingredientId: 'wheat-malt', amount: 2.5 },
      { ingredientId: 'pilsner-malt', amount: 2.1 },
      { ingredientId: 'styrian-hops', amount: 45 },
      { ingredientId: 'wheat-yeast', amount: 1 },
      { ingredientId: 'bottles', amount: 60 }
    ],
    waterCost: 25,
    salePricePerCase: 19,
    marketAppeal: 0.95,
    batchSizeCases: 5,
    targetBatchLiters: 20,
    qualityBase: 70,
    difficulty: 13,
    storageSensitivity: 1,
    riskTags: ['isoamyl acetate', '4-vinyl guaiacol', 'haze'],
    challenge: 'Quick to brew, but warm yeast can push banana and clove too hard.',
    enabled: true,
    stepDurations: { brewing: 360, fermenting: 9 * 1440, packaging: 120, 'bottle-conditioning': 1440 },
    faultEvents: [
      {
        id: 'wheat-banana',
        stage: 'fermenting',
        minRisk: 22,
        qualityPenalty: 6,
        message: 'The Wheat ran warm. Isoamyl acetate pushed the banana note too far. Quality -6.'
      },
      {
        id: 'wheat-clove',
        stage: 'fermenting',
        minRisk: 30,
        qualityPenalty: 7,
        message: 'The Wheat turned sharp with excess 4-vinyl guaiacol clove phenolics. Quality -7.'
      }
    ]
  },
  {
    id: 'shed-saison',
    name: 'Shed Saison',
    style: 'Saison',
    description: 'Rustic and tolerant of warm fermentation, but niche in the local market.',
    ingredients: [
      { ingredientId: 'pilsner-malt', amount: 3.8 },
      { ingredientId: 'wheat-malt', amount: 0.8 },
      { ingredientId: 'styrian-hops', amount: 60 },
      { ingredientId: 'saison-yeast', amount: 1 },
      { ingredientId: 'bottles', amount: 60 }
    ],
    waterCost: 25,
    salePricePerCase: 20,
    marketAppeal: 0.86,
    batchSizeCases: 5,
    targetBatchLiters: 20,
    qualityBase: 73,
    difficulty: 12,
    storageSensitivity: 0.7,
    riskTags: ['over-attenuation', 'fusel alcohols', 'phenolics'],
    challenge: 'Forgives a warm garage but sells slower without the right audience.',
    enabled: true,
    stepDurations: { brewing: 360, fermenting: 9 * 1440, packaging: 120, 'bottle-conditioning': 1440 },
    faultEvents: [
      {
        id: 'saison-fusel',
        stage: 'fermenting',
        minRisk: 26,
        qualityPenalty: 7,
        message: 'The Saison fermented hot and threw fusel alcohol heat over the peppery profile. Quality -7.'
      }
    ]
  },
  {
    id: 'midnight-stout',
    name: 'Midnight Stout',
    style: 'Stout',
    description: 'Roasty specialty beer with better margin but slower casual demand.',
    ingredients: [
      { ingredientId: 'pale-malt', amount: 4.4 },
      { ingredientId: 'black-malt', amount: 0.45 },
      { ingredientId: 'fuggles-hops', amount: 60 },
      { ingredientId: 'stout-yeast', amount: 1 },
      { ingredientId: 'bottles', amount: 60 }
    ],
    waterCost: 25,
    salePricePerCase: 23,
    marketAppeal: 0.82,
    batchSizeCases: 5,
    targetBatchLiters: 18,
    qualityBase: 75,
    difficulty: 15,
    storageSensitivity: 0.9,
    riskTags: ['roast harshness', 'astringency', 'slow sell-through'],
    challenge: 'Good margin, but roasted malt can turn harsh and demand is smaller.',
    enabled: true,
    stepDurations: { brewing: 360, fermenting: 12 * 1440, packaging: 120, 'bottle-conditioning': 1440 },
    faultEvents: [
      {
        id: 'stout-astringent',
        stage: 'brewing',
        minRisk: 25,
        qualityPenalty: 7,
        message: 'The Stout extracted tannins from dark grain and finished roasty-astringent. Quality -7.'
      }
    ]
  },
  {
    id: 'hot-garage-kveik',
    name: 'Hot Garage Kveik',
    style: 'Kveik',
    description: 'A hot-fermented farmhouse pale beer that turns garage heat into speed and citrusy yeast character.',
    ingredients: [
      { ingredientId: 'pale-malt', amount: 4.6 },
      { ingredientId: 'wheat-malt', amount: 0.5 },
      { ingredientId: 'styrian-hops', amount: 65 },
      { ingredientId: 'kveik-yeast', amount: 1 },
      { ingredientId: 'bottles', amount: 60 }
    ],
    waterCost: 25,
    salePricePerCase: 22,
    marketAppeal: 0.9,
    batchSizeCases: 5,
    targetBatchLiters: 20,
    qualityBase: 72,
    difficulty: 10,
    storageSensitivity: 0.8,
    riskTags: ['citrus esters', 'underpitch stress', 'old fruit'],
    challenge: 'Thrives when the garage is hot, but cool fermentation can make it sluggish and odd.',
    enabled: true,
    stepDurations: { brewing: 360, fermenting: 7 * 1440, packaging: 120, 'bottle-conditioning': 1440 },
    faultEvents: [
      {
        id: 'kveik-cool-stress',
        stage: 'fermenting',
        minRisk: 26,
        qualityPenalty: 6,
        message: 'The Kveik ran too cool and lost its clean citrus snap. Quality -6.'
      }
    ]
  },
  {
    id: 'custom-recipe',
    name: 'Custom recipe',
    style: 'Experimental',
    description: 'Recipe designer placeholder for later.',
    ingredients: [],
    waterCost: 0,
    salePricePerCase: 0,
    marketAppeal: 0,
    batchSizeCases: 0,
    targetBatchLiters: 0,
    qualityBase: 0,
    difficulty: 0,
    storageSensitivity: 0,
    riskTags: ['coming later'],
    challenge: 'Custom recipe design is coming later.',
    enabled: false,
    stepDurations: { brewing: 360, fermenting: 10 * 1440, packaging: 120, 'bottle-conditioning': 1440 },
    faultEvents: []
  }
];

export const getRecipe = (recipeId: string): Recipe => {
  const recipe = recipes.find((item) => item.id === recipeId);
  if (!recipe) {
    throw new Error(`Unknown recipe: ${recipeId}`);
  }
  return recipe;
};
