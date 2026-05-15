export const recipes = [
    {
        id: 'garage-blonde',
        name: 'Garage Blonde',
        style: 'Blonde',
        description: 'A simple pale garage beer with broad appeal and little room to hide flaws.',
        ingredients: [
            { ingredientId: 'pilsner-malt', amount: 4.2 },
            { ingredientId: 'saaz-hops', amount: 45 },
            { ingredientId: 'ale-yeast', amount: 1 },
            { ingredientId: 'bottles', amount: 8 }
        ],
        waterCost: 25,
        salePricePerCase: 18,
        marketAppeal: 1,
        batchSizeCases: 8,
        qualityBase: 68,
        difficulty: 8,
        storageSensitivity: 0.8,
        riskTags: ['acetaldehyde', 'diacetyl', 'low body'],
        challenge: 'Cheap and sellable, but clean beer exposes green apple or buttery faults.',
        enabled: true,
        stepDurations: { mashing: 10, fermenting: 10, packaging: 10 },
        faultEvents: [
            {
                id: 'blonde-acetaldehyde',
                stage: 'fermenting',
                minRisk: 20,
                qualityPenalty: 6,
                message: 'The Blonde tasted young. Acetaldehyde showed up as green apple. Quality -6.'
            },
            {
                id: 'blonde-diacetyl',
                stage: 'fermenting',
                minRisk: 28,
                qualityPenalty: 7,
                message: 'The Blonde exposed a buttery diacetyl note from rushed fermentation. Quality -7.'
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
            { ingredientId: 'bottles', amount: 9 }
        ],
        waterCost: 25,
        salePricePerCase: 26,
        marketAppeal: 1.08,
        batchSizeCases: 9,
        qualityBase: 74,
        difficulty: 18,
        storageSensitivity: 1.5,
        riskTags: ['oxidation', 'polyphenols', 'chlorophyll', 'hop creep'],
        challenge: 'High hop cost and high reward; old or warm hops can turn grassy and harsh.',
        enabled: true,
        stepDurations: { mashing: 11, fermenting: 11, packaging: 10 },
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
            { ingredientId: 'bottles', amount: 8 }
        ],
        waterCost: 26,
        salePricePerCase: 21,
        marketAppeal: 1.1,
        batchSizeCases: 8,
        qualityBase: 72,
        difficulty: 22,
        storageSensitivity: 1.2,
        riskTags: ['DMS', 'diacetyl', 'hydrogen sulfide'],
        challenge: 'Broad demand, but pilsner malt and lager yeast punish weak temperature control.',
        enabled: true,
        stepDurations: { mashing: 11, fermenting: 16, packaging: 10 },
        faultEvents: [
            {
                id: 'pils-dms',
                stage: 'mashing',
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
            { ingredientId: 'bottles', amount: 8 }
        ],
        waterCost: 25,
        salePricePerCase: 19,
        marketAppeal: 0.95,
        batchSizeCases: 8,
        qualityBase: 70,
        difficulty: 13,
        storageSensitivity: 1,
        riskTags: ['isoamyl acetate', '4-vinyl guaiacol', 'haze'],
        challenge: 'Quick to brew, but warm yeast can push banana and clove too hard.',
        enabled: true,
        stepDurations: { mashing: 10, fermenting: 9, packaging: 10 },
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
            { ingredientId: 'bottles', amount: 8 }
        ],
        waterCost: 25,
        salePricePerCase: 20,
        marketAppeal: 0.86,
        batchSizeCases: 8,
        qualityBase: 73,
        difficulty: 12,
        storageSensitivity: 0.7,
        riskTags: ['over-attenuation', 'fusel alcohols', 'phenolics'],
        challenge: 'Forgives a warm garage but sells slower without the right audience.',
        enabled: true,
        stepDurations: { mashing: 10, fermenting: 9, packaging: 10 },
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
            { ingredientId: 'bottles', amount: 7 }
        ],
        waterCost: 25,
        salePricePerCase: 23,
        marketAppeal: 0.82,
        batchSizeCases: 7,
        qualityBase: 75,
        difficulty: 15,
        storageSensitivity: 0.9,
        riskTags: ['roast harshness', 'astringency', 'slow sell-through'],
        challenge: 'Good margin, but roasted malt can turn harsh and demand is smaller.',
        enabled: true,
        stepDurations: { mashing: 11, fermenting: 12, packaging: 10 },
        faultEvents: [
            {
                id: 'stout-astringent',
                stage: 'mashing',
                minRisk: 25,
                qualityPenalty: 7,
                message: 'The Stout extracted tannins from dark grain and finished roasty-astringent. Quality -7.'
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
        qualityBase: 0,
        difficulty: 0,
        storageSensitivity: 0,
        riskTags: ['coming later'],
        challenge: 'Custom recipe design is coming later.',
        enabled: false,
        stepDurations: { mashing: 10, fermenting: 10, packaging: 10 },
        faultEvents: []
    }
];
export const getRecipe = (recipeId) => {
    const recipe = recipes.find((item) => item.id === recipeId);
    if (!recipe) {
        throw new Error(`Unknown recipe: ${recipeId}`);
    }
    return recipe;
};
//# sourceMappingURL=recipes.js.map