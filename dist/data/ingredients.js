export const ingredients = [
    {
        id: 'pilsner-malt',
        name: 'Pilsner malt',
        category: 'malt',
        unit: 'kg',
        storageArea: 'dry-shelf',
        packSize: 5,
        packPrice: 9.7,
        sourceNote: 'Consumer homebrew retail anchor: Castle Pils malt 5 kg around EUR9.69.'
    },
    {
        id: 'pale-malt',
        name: 'Pale malt',
        category: 'malt',
        unit: 'kg',
        storageArea: 'dry-shelf',
        packSize: 5,
        packPrice: 11.5,
        sourceNote: 'Consumer homebrew retail anchor: pale/base malts around EUR2.30/kg.'
    },
    {
        id: 'wheat-malt',
        name: 'Wheat malt',
        category: 'malt',
        unit: 'kg',
        storageArea: 'dry-shelf',
        packSize: 5,
        packPrice: 12,
        sourceNote: 'Consumer homebrew retail anchor: wheat/base malt around EUR2.40/kg.'
    },
    {
        id: 'aromatic-malt',
        name: 'Aromatic malt',
        category: 'malt',
        unit: 'kg',
        storageArea: 'dry-shelf',
        packSize: 1,
        packPrice: 2.9,
        sourceNote: 'Small Belgian-style specialty malt pack for honeyed malt depth.'
    },
    {
        id: 'crystal-malt',
        name: 'Crystal malt',
        category: 'malt',
        unit: 'kg',
        storageArea: 'dry-shelf',
        packSize: 5,
        packPrice: 11.9,
        sourceNote: 'Consumer homebrew retail anchor: specialty malt around EUR2.38/kg.'
    },
    {
        id: 'black-malt',
        name: 'Black malt',
        category: 'malt',
        unit: 'kg',
        storageArea: 'dry-shelf',
        packSize: 5,
        packPrice: 13.2,
        sourceNote: 'Consumer homebrew retail anchor: roasted malt around EUR2.64/kg.'
    },
    {
        id: 'saaz-hops',
        name: 'Saaz hops',
        category: 'hops',
        unit: 'g',
        storageArea: 'cold-box',
        packSize: 100,
        packPrice: 3.75,
        sourceNote: 'Consumer homebrew retail anchor: Saaz pellets 100 g around EUR3.75.'
    },
    {
        id: 'ipa-hops',
        name: 'Citrus IPA hops',
        category: 'hops',
        unit: 'g',
        storageArea: 'cold-box',
        packSize: 100,
        packPrice: 5.6,
        sourceNote: 'Consumer homebrew retail anchor: aroma hops 100 g around EUR5-6.'
    },
    {
        id: 'styrian-hops',
        name: 'Styrian hops',
        category: 'hops',
        unit: 'g',
        storageArea: 'cold-box',
        packSize: 100,
        packPrice: 4.15,
        sourceNote: 'Consumer homebrew retail anchor: Styrian Goldings 100 g around EUR4.15.'
    },
    {
        id: 'fuggles-hops',
        name: 'Fuggles hops',
        category: 'hops',
        unit: 'g',
        storageArea: 'cold-box',
        packSize: 100,
        packPrice: 5.58,
        sourceNote: 'Consumer homebrew retail anchor: Fuggles pellets 100 g around EUR5.58.'
    },
    {
        id: 'ale-yeast',
        name: 'Ale yeast',
        category: 'yeast',
        unit: 'pack',
        storageArea: 'cold-box',
        packSize: 1,
        packPrice: 3.2,
        sourceNote: 'Consumer homebrew retail anchor: dry yeast 11.5 g pack around EUR3.20.'
    },
    {
        id: 'lager-yeast',
        name: 'Lager yeast',
        category: 'yeast',
        unit: 'pack',
        storageArea: 'cold-box',
        packSize: 1,
        packPrice: 3.8,
        sourceNote: 'Lager dry yeast is modeled slightly above standard ale yeast.'
    },
    {
        id: 'wheat-yeast',
        name: 'Wheat yeast',
        category: 'yeast',
        unit: 'pack',
        storageArea: 'cold-box',
        packSize: 1,
        packPrice: 3.7,
        sourceNote: 'Specialty wheat yeast is modeled above standard ale yeast.'
    },
    {
        id: 'belgian-yeast',
        name: 'Belgian ale yeast',
        category: 'yeast',
        unit: 'pack',
        storageArea: 'cold-box',
        packSize: 1,
        packPrice: 4.1,
        sourceNote: 'Abbey-style dry yeast for fruity-spicy Belgian blond fermentation.'
    },
    {
        id: 'saison-yeast',
        name: 'Saison yeast',
        category: 'yeast',
        unit: 'pack',
        storageArea: 'cold-box',
        packSize: 1,
        packPrice: 3.9,
        sourceNote: 'Specialty saison yeast is modeled above standard ale yeast.'
    },
    {
        id: 'kveik-yeast',
        name: 'Kveik yeast',
        category: 'yeast',
        unit: 'pack',
        storageArea: 'cold-box',
        packSize: 1,
        packPrice: 4.2,
        sourceNote: 'Norwegian farmhouse-style yeast modeled for hot, fast fermentations.'
    },
    {
        id: 'stout-yeast',
        name: 'Stout yeast',
        category: 'yeast',
        unit: 'pack',
        storageArea: 'cold-box',
        packSize: 1,
        packPrice: 3.2,
        sourceNote: 'Modeled as a robust ale yeast pack.'
    },
    {
        id: 'bottles',
        name: 'Bottles and caps',
        category: 'packaging',
        unit: 'unit',
        storageArea: 'utility-shelf',
        packSize: 12,
        packPrice: 4.8,
        sourceNote: 'Twelve 33 cl bottles with caps; one in-game case is one bundle.'
    },
    {
        id: 'candi-sugar',
        name: 'Light candi sugar',
        category: 'sugar',
        unit: 'kg',
        storageArea: 'dry-shelf',
        packSize: 0.5,
        packPrice: 2.6,
        sourceNote: 'Light Belgian brewing sugar for a dry finish without dark malt flavor.'
    },
    {
        id: 'cleaner',
        name: 'Cleaner and sanitizer',
        category: 'cleaning',
        unit: 'unit',
        storageArea: 'utility-shelf',
        packSize: 1,
        packPrice: 2.5,
        sourceNote: 'Prototype garage cleaning supply unit.'
    }
];
export const getIngredient = (ingredientId) => {
    const ingredient = ingredients.find((item) => item.id === ingredientId);
    if (!ingredient)
        throw new Error(`Unknown ingredient: ${ingredientId}`);
    return ingredient;
};
export const createIngredientStock = () => Object.fromEntries(ingredients.map((ingredient) => [
    ingredient.id,
    {
        amount: ingredient.id === 'pilsner-malt'
            ? 10
            : ingredient.id === 'pale-malt'
                ? 8
                : ingredient.id === 'aromatic-malt'
                    ? 0.6
                    : ingredient.id === 'saaz-hops'
                        ? 100
                        : ingredient.id === 'styrian-hops'
                            ? 100
                            : ingredient.id === 'ale-yeast'
                                ? 2
                                : ingredient.id === 'belgian-yeast'
                                    ? 2
                                    : ingredient.id === 'candi-sugar'
                                        ? 1
                                        : ingredient.id === 'bottles'
                                            ? 72
                                            : ingredient.id === 'cleaner'
                                                ? 4
                                                : 0,
        condition: 96
    }
]));
//# sourceMappingURL=ingredients.js.map