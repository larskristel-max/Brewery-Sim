import { getIngredient } from '../data/ingredients.js';
import { createOwnedEquipment, getEquipmentCatalogItem, topGarageTier } from '../data/equipment.js';
import { getRecipe } from '../data/recipes.js';
import { brewingRiskRuleSet, brewdayRiskForRecipe, packagingRiskForMode, recipeMatchesBrewingRisk, transferRiskForRecipe } from '../data/brewingRiskRules.js';
import { markCampaignMissionSeen, syncCampaignAfterAction } from './campaign.js';
import type {
  Batch,
  BatchSubstitution,
  BatchStep,
  BatchVerdict,
  BreweryPromiseId,
  BreweryTier,
  BrewdayApproach,
  ConditioningState,
  CustomerId,
  CustomerPromise,
  EquipmentId,
  FermentationReadiness,
  GameAction,
  GameState,
  IdentityPathId,
  IngredientId,
  LocalDemand,
  PackagingMode,
  PackagingResult,
  Recipe,
  RecipeIngredient,
  SalesChannelId,
  SanitationArea,
  SupplyOrderItem,
  TimedBatchStep,
  TransferMode
} from './schema.js';
import { activeOwnedEquipment, availableFermenters, bottlesPerCase, caseCountLabel, cleaningPlanForEquipment, durationLabel, equipmentConditionTier, finishedBeerCaseCount, formatCurrency, garageSpaceAvailable, litersToCases, orderCost, recipeBatchCapacity, recipeMissingIngredients, recipeOrderItems, saleConsequencePreview, salesChannels, storageOverflowByArea, totalStorageOverflow } from './selectors.js';

const orderLeadDays = 3;
const startOfDayMinute = 7 * 60;
const manualSteps: BatchStep[] = ['awaiting-transfer', 'awaiting-packaging', 'ready'];
const minFermenterTemperatureC = 8;
const maxFermenterTemperatureC = 40;
const gameStartDateUtc = Date.UTC(2026, 4, 16);

const stepEquipment: Record<TimedBatchStep, EquipmentId> = {
  brewing: 'kettle',
  fermenting: 'fermenter',
  packaging: 'bottler',
  'bottle-conditioning': 'bottler'
};

const fallbackVerdict = (quality: number, recipeName: string): BatchVerdict => ({
  qualityBand: quality >= 80 ? 'excellent' : quality >= 62 ? 'solid' : quality >= 45 ? 'flawed' : 'bad',
  headline: `${recipeName} is packaged.`,
  sensoryNotes: ['No detailed batch notes were recorded for this older lot.'],
  likelyCauses: ['Produced before batch verdict tracking was added.'],
  sellAdvice: quality >= 45 ? 'sell' : 'discount',
  stabilityRisk: quality >= 62 ? 8 : 18,
  presentationScore: 68,
  legacyTags: quality >= 80 ? ['promising flagship'] : []
});

const defaultIdentityScores = (): Record<IdentityPathId, number> => ({
  'clean-lager-specialist': 0,
  'farmhouse-saison-brewer': 0,
  'hype-ipa-brewery': 0,
  'event-supplier': 0,
  'local-pub-workhorse': 0,
  'experimental-belgian': 0,
  'regional-consistency': 0
});

const cloneState = (state: GameState): GameState => ({
  ...state,
  inventory: {
    ...state.inventory,
    ingredients: Object.fromEntries(Object.entries(state.inventory.ingredients).map(([id, stock]) => [id, { ...stock }])) as GameState['inventory']['ingredients']
  },
  equipment: Object.fromEntries(Object.entries(state.equipment).map(([id, equipment]) => [id, { ...equipment }])) as GameState['equipment'],
  ownedEquipment: state.ownedEquipment.map((item) => ({ ...item })),
  activeEquipment: { ...state.activeEquipment },
  demand: { ...state.demand },
  batches: state.batches.map((batch) => ({
    ...batch,
    brewdayNotes: [...(batch.brewdayNotes ?? [])],
    substitutions: [...(batch.substitutions ?? [])],
    fermentationReadiness: { ...batch.fermentationReadiness },
    conditioningState: { ...batch.conditioningState },
    packagingResult: batch.packagingResult ? { ...batch.packagingResult } : undefined,
    faultEventsTriggered: [...batch.faultEventsTriggered]
  })),
  finishedBeerLots: state.finishedBeerLots.map((lot) => {
    const verdict = lot.verdict ?? fallbackVerdict(lot.quality, lot.recipeName);
    return { ...lot, verdict: { ...verdict, presentationScore: verdict.presentationScore ?? 68, sensoryNotes: [...verdict.sensoryNotes], likelyCauses: [...verdict.likelyCauses], legacyTags: [...verdict.legacyTags] } };
  }),
  pendingOrders: state.pendingOrders.map((order) => ({ ...order, items: order.items.map((item) => ({ ...item })) })),
  storage: { ...state.storage },
  events: [...state.events],
  fermenterTemperatureC: state.fermenterTemperatureC,
  energy: state.energy,
  garageSpaceUsed: state.garageSpaceUsed,
  garageSpaceLimit: state.garageSpaceLimit,
  householdPressure: state.householdPressure,
  complianceRisk: state.complianceRisk,
  canInvoice: state.canInvoice,
  campaign: {
    missionId: state.campaign.missionId,
    completedMissionIds: [...state.campaign.completedMissionIds],
    seenMissionIds: [...state.campaign.seenMissionIds]
  },
  customerMemory: Object.fromEntries(Object.entries(state.customerMemory ?? {}).map(([id, memory]) => [id, { ...memory, notes: [...memory.notes] }])) as GameState['customerMemory'],
  breweryIdentityTags: [...(state.breweryIdentityTags ?? [])],
  sanitationDebt: { ...(state.sanitationDebt ?? defaultSanitationDebt()) },
  breweryHistory: (state.breweryHistory ?? []).map((entry) => ({ ...entry })),
  flagshipRecipeIds: [...(state.flagshipRecipeIds ?? [])],
  customerPromises: (state.customerPromises ?? []).map((promise) => ({ ...promise, preferredStyles: [...promise.preferredStyles] })),
  identityScores: { ...defaultIdentityScores(), ...(state.identityScores ?? {}) },
  breweryTier: state.breweryTier ?? 'garage',
  awards: (state.awards ?? []).map((award) => ({ ...award }))
});

const addEvent = (state: GameState, message: string): void => {
  state.events = [{ id: `${state.day}-${state.minute}-${state.events.length}-${message.length}`, minute: state.minute, message }, ...state.events].slice(0, 12);
};

const defaultSanitationDebt = (): Record<SanitationArea, number> => ({
  brewhouse: 8,
  fermentation: 10,
  packaging: 10,
  transferPath: 8,
  generalGarage: 12
});

const addHistory = (state: GameState, entry: Omit<GameState['breweryHistory'][number], 'id' | 'day'>): void => {
  state.breweryHistory = [
    {
      id: `history-${state.day}-${state.minute}-${state.breweryHistory.length}`,
      day: state.day,
      ...entry
    },
    ...state.breweryHistory
  ].slice(0, 24);
};

const addIdentityTag = (state: GameState, tag: string): void => {
  if (!state.breweryIdentityTags.includes(tag)) {
    state.breweryIdentityTags = [...state.breweryIdentityTags, tag].slice(-8);
    addHistory(state, { kind: 'identity', title: `Identity gained: ${tag}`, detail: 'Customer reactions and batch outcomes are shaping what this brewery is known for.' });
  }
};

const addIdentityPoints = (state: GameState, path: IdentityPathId, points: number, reason: string): void => {
  const previous = state.identityScores[path] ?? 0;
  state.identityScores[path] = Math.max(0, previous + points);
  if (state.identityScores[path] >= 5 && previous < 5) addIdentityTag(state, path.replace(/-/g, ' '));
  if (points > 0) addHistory(state, { kind: 'identity', title: `${path.replace(/-/g, ' ')} +${points}`, detail: reason });
};

const updateBreweryTier = (state: GameState): void => {
  const previous = state.breweryTier;
  const fermenterCount = state.ownedEquipment.filter((item) => item.equipmentId === 'fermenter').length;
  const maxIdentity = Math.max(...Object.values(state.identityScores));
  const nextTier: BreweryTier =
    state.reputation >= 24 && state.flagshipRecipeIds.length >= 2
      ? 'regional'
      : state.reputation >= 14 && state.awards.length >= 1
        ? 'craft'
        : fermenterCount >= 2 || state.reputation >= 6 || maxIdentity >= 5
          ? 'nano'
          : 'garage';
  if (nextTier !== previous) {
    state.breweryTier = nextTier;
    addHistory(state, { kind: 'identity', title: `${nextTier} brewery tier reached`, detail: 'Growth now carries broader responsibilities and expectations.' });
    addEvent(state, `${nextTier} brewery tier reached. New expectations are forming around consistency and promises.`);
  }
};

const promiseIdForDemand = (demand: GameState['demand']): string =>
  `promise-${demand.customerId ?? demand.channelId}${demand.requestedRecipeId ? `-${demand.requestedRecipeId}` : ''}-${demand.deadlineDay ?? 'open'}-${demand.casesRequested}`;

const ensureActivePromise = (state: GameState): CustomerPromise | null => {
  if (!state.demand.promiseLocked || !state.demand.customerId || !state.demand.deadlineDay || !state.demand.minimumQualityBand || !state.demand.packagingExpectation) return null;
  const id = promiseIdForDemand(state.demand);
  const existing = state.customerPromises.find((promise) => promise.id === id);
  if (existing) return existing;
  const promise: CustomerPromise = {
    id,
    customerId: state.demand.customerId,
    customerName: state.demand.accountName,
    requestedCases: state.demand.casesRequested,
    deliveredCases: state.demand.casesSold,
    preferredStyles: state.demand.requestedRecipeName ? [state.demand.requestedRecipeName] : [],
    deadlineDay: state.demand.deadlineDay,
    minimumQualityBand: state.demand.minimumQualityBand,
    packagingExpectation: state.demand.packagingExpectation,
    status: state.demand.missedPromise ? 'missed' : 'open',
    trustAtStake: state.demand.reputationReward
  };
  state.customerPromises = [promise, ...state.customerPromises].slice(0, 12);
  addHistory(state, { kind: 'promise', title: `${state.demand.accountName} accepted`, detail: `${state.demand.casesRequested} cases by ${formatGameDate(state.demand.deadlineDay)}.`, customerId: state.demand.customerId });
  return promise;
};

const syncActivePromiseProgress = (state: GameState): void => {
  const promise = ensureActivePromise(state);
  if (!promise) return;
  promise.deliveredCases = state.demand.casesSold;
  if (state.demand.missedPromise) promise.status = 'missed';
  else if (state.demand.casesSold >= state.demand.casesRequested) promise.status = 'fulfilled';
};

const hasOpenLockedPromise = (state: GameState): boolean =>
  Boolean(state.demand.promiseLocked && !state.demand.missedPromise && state.demand.casesSold < state.demand.casesRequested);

const promiseTemplate = (state: GameState, promiseId: BreweryPromiseId): { demand: LocalDemand; identityPath: IdentityPathId; unlockError?: string } => {
  const templates: Record<BreweryPromiseId, { demand: Omit<LocalDemand, 'casesSold' | 'deadlineDay'>; identityPath: IdentityPathId; deadlineDays: number; unlockError?: string }> = {
    'mira-regular-tap': {
      demand: {
        accountName: 'Mira regular tap',
        channelId: 'local-bar',
        channelName: 'Local bar',
        customerId: 'mira',
        casesRequested: 12,
        reputationReward: 3,
        invoiceRequired: false,
        formalOrder: true,
        minimumQualityBand: 'solid',
        packagingExpectation: 'clean-label',
        promiseLocked: true
      },
      identityPath: 'local-pub-workhorse',
      deadlineDays: 14
    },
    'festival-saison-slot': {
      demand: {
        accountName: 'Farmhouse festival slot',
        channelId: 'private-event',
        channelName: 'Private event',
        customerId: 'festival',
        casesRequested: 10,
        reputationReward: 3,
        invoiceRequired: false,
        formalOrder: false,
        minimumQualityBand: 'solid',
        packagingExpectation: 'presentable',
        promiseLocked: true
      },
      identityPath: 'event-supplier',
      deadlineDays: 12
    },
    'restaurant-clean-lager': {
      demand: {
        accountName: 'Restaurant clean lager trial',
        channelId: 'restaurant',
        channelName: 'Restaurant',
        customerId: 'restaurant',
        casesRequested: 16,
        reputationReward: 4,
        invoiceRequired: true,
        formalOrder: true,
        minimumQualityBand: 'excellent',
        packagingExpectation: 'clean-label',
        promiseLocked: true
      },
      identityPath: 'clean-lager-specialist',
      deadlineDays: 18,
      unlockError: state.canInvoice ? undefined : 'Restaurant promises need invoice and traceability prep first.'
    },
    'regional-consistency-contract': {
      demand: {
        accountName: 'Regional consistency contract',
        channelId: 'restaurant',
        channelName: 'Restaurant',
        customerId: 'restaurant',
        casesRequested: 24,
        reputationReward: 6,
        invoiceRequired: true,
        formalOrder: true,
        minimumQualityBand: 'solid',
        packagingExpectation: 'clean-label',
        promiseLocked: true
      },
      identityPath: 'regional-consistency',
      deadlineDays: 28,
      unlockError: state.canInvoice && (state.breweryTier === 'craft' || state.breweryTier === 'regional') ? undefined : 'Regional contracts need craft tier plus invoice and traceability prep.'
    }
  };
  const template = templates[promiseId];
  return {
    ...template,
    demand: {
      ...template.demand,
      casesSold: 0,
      deadlineDay: state.day + template.deadlineDays
    }
  };
};

const chooseBreweryPromise = (state: GameState, promiseId: BreweryPromiseId): GameState => {
  if (state.campaign.missionId !== 'sandbox-unlocked') {
    addEvent(state, 'Finish the garage story before choosing open brewery promises.');
    return state;
  }
  if (hasOpenLockedPromise(state)) {
    addEvent(state, `${state.demand.accountName} is still open. Finish, miss, or recover that promise before accepting another.`);
    return state;
  }
  const nextPromise = promiseTemplate(state, promiseId);
  if (nextPromise.unlockError) {
    addEvent(state, nextPromise.unlockError);
    return state;
  }
  state.demand = nextPromise.demand;
  ensureActivePromise(state);
  addIdentityPoints(state, nextPromise.identityPath, 1, `${state.demand.accountName} gives this brewery a clearer direction.`);
  updateBreweryTier(state);
  addEvent(state, `${state.demand.accountName} accepted: ${state.demand.casesRequested} cases by ${formatGameDate(state.demand.deadlineDay ?? state.day)}.`);
  return state;
};

const raiseSanitationDebt = (state: GameState, area: SanitationArea, amount: number): void => {
  state.sanitationDebt[area] = Math.min(100, Math.max(0, (state.sanitationDebt[area] ?? 0) + amount));
};

const syncCampaign = (state: GameState, actionType: GameAction['type']): void => {
  const message = syncCampaignAfterAction(state, actionType);
  if (message) {
    ensureActivePromise(state);
    addEvent(state, message);
  }
};

const formatGameDate = (day: number): string => {
  const date = new Date(gameStartDateUtc + Math.max(0, day - 1) * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
};

const demandForDay = (state: GameState, day: number): LocalDemand => {
  const flagshipRecipeId = state.flagshipRecipeIds[0];
  if (flagshipRecipeId && day > 1) {
    const recipe = getRecipe(flagshipRecipeId);
    const flagshipChannelId: SalesChannelId = state.reputation >= 9 ? 'local-bar' : 'friends-family';
    const flagshipChannel = salesChannels[flagshipChannelId];
    const buyerName = flagshipChannelId === 'local-bar' ? `Mira wants ${recipe.name} back on tap` : `Samira asks for ${recipe.name} again`;
    return {
      accountName: buyerName,
      channelId: flagshipChannelId,
      channelName: flagshipChannel.name,
      customerId: flagshipChannelId === 'local-bar' ? 'mira' : 'samira',
      casesRequested: Math.max(4, Math.min(flagshipChannel.cases, recipe.batchSizeCases * 2)),
      casesSold: 0,
      reputationReward: flagshipChannel.rep + 1,
      invoiceRequired: flagshipChannel.formal && (state.visibilityRisk >= flagshipChannel.invoiceAfter || state.reputation >= 14),
      formalOrder: flagshipChannel.formal,
      deadlineDay: day + 12,
      minimumQualityBand: 'solid',
      packagingExpectation: flagshipChannelId === 'local-bar' ? 'clean-label' : 'any',
      promiseLocked: true,
      requestedRecipeId: recipe.id,
      requestedRecipeName: recipe.name,
      flagshipRequest: true
    };
  }
  const busyWeekend = day % 5 === 0;
  const channelId: SalesChannelId =
    state.reputation >= 16 ? 'restaurant' : state.reputation >= 9 ? 'local-bar' : state.reputation >= 4 || busyWeekend ? 'private-event' : 'friends-family';
  const channel = salesChannels[channelId];
  const casesRequested = channel.cases + Math.floor(state.reputation / 6) + (busyWeekend ? 3 : 0);
  const invoiceRequired = channel.formal && (state.visibilityRisk >= channel.invoiceAfter || state.reputation >= 14 || channelId === 'restaurant');
  return {
    accountName: channel.name,
    channelId,
    channelName: channel.name,
    casesRequested,
    casesSold: 0,
    reputationReward: channel.rep + (busyWeekend ? 1 : 0),
    invoiceRequired,
    formalOrder: channel.formal
  };
};

const storagePressure = (state: GameState): number => Math.round(totalStorageOverflow(state) * 4);

const conditionLabel = (ingredientId: IngredientId, condition: number): string => {
  const ingredient = getIngredient(ingredientId);
  if (condition >= 85) return 'fresh';
  if (ingredient.category === 'malt' || ingredient.category === 'sugar') return 'damp';
  if (ingredient.category === 'hops') return 'stale';
  if (ingredient.category === 'yeast') return 'weak';
  return 'stressed';
};

const storageUseForItem = (ingredientId: IngredientId, amount: number): number => {
  const ingredient = getIngredient(ingredientId);
  if (ingredient.id === 'bottles') return amount / bottlesPerCase;
  if (ingredient.storageArea === 'cold-box' && ingredient.unit === 'g') return amount / 1000;
  if (ingredient.storageArea === 'cold-box' && ingredient.unit === 'pack') return amount * 0.0115;
  return amount;
};

const stockPenaltyForRecipe = (state: GameState, ingredients: RecipeIngredient[], sensitivity: number): number => {
  const weighted = ingredients.reduce(
    (total, item) => {
      const stock = state.inventory.ingredients[item.ingredientId];
      return {
        amount: total.amount + item.amount,
        penalty: total.penalty + Math.max(0, 95 - (stock?.condition ?? 60)) * item.amount
      };
    },
    { amount: 0, penalty: 0 }
  );
  return Math.round(((weighted.penalty / Math.max(1, weighted.amount)) / 5) * sensitivity);
};

const contamRiskForRecipe = (state: GameState, batchIngredients: RecipeIngredient[], recipeDifficulty: number, storagePenalty: number): number => {
  const fermenter = activeOwnedEquipment(state, 'fermenter');
  const fermenterDirt = 100 - fermenter.condition;
  const debt = state.sanitationDebt ?? defaultSanitationDebt();
  const debtPressure = debt.fermentation * 0.18 + debt.transferPath * 0.12 + debt.generalGarage * 0.08;
  return Math.max(3, Math.round(8 + recipeDifficulty * 0.45 + fermenterDirt * 0.35 + storagePenalty + storagePressure(state) + fermenter.riskModifier + batchIngredients.length + debtPressure));
};

const substitutionCandidates: Partial<Record<IngredientId, IngredientId[]>> = {
  'pilsner-malt': ['pale-malt', 'wheat-malt'],
  'pale-malt': ['pilsner-malt', 'wheat-malt'],
  'wheat-malt': ['pilsner-malt', 'pale-malt'],
  'saaz-hops': ['styrian-hops', 'fuggles-hops', 'ipa-hops'],
  'styrian-hops': ['saaz-hops', 'fuggles-hops', 'ipa-hops'],
  'fuggles-hops': ['styrian-hops', 'saaz-hops', 'ipa-hops'],
  'ipa-hops': ['styrian-hops', 'saaz-hops'],
  'ale-yeast': ['wheat-yeast', 'stout-yeast', 'saison-yeast'],
  'wheat-yeast': ['ale-yeast', 'saison-yeast'],
  'saison-yeast': ['ale-yeast', 'wheat-yeast', 'kveik-yeast'],
  'stout-yeast': ['ale-yeast'],
  'kveik-yeast': ['saison-yeast', 'ale-yeast']
};

const substitutionEffect = (missingIngredientId: IngredientId, substituteIngredientId: IngredientId, amount: number): BatchSubstitution => {
  const missing = getIngredient(missingIngredientId);
  const substitute = getIngredient(substituteIngredientId);
  const effect =
    missing.category === 'hops'
      ? { qualityPenalty: 3, riskPenalty: 4, descriptor: 'hop profile shifted from the recipe promise' }
      : missing.category === 'yeast'
        ? { qualityPenalty: 5, riskPenalty: 6, descriptor: 'yeast character drifted from the intended style' }
        : missing.category === 'malt'
          ? { qualityPenalty: 2, riskPenalty: 2, descriptor: 'malt character moved away from the exact recipe' }
          : { qualityPenalty: 2, riskPenalty: 3, descriptor: 'supplier substitution changed the process assumptions' };
  return {
    missingIngredientId,
    substituteIngredientId,
    amount,
    qualityPenalty: effect.qualityPenalty,
    riskPenalty: effect.riskPenalty,
    note: `${substitute.name} covered missing ${missing.name}; ${effect.descriptor}.`
  };
};

const substitutionPlanForRecipe = (state: GameState, recipe: Recipe): { consumption: RecipeIngredient[]; substitutions: BatchSubstitution[] } | null => {
  const available = Object.fromEntries(Object.entries(state.inventory.ingredients).map(([id, stock]) => [id, stock.amount])) as Record<IngredientId, number>;
  const consumption: RecipeIngredient[] = [];
  const substitutions: BatchSubstitution[] = [];

  recipe.ingredients.forEach((item) => {
    const exact = Math.min(available[item.ingredientId] ?? 0, item.amount);
    if (exact > 0) {
      available[item.ingredientId] -= exact;
      consumption.push({ ingredientId: item.ingredientId, amount: exact });
    }
  });

  for (const item of recipe.ingredients) {
    const exactConsumed = consumption.filter((used) => used.ingredientId === item.ingredientId).reduce((total, used) => total + used.amount, 0);
    let missing = Math.max(0, item.amount - exactConsumed);
    if (missing <= 0) continue;
    const substituteId = (substitutionCandidates[item.ingredientId] ?? []).find((candidateId) => (available[candidateId] ?? 0) >= missing);
    if (!substituteId) return null;
    available[substituteId] -= missing;
    consumption.push({ ingredientId: substituteId, amount: missing });
    substitutions.push(substitutionEffect(item.ingredientId, substituteId, missing));
  }

  return { consumption, substitutions };
};

type FermentationProfile = {
  family: 'lager' | 'clean ale' | 'wheat ale' | 'saison' | 'stout ale' | 'kveik';
  idealMin: number;
  idealMax: number;
  severeMin: number;
  severeMax: number;
};

const clampFermenterTemperature = (temperatureC: number): number =>
  Math.min(maxFermenterTemperatureC, Math.max(minFermenterTemperatureC, Math.round(temperatureC)));

const fermentationProfileForRecipe = (recipe: Recipe): FermentationProfile => {
  const ingredientIds = recipe.ingredients.map((ingredient) => ingredient.ingredientId);
  const style = recipe.style.toLowerCase();
  if (ingredientIds.includes('lager-yeast')) return { family: 'lager', idealMin: 9, idealMax: 14, severeMin: 7, severeMax: 18 };
  if (style.includes('kveik') || ingredientIds.includes('kveik-yeast')) return { family: 'kveik', idealMin: 28, idealMax: 40, severeMin: 18, severeMax: 42 };
  if (ingredientIds.includes('saison-yeast')) return { family: 'saison', idealMin: 20, idealMax: 30, severeMin: 15, severeMax: 35 };
  if (ingredientIds.includes('wheat-yeast')) return { family: 'wheat ale', idealMin: 18, idealMax: 24, severeMin: 14, severeMax: 28 };
  if (ingredientIds.includes('stout-yeast')) return { family: 'stout ale', idealMin: 16, idealMax: 22, severeMin: 13, severeMax: 26 };
  return { family: 'clean ale', idealMin: 17, idealMax: 22, severeMin: 14, severeMax: 26 };
};

const fermentationTemperatureEffect = (recipe: Recipe, temperatureC: number): { label: string; risk: number; quality: number; speed: number; event?: string } => {
  const profile = fermentationProfileForRecipe(recipe);
  if (temperatureC >= profile.idealMin && temperatureC <= profile.idealMax) {
    return { label: `${profile.family} sweet spot`, risk: -3, quality: 2, speed: profile.family === 'lager' ? 0.96 : 1 };
  }

  const coldGap = Math.max(0, profile.idealMin - temperatureC);
  const hotGap = Math.max(0, temperatureC - profile.idealMax);
  const gap = coldGap || hotGap;
  const severe = temperatureC < profile.severeMin || temperatureC > profile.severeMax;
  const hot = hotGap > 0;
  const risk = Math.round(gap * (hot ? 2.1 : 1.5) + (severe ? 8 : 2));
  const quality = Math.round(gap * (hot ? 1.4 : 1) + (severe ? 6 : 2));
  const speed = coldGap > 0 ? 1 + coldGap * 0.08 : Math.max(0.78, 1 - hotGap * 0.025);
  const event = hot
    ? `${recipe.name} fermented too warm for ${profile.family} yeast at ${temperatureC} C: extra esters, fusels or diacetyl risk hurt quality.`
    : `${recipe.name} fermented too cold for ${profile.family} yeast at ${temperatureC} C: sluggish yeast left cleanup faults behind.`;
  return { label: hot ? 'too warm' : 'too cold', risk, quality: -quality, speed, event };
};

const defaultConditioningState = (): ConditioningState => ({
  carbonationProgress: 0,
  co2Integration: 'rough',
  refermentationRisk: 0,
  packagePressureRisk: 0
});

const fermentationReadinessFor = (state: GameState, recipe: Recipe, progress: number, gravityChecked = false): FermentationReadiness => {
  const temperatureStress = Math.max(0, fermentationTemperatureEffect(recipe, state.fermenterTemperatureC).risk);
  const apparentProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const checkedBonus = gravityChecked ? 8 : 0;
  const confidenceProgress = Math.min(100, apparentProgress + checkedBonus);
  const fgConfidence = confidenceProgress >= 98 ? 'stable' : confidenceProgress >= 88 ? 'nearly-stable' : confidenceProgress >= 55 ? 'moving' : 'unknown';
  const yeastCleanup = apparentProgress >= 96 && temperatureStress < 10 ? 'ready' : apparentProgress >= 82 ? 'cleaning-up' : 'green';
  const rushRisk = Math.max(0, Math.round((100 - apparentProgress) * 0.48 + (fgConfidence === 'stable' ? 0 : 8) + (yeastCleanup === 'ready' ? 0 : 7) + temperatureStress));
  return { apparentProgress, fgConfidence, yeastCleanup, temperatureStress, rushRisk, gravityChecked };
};

const applyFermentationReadiness = (state: GameState, batch: Batch): void => {
  batch.fermentationReadiness = fermentationReadinessFor(state, getRecipe(batch.recipeId), batch.stepProgress, batch.fermentationReadiness?.gravityChecked ?? false);
};

const conditioningLabel = (state: ConditioningState): string =>
  `${state.carbonationProgress}% carbonation, CO2 ${state.co2Integration}, pressure risk ${state.packagePressureRisk}`;

const advanceConditioningState = (batch: Batch): void => {
  const progress = Math.max(0, Math.min(100, Math.round(batch.stepProgress)));
  batch.conditioningState = {
    ...batch.conditioningState,
    carbonationProgress: Math.max(batch.conditioningState.carbonationProgress, progress),
    co2Integration: progress >= 88 ? 'integrated' : progress >= 58 ? 'improving' : batch.conditioningState.co2Integration
  };
};

const finishConditioningState = (batch: Batch): void => {
  const mode = batch.packagingMode ?? 'standard';
  const pressureRelief = mode === 'careful' ? 18 : mode === 'rush' ? 8 : 13;
  const refermentationRelief = mode === 'careful' ? 12 : mode === 'rush' ? 5 : 9;
  batch.conditioningState = {
    ...batch.conditioningState,
    carbonationProgress: 100,
    co2Integration: 'integrated',
    refermentationRisk: Math.max(0, Math.round(batch.conditioningState.refermentationRisk - refermentationRelief)),
    packagePressureRisk: Math.max(0, Math.round(batch.conditioningState.packagePressureRisk - pressureRelief))
  };
};

const brewdayEffect = brewdayRiskForRecipe;

const packagingModeEffect = packagingRiskForMode;

const transferModeEffect = transferRiskForRecipe;

const activeCustomerId = (state: GameState, channelId: SalesChannelId): CustomerId => {
  const account = state.demand.accountName.toLowerCase();
  if (account.includes('samira') || state.campaign.missionId === 'barbecue-text') return 'samira';
  if (account.includes('nico') || account.includes('wedding')) return 'nico';
  if (account.includes('mira') || channelId === 'local-bar') return 'mira';
  if (channelId === 'restaurant') return 'restaurant';
  if (channelId === 'private-event') return 'festival';
  return 'samira';
};

const qualityRank = (qualityBand: BatchVerdict['qualityBand']): number =>
  ({ unsafe: 0, bad: 1, flawed: 2, solid: 3, excellent: 4 })[qualityBand];

const packagingMeetsExpectation = (verdict: BatchVerdict, expectation?: GameState['demand']['packagingExpectation']): boolean => {
  if (!expectation || expectation === 'any') return true;
  if (expectation === 'presentable') return verdict.presentationScore >= 60;
  if (expectation === 'clean-label') return verdict.presentationScore >= 75 && qualityRank(verdict.qualityBand) >= qualityRank('solid');
  return false;
};

const rememberCustomerNote = (state: GameState, customerId: CustomerId, note: string, trustDelta: number): void => {
  const existing = state.customerMemory[customerId] ?? { customerId, trust: 0, notes: [] };
  state.customerMemory[customerId] = {
    ...existing,
    trust: Math.max(-5, Math.min(8, existing.trust + trustDelta)),
    notes: [note, ...existing.notes].slice(0, 5)
  };
};

const identityPathForRecipe = (recipe: Recipe): IdentityPathId => {
  const style = recipe.style.toLowerCase();
  if (style.includes('pils') || style.includes('lager')) return 'clean-lager-specialist';
  if (style.includes('saison') || style.includes('kveik') || style.includes('wheat')) return 'farmhouse-saison-brewer';
  if (style.includes('ipa')) return 'hype-ipa-brewery';
  if (style.includes('stout')) return 'local-pub-workhorse';
  return 'experimental-belgian';
};

const applyIngredientOrder = (next: GameState, items: SupplyOrderItem[]): void => {
  items.forEach((item) => {
    const stock = next.inventory.ingredients[item.ingredientId];
    const currentAmount = stock.amount;
    stock.amount += item.amount;
    stock.condition = Math.round((stock.condition * currentAmount + 98 * item.amount) / Math.max(1, stock.amount));
  });
};

const receiveDueOrders = (state: GameState): void => {
  const due = state.pendingOrders.filter((order) => order.arrivalDay <= state.day);
  if (due.length === 0) return;

  due.forEach((order) => {
    applyIngredientOrder(state, order.items);
    const summary = order.items.map((item) => `${getIngredient(item.ingredientId).name} x${item.packs}`).join(', ');
    addEvent(state, `Ingredient delivery arrived: ${summary}.`);
  });
  state.pendingOrders = state.pendingOrders.filter((order) => order.arrivalDay > state.day);
};

const degradeStoredIngredients = (state: GameState): void => {
  const overflow = storageOverflowByArea(state);
  const pressure = totalStorageOverflow(state);
  Object.entries(state.inventory.ingredients).forEach(([ingredientId, stock]) => {
    if (stock.amount <= 0) return;
    const ingredient = getIngredient(ingredientId as IngredientId);
    const areaOverflow = overflow[ingredient.storageArea];
    let decay = 0;
    if (areaOverflow > 0) decay += 2 + storageUseForItem(ingredient.id, stock.amount) / Math.max(1, areaOverflow);
    if (ingredient.storageArea === 'cold-box' && areaOverflow > 0) decay += ingredient.category === 'yeast' ? 3 : 2;
    if (pressure > 4 && ingredient.storageArea === 'dry-shelf') decay += 1;
    if (decay > 0) stock.condition = Math.max(45, stock.condition - decay);
  });

  if (overflow['dry-shelf'] > 0) addEvent(state, `Dry shelf overflow: malt is crowding the garage and can turn damp or musty.`);
  if (overflow['cold-box'] > 0) addEvent(state, `Cold box overflow: hops lose aroma and yeast viability faster outside proper storage.`);
  if (overflow['utility-shelf'] > 0) addEvent(state, `Utility shelf overflow: bottles and chemicals are blocking clean work space.`);
};

const randomEventForDay = (state: GameState): string => {
  const overflow = totalStorageOverflow(state);
  if (overflow > 5) {
    state.reputation = Math.max(0, state.reputation - 1);
    return 'A cluttered garage attracted pests and worried a neighbor. Reputation -1.';
  }

  const eventIndex = (state.day * 7 + state.reputation + state.salesToday + Math.round(state.visibilityRisk)) % 6;
  if (eventIndex === 0) return 'Local cafe requests extra cases for a tasting board.';
  if (eventIndex === 1) return 'Homebrew shop reminder: order before stock runs out; deliveries take 3 days.';
  if (eventIndex === 2) return 'Fermentation temperature warning: clean gear and temp control keep the batch safer.';
  if (eventIndex === 3) return 'Storage warning: damp malt and warm hops can show up later as beer faults.';
  if (eventIndex === 4) {
    state.reputation = Math.max(0, state.reputation - 1);
    return 'Neighbor complaint about late garage pickup. Reputation slips by 1.';
  }
  state.demand.casesRequested += 4;
  return 'Busy weekend demand: nearby bars want 4 extra cases today.';
};

const isTimedStep = (step: BatchStep): step is TimedBatchStep => !manualSteps.includes(step);

const durationForStep = (state: GameState, batch: Batch, step: TimedBatchStep): number => {
  const recipe = getRecipe(batch.recipeId);
  let duration = recipe.stepDurations[step];
  if (step === 'brewing') duration *= brewdayEffect(recipe, batch.brewdayApproach ?? 'standard').time;
  if (step === 'packaging') duration *= packagingModeEffect(batch.packagingMode ?? 'standard').time;
  if (step === 'fermenting') duration *= fermentationTemperatureEffect(recipe, state.fermenterTemperatureC).speed;
  const station = step === 'fermenting' ? state.ownedEquipment.find((item) => item.instanceId === batch.fermenterInstanceId) : activeOwnedEquipment(state, stepEquipment[step]);
  const equipment = station ?? activeOwnedEquipment(state, stepEquipment[step]);
  duration *= equipment.batchTimeModifier;
  return Math.max(4, duration * (1.2 - equipment.condition / 500));
};

const triggerRecipeFault = (state: GameState, batch: Batch, completedStep: TimedBatchStep): void => {
  const recipe = getRecipe(batch.recipeId);
  const risk = completedStep === 'fermenting' ? batch.faultRisk + fermentationTemperatureEffect(recipe, state.fermenterTemperatureC).risk : batch.faultRisk;
  const candidates = recipe.faultEvents.filter((event) => event.stage === completedStep && !batch.faultEventsTriggered.includes(event.id) && risk >= event.minRisk);
  if (candidates.length === 0) return;
  const event = candidates[(state.day + batch.recipeId.length + completedStep.length) % candidates.length];
  batch.quality = Math.max(25, batch.quality - event.qualityPenalty);
  batch.faultEventsTriggered.push(event.id);
  addEvent(state, event.message);
};

const applyStepQuality = (state: GameState, batch: Batch, completedStep: TimedBatchStep): void => {
  const equipment = completedStep === 'fermenting' ? state.ownedEquipment.find((item) => item.instanceId === batch.fermenterInstanceId) ?? activeOwnedEquipment(state, 'fermenter') : activeOwnedEquipment(state, stepEquipment[completedStep]);
  const dirtPenalty = Math.round((100 - equipment.condition) / (completedStep === 'fermenting' ? 4 : 7));
  batch.quality = Math.max(30, batch.quality - dirtPenalty);
  triggerRecipeFault(state, batch, completedStep);

  if (completedStep === 'fermenting') {
    const recipe = getRecipe(batch.recipeId);
    const temperatureEffect = fermentationTemperatureEffect(recipe, state.fermenterTemperatureC);
    if (temperatureEffect.quality !== 0) {
      batch.quality = Math.max(25, batch.quality + temperatureEffect.quality);
      if (temperatureEffect.event) addEvent(state, `${temperatureEffect.event} Quality ${temperatureEffect.quality > 0 ? '+' : ''}${temperatureEffect.quality}.`);
    }
    const risk = Math.max(3, batch.contaminationRisk + temperatureEffect.risk);
    if (risk >= 35) {
      batch.quality = Math.max(25, batch.quality - 14);
      addEvent(state, `Infection scare in ${batch.recipeName}: quality dropped hard. Clean and sanitize before the next batch.`);
    } else if (risk >= 24) {
      batch.quality = Math.max(30, batch.quality - 7);
      addEvent(state, `Slight fermentation off-note in ${batch.recipeName}. Infection chance was ${risk}%.`);
    }
  }
};

const batchVerdictFor = (batch: Batch, finalQuality: number): BatchVerdict => {
  const recipe = getRecipe(batch.recipeId);
  const readiness = batch.fermentationReadiness ?? fermentationReadinessFor({ fermenterTemperatureC: 18 } as GameState, recipe, 100, true);
  const packaging = batch.packagingResult ?? { oxygenPickupRisk: 8, sanitationRisk: 8, fillOrCapRisk: 6, presentationScore: 68, packageStability: 78 };
  const conditioning = batch.conditioningState ?? defaultConditioningState();
  const style = recipe.style.toLowerCase();
  const sensoryNotes: string[] = [];
  const likelyCauses: string[] = [];
  const legacyTags: string[] = [];
  let stabilityRisk = Math.max(conditioning.packagePressureRisk, conditioning.refermentationRisk, 100 - packaging.packageStability);
  let adjustedQuality = finalQuality;

  batch.substitutions.forEach((substitution) => {
    sensoryNotes.push(substitution.note);
    likelyCauses.push(`Supplier substitution: ${getIngredient(substitution.substituteIngredientId).name} replaced ${getIngredient(substitution.missingIngredientId).name}.`);
    adjustedQuality -= substitution.qualityPenalty;
    stabilityRisk += Math.max(0, substitution.riskPenalty - 2);
  });

  if (batch.brewdayApproach === 'fast' && recipeMatchesBrewingRisk(recipe, brewingRiskRuleSet.verdictSignals.forgivingFastStyles)) {
    sensoryNotes.push('Young but clean enough for a quick-turn garage beer.');
    likelyCauses.push('Fast brew day matched a forgiving style.');
  }
  if (batch.brewdayApproach === 'fast' && recipeMatchesBrewingRisk(recipe, brewingRiskRuleSet.verdictSignals.dmsStyleMatches)) {
    sensoryNotes.push('Cooked-corn edge threatens the clean lager promise.');
    likelyCauses.push('Short Pils boil raised DMS risk.');
    adjustedQuality -= 4;
  }
  if (recipeMatchesBrewingRisk(recipe, brewingRiskRuleSet.verdictSignals.hopAromaStyleMatches) && packaging.oxygenPickupRisk >= 16) {
    sensoryNotes.push('Hop aroma is duller than expected.');
    likelyCauses.push('Oxygen pickup during packaging hurt the IPA.');
    adjustedQuality -= 5;
  }
  if (recipeMatchesBrewingRisk(recipe, brewingRiskRuleSet.verdictSignals.hopAromaStyleMatches) && batch.transferMode === 'rough') {
    sensoryNotes.push('Hop aroma collapsed from rough handling before fermentation.');
    likelyCauses.push('Rough IPA transfer added oxygen exposure and aroma loss.');
    adjustedQuality -= 4;
  }
  if (readiness.fgConfidence !== 'stable') {
    sensoryNotes.push('Finish still tastes young and unsettled.');
    likelyCauses.push('Packaged before stable gravity was confirmed.');
    stabilityRisk += readiness.rushRisk;
    adjustedQuality -= readiness.fgConfidence === 'nearly-stable' ? brewingRiskRuleSet.verdictSignals.earlyPackageNearlyStablePenalty : brewingRiskRuleSet.verdictSignals.earlyPackageUnknownPenalty;
  }
  if (readiness.yeastCleanup !== 'ready') {
    sensoryNotes.push(readiness.yeastCleanup === 'green' ? 'Green apple / slick young-beer note.' : 'Cleanup character is improving but not fully polished.');
    likelyCauses.push('Yeast cleanup was rushed.');
  }
  if (packaging.missedCriticalItem) {
    sensoryNotes.push('Package stability is questionable.');
    likelyCauses.push(`Missed sanitation item: ${packaging.missedCriticalItem}.`);
    stabilityRisk += brewingRiskRuleSet.verdictSignals.packagingMissedCriticalStability;
    adjustedQuality -= brewingRiskRuleSet.verdictSignals.packagingMissedCriticalPenalty;
  }
  if (packaging.presentationScore >= 78) sensoryNotes.push('Bottles look intentional instead of garage-random.');
  if (conditioning.carbonationProgress < 75) {
    sensoryNotes.push('Carbonation feels young and incomplete.');
    likelyCauses.push('Released before conditioning finished.');
    adjustedQuality -= brewingRiskRuleSet.verdictSignals.youngConditioningPenalty;
  }
  if (conditioning.co2Integration === 'rough') {
    sensoryNotes.push('CO2 feels prickly instead of integrated.');
    likelyCauses.push('Package did not get enough conditioning time.');
    adjustedQuality -= brewingRiskRuleSet.verdictSignals.roughCo2Penalty;
    stabilityRisk += brewingRiskRuleSet.verdictSignals.roughCo2Stability;
  }
  if (batch.faultEventsTriggered.length > 0) likelyCauses.push('Recorded process fault during the batch.');

  const qualityBand =
    stabilityRisk >= 72 || adjustedQuality < 30
      ? 'unsafe'
      : adjustedQuality >= 84
        ? 'excellent'
        : adjustedQuality >= 64
          ? 'solid'
          : adjustedQuality >= 45
            ? 'flawed'
            : 'bad';
  const sellAdvice = qualityBand === 'unsafe' ? 'recall' : qualityBand === 'bad' ? 'dump' : qualityBand === 'flawed' ? (stabilityRisk >= 42 ? 'hold' : 'discount') : 'sell';
  if (qualityBand === 'excellent') legacyTags.push('flagship candidate');
  if (qualityBand === 'solid' && batch.brewdayApproach === 'fast') legacyTags.push('fast but clean');
  if (style.includes('saison') || style.includes('kveik')) legacyTags.push('seasonal story');
  const headline =
    qualityBand === 'excellent'
      ? `${batch.recipeName} landed clean and memorable.`
      : qualityBand === 'solid'
        ? batch.brewdayApproach === 'fast'
          ? 'Fast but clean. Young, simple, sellable.'
          : `${batch.recipeName} is solid and sellable.`
        : qualityBand === 'flawed'
          ? `${batch.recipeName} is sellable with a warning.`
          : qualityBand === 'bad'
            ? `${batch.recipeName} should not go to a serious customer.`
            : 'Do not sell. Package stability risk is severe.';

  return {
    qualityBand,
    headline,
    sensoryNotes: sensoryNotes.length > 0 ? sensoryNotes : ['Clean enough to represent the brewery.'],
    likelyCauses: likelyCauses.length > 0 ? likelyCauses : ['Good process discipline across brewday, fermentation and packaging.'],
    sellAdvice,
    stabilityRisk: Math.max(0, Math.min(100, Math.round(stabilityRisk))),
    presentationScore: packaging.presentationScore,
    legacyTags
  };
};

const finishConditionedBatch = (state: GameState, batch: Batch): void => {
  const bottler = activeOwnedEquipment(state, 'bottler');
  const recipe = getRecipe(batch.recipeId);
  const finalQuality = Math.min(100, batch.quality + bottler.qualityBonus);
  const verdict = batchVerdictFor(batch, finalQuality);
  state.inventory.cases += batch.casesExpected;
  state.finishedBeerLots.push({
    id: `${batch.id}-lot`,
    sourceBatchId: batch.id,
    recipeId: batch.recipeId,
    recipeName: batch.recipeName,
    cases: batch.casesExpected,
    volumeLiters: batch.volumeLiters,
    quality: finalQuality,
    marketAppeal: recipe.marketAppeal,
    packagingState: 'packaged',
    saleState: 'available',
    verdict
  });
  verdict.legacyTags.forEach((tag) => addIdentityTag(state, tag));
  if ((verdict.qualityBand === 'excellent' || verdict.legacyTags.includes('flagship candidate')) && !state.flagshipRecipeIds.includes(batch.recipeId)) {
    state.flagshipRecipeIds = [...state.flagshipRecipeIds, batch.recipeId].slice(-5);
    addHistory(state, {
      kind: 'flagship',
      title: `${batch.recipeName} became a flagship candidate`,
      detail: verdict.headline,
      recipeId: batch.recipeId
    });
  }
  addHistory(state, {
    kind: 'verdict',
    title: `${batch.recipeName}: ${verdict.qualityBand}`,
    detail: `${verdict.headline} Advice: ${verdict.sellAdvice}.`,
    recipeId: batch.recipeId
  });
  if (qualityRank(verdict.qualityBand) >= qualityRank('solid')) {
    addIdentityPoints(state, identityPathForRecipe(recipe), verdict.qualityBand === 'excellent' ? 3 : 1, `${batch.recipeName} finished ${verdict.qualityBand}.`);
    if (verdict.stabilityRisk <= 12) addIdentityPoints(state, 'regional-consistency', 1, `${batch.recipeName} packaged with stable quality.`);
  }
  updateBreweryTier(state);
  state.batches = state.batches.filter((item) => item.id !== batch.id);
  addEvent(state, `${caseCountLabel(batch.casesExpected)} of ${batch.recipeName} are ready. Verdict: ${verdict.headline}`);
};

const completeTimedStep = (state: GameState, batch: Batch, completedStep: TimedBatchStep): void => {
  applyStepQuality(state, batch, completedStep);
  batch.stepProgress = 0;
  if (completedStep === 'brewing') {
    batch.step = 'awaiting-transfer';
    const note = batch.brewdayNotes[batch.brewdayNotes.length - 1] ?? 'Brew day notes recorded.';
    addEvent(state, `${batch.recipeName} brew day is complete: ${note} ${caseCountLabel(batch.casesExpected)} expected.`);
  } else if (completedStep === 'fermenting') {
    batch.fermentationReadiness = fermentationReadinessFor(state, getRecipe(batch.recipeId), 100, true);
    batch.conditioningState = {
      carbonationProgress: 0,
      co2Integration: 'rough',
      refermentationRisk: Math.max(0, batch.fermentationReadiness.rushRisk - 6),
      packagePressureRisk: Math.max(0, batch.fermentationReadiness.rushRisk - 8)
    };
    batch.step = 'awaiting-packaging';
    addEvent(state, `${batch.recipeName} finished fermenting. FG looks ${batch.fermentationReadiness.fgConfidence}; yeast cleanup is ${batch.fermentationReadiness.yeastCleanup}.`);
  } else if (completedStep === 'packaging') {
    batch.step = 'bottle-conditioning';
    batch.stepProgress = 0;
    addEvent(state, `${batch.recipeName} is packaged and conditioning. ${conditioningLabel(batch.conditioningState)}.`);
  } else {
    batch.step = 'ready';
    finishConditioningState(batch);
    finishConditionedBatch(state, batch);
  }
};

const advanceBatch = (state: GameState, batch: Batch, minutes: number): void => {
  if (!isTimedStep(batch.step)) return;
  batch.stepProgress += (minutes / durationForStep(state, batch, batch.step)) * 100;
  if (batch.step === 'fermenting') applyFermentationReadiness(state, batch);
  if (batch.step === 'bottle-conditioning') advanceConditioningState(batch);
  if (batch.stepProgress >= 100) completeTimedStep(state, batch, batch.step);
};

const degradeEquipment = (state: GameState, minutes: number): void => {
  state.batches.forEach((batch) => {
    if (!isTimedStep(batch.step)) return;
    const equipmentId = stepEquipment[batch.step];
    const active = batch.step === 'fermenting' ? state.ownedEquipment.find((item) => item.instanceId === batch.fermenterInstanceId) : activeOwnedEquipment(state, equipmentId);
    if (active) active.condition = Math.max(25, active.condition - minutes * 0.01);
    state.equipment[equipmentId].condition = Math.max(25, state.equipment[equipmentId].condition - minutes * 0.01);
  });
};

const rolloverOneDay = (state: GameState): void => {
  const fulfilled = state.demand.casesSold >= state.demand.casesRequested;
  if (fulfilled) {
    state.reputation += state.demand.reputationReward;
    syncActivePromiseProgress(state);
    addEvent(state, `Demand fulfilled. Reputation +${state.demand.reputationReward}.`);
    if (state.demand.customerId) {
      addHistory(state, {
        kind: 'promise',
        title: `${state.demand.accountName} fulfilled`,
        detail: `${caseCountLabel(state.demand.casesSold)} delivered before the promise closed.`,
        customerId: state.demand.customerId
      });
    }
  } else if (state.demand.casesSold < Math.floor(state.demand.casesRequested / 2)) {
    state.reputation = Math.max(0, state.reputation - 1);
    addEvent(state, `${state.demand.accountName} still needed cases yesterday. Reputation -1.`);
  }

  state.day += 1;
  state.salesToday = 0;
  state.energy = 100;
  receiveDueOrders(state);
  degradeStoredIngredients(state);
  const lockedPromiseStillOpen = Boolean(state.demand.promiseLocked && !fulfilled);
  if (lockedPromiseStillOpen) {
    if (state.demand.deadlineDay && state.day > state.demand.deadlineDay && !state.demand.missedPromise) {
    state.demand.missedPromise = true;
      syncActivePromiseProgress(state);
      state.reputation = Math.max(0, state.reputation - 2);
      if (state.demand.customerId) rememberCustomerNote(state, state.demand.customerId, `${state.demand.accountName} deadline was missed.`, -2);
      addEvent(state, `${state.demand.accountName} deadline passed with ${state.demand.casesSold}/${state.demand.casesRequested} cases delivered. Reputation -2.`);
      addHistory(state, {
        kind: 'customer',
        title: `${state.demand.accountName} missed deadline`,
        detail: 'A named promise stayed open too long and damaged trust.',
        customerId: state.demand.customerId
      });
    } else {
      const deadline = state.demand.deadlineDay ? ` Deadline: ${formatGameDate(state.demand.deadlineDay)}.` : '';
      addEvent(state, `New morning: ${state.demand.accountName} still needs ${state.demand.casesRequested - state.demand.casesSold} cases.${deadline}`);
    }
    addEvent(state, 'Garage reminder: locked promises stay on the board until they are fulfilled, missed, or recovered.');
  } else {
    state.demand = demandForDay(state, state.day);
    ensureActivePromise(state);
    addEvent(state, `New morning: ${state.demand.accountName} requests ${state.demand.casesRequested} cases.`);
    if (state.demand.flagshipRequest && state.demand.requestedRecipeName) addEvent(state, `Flagship pull: this order only counts if you deliver ${state.demand.requestedRecipeName}.`);
    addEvent(state, randomEventForDay(state));
  }
};

const advanceGameTime = (state: GameState, minutes: number, energyCost = 0): void => {
  state.minute += minutes;
  state.dayElapsedSeconds += minutes * 60;
  state.energy = Math.max(0, state.energy - energyCost);
  [...state.batches].forEach((batch) => advanceBatch(state, batch, minutes));
  degradeEquipment(state, minutes);

  while (state.minute >= 24 * 60) {
    state.minute -= 24 * 60;
    rolloverOneDay(state);
  }
};

const endDay = (state: GameState): void => {
  if (state.batches.some((batch) => batch.step === 'awaiting-transfer' || batch.step === 'awaiting-packaging')) {
    addEvent(state, 'Finish the waiting transfer or packaging decision before ending the day.');
    return;
  }
  const minutesUntilMorning = state.minute < startOfDayMinute ? startOfDayMinute - state.minute : 24 * 60 - state.minute + startOfDayMinute;
  advanceGameTime(state, minutesUntilMorning, 0);
  if (state.minute < startOfDayMinute) state.minute = startOfDayMinute;
  addEvent(state, 'Ended the day. Fermentation and bottle conditioning advanced overnight.');
};

const consumeIngredients = (next: GameState, ingredients: RecipeIngredient[]): void => {
  ingredients.forEach((item) => {
    next.inventory.ingredients[item.ingredientId].amount = Math.max(0, next.inventory.ingredients[item.ingredientId].amount - item.amount);
  });
};

const startBatch = (next: GameState, recipeId: string, approach: BrewdayApproach = 'standard', allowSubstitutions = false): GameState => {
  const recipe = getRecipe(recipeId);
  if (!recipe.enabled) {
    addEvent(next, 'Custom recipe design is coming later.');
    return next;
  }
  const kettleBusy = next.batches.some((batch) => batch.step === 'brewing');
  const missing = recipeMissingIngredients(next, recipe);
  const substitutionPlan = missing.length > 0 && allowSubstitutions ? substitutionPlanForRecipe(next, recipe) : null;
  const capacity = recipeBatchCapacity(next, recipe);
  if (next.energy < 35) {
    addEvent(next, 'Not enough energy for a brew day. End the day first.');
    return next;
  }
  if (kettleBusy || (missing.length > 0 && !substitutionPlan) || next.inventory.water < recipe.waterCost || !capacity.fermenter) {
    addEvent(next, missing.length > 0 && allowSubstitutions ? 'No believable substitution covers the missing recipe supplies. Order exact ingredients first.' : capacity.reason || 'The kettle is busy or ingredients are short. Order supplies before brewing.');
    return next;
  }

  const brewhouse = activeOwnedEquipment(next, 'kettle');
  const fermenter = capacity.fermenter;
  const equipmentQuality = brewhouse.qualityBonus + fermenter.qualityBonus;
  const kettlePenalty = Math.round((100 - brewhouse.condition) / 6);
  const storagePenalty = stockPenaltyForRecipe(next, recipe.ingredients, recipe.storageSensitivity);
  const brewday = brewdayEffect(recipe, approach);
  const substitutionQualityPenalty = substitutionPlan?.substitutions.reduce((total, substitution) => total + substitution.qualityPenalty, 0) ?? 0;
  const substitutionRiskPenalty = substitutionPlan?.substitutions.reduce((total, substitution) => total + substitution.riskPenalty, 0) ?? 0;
  const risk = Math.max(3, contamRiskForRecipe(next, recipe.ingredients, recipe.difficulty + brewhouse.riskModifier, storagePenalty) + brewday.risk + substitutionRiskPenalty);
  const batchId = `${recipeId}-${next.day}-${next.minute}-${next.batches.length}`;

  consumeIngredients(next, substitutionPlan?.consumption ?? recipe.ingredients);
  next.inventory.water -= recipe.waterCost;
  raiseSanitationDebt(next, 'brewhouse', approach === 'fast' ? 7 : approach === 'careful' ? 3 : 5);
  raiseSanitationDebt(next, 'generalGarage', 2);
  fermenter.occupiedBatchId = batchId;
  next.batches.push({
    id: batchId,
    recipeId: recipe.id,
    recipeName: recipe.name,
    step: 'brewing',
    stepProgress: 0,
    quality: Math.max(35, recipe.qualityBase + equipmentQuality - kettlePenalty - storagePenalty + brewday.quality - substitutionQualityPenalty),
    casesExpected: capacity.cases,
    volumeLiters: capacity.liters,
    fermenterInstanceId: fermenter.instanceId,
    brewdayApproach: approach,
    brewdayNotes: substitutionPlan?.substitutions.length ? [brewday.note, ...substitutionPlan.substitutions.map((substitution) => substitution.note)] : [brewday.note],
    substitutions: substitutionPlan?.substitutions ?? [],
    fermentationReadiness: fermentationReadinessFor(next, recipe, 0, false),
    conditioningState: defaultConditioningState(),
    contaminationRisk: risk,
    faultRisk: risk + storagePenalty,
    storagePenalty,
    faultEventsTriggered: []
  });
  addEvent(next, `${recipe.name} brew day started ${approach}${substitutionPlan?.substitutions.length ? ' with substitutions' : ''}: ${brewday.note} ${capacity.reason}`);
  substitutionPlan?.substitutions.forEach((substitution) => addEvent(next, `Supplier substitution: ${substitution.note}`));
  return next;
};

const transferAwaitingBatch = (next: GameState, batchId?: string, mode: TransferMode = 'careful'): GameState => {
  const batch = next.batches.find((item) => item.step === 'awaiting-transfer' && (!batchId || item.id === batchId));
  if (!batch) {
    addEvent(next, 'No brewed batch is waiting for transfer.');
    return next;
  }
  const recipe = getRecipe(batch.recipeId);
  const brewhouse = activeOwnedEquipment(next, 'kettle');
  const transfer = transferModeEffect(recipe, mode);
  const nextRisk = Math.max(3, contamRiskForRecipe(next, recipe.ingredients, recipe.difficulty + brewhouse.riskModifier, batch.storagePenalty) + transfer.risk);
  const riskImproved = nextRisk < batch.contaminationRisk;
  batch.transferMode = mode;
  batch.contaminationRisk = nextRisk;
  batch.faultRisk = nextRisk + batch.storagePenalty;
  batch.quality = Math.max(25, Math.min(100, batch.quality + transfer.quality));
  batch.brewdayNotes.push(transfer.note);
  batch.step = 'fermenting';
  batch.stepProgress = 0;
  batch.fermentationReadiness = fermentationReadinessFor(next, recipe, 0, false);
  raiseSanitationDebt(next, 'transferPath', mode === 'rough' ? 8 : 4);
  raiseSanitationDebt(next, 'fermentation', mode === 'rough' ? 5 : 2);
  advanceGameTime(next, transfer.minutes, transfer.energy);
  addEvent(next, `${batch.recipeName} transferred ${mode} into ${stateEquipmentName(next, 'fermenter')}. ${transfer.note}`);
  if (riskImproved) addEvent(next, `Fresh sanitation lowered infection chance to ${nextRisk}%.`);
  return next;
};

const stateEquipmentName = (state: GameState, equipmentId: EquipmentId): string => state.equipment[equipmentId].name;

const packageAwaitingBatch = (next: GameState, batchId?: string, mode: PackagingMode = 'standard'): GameState => {
  const batch = next.batches.find((item) => item.step === 'awaiting-packaging' && (!batchId || item.id === batchId));
  if (!batch) {
    addEvent(next, 'No fermented batch is waiting for packaging.');
    return next;
  }
  if (next.energy < 18) {
    addEvent(next, 'Not enough energy to package. End the day first.');
    return next;
  }
  const bottler = activeOwnedEquipment(next, 'bottler');
  const bottlerTier = equipmentConditionTier(bottler.condition);
  const modeEffect = packagingModeEffect(mode);
  const sanitationDebt = next.sanitationDebt ?? defaultSanitationDebt();
  const dirtyLoss = bottlerTier === 'critical' ? 2 : bottlerTier === 'dirty' ? 1 : 0;
  const rushedLoss = mode === 'rush' && batch.casesExpected >= 5 ? 1 : 0;
  const lostCases = Math.max(0, dirtyLoss + rushedLoss + Math.round(batch.casesExpected * bottler.lossModifier));
  const sanitationRisk = Math.max(0, Math.round((100 - bottler.condition) * 0.45 + sanitationDebt.packaging * 0.25 + sanitationDebt.transferPath * 0.15 + (mode === 'rush' ? 10 : mode === 'careful' ? -5 : 0)));
  const missedCriticalItem = (bottler.condition <= 42 || sanitationDebt.packaging >= 45) && mode !== 'careful' ? (bottler.itemId === 'wand-capper' ? 'bottling wand' : 'filler head') : undefined;
  const refermentationRisk = Math.max(0, (batch.fermentationReadiness?.fgConfidence === 'stable' ? 3 : batch.fermentationReadiness?.rushRisk ?? 18) + sanitationRisk / 2);
  const packagePressureRisk = Math.max(0, Math.round(refermentationRisk + (batch.fermentationReadiness?.fgConfidence === 'moving' || batch.fermentationReadiness?.fgConfidence === 'unknown' ? 18 : 0)));
  batch.casesExpected = Math.max(1, batch.casesExpected - lostCases);
  batch.packagingMode = mode;
  batch.packagingResult = {
    oxygenPickupRisk: Math.max(0, Math.round(10 + modeEffect.oxygen + (bottler.itemId === 'wand-capper' ? 4 : 0))),
    sanitationRisk,
    fillOrCapRisk: Math.max(0, Math.round(8 + modeEffect.fill + (100 - bottler.condition) / 8)),
    presentationScore: Math.max(10, Math.min(100, Math.round(66 + modeEffect.presentation + bottler.qualityBonus))),
    packageStability: Math.max(0, Math.min(100, Math.round(88 - packagePressureRisk - (missedCriticalItem ? 22 : 0)))),
    missedCriticalItem
  };
  batch.conditioningState = {
    carbonationProgress: mode === 'rush' ? 55 : mode === 'careful' ? 82 : 70,
    co2Integration: mode === 'rush' ? 'rough' : mode === 'careful' ? 'integrated' : 'improving',
    refermentationRisk,
    packagePressureRisk
  };
  batch.quality = Math.max(25, Math.min(100, batch.quality + modeEffect.quality - (missedCriticalItem ? 8 : 0)));
  raiseSanitationDebt(next, 'packaging', mode === 'rush' ? 10 : mode === 'careful' ? 4 : 6);
  raiseSanitationDebt(next, 'transferPath', 3);
  batch.step = 'packaging';
  batch.stepProgress = 0;
  const fermenter = next.ownedEquipment.find((item) => item.instanceId === batch.fermenterInstanceId);
  if (fermenter) delete fermenter.occupiedBatchId;
  if (lostCases > 0) {
    addEvent(next, `Packaging ${mode} lost ${caseCountLabel(lostCases)}. ${modeEffect.note} ${caseCountLabel(batch.casesExpected)} should reach the pallet.`);
  } else {
    addEvent(next, `${batch.recipeName} packaging started ${mode}. ${modeEffect.note}`);
  }
  return next;
};

const checkGravity = (next: GameState, batchId?: string): GameState => {
  const batch = next.batches.find((item) => item.step === 'fermenting' && (!batchId || item.id === batchId));
  if (!batch) {
    addEvent(next, 'No fermenting batch is ready for a gravity check.');
    return next;
  }
  if (next.energy < 4) {
    addEvent(next, 'Not enough energy to pull and read a gravity sample.');
    return next;
  }
  advanceGameTime(next, 15, 4);
  if (batch.step === 'fermenting') {
    batch.fermentationReadiness = fermentationReadinessFor(next, getRecipe(batch.recipeId), batch.stepProgress, true);
  } else if (batch.step === 'awaiting-packaging') {
    batch.fermentationReadiness = batch.fermentationReadiness ?? fermentationReadinessFor(next, getRecipe(batch.recipeId), 100, true);
  }
  addEvent(next, `${batch.recipeName} gravity check: FG confidence is ${batch.fermentationReadiness.fgConfidence}, yeast cleanup is ${batch.fermentationReadiness.yeastCleanup}.`);
  return next;
};

const packageEarly = (next: GameState, batchId?: string): GameState => {
  const batch = next.batches.find((item) => item.step === 'fermenting' && (!batchId || item.id === batchId));
  if (!batch) {
    addEvent(next, 'No fermenting batch can be rushed to packaging.');
    return next;
  }
  applyFermentationReadiness(next, batch);
  const readiness = batch.fermentationReadiness;
  if (readiness.apparentProgress < 55) {
    addEvent(next, `${batch.recipeName} is too early to package without making a cartoonishly bad decision. Let it ferment longer or check gravity later.`);
    return next;
  }
  batch.step = 'awaiting-packaging';
  batch.stepProgress = 0;
  batch.quality = Math.max(25, batch.quality - (readiness.fgConfidence === 'unknown' || readiness.fgConfidence === 'moving' ? 8 : 3));
  batch.conditioningState = {
    carbonationProgress: 0,
    co2Integration: 'rough',
    refermentationRisk: Math.min(100, readiness.rushRisk + 12),
    packagePressureRisk: Math.min(100, readiness.rushRisk + (readiness.fgConfidence === 'stable' ? 2 : 20))
  };
  addEvent(next, `${batch.recipeName} was rushed out of fermentation: FG ${readiness.fgConfidence}, cleanup ${readiness.yeastCleanup}. Packaging can save the deadline, not erase the risk.`);
  return next;
};

const waitUntilReady = (next: GameState, batchId?: string): GameState => {
  const batch = next.batches.find((item) => isTimedStep(item.step) && (!batchId || item.id === batchId));
  if (!batch || !isTimedStep(batch.step)) {
    addEvent(next, 'Nothing is actively timed right now.');
    return next;
  }
  const duration = durationForStep(next, batch, batch.step);
  const remainingMinutes = Math.max(1, Math.ceil(duration * (1 - batch.stepProgress / 100)));
  const energyCost =
    batch.step === 'brewing'
      ? Math.min(next.energy, Math.max(8, Math.ceil((remainingMinutes / duration) * 45)))
      : batch.step === 'packaging'
        ? Math.min(next.energy, Math.max(6, Math.ceil((remainingMinutes / duration) * 24)))
        : 0;
  const stepName = batch.step === 'brewing' ? 'brew day' : batch.step === 'fermenting' ? 'fermentation' : batch.step === 'packaging' ? 'packaging' : 'conditioning';
  const startingStep = batch.step;
  const startingFaultCount = batch.faultEventsTriggered.length;
  addEvent(next, `Skipped ahead ${durationLabel(remainingMinutes)} for ${batch.recipeName} ${stepName}.`);
  advanceGameTime(next, remainingMinutes, energyCost);
  if (startingStep === 'fermenting' && (batch.step as BatchStep) === 'awaiting-packaging' && batch.faultEventsTriggered.length > startingFaultCount) {
    addEvent(next, `Sanitation or recipe faults affected ${batch.recipeName} during fermentation. Check the batch quality before packaging.`);
  }
  return next;
};

const createOrderItems = (items: RecipeIngredient[]): SupplyOrderItem[] =>
  items.map((item) => {
    const ingredient = getIngredient(item.ingredientId);
    const packs = Math.ceil(item.amount / ingredient.packSize);
    return { ingredientId: item.ingredientId, amount: packs * ingredient.packSize, packs };
  });

const orderItems = (next: GameState, items: RecipeIngredient[], label: string): GameState => {
  if (items.length === 0) {
    addEvent(next, 'No missing ingredients to order for that recipe.');
    return next;
  }
  const alreadyIncoming = items.every((item) => {
    const incomingAmount = next.pendingOrders.reduce(
      (total, order) => total + order.items.filter((orderItem) => orderItem.ingredientId === item.ingredientId).reduce((sum, orderItem) => sum + orderItem.amount, 0),
      0
    );
    return incomingAmount >= item.amount;
  });
  if (alreadyIncoming) {
    const earliestArrival = Math.min(...next.pendingOrders.map((order) => order.arrivalDay));
    addEvent(next, `${label} is already ordered. Delivery arrives ${formatGameDate(earliestArrival)}.`);
    return next;
  }
  const cost = orderCost(items);
  if (next.cash < cost) {
    addEvent(next, `Not enough cash for ${label}. Need EUR ${cost}.`);
    return next;
  }
  const orderLineItems = createOrderItems(items);
  next.cash -= cost;
  next.pendingOrders.push({
    id: `order-${next.day}-${next.minute}-${next.pendingOrders.length}`,
    dayOrdered: next.day,
    arrivalDay: next.day + orderLeadDays,
    cost,
    items: orderLineItems
  });
  const overflowAfterOrder = orderLineItems.reduce((total, item) => total + storageUseForItem(item.ingredientId, item.amount), 0) + totalStorageOverflow(next);
  addEvent(next, `${label} ordered for EUR ${cost}. Arrives ${formatGameDate(next.day + orderLeadDays)} in ${orderLeadDays} days${overflowAfterOrder > 6 ? '; storage will be tight.' : '.'}`);
  return next;
};

const sellCases = (next: GameState, requestedCases: number, channelOverride?: SalesChannelId): GameState => {
  const channel = salesChannels[channelOverride ?? next.demand.channelId];
  const invoiceRequired = next.demand.invoiceRequired || (!next.demand.promiseLocked && channel.formal && next.visibilityRisk >= channel.invoiceAfter);
  if (invoiceRequired && !next.canInvoice) {
    next.complianceRisk += 8;
    next.householdPressure += 3;
    addEvent(next, `${channel.name} needs an invoice and traceability details. The order is blocked until the garage goes formal or you choose safer sales.`);
    return next;
  }
  const remainingDemand = channelOverride && channelOverride !== next.demand.channelId ? channel.cases : Math.max(0, next.demand.casesRequested - next.demand.casesSold);
  const cases = Math.min(requestedCases, next.inventory.cases, finishedBeerCaseCount(next), remainingDemand || requestedCases);
  if (cases <= 0) {
    addEvent(next, 'No sellable cases or open local demand right now.');
    return next;
  }
  let casesToPreview = cases;
  const blockedLot = next.finishedBeerLots.find((lot) => {
    if (casesToPreview <= 0) return false;
    const casesFromLot = Math.min(casesToPreview, lot.cases);
    casesToPreview -= casesFromLot;
    return lot.verdict.sellAdvice === 'dump' || lot.verdict.sellAdvice === 'recall' || lot.verdict.qualityBand === 'bad' || lot.verdict.qualityBand === 'unsafe';
  });
  if (blockedLot) {
    const customerId = next.demand.customerId ?? activeCustomerId(next, channelOverride ?? next.demand.channelId);
    const warning = `${blockedLot.recipeName} is marked ${blockedLot.verdict.sellAdvice}. Use a recovery action before selling it into a normal promise.`;
    rememberCustomerNote(next, customerId, `${channel.name} was not served unsafe beer: ${blockedLot.verdict.headline}`, 0);
    addHistory(next, {
      kind: 'customer',
      title: `${channel.name} unsafe sale blocked`,
      detail: warning,
      recipeId: blockedLot.recipeId,
      customerId
    });
    addEvent(next, warning);
    return next;
  }
  let casesToAcceptPreview = cases;
  const previewSoldLots: { recipeId: string; recipeName: string; cases: number; verdict: BatchVerdict }[] = [];
  next.finishedBeerLots.forEach((lot) => {
    if (casesToAcceptPreview <= 0) return;
    const casesFromLot = Math.min(casesToAcceptPreview, lot.cases);
    const verdict = lot.verdict ?? fallbackVerdict(lot.quality, lot.recipeName);
    previewSoldLots.push({ recipeId: lot.recipeId, recipeName: lot.recipeName, cases: casesFromLot, verdict });
    casesToAcceptPreview -= casesFromLot;
  });
  const previewWorstVerdict = previewSoldLots.map((lot) => lot.verdict).sort((a, b) => b.stabilityRisk - a.stabilityRisk || qualityRank(a.qualityBand) - qualityRank(b.qualityBand))[0];
  const previewCustomerId = activeCustomerId(next, channelOverride ?? next.demand.channelId);
  const wrongFlagshipRecipe = Boolean(next.demand.requestedRecipeId && previewSoldLots.some((lot) => lot.recipeId !== next.demand.requestedRecipeId));
  const substitutedPromiseBeer = previewSoldLots.some((lot) => lot.verdict.likelyCauses.some((cause) => /Supplier substitution/i.test(cause)));
  if (wrongFlagshipRecipe) {
    const requestedName = next.demand.requestedRecipeName ?? getRecipe(next.demand.requestedRecipeId ?? previewSoldLots[0]?.recipeId ?? 'garage-blonde').name;
    const rejection = `${channel.name} asked for ${requestedName}, not a substitute batch.`;
    rememberCustomerNote(next, previewCustomerId, rejection, -1);
    addEvent(next, rejection);
    addHistory(next, {
      kind: 'customer',
      title: `${channel.name} rejected substitute beer`,
      detail: `No cases moved. ${next.demand.accountName} is a named flagship request.`,
      customerId: previewCustomerId
    });
    return next;
  }
  if (substitutedPromiseBeer && (next.demand.flagshipRequest || next.demand.packagingExpectation === 'clean-label' || next.demand.minimumQualityBand === 'excellent')) {
    const rejection = `${channel.name} rejects the substituted batch for this promise. They wanted the beer as specified.`;
    rememberCustomerNote(next, previewCustomerId, rejection, -2);
    addEvent(next, rejection);
    addHistory(next, {
      kind: 'customer',
      title: `${channel.name} rejected substituted beer`,
      detail: `No cases moved. Supplier substitutions are too visible for ${next.demand.accountName}.`,
      customerId: previewCustomerId
    });
    return next;
  }
  if (previewWorstVerdict) {
    const previewMissedMinimum = next.demand.minimumQualityBand ? qualityRank(previewWorstVerdict.qualityBand) < qualityRank(next.demand.minimumQualityBand) : false;
    const previewMissedPackaging = !packagingMeetsExpectation(previewWorstVerdict, next.demand.packagingExpectation);
    const strictPromise = Boolean(next.demand.promiseLocked && previewCustomerId !== 'samira');
    if (strictPromise && (previewMissedMinimum || previewMissedPackaging)) {
      const rejection = `${channel.name} rejects the batch conversation. ${previewWorstVerdict.headline}`;
      rememberCustomerNote(next, previewCustomerId, rejection, -2);
      addEvent(next, rejection);
      addEvent(next, `${next.demand.accountName} will not take these cases: ${previewMissedMinimum ? `needed ${next.demand.minimumQualityBand} beer` : ''}${previewMissedMinimum && previewMissedPackaging ? ' and ' : ''}${previewMissedPackaging ? `needed ${next.demand.packagingExpectation} packaging` : ''}.`);
      addHistory(next, {
        kind: 'customer',
        title: `${channel.name} rejected ${previewSoldLots[0]?.recipeName ?? 'the batch'}`,
        detail: `No cases moved and no cash paid. ${rejection}`,
        customerId: previewCustomerId
      });
      return next;
    }
  }
  const consequence = saleConsequencePreview(next, channelOverride ?? next.demand.channelId, cases);
  const revenue = consequence.cashDelta;
  let casesToRemove = cases;
  const soldLotNames = new Set<string>();
  const soldVerdicts: BatchVerdict[] = [];
  const soldLots: { recipeId: string; recipeName: string; cases: number; verdict: BatchVerdict }[] = [];
  next.finishedBeerLots.forEach((lot) => {
    if (casesToRemove <= 0) return;
    const casesFromLot = Math.min(casesToRemove, lot.cases);
    soldLotNames.add(lot.recipeName);
    const verdict = lot.verdict ?? fallbackVerdict(lot.quality, lot.recipeName);
    soldVerdicts.push(verdict);
    soldLots.push({ recipeId: lot.recipeId, recipeName: lot.recipeName, cases: casesFromLot, verdict });
    lot.cases -= casesFromLot;
    casesToRemove -= casesFromLot;
  });
  next.finishedBeerLots = next.finishedBeerLots.filter((item) => item.cases > 0);
  next.inventory.cases -= cases;
  next.cash += revenue;
  next.demand.casesSold += cases;
  next.salesToday += cases;
  next.visibilityRisk += consequence.visibilityDelta;
  next.complianceRisk += consequence.complianceDelta;
  next.householdPressure += consequence.householdPressureDelta;
  const repGain = consequence.reputationDelta;
  next.reputation += repGain;
  const soldLabel = soldLotNames.size === 1 ? [...soldLotNames][0] : 'mixed garage beer';
  addEvent(next, `Sold ${caseCountLabel(cases)} of ${soldLabel} through ${channel.name} for EUR ${revenue}. Reputation +${repGain}.`);
  const customerId = activeCustomerId(next, channelOverride ?? next.demand.channelId);
  const worstVerdict = soldVerdicts.sort((a, b) => b.stabilityRisk - a.stabilityRisk || qualityRank(a.qualityBand) - qualityRank(b.qualityBand))[0];
  if (worstVerdict) {
    const formal = channel.formal || next.demand.formalOrder;
    const missedMinimum = next.demand.minimumQualityBand ? qualityRank(worstVerdict.qualityBand) < qualityRank(next.demand.minimumQualityBand) : false;
    const missedPackaging = !packagingMeetsExpectation(worstVerdict, next.demand.packagingExpectation);
    const strictPromise = Boolean(next.demand.promiseLocked && customerId !== 'samira');
    const promiseDeliveryAccepted = !(strictPromise && (missedMinimum || missedPackaging));
    if (!promiseDeliveryAccepted) {
      next.demand.casesSold = Math.max(0, next.demand.casesSold - cases);
    }
    const activePromise = ensureActivePromise(next);
    if (activePromise) {
      if (!activePromise.bestDeliveredQualityBand || qualityRank(worstVerdict.qualityBand) > qualityRank(activePromise.bestDeliveredQualityBand)) {
        activePromise.bestDeliveredQualityBand = worstVerdict.qualityBand;
      }
      activePromise.bestPresentationScore = Math.max(activePromise.bestPresentationScore ?? 0, worstVerdict.presentationScore);
    }
    syncActivePromiseProgress(next);
    const reaction =
      worstVerdict.qualityBand === 'excellent'
        ? `${channel.name} is excited: ${worstVerdict.headline}`
      : worstVerdict.qualityBand === 'solid'
          ? `${channel.name} is happy enough to ask about the next batch. ${worstVerdict.headline}`
          : worstVerdict.qualityBand === 'flawed'
            ? `${channel.name} noticed the flaw: ${worstVerdict.sensoryNotes[0]}`
            : formal
              ? `${channel.name} rejects the batch conversation. ${worstVerdict.headline}`
              : `${channel.name} takes it, but this batch damages trust. ${worstVerdict.headline}`;
    const trustDelta = missedMinimum || missedPackaging ? -2 : worstVerdict.qualityBand === 'excellent' ? 2 : worstVerdict.qualityBand === 'solid' ? 1 : worstVerdict.qualityBand === 'flawed' ? -1 : -2;
    rememberCustomerNote(next, customerId, reaction, trustDelta);
    addEvent(next, reaction);
    if (!promiseDeliveryAccepted) {
      addEvent(next, `${next.demand.accountName} will not count this toward the promise: ${missedMinimum ? `needed ${next.demand.minimumQualityBand} beer` : ''}${missedMinimum && missedPackaging ? ' and ' : ''}${missedPackaging ? `needed ${next.demand.packagingExpectation} packaging` : ''}.`);
    }
    addHistory(next, {
      kind: 'customer',
      title: `${channel.name} reacted to ${soldLabel}`,
      detail: missedMinimum || missedPackaging ? `${reaction} It missed the promised ${next.demand.minimumQualityBand ?? 'buyer'} standard${missedPackaging ? ` and ${next.demand.packagingExpectation} packaging` : ''}.` : reaction,
      customerId
    });
    if (worstVerdict.qualityBand === 'excellent' || worstVerdict.qualityBand === 'solid') {
      soldLots.forEach((lot) => {
        if (!next.flagshipRecipeIds.includes(lot.recipeId) && (lot.verdict.legacyTags.includes('flagship candidate') || next.customerMemory[customerId]?.trust >= 3)) {
          next.flagshipRecipeIds = [...next.flagshipRecipeIds, lot.recipeId].slice(-5);
          addHistory(next, { kind: 'flagship', title: `${lot.recipeName} gained regulars`, detail: `${channel.name} asked about future batches.`, recipeId: lot.recipeId, customerId });
        }
      });
    }
    if (next.campaign.missionId === 'first-festival' && customerId === 'festival' && promiseDeliveryAccepted && qualityRank(worstVerdict.qualityBand) >= qualityRank('solid') && cases >= 6) {
      next.reputation += 1;
      addIdentityTag(next, 'event beer');
      addIdentityPoints(next, 'event-supplier', 3, `${soldLabel} succeeded under event pressure.`);
      const awardRecipe = soldLots[0]?.recipeId ?? 'garage-blonde';
      if (!next.awards.some((award) => award.title === 'Festival table buzz' && award.recipeId === awardRecipe)) {
        next.awards = [
          {
            id: `award-${next.day}-${next.minute}-${next.awards.length}`,
            day: next.day,
            title: 'Festival table buzz',
            recipeId: awardRecipe,
            customerId,
            reputationDelta: 1,
            identityPath: 'event-supplier' as IdentityPathId
          },
          ...next.awards
        ].slice(0, 12);
      }
      addHistory(next, { kind: 'award', title: 'Festival table buzz', detail: `${soldLabel} moved well at an event and earned informal award talk. Reputation +1.`, customerId });
      addEvent(next, `Festival table buzz: ${soldLabel} earned word-of-mouth. Reputation +1.`);
    }
  }
  updateBreweryTier(next);
  if (next.visibilityRisk >= 20) addEvent(next, 'Garage visibility is high. Bars and restaurants may now ask for invoices, traceability, and legal release status.');
  if (next.complianceRisk >= 30) addEvent(next, 'Compliance pressure is severe: pause public sales, prepare paperwork, or risk blocked orders and fines.');
  return next;
};

const highestRiskLot = (state: GameState) =>
  [...state.finishedBeerLots].sort((a, b) => (b.verdict?.stabilityRisk ?? 0) - (a.verdict?.stabilityRisk ?? 0) || qualityRank(a.verdict?.qualityBand ?? 'solid') - qualityRank(b.verdict?.qualityBand ?? 'solid'))[0];

const recoverLot = (next: GameState, actionId: Extract<GameAction, { type: 'recovery-action' }>['actionId'], lotId?: string): GameState => {
  const lot = lotId ? next.finishedBeerLots.find((item) => item.id === lotId) ?? highestRiskLot(next) : highestRiskLot(next);
  if (actionId === 'replacement-gesture') {
    const customerId = next.demand.customerId ?? activeCustomerId(next, next.demand.channelId);
    const cost = Math.min(60, Math.max(18, next.demand.casesRequested * 4));
    if (next.cash < cost) {
      addEvent(next, `Replacement gesture needs ${formatCurrency(cost)} cash.`);
      return next;
    }
  next.cash -= cost;
  next.reputation += 1;
  rememberCustomerNote(next, customerId, 'You offered a replacement gesture before trust collapsed.', 1);
    const activePromise = ensureActivePromise(next);
    if (activePromise && activePromise.status === 'missed') activePromise.status = 'replaced';
  addHistory(next, { kind: 'recovery', title: 'Replacement gesture', detail: `Spent ${formatCurrency(cost)} to protect a customer relationship. Reputation +1.`, customerId });
    addEvent(next, `Replacement gesture sent to ${next.demand.accountName}. Reputation +1, trust repaired.`);
    return next;
  }

  if (!lot) {
    addEvent(next, 'No finished lot needs a recovery decision right now.');
    return next;
  }

  if (actionId === 'hold-risky-lot') {
    const cost = 8;
    if (next.energy < 6) {
      addEvent(next, 'Not enough energy to cold-hold and recheck the risky lot.');
      return next;
    }
    next.energy -= 6;
    next.cash = Math.max(0, next.cash - cost);
    lot.verdict = {
      ...lot.verdict,
      headline: `${lot.recipeName} was held and rechecked before sale.`,
      sensoryNotes: ['Held cold to let carbonation and package checks settle.', ...lot.verdict.sensoryNotes].slice(0, 4),
      likelyCauses: ['Recovery action: hold and recheck.', ...lot.verdict.likelyCauses].slice(0, 4),
      sellAdvice: lot.verdict.sellAdvice === 'recall' || lot.verdict.sellAdvice === 'dump' ? 'discount' : 'sell',
      stabilityRisk: Math.max(0, lot.verdict.stabilityRisk - 22)
    };
    addHistory(next, { kind: 'recovery', title: `${lot.recipeName} held and rechecked`, detail: `Stability risk reduced to ${lot.verdict.stabilityRisk}/100.`, recipeId: lot.recipeId });
    addEvent(next, `${lot.recipeName} held cold and rechecked. Stability risk now ${lot.verdict.stabilityRisk}/100.`);
    return next;
  }

  if (actionId === 'discount-risky-lot') {
    const cases = lot.cases;
    const revenue = Math.max(4, Math.round(cases * getRecipe(lot.recipeId).salePricePerCase * 0.38));
    next.finishedBeerLots = next.finishedBeerLots.filter((item) => item.id !== lot.id);
    next.inventory.cases = Math.max(0, next.inventory.cases - cases);
    next.cash += revenue;
    next.reputation = Math.max(0, next.reputation - (lot.verdict.qualityBand === 'bad' || lot.verdict.qualityBand === 'unsafe' ? 1 : 0));
    addHistory(next, {
      kind: 'recovery',
      title: `${lot.recipeName} discounted`,
      detail: `${caseCountLabel(cases)} cleared as flawed beer for ${formatCurrency(revenue)} instead of going to a promise.`,
      recipeId: lot.recipeId
    });
    addEvent(next, `${lot.recipeName} discounted and cleared quietly for ${formatCurrency(revenue)}. It did not count toward any named promise.`);
    return next;
  }

  if (actionId === 'recall-risky-lot') {
    const cases = lot.cases;
    const customerId = next.demand.customerId ?? activeCustomerId(next, next.demand.channelId);
    const cost = Math.min(next.cash, Math.max(20, cases * 7));
    next.cash -= cost;
    next.reputation = Math.max(0, next.reputation - 1);
    next.complianceRisk = Math.max(0, next.complianceRisk - 6);
    next.finishedBeerLots = next.finishedBeerLots.filter((item) => item.id !== lot.id);
    next.inventory.cases = Math.max(0, next.inventory.cases - cases);
    rememberCustomerNote(next, customerId, `${lot.recipeName} was recalled before it hurt drinkers. Expensive, but responsible.`, 1);
    addHistory(next, {
      kind: 'recovery',
      title: `${lot.recipeName} recalled`,
      detail: `${caseCountLabel(cases)} pulled back at a cost of ${formatCurrency(cost)}. Reputation -1, trust protected.`,
      recipeId: lot.recipeId,
      customerId
    });
    addEvent(next, `${lot.recipeName} recalled: ${caseCountLabel(cases)} pulled back for ${formatCurrency(cost)}. Reputation -1, trust protected.`);
    return next;
  }

  next.finishedBeerLots = next.finishedBeerLots.filter((item) => item.id !== lot.id);
  next.inventory.cases = Math.max(0, next.inventory.cases - lot.cases);
  addHistory(next, { kind: 'recovery', title: `${lot.recipeName} dumped`, detail: `${caseCountLabel(lot.cases)} removed instead of risking customers.`, recipeId: lot.recipeId });
  addEvent(next, `${caseCountLabel(lot.cases)} of ${lot.recipeName} dumped. Painful, but the brewery avoided selling a bad promise.`);
  return next;
};

const enterCompetition = (next: GameState, lotId?: string): GameState => {
  const lot = lotId ? next.finishedBeerLots.find((item) => item.id === lotId) : next.finishedBeerLots.find((item) => item.cases > 0);
  if (!lot) {
    addEvent(next, 'No finished lot is available for competition judging.');
    return next;
  }
  if (lot.verdict.qualityBand === 'unsafe' || lot.verdict.sellAdvice === 'recall' || lot.verdict.sellAdvice === 'dump') {
    addEvent(next, `${lot.recipeName} is not competition-safe. Recover, hold, dump, or recall it before showing it publicly.`);
    return next;
  }
  const entryCost = 25;
  if (next.cash < entryCost) {
    addEvent(next, `Competition entry needs ${formatCurrency(entryCost)} cash.`);
    return next;
  }
  if (next.energy < 8) {
    addEvent(next, 'Not enough energy to pack samples and drive them to judging.');
    return next;
  }

  next.cash -= entryCost;
  next.energy -= 8;
  lot.cases -= 1;
  next.inventory.cases = Math.max(0, next.inventory.cases - 1);
  const recipe = getRecipe(lot.recipeId);
  const score = lot.quality + lot.verdict.presentationScore / 5 - lot.verdict.stabilityRisk / 2 + qualityRank(lot.verdict.qualityBand) * 6;
  const awardWorthy = score >= 92 && qualityRank(lot.verdict.qualityBand) >= qualityRank('solid');
  if (awardWorthy) {
    const reputationDelta = lot.verdict.qualityBand === 'excellent' ? 2 : 1;
    next.reputation += reputationDelta;
    addIdentityPoints(next, identityPathForRecipe(recipe), reputationDelta + 1, `${lot.recipeName} impressed judges.`);
    const awardTitle = lot.verdict.qualityBand === 'excellent' ? 'Local judges gold' : 'Local judges mention';
    if (!next.awards.some((award) => award.title === awardTitle && award.recipeId === lot.recipeId)) {
      next.awards = [
        {
          id: `award-${next.day}-${next.minute}-${next.awards.length}`,
          day: next.day,
          title: awardTitle,
          recipeId: lot.recipeId,
          reputationDelta,
          identityPath: identityPathForRecipe(recipe)
        },
        ...next.awards
      ].slice(0, 12);
    }
    addHistory(next, {
      kind: 'award',
      title: `${lot.recipeName} won ${awardTitle}`,
      detail: `One case was entered for judging. Reputation +${reputationDelta}. Judges called out: ${lot.verdict.sensoryNotes[0]}`,
      recipeId: lot.recipeId
    });
    addEvent(next, `${lot.recipeName} earned ${awardTitle}. Reputation +${reputationDelta}; ${identityPathForRecipe(recipe).replace(/-/g, ' ')} identity rose.`);
  } else {
    addHistory(next, {
      kind: 'award',
      title: `${lot.recipeName} judging feedback`,
      detail: `No award. Judges noted: ${lot.verdict.sensoryNotes[0]} Likely cause: ${lot.verdict.likelyCauses[0]}`,
      recipeId: lot.recipeId
    });
    addEvent(next, `${lot.recipeName} did not place. Judges noted: ${lot.verdict.sensoryNotes[0]}`);
  }
  next.finishedBeerLots = next.finishedBeerLots.filter((item) => item.cases > 0);
  updateBreweryTier(next);
  return next;
};

export const reduceGame = (state: GameState, action: GameAction): GameState => {
  const next = cloneState(state);

  if (action.type === 'tick') {
    return next;
  }

  if (action.type === 'dismiss-story-card') {
    markCampaignMissionSeen(next);
    return next;
  }

  if (action.type === 'end-day') {
    endDay(next);
    return next;
  }

  if (action.type === 'select-equipment') {
    next.selectedEquipmentId = action.equipmentId;
    return next;
  }

  if (action.type === 'use-equipment') {
    next.selectedEquipmentId = action.equipmentId;
    if (action.equipmentId === 'kettle') return startBatch(next, 'garage-blonde');
    if (action.equipmentId === 'mill') {
      addEvent(next, `${stateEquipmentName(next, 'mill')} inspected. Milling actions are coming in a future production pass.`);
      return next;
    }
    if (action.equipmentId === 'fermenter') {
      const waiting = next.batches.find((item) => item.step === 'awaiting-transfer');
      if (waiting) return transferAwaitingBatch(next, waiting.id, 'careful');
      const batch = next.batches.find((item) => item.step === 'fermenting' || item.step === 'awaiting-packaging');
      const effectiveRisk = batch ? Math.max(3, batch.contaminationRisk + fermentationTemperatureEffect(getRecipe(batch.recipeId), next.fermenterTemperatureC).risk) : 0;
      addEvent(next, batch ? `${batch.recipeName} ${batch.step === 'awaiting-packaging' ? 'is ready for the bottling bench' : `fermenting at ${next.fermenterTemperatureC} C. Infection chance is ${effectiveRisk}%.`}` : `Fermenter set to ${next.fermenterTemperatureC} C. Mash something in the kettle first.`);
      return next;
    }
    if (action.equipmentId === 'bottler') return packageAwaitingBatch(next);
  }

  if (action.type === 'start-batch') {
    const updated = startBatch(next, action.recipeId, action.brewdayApproach ?? 'standard', action.allowSubstitutions ?? false);
    syncCampaign(updated, action.type);
    return updated;
  }
  if (action.type === 'wait-until-ready') return waitUntilReady(next, action.batchId);
  if (action.type === 'transfer-batch') return transferAwaitingBatch(next, action.batchId, action.transferMode ?? 'careful');
  if (action.type === 'check-gravity') return checkGravity(next, action.batchId);
  if (action.type === 'package-early') return packageEarly(next, action.batchId);
  if (action.type === 'start-packaging') return packageAwaitingBatch(next, action.batchId, action.packagingMode ?? 'standard');
  if (action.type === 'ready-batch') {
    const batch = next.batches.find((item) => item.id === action.batchId && (item.step === 'bottle-conditioning' || item.step === 'ready'));
    if (batch) {
      addEvent(next, batch.step === 'bottle-conditioning' ? `${batch.recipeName} released young from conditioning. The verdict keeps the CO2 risk.` : `${batch.recipeName} released to the pallet.`);
      finishConditionedBatch(next, batch);
    }
    return next;
  }

  if (action.type === 'order-recipe') {
    const recipe = getRecipe(action.recipeId);
    return orderItems(next, recipeOrderItems(next, recipe, action.mode), action.mode === 'extra' ? `Extra ${recipe.name} supplies` : `Missing ${recipe.name} supplies`);
  }

  if (action.type === 'order-ingredient') {
    const ingredient = getIngredient(action.ingredientId);
    return orderItems(next, [{ ingredientId: action.ingredientId, amount: ingredient.packSize * action.packs }], `${ingredient.name} x${action.packs}`);
  }

  if (action.type === 'package-batch') return packageAwaitingBatch(next, action.batchId);

  if (action.type === 'sell-cases') {
    const updated = sellCases(next, action.cases);
    syncCampaign(updated, action.type);
    return updated;
  }
  if (action.type === 'sell-channel') {
    const updated = sellCases(next, action.cases, action.channelId);
    syncCampaign(updated, action.type);
    return updated;
  }

  if (action.type === 'choose-promise') {
    return chooseBreweryPromise(next, action.promiseId);
  }

  if (action.type === 'buy-equipment') {
    const item = getEquipmentCatalogItem(action.equipmentItemId);
    const sameOwned = next.ownedEquipment.filter((owned) => owned.itemId === item.id).length;
    if (item.maxOwned && sameOwned >= item.maxOwned) {
      addEvent(next, `${item.name} limit reached for this garage.`);
      return next;
    }
    if (!item.maxOwned && sameOwned > 0) {
      addEvent(next, `${item.name} is already installed.`);
      return next;
    }
    if (next.cash < item.cost) {
      addEvent(next, `Not enough cash for ${item.name}. Need EUR ${item.cost}.`);
      return next;
    }
    if (garageSpaceAvailable(next) < item.spaceUsed) {
      addEvent(next, `No garage space for ${item.name}. Free space or move out of the garage.`);
      return next;
    }
    next.cash -= item.cost;
    const owned = createOwnedEquipment(item.id, sameOwned + 1, true);
    next.ownedEquipment.push(owned);
    next.activeEquipment[item.equipmentId] = owned.instanceId;
    next.garageSpaceUsed += owned.spaceUsed;
    const current = next.equipment[item.equipmentId];
    next.equipment[item.equipmentId] = {
      ...current,
      itemId: item.id,
      name: item.name,
      description: item.description,
      tier: item.tier,
      cost: item.cost,
      capacityCaseBonus: 0,
      qualityBonus: item.qualityBonus,
      riskModifier: item.riskModifier,
      speedModifier: item.speedModifier,
      capacityLiters: item.capacityLiters,
      spaceUsed: item.spaceUsed,
      visualClass: item.visualClass,
      operonTypeKey: item.operonTypeKey,
      condition: Math.max(current.condition, 78 + item.tier * 5)
    };
    if (item.tier >= 3 || next.garageSpaceUsed >= next.garageSpaceLimit - 2) {
      next.householdPressure += 6;
      next.visibilityRisk += 4;
    }
    addEvent(next, `${item.name} installed. ${item.description}`);
    const garageMaxed =
      Object.values(next.equipment).every((equipment) => next.ownedEquipment.some((owned) => owned.equipmentId === equipment.id) && equipment.tier >= topGarageTier(equipment.id)) ||
      next.ownedEquipment.some((ownedItem) => ownedItem.tier >= 3);
    if (garageMaxed) addEvent(next, 'Garage ceiling reached: this setup is too professional for the garage. The next milestone is moving into a real brewery space.');
    syncCampaign(next, action.type);
    return next;
  }

  if (action.type === 'crisis-action') {
    if (action.actionId === 'pause-public-sales') {
      next.visibilityRisk = Math.max(0, next.visibilityRisk - 10);
      next.householdPressure = Math.max(0, next.householdPressure - 4);
      addEvent(next, 'You paused public sales and kept beer for private buyers. Visibility and household pressure cooled down.');
    }
    if (action.actionId === 'discount-informal') {
      const cases = Math.min(4, next.inventory.cases);
      if (cases <= 0) addEvent(next, 'No packaged beer to discount right now.');
      else {
        next.inventory.cases -= cases;
        next.cash += cases * 8;
        next.visibilityRisk = Math.max(0, next.visibilityRisk - 3);
        addEvent(next, `Discounted ${cases} cases informally to clear space. Cash improved, but margin was poor.`);
      }
    }
    if (action.actionId === 'paperwork-prep') {
      const cost = 260;
      if (next.cash < cost) addEvent(next, `Paperwork prep needs EUR ${cost}.`);
      else {
        next.cash -= cost;
        next.canInvoice = true;
        next.complianceRisk = Math.max(0, next.complianceRisk - 14);
        addEvent(next, 'Invoice and traceability prep started. Formal orders are now possible, but the garage is still not a licensed brewery.');
      }
    }
    syncCampaign(next, action.type);
    return next;
  }

  if (action.type === 'competition-entry') {
    return enterCompetition(next, action.lotId);
  }

  if (action.type === 'recovery-action') {
    const updated = recoverLot(next, action.actionId, action.lotId);
    syncCampaign(updated, action.type);
    return updated;
  }

  if (action.type === 'set-fermenter-temperature') {
    const previous = next.fermenterTemperatureC;
    next.fermenterTemperatureC = clampFermenterTemperature(action.temperatureC);
    if (next.fermenterTemperatureC !== previous) {
      const activeBatch = next.batches.find((batch) => batch.step === 'fermenting');
      const activeRecipe = activeBatch ? getRecipe(activeBatch.recipeId) : null;
      const effect = activeRecipe ? fermentationTemperatureEffect(activeRecipe, next.fermenterTemperatureC) : null;
      addEvent(next, effect ? `Fermenter set to ${next.fermenterTemperatureC} C for ${activeRecipe?.name}: ${effect.label}.` : `Fermenter set to ${next.fermenterTemperatureC} C.`);
    }
    syncCampaign(next, action.type);
    return next;
  }

  if (action.type === 'clean-equipment') {
    const equipment = next.equipment[action.equipmentId];
    const { cost, minutes, energyCost, duration } = cleaningPlanForEquipment(next, action.equipmentId);
    const beerInside =
      action.equipmentId === 'kettle'
        ? next.batches.some((batch) => batch.step === 'brewing' || batch.step === 'awaiting-transfer')
        : action.equipmentId === 'fermenter'
          ? next.batches.some((batch) => batch.step === 'fermenting' || batch.step === 'awaiting-packaging')
          : action.equipmentId === 'bottler'
            ? next.batches.some((batch) => batch.step === 'packaging' || batch.step === 'bottle-conditioning')
            : false;
    if (beerInside) {
      addEvent(next, 'Cannot clean that station while beer is inside it. Transfer or finish the current step first.');
      return next;
    }
    if (next.energy < energyCost) {
      addEvent(next, 'Not enough energy to clean properly. End the day first.');
      return next;
    }
    if (next.cash < cost) {
      addEvent(next, 'Cleaning supplies are too expensive right now.');
      return next;
    }
    next.cash -= cost;
    advanceGameTime(next, minutes, energyCost);
    equipment.condition = Math.min(100, equipment.condition + 26);
    if (action.equipmentId === 'kettle') next.sanitationDebt.brewhouse = Math.max(0, next.sanitationDebt.brewhouse - 32);
    if (action.equipmentId === 'fermenter') next.sanitationDebt.fermentation = Math.max(0, next.sanitationDebt.fermentation - 34);
    if (action.equipmentId === 'bottler') next.sanitationDebt.packaging = Math.max(0, next.sanitationDebt.packaging - 38);
    if (action.equipmentId === 'bottler' || action.equipmentId === 'fermenter') next.sanitationDebt.transferPath = Math.max(0, next.sanitationDebt.transferPath - 24);
    next.sanitationDebt.generalGarage = Math.max(0, next.sanitationDebt.generalGarage - 12);
    const owned = next.ownedEquipment.find((item) => item.instanceId === next.activeEquipment[action.equipmentId]);
    if (owned) owned.condition = equipment.condition;
    const equipmentName = equipment.id === 'bottler' ? 'Bottling station' : equipment.name;
    addEvent(next, `${equipmentName} cleaned and sanitized in ${duration}. Clean stations protect quality and lower infection chance.`);
    syncCampaign(next, action.type);
    return next;
  }

  return next;
};
