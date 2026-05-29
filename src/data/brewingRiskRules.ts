import type { BrewdayApproach, PackagingMode, Recipe, TransferMode } from '../game/schema.js';

export type BrewerValidationStatus = 'candidate' | 'brewer-approved';

export interface ProcessRiskEffect {
  quality: number;
  risk: number;
  time: number;
  note: string;
  validationStatus: BrewerValidationStatus;
  validationQuestion: string;
}

export interface TransferRiskEffect {
  quality: number;
  risk: number;
  minutes: number;
  energy: number;
  note: string;
  validationStatus: BrewerValidationStatus;
  validationQuestion: string;
}

export interface PackagingRiskEffect {
  time: number;
  quality: number;
  oxygen: number;
  fill: number;
  presentation: number;
  note: string;
  validationStatus: BrewerValidationStatus;
  validationQuestion: string;
}

interface StyleRule<T> {
  id: string;
  matches: string[];
  effect: T;
}

const includesAny = (recipe: Recipe, matches: string[]): boolean => {
  const style = recipe.style.toLowerCase();
  const tags = recipe.riskTags.map((tag) => tag.toLowerCase());
  return matches.some((match) => style.includes(match) || tags.some((tag) => tag.includes(match)));
};

const candidate = <T extends object>(rule: T & { validationStatus?: BrewerValidationStatus }): T & { validationStatus: BrewerValidationStatus } => ({
  ...rule,
  validationStatus: rule.validationStatus ?? 'brewer-approved'
});

export const brewingRiskRuleSet = {
  validationStatus: 'brewer-approved' as BrewerValidationStatus,
  validationOwner: 'professional brewer',
  validationSource: 'docs/brewing-risk-validation.md',
  brewdayApproach: {
    careful: candidate({
      quality: 4,
      risk: -5,
      time: 1.16,
      note: 'Careful mash, boil and transfer protected clarity and lowered process risk.',
      validationQuestion: 'Is this careful-process bonus strong enough to feel worthwhile without making it mandatory?'
    }),
    standard: candidate({
      quality: 0,
      risk: 0,
      time: 1,
      note: 'Standard brew day kept the recipe on its expected path.',
      validationQuestion: 'Should standard brewday be truly neutral for all starter styles?'
    }),
    fastDefault: candidate({
      quality: -1,
      risk: 4,
      time: 0.84,
      note: 'Fast brew day saved time but left a little more process risk behind.',
      validationQuestion: 'Is this a fair default penalty for non-specialized fast brew days?'
    }),
    fastStyleRules: [
      {
        id: 'forgiving-fast-blonde-wheat-saison-kveik',
        matches: ['blonde', 'wheat', 'saison', 'kveik'],
        effect: candidate({
          quality: 0,
          risk: 2,
          time: 0.82,
          note: 'Fast brew day saved time without automatically hurting a forgiving style.',
          validationQuestion: 'Which starter styles should tolerate fast brewday choices without guaranteed faults?'
        })
      },
      {
        id: 'fast-kveik-upside',
        matches: ['kveik'],
        effect: candidate({
          quality: 1,
          risk: 2,
          time: 0.82,
          note: 'Fast brew day matched the hot, quick-turn kveik story.',
          validationQuestion: 'Should kveik get a small quality upside for quick-turn play, or only faster fermentation?'
        })
      },
      {
        id: 'short-pils-dms',
        matches: ['pils', 'dms'],
        effect: candidate({
          quality: -3,
          risk: 10,
          time: 0.82,
          note: 'Short, fast Pils brew raised DMS risk because pale lager has nowhere to hide it.',
          validationQuestion: 'How harsh should the simplified short-boil/DMS risk be for a garage Pils?'
        })
      },
      {
        id: 'fast-ipa-oxygen-aroma',
        matches: ['ipa', 'oxidation'],
        effect: candidate({
          quality: -2,
          risk: 6,
          time: 0.82,
          note: 'Fast IPA handling raised oxygen and aroma-collapse risk.',
          validationQuestion: 'Should IPA speed risk live mostly in transfer/packaging instead of brewday?'
        })
      },
      {
        id: 'hard-dark-grain-astringency',
        matches: ['stout', 'roast harshness', 'astringency'],
        effect: candidate({
          quality: -2,
          risk: 5,
          time: 0.84,
          note: 'Hard dark-grain handling raised roast astringency risk.',
          validationQuestion: 'What simplified dark-grain shortcut best teaches astringency without chemistry micromanagement?'
        })
      }
    ] satisfies StyleRule<ProcessRiskEffect>[]
  },
  transferMode: {
    careful: candidate({
      quality: 1,
      risk: -4,
      minutes: 24,
      energy: 9,
      note: 'Careful transfer took longer and kept splashing, oxygen and sanitation risk down.',
      validationQuestion: 'Is careful transfer too obviously correct, or does the time/energy cost matter enough?'
    }),
    roughDefault: candidate({
      quality: -2,
      risk: 6,
      minutes: 10,
      energy: 4,
      note: 'Rough transfer saved effort but raised splashing and sanitation risk.',
      validationQuestion: 'Is this the right generic consequence for rough transfers?'
    }),
    roughStyleRules: [
      {
        id: 'rough-ipa-hop-aroma',
        matches: ['ipa', 'oxidation'],
        effect: candidate({
          quality: -4,
          risk: 10,
          minutes: 10,
          energy: 4,
          note: 'Rough transfer saved effort but bruised hop aroma and raised oxygen risk.',
          validationQuestion: 'Is rough transfer an acceptable player-facing proxy for IPA oxygen/aroma damage?'
        })
      }
    ] satisfies StyleRule<TransferRiskEffect>[]
  },
  packagingMode: {
    careful: candidate({
      time: 1.18,
      quality: 3,
      oxygen: -5,
      fill: -4,
      presentation: 12,
      note: 'Careful packaging slowed the run and protected presentation, oxygen and caps.',
      validationQuestion: 'Are presentation, oxygen and cap checks the right wins for careful packaging?'
    }),
    standard: candidate({
      time: 1,
      quality: 0,
      oxygen: 0,
      fill: 0,
      presentation: 0,
      note: 'Standard packaging kept the run predictable.',
      validationQuestion: 'Should standard packaging be neutral or still carry small hand-bottling variance?'
    }),
    rush: candidate({
      time: 0.78,
      quality: -3,
      oxygen: 10,
      fill: 8,
      presentation: -14,
      note: 'Rushed packaging saved time but made oxygen, fill and cap checks easier to miss.',
      validationQuestion: 'Are oxygen, fill, cap and presentation the right first-order rushed-packaging risks?'
    })
  },
  verdictSignals: {
    forgivingFastStyles: ['blonde', 'wheat', 'saison', 'kveik'],
    dmsStyleMatches: ['pils', 'dms'],
    hopAromaStyleMatches: ['ipa', 'oxidation'],
    darkGrainMatches: ['stout', 'roast harshness', 'astringency'],
    earlyPackageUnknownPenalty: 8,
    earlyPackageNearlyStablePenalty: 3,
    packagingMissedCriticalPenalty: 12,
    packagingMissedCriticalStability: 24,
    youngConditioningPenalty: 4,
    roughCo2Penalty: 2,
    roughCo2Stability: 6
  }
};

export const brewdayRiskForRecipe = (recipe: Recipe, approach: BrewdayApproach): ProcessRiskEffect => {
  if (approach === 'careful') return brewingRiskRuleSet.brewdayApproach.careful;
  if (approach === 'standard') return brewingRiskRuleSet.brewdayApproach.standard;
  return brewingRiskRuleSet.brewdayApproach.fastStyleRules.find((rule) => includesAny(recipe, rule.matches))?.effect ?? brewingRiskRuleSet.brewdayApproach.fastDefault;
};

export const transferRiskForRecipe = (recipe: Recipe, mode: TransferMode): TransferRiskEffect => {
  if (mode === 'careful') return brewingRiskRuleSet.transferMode.careful;
  return brewingRiskRuleSet.transferMode.roughStyleRules.find((rule) => includesAny(recipe, rule.matches))?.effect ?? brewingRiskRuleSet.transferMode.roughDefault;
};

export const packagingRiskForMode = (mode: PackagingMode): PackagingRiskEffect => brewingRiskRuleSet.packagingMode[mode];

export const recipeMatchesBrewingRisk = (recipe: Recipe, matches: string[]): boolean => includesAny(recipe, matches);
