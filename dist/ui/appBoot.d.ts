import type { GameState } from '../game/schema.js';
import type { GarageEquipmentLayoutTier } from '../data/garageLayout.js';
export type BootConfig = {
    hadBrowserSave: boolean;
    layoutDebugEnabled: boolean;
    tier2PreviewEnabled: boolean;
    activeGarageLayoutTier: GarageEquipmentLayoutTier;
};
export type BootState = {
    config: BootConfig;
    state: GameState;
    saveStatus: string;
};
export declare const hasBrowserSave: () => boolean;
export declare const readBootConfig: () => BootConfig;
export declare const createTier2PreviewState: () => GameState;
export declare const createBootState: () => BootState;
