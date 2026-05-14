import type { GameState } from './schema.js';
export declare const SAVE_VERSION = 1;
export declare const STORAGE_KEY = "brewery-sim-save-v1";
type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export declare const loadSavedGame: (storage?: BrowserStorage | null) => GameState;
export declare const saveGameState: (state: GameState, storage?: BrowserStorage | null) => void;
export declare const resetSavedGame: (storage?: BrowserStorage | null) => void;
export {};
