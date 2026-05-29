import { getRecipe } from '../data/recipes.js';
import type { CampaignMissionId, CampaignState, GameState, SalesChannelId } from './schema.js';
import { caseCountLabel, formatGameDate, ownedByStation, recipeMissingIngredients, recipeMissingOrderSummary, recipeRequirementSummary } from './selectors.js';

export type CampaignMission = {
  id: CampaignMissionId;
  title: string;
  character: string;
  characterId: string;
  characterRole?: string;
  message: string;
  phoneThread: string[];
  replyText: string;
  goal: string;
  reward: string;
  act: string;
};

export type CampaignView = CampaignMission & {
  progress: number;
  progressLabel: string;
  nextStep: string;
  primaryTarget: 'kettle' | 'fermenter' | 'bottler' | 'cases' | 'shop' | 'ops' | 'notebook';
  cardVisible: boolean;
  hiddenSystems: {
    risk: boolean;
    temperature: boolean;
    compliance: boolean;
    household: boolean;
    formalBuyers: boolean;
    advancedRecipes: boolean;
    cleaning: boolean;
  };
};

export const campaignMissionOrder: CampaignMissionId[] = [
  'barbecue-text',
  'empty-shelf',
  'bucket-empire',
  'uncle-nico-wedding',
  'warm-garage-week',
  'sticky-bucket',
  'labels-at-midnight',
  'first-festival',
  'first-bar-account',
  'household-summit',
  'sandbox-unlocked'
];

export const initialCampaignState = (): CampaignState => ({
  missionId: 'barbecue-text',
  completedMissionIds: [],
  seenMissionIds: []
});

export const campaignMissions: Record<CampaignMissionId, CampaignMission> = {
  'barbecue-text': {
    id: 'barbecue-text',
    title: 'The Barbecue Text',
    character: 'Samira',
    characterId: 'samira',
    act: 'Garage Doors Up',
    message:
      'Big barbecue in six weeks. Could you bring 4 cases of Garage Blonde? People keep asking about that garage beer. I said yes before asking you. Sorry. Sort of.',
    phoneThread: [
      'Big barbecue in six weeks.',
      'People keep asking about that Garage Blonde you made in the garage.',
      'Could you bring 4 cases? I said yes before asking you. Sorry. Sort of.'
    ],
    replyText: 'I can do 4 cases.',
    goal: 'Brew, bottle, and deliver 4 cases of Garage Blonde.',
    reward: 'First customer feedback and enough cash to keep the garage experiment alive.'
  },
  'empty-shelf': {
    id: 'empty-shelf',
    title: 'The Empty Shelf',
    character: 'Rudy',
    characterId: 'rudy',
    characterRole: 'Homebrew shop owner',
    act: 'Back Already?',
    message:
      'The barbecue beer vanished. That is good news. Your shelf, however, now has the confident emptiness of someone who forgot beer needs ingredients.',
    phoneThread: [
      'Rudy here, from the homebrew shop.',
      'Samira says the barbecue beer vanished. Good news.',
      'Your shelf says something else: beer needs malt, hops, yeast, and bottles before it can become beer again.'
    ],
    replyText: 'Send me the missing supplies.',
    goal: 'Order the missing Garage Blonde supplies, wait for delivery, then start another batch.',
    reward: 'Supply ordering, delivery timing, and Rudy deciding this is how garages lose their cars.'
  },
  'bucket-empire': {
    id: 'bucket-empire',
    title: 'One Bucket Is Not A Brewery',
    character: 'Rudy',
    characterId: 'rudy',
    characterRole: 'Homebrew shop owner',
    act: 'Capacity Trouble',
    message:
      'You have one bucket doing honest work and another beer promise arriving behind it. That is not production planning. That is hoping plastic can multitask.',
    phoneThread: [
      'One bucket can make beer.',
      'One bucket cannot make beer while another batch is already taking a long nap in it.',
      'Add a second plastic fermenter before the promises start stacking up.'
    ],
    replyText: 'Add a second bucket.',
    goal: 'Buy a second plastic fermenter so batches can overlap.',
    reward: 'A second fermenter slot and the first real feeling that the garage is growing.'
  },
  'uncle-nico-wedding': {
    id: 'uncle-nico-wedding',
    title: "Uncle Nico's Wedding",
    character: 'Uncle Nico',
    characterId: 'nico',
    act: 'The Promise Gets Bigger',
    message:
      'I told the wedding people you make beer now. They loved this. I may have said 10 cases. Four months is enough, right?',
    phoneThread: [
      'I told the wedding people you make beer now.',
      'They loved this.',
      'I may have said 10 cases. Four months is enough, right?'
    ],
    replyText: 'Ten cases. Four months. Got it.',
    goal: 'Produce and sell 10 cases for the wedding order.',
    reward: 'Overlapping batches, bigger promises, and a family member who should not handle sales.'
  },
  'warm-garage-week': {
    id: 'warm-garage-week',
    title: 'The Warm Garage Week',
    character: 'The Weather',
    characterId: 'weather',
    act: 'Quality Starts Talking',
    message:
      'The garage smells like bread, flowers, and ambition. Nice for humans. Slightly dramatic for yeast.',
    phoneThread: [
      'The garage is getting warm.',
      'That smells nice for humans.',
      'Yeast has opinions about temperature, and those opinions become flavor.'
    ],
    replyText: "I'll watch the temperature.",
    goal: 'Use temperature controls or accept a clear quality consequence.',
    reward: 'Temperature, quality notes, and the first controlled brewing problem.'
  },
  'sticky-bucket': {
    id: 'sticky-bucket',
    title: 'The Sticky Bucket',
    character: 'The Bucket',
    characterId: 'bucket',
    act: 'Clean Is A Verb',
    message:
      'The bucket no longer smells neutral. It smells like old cereal and optimism. That is not a fermentation profile.',
    phoneThread: [
      'The bucket no longer smells neutral.',
      'It smells like old cereal and optimism.',
      'That is not a fermentation profile. Clean it before it gives the next batch a personality.'
    ],
    replyText: 'Cleaning first.',
    goal: 'Clean and sanitize a station before the next serious batch.',
    reward: 'Cleaning, infection risk, and quality protection.'
  },
  'labels-at-midnight': {
    id: 'labels-at-midnight',
    title: 'Labels At Midnight',
    character: 'Samira',
    characterId: 'samira',
    act: 'Looks Like Beer',
    message:
      'A private event wants bottles that look less like they were smuggled out from under a workbench. Rustic is good. Random is less good.',
    phoneThread: [
      'A private event wants bottles.',
      'They should look less like they were smuggled out from under a workbench.',
      'Rustic is good. Random is less good.'
    ],
    replyText: 'Make it look presentable.',
    goal: 'Package a presentable event batch.',
    reward: 'Packaging presentation and reputation pressure.'
  },
  'first-festival': {
    id: 'first-festival',
    title: 'First Festival Table',
    character: 'Festival organizer',
    characterId: 'festival',
    act: 'Public Pour',
    message:
      'A small summer beer table has one open spot. Eight cases, presentable bottles, no weird package surprises. If people talk, bars listen.',
    phoneThread: [
      'We have one open spot at the summer beer table.',
      'Eight cases. Presentable bottles. No weird package surprises.',
      'If people talk, bars listen.'
    ],
    replyText: 'I can bring a clean event batch.',
    goal: 'Deliver 8 solid cases to the festival table.',
    reward: 'A first award-style public success and an event-supplier identity boost.'
  },
  'first-bar-account': {
    id: 'first-bar-account',
    title: 'First Bar Account',
    character: 'Mira',
    characterId: 'mira',
    characterRole: 'Local bar owner',
    act: 'The Word Invoice',
    message:
      'Bring me a few bottles. If they are good, we can talk about a small order. If they are weird, we can also talk, but it will be shorter.',
    phoneThread: [
      'Bring me a few bottles.',
      'If they are good, we can talk about a small order.',
      'If they are weird, we can also talk, but it will be shorter.'
    ],
    replyText: "I'll bring samples.",
    goal: 'Compare informal, private, and bar sales.',
    reward: 'Formal buyers, visibility, and the first paperwork warning.'
  },
  'household-summit': {
    id: 'household-summit',
    title: 'The Household Summit',
    character: 'The Household',
    characterId: 'household',
    act: 'Garage Treaty',
    message:
      'There are bottles in the laundry basket and something is bubbling next to the freezer. We need a garage treaty.',
    phoneThread: [
      'There are bottles in the laundry basket.',
      'Something is bubbling next to the freezer.',
      'We need a garage treaty before the house becomes part of production.'
    ],
    replyText: "I'll clean up the garage.",
    goal: 'Reduce garage pressure through cleanup, fewer deliveries, or safer sales.',
    reward: 'Household pressure and the reason the garage cannot scale forever.'
  },
  'sandbox-unlocked': {
    id: 'sandbox-unlocked',
    title: 'Garage No More?',
    character: 'Notebook',
    characterId: 'notebook',
    act: 'Sandbox',
    message:
      'The garage works. Not elegantly, not quietly, and not without witnesses. But it works.',
    phoneThread: [
      'The garage works.',
      'Not elegantly, not quietly, and not without witnesses.',
      'But it works. The next promises are yours to choose.'
    ],
    replyText: "Let's see what this becomes.",
    goal: 'Choose what kind of brewery this becomes next.',
    reward: 'All recipes, buyers, pressure systems, and upgrades are now part of the normal game.'
  }
};

const missionIndex = (missionId: CampaignMissionId): number => campaignMissionOrder.indexOf(missionId);

export const isCampaignComplete = (state: GameState): boolean => state.campaign.missionId === 'sandbox-unlocked';

export const isMissionSeen = (state: GameState, missionId = state.campaign.missionId): boolean =>
  state.campaign.seenMissionIds.includes(missionId);

export const campaignHasReached = (state: GameState, missionId: CampaignMissionId): boolean =>
  missionIndex(state.campaign.missionId) >= missionIndex(missionId) || state.campaign.completedMissionIds.includes(missionId);

export const campaignAllowsAdvancedRecipes = (state: GameState): boolean => campaignHasReached(state, 'first-bar-account');
export const campaignAllowsTemperature = (state: GameState): boolean => campaignHasReached(state, 'warm-garage-week');
export const campaignAllowsCleaning = (state: GameState): boolean => campaignHasReached(state, 'sticky-bucket');
export const campaignAllowsFormalBuyers = (state: GameState): boolean => campaignHasReached(state, 'first-bar-account');
export const campaignAllowsPressure = (state: GameState): boolean => campaignHasReached(state, 'household-summit');

export const campaignVisibleSalesChannels = (state: GameState): SalesChannelId[] => {
  if (campaignAllowsFormalBuyers(state)) return ['friends-family', 'private-event', 'local-bar'];
  if (campaignHasReached(state, 'uncle-nico-wedding')) return ['friends-family', 'private-event'];
  return ['friends-family'];
};

export const campaignHiddenSystems = (state: GameState): CampaignView['hiddenSystems'] => ({
  risk: !campaignAllowsCleaning(state),
  temperature: !campaignAllowsTemperature(state),
  compliance: !campaignAllowsFormalBuyers(state),
  household: !campaignAllowsPressure(state),
  formalBuyers: !campaignAllowsFormalBuyers(state),
  advancedRecipes: !campaignAllowsAdvancedRecipes(state),
  cleaning: !campaignAllowsCleaning(state)
});

const garageBlonde = () => getRecipe('garage-blonde');

const missingGarageBlondeSupplies = (state: GameState) => recipeMissingIngredients(state, garageBlonde());

const hasIncomingGarageBlondeSupplies = (state: GameState): boolean => {
  const missing = missingGarageBlondeSupplies(state);
  if (missing.length === 0) return false;
  return missing.every((item) => {
    const incoming = state.pendingOrders.reduce(
      (total, order) => total + order.items.filter((orderItem) => orderItem.ingredientId === item.ingredientId).reduce((sum, orderItem) => sum + orderItem.amount, 0),
      0
    );
    return incoming >= item.amount;
  });
};

const firstActiveBatch = (state: GameState) => state.batches[0];

const firstLoopNextStep = (state: GameState): CampaignView['nextStep'] => {
  const batch = state.batches.find((item) => item.recipeId === 'garage-blonde');
  if (state.demand.casesSold >= 4) return 'Order complete. Tap the story card to read the barbecue feedback.';
  if (state.inventory.cases > 0) return "Tap the pallet to deliver Samira's barbecue cases.";
  if (!batch) return 'Tap the stock pot to brew Garage Blonde.';
  if (batch.step === 'brewing') return 'Tap the stock pot to finish the brew day.';
  if (batch.step === 'awaiting-transfer') return 'Tap the stock pot to transfer Garage Blonde.';
  if (batch.step === 'fermenting') return 'Tap the fermenter to let fermentation finish.';
  if (batch.step === 'awaiting-packaging') return 'Tap the fermenter to move Garage Blonde to bottling.';
  if (batch.step === 'packaging' || batch.step === 'bottle-conditioning') return 'Tap the bottling bench to finish packaging.';
  return 'Tap the stock pot to brew Garage Blonde.';
};

const firstLoopTarget = (state: GameState): CampaignView['primaryTarget'] => {
  const batch = state.batches.find((item) => item.recipeId === 'garage-blonde');
  if (state.inventory.cases > 0) return 'cases';
  if (!batch || batch.step === 'brewing' || batch.step === 'awaiting-transfer') return 'kettle';
  if (batch.step === 'fermenting' || batch.step === 'awaiting-packaging') return 'fermenter';
  return 'bottler';
};

export const campaignNextStep = (state: GameState): string => campaignView(state).nextStep;

export const campaignPrimaryTarget = (state: GameState): CampaignView['primaryTarget'] => campaignView(state).primaryTarget;

export const campaignView = (state: GameState): CampaignView => {
  const mission = campaignMissions[state.campaign.missionId] ?? campaignMissions['barbecue-text'];
  const activeBatch = firstActiveBatch(state);
  let progress = 0;
  let progressLabel = '';
  let nextStep = '';
  let primaryTarget: CampaignView['primaryTarget'] = 'kettle';

  if (mission.id === 'barbecue-text') {
    progress = Math.min(100, Math.round((Math.min(state.demand.casesSold, 4) / 4) * 100));
    if (progress === 0 && activeBatch) progress = 30;
    if (state.inventory.cases > 0 && state.demand.casesSold < 4) progress = 70;
    progressLabel = `${Math.min(state.demand.casesSold, 4)}/4 barbecue cases delivered`;
    nextStep = firstLoopNextStep(state);
    primaryTarget = firstLoopTarget(state);
  } else if (mission.id === 'empty-shelf') {
    const missing = missingGarageBlondeSupplies(state);
    const incoming = hasIncomingGarageBlondeSupplies(state);
    const recipe = garageBlonde();
    progress = missing.length === 0 ? 70 : incoming ? 45 : 15;
    if (state.batches.some((batch) => batch.recipeId === 'garage-blonde')) progress = 100;
    progressLabel = missing.length === 0 ? 'Garage Blonde supplies ready' : `${missing.length} supply item${missing.length === 1 ? '' : 's'} missing`;
    nextStep = missing.length > 0 && !incoming
      ? `Garage Blonde needs ${recipeRequirementSummary(recipe)}. ${recipeMissingOrderSummary(state, recipe)} Tap the cart, choose Supplies, and order it.`
      : incoming
        ? `End the day until Rudy's delivery arrives. Next delivery: ${formatGameDate(Math.min(...state.pendingOrders.map((order) => order.arrivalDay)))}.`
        : 'Tap the stock pot to start the second Garage Blonde.';
    primaryTarget = missing.length > 0 && !incoming ? 'shop' : incoming ? 'ops' : 'kettle';
  } else if (mission.id === 'bucket-empire') {
    const fermenterCount = ownedByStation(state, 'fermenter').length;
    progress = fermenterCount > 1 ? 100 : state.cash >= 45 ? 65 : 30;
    progressLabel = `${fermenterCount}/2 fermenter slots`;
    nextStep = fermenterCount > 1 ? 'Second bucket installed. Tap the story card to take the next order.' : 'Tap the cart, choose Equipment, and add another plastic fermenter.';
    primaryTarget = 'shop';
  } else if (mission.id === 'uncle-nico-wedding') {
    const sold = Math.min(state.demand.casesSold, 10);
    progress = Math.round((sold / 10) * 100);
    progressLabel = `${sold}/10 wedding cases delivered`;
    nextStep = state.inventory.cases > 0 ? "Tap the pallet to fill Uncle Nico's wedding promise." : 'Use two fermenters to build the wedding order.';
    primaryTarget = state.inventory.cases > 0 ? 'cases' : 'kettle';
  } else if (mission.id === 'warm-garage-week') {
    progress = campaignAllowsTemperature(state) ? 50 : 0;
    progressLabel = `${state.fermenterTemperatureC} C garage fermentation`;
    nextStep = 'Use Cool or Warm on the fermenter, then let the batch finish and read the quality note.';
    primaryTarget = 'fermenter';
  } else if (mission.id === 'sticky-bucket') {
    progress = Math.min(100, Math.round((Math.max(...state.ownedEquipment.filter((item) => item.equipmentId === 'fermenter').map((item) => item.condition), 0) / 100) * 100));
    progressLabel = 'Clean one brewing station';
    nextStep = 'Tap an empty station and run Clean & sanitize.';
    primaryTarget = 'fermenter';
  } else if (mission.id === 'labels-at-midnight') {
    progress = state.salesToday > 0 || state.demand.casesSold > 0 ? 60 : 15;
    progressLabel = 'Private event presentation';
    nextStep = state.inventory.cases > 0 ? 'Tap the pallet and sell to the private event.' : 'Package a clean batch for the private event.';
    primaryTarget = state.inventory.cases > 0 ? 'cases' : 'bottler';
  } else if (mission.id === 'first-festival') {
    const sold = Math.min(state.demand.casesSold, 8);
    progress = Math.round((sold / 8) * 100);
    progressLabel = `${sold}/8 festival cases delivered`;
    nextStep = state.inventory.cases > 0 ? 'Tap the pallet and deliver the festival cases.' : 'Brew and package a solid event batch for the festival table.';
    primaryTarget = state.inventory.cases > 0 ? 'cases' : 'kettle';
  } else if (mission.id === 'first-bar-account') {
    progress = state.visibilityRisk > 0 ? 70 : 20;
    progressLabel = 'Bar account unlocked';
    nextStep = state.inventory.cases > 0 ? 'Tap the pallet and compare the local bar offer.' : 'Prepare beer before talking to Mira about the bar order.';
    primaryTarget = state.inventory.cases > 0 ? 'cases' : 'kettle';
  } else if (mission.id === 'household-summit') {
    progress = Math.max(10, 100 - Math.min(100, state.householdPressure * 8));
    progressLabel = `Household pressure ${state.householdPressure}`;
    nextStep = 'Reduce pressure with cleaning, fewer deliveries, or safer private sales.';
    primaryTarget = 'notebook';
  } else {
    progress = 100;
    progressLabel = 'Garage sandbox open';
    nextStep = 'Choose the next brewery promise.';
    primaryTarget = 'notebook';
  }

  return {
    ...mission,
    progress,
    progressLabel,
    nextStep,
    primaryTarget,
    cardVisible: !isMissionSeen(state),
    hiddenSystems: campaignHiddenSystems(state)
  };
};

export const markCampaignMissionSeen = (state: GameState, missionId = state.campaign.missionId): void => {
  if (!state.campaign.seenMissionIds.includes(missionId)) {
    state.campaign.seenMissionIds = [...state.campaign.seenMissionIds, missionId];
  }
};

export const completeCampaignMission = (state: GameState, missionId = state.campaign.missionId): void => {
  if (!state.campaign.completedMissionIds.includes(missionId)) {
    state.campaign.completedMissionIds = [...state.campaign.completedMissionIds, missionId];
  }
  const nextMission = campaignMissionOrder[missionIndex(missionId) + 1];
  if (nextMission) state.campaign.missionId = nextMission;
};

export const syncCampaignAfterAction = (state: GameState, actionType: string): string | null => {
  const missionId = state.campaign.missionId;
  if (missionId === 'barbecue-text' && state.demand.casesSold >= 4) {
    completeCampaignMission(state, missionId);
    return 'Samira says the barbecue beer disappeared. Rudy says your supply shelf looks emotionally empty.';
  }
  if (missionId === 'empty-shelf' && actionType === 'start-batch' && state.batches.some((batch) => batch.recipeId === 'garage-blonde')) {
    completeCampaignMission(state, missionId);
    return 'Second batch started. Rudy was right: brewing is mostly planning wearing a fun hat.';
  }
  if (missionId === 'bucket-empire' && ownedByStation(state, 'fermenter').length >= 2) {
    completeCampaignMission(state, missionId);
    state.demand = {
      accountName: "Uncle Nico's wedding",
      channelId: 'private-event',
      channelName: 'Private event',
      customerId: 'nico',
      casesRequested: 10,
      casesSold: 0,
      reputationReward: 3,
      invoiceRequired: false,
      formalOrder: false,
      deadlineDay: state.day + 16,
      minimumQualityBand: 'solid',
      packagingExpectation: 'presentable',
      promiseLocked: true
    };
    return 'Second bucket installed. Uncle Nico immediately made this your problem.';
  }
  if (missionId === 'uncle-nico-wedding' && state.demand.casesSold >= 10) {
    completeCampaignMission(state, missionId);
    return 'Wedding order filled. The garage has proven it can make promises, which is dangerous.';
  }
  if (missionId === 'warm-garage-week' && actionType === 'set-fermenter-temperature') {
    completeCampaignMission(state, missionId);
    return 'Temperature adjusted. The yeast appreciates being treated like a living thing instead of a timer.';
  }
  if (missionId === 'sticky-bucket' && actionType === 'clean-equipment') {
    completeCampaignMission(state, missionId);
    state.demand = {
      accountName: 'Private event',
      channelId: 'private-event',
      channelName: 'Private event',
      customerId: 'festival',
      casesRequested: 8,
      casesSold: 0,
      reputationReward: 2,
      invoiceRequired: false,
      formalOrder: false,
      deadlineDay: state.day + 10,
      minimumQualityBand: 'solid',
      packagingExpectation: 'presentable',
      promiseLocked: true
    };
    return 'The bucket is clean enough to stop having a personality. Samira found a private event that wants nicer bottles.';
  }
  if (missionId === 'labels-at-midnight' && actionType === 'sell-channel' && state.demand.casesSold >= 8) {
    completeCampaignMission(state, missionId);
    state.demand = {
      accountName: 'Summer beer table',
      channelId: 'private-event',
      channelName: 'Private event',
      customerId: 'festival',
      casesRequested: 8,
      casesSold: 0,
      reputationReward: 2,
      invoiceRequired: false,
      formalOrder: false,
      deadlineDay: state.day + 10,
      minimumQualityBand: 'solid',
      packagingExpectation: 'presentable',
      promiseLocked: true
    };
    return 'The private event called the bottles rustic. A summer festival table has one open spot.';
  }
  if (missionId === 'first-festival' && actionType === 'sell-channel' && state.demand.casesSold >= 8) {
    completeCampaignMission(state, missionId);
    state.demand = {
      accountName: 'Mira at the local bar',
      channelId: 'local-bar',
      channelName: 'Local bar',
      customerId: 'mira',
      casesRequested: 12,
      casesSold: 0,
      reputationReward: 3,
      invoiceRequired: false,
      formalOrder: true,
      deadlineDay: state.day + 14,
      minimumQualityBand: 'solid',
      packagingExpectation: 'clean-label',
      promiseLocked: true
    };
    return 'The festival table made people talk. Mira at the bar wants a sample and said the word invoice.';
  }
  if (missionId === 'first-bar-account' && actionType === 'sell-channel' && state.demand.casesSold > 0) {
    completeCampaignMission(state, missionId);
    return 'Mira took the beer. The household noticed the garage is now a pickup location with buckets.';
  }
  if (missionId === 'household-summit' && (actionType === 'crisis-action' || actionType === 'clean-equipment')) {
    completeCampaignMission(state, missionId);
    return 'Garage treaty signed. Normal sandbox unlocked: more recipes, bigger buyers, and better problems.';
  }
  return null;
};
