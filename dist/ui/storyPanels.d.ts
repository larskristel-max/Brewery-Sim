import type { GameState } from '../game/schema.js';
export declare const renderFirstLoopObjective: (state: GameState, guidanceDismissed: boolean) => string;
export declare const renderStoryMissionCard: (state: GameState) => string;
export declare const renderStoryIntroCard: (state: GameState) => string;
export declare const renderMissionsControl: (state: GameState, missionsOpen: boolean) => string;
export declare const renderNotificationControl: (state: GameState, notificationsOpen: boolean) => string;
