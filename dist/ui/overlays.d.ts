import type { GameState } from '../game/schema.js';
import type { FocusOverlay, ShopSection } from './types.js';
type OverlayContext = {
    state: GameState;
    activeOverlay: FocusOverlay | null;
    selectedShopSection: ShopSection | null;
    batchRemainingLabel: (batch: GameState['batches'][number]) => string;
    stepLabel: (step: string) => string;
};
export declare const renderFocusOverlay: (context: OverlayContext) => string;
export {};
