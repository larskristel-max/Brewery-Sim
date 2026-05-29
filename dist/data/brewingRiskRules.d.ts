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
export declare const brewingRiskRuleSet: {
    validationStatus: BrewerValidationStatus;
    validationOwner: string;
    validationSource: string;
    brewdayApproach: {
        careful: {
            quality: number;
            risk: number;
            time: number;
            note: string;
            validationQuestion: string;
        } & {
            validationStatus: BrewerValidationStatus;
        };
        standard: {
            quality: number;
            risk: number;
            time: number;
            note: string;
            validationQuestion: string;
        } & {
            validationStatus: BrewerValidationStatus;
        };
        fastDefault: {
            quality: number;
            risk: number;
            time: number;
            note: string;
            validationQuestion: string;
        } & {
            validationStatus: BrewerValidationStatus;
        };
        fastStyleRules: {
            id: string;
            matches: string[];
            effect: {
                quality: number;
                risk: number;
                time: number;
                note: string;
                validationQuestion: string;
            } & {
                validationStatus: BrewerValidationStatus;
            };
        }[];
    };
    transferMode: {
        careful: {
            quality: number;
            risk: number;
            minutes: number;
            energy: number;
            note: string;
            validationQuestion: string;
        } & {
            validationStatus: BrewerValidationStatus;
        };
        roughDefault: {
            quality: number;
            risk: number;
            minutes: number;
            energy: number;
            note: string;
            validationQuestion: string;
        } & {
            validationStatus: BrewerValidationStatus;
        };
        roughStyleRules: {
            id: string;
            matches: string[];
            effect: {
                quality: number;
                risk: number;
                minutes: number;
                energy: number;
                note: string;
                validationQuestion: string;
            } & {
                validationStatus: BrewerValidationStatus;
            };
        }[];
    };
    packagingMode: {
        careful: {
            time: number;
            quality: number;
            oxygen: number;
            fill: number;
            presentation: number;
            note: string;
            validationQuestion: string;
        } & {
            validationStatus: BrewerValidationStatus;
        };
        standard: {
            time: number;
            quality: number;
            oxygen: number;
            fill: number;
            presentation: number;
            note: string;
            validationQuestion: string;
        } & {
            validationStatus: BrewerValidationStatus;
        };
        rush: {
            time: number;
            quality: number;
            oxygen: number;
            fill: number;
            presentation: number;
            note: string;
            validationQuestion: string;
        } & {
            validationStatus: BrewerValidationStatus;
        };
    };
    verdictSignals: {
        forgivingFastStyles: string[];
        dmsStyleMatches: string[];
        hopAromaStyleMatches: string[];
        darkGrainMatches: string[];
        earlyPackageUnknownPenalty: number;
        earlyPackageNearlyStablePenalty: number;
        packagingMissedCriticalPenalty: number;
        packagingMissedCriticalStability: number;
        youngConditioningPenalty: number;
        roughCo2Penalty: number;
        roughCo2Stability: number;
    };
};
export declare const brewdayRiskForRecipe: (recipe: Recipe, approach: BrewdayApproach) => ProcessRiskEffect;
export declare const transferRiskForRecipe: (recipe: Recipe, mode: TransferMode) => TransferRiskEffect;
export declare const packagingRiskForMode: (mode: PackagingMode) => PackagingRiskEffect;
export declare const recipeMatchesBrewingRisk: (recipe: Recipe, matches: string[]) => boolean;
