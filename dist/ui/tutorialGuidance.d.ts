import type { GameState } from '../game/schema.js';
import type { SceneTarget } from './types.js';
export declare const renderNextTapBadge: (nextTap: boolean, target: SceneTarget) => string;
export declare const renderTutorialLesson: (state: GameState, guidanceDismissed: boolean) => string;
export declare const renderPhoneEconomyCard: (state: GameState) => string;
