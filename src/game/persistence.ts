import { createInitialState } from './initialState.js';
import type { GameState } from './schema.js';

export const SAVE_VERSION = 1;
export const STORAGE_KEY = 'brewery-sim-save-v1';

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type SaveEnvelope = {
  version: typeof SAVE_VERSION;
  state: GameState;
};

const getBrowserStorage = (): BrowserStorage | null => {
  if (typeof globalThis.localStorage === 'undefined') return null;
  return globalThis.localStorage;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const hasNumber = (value: Record<string, unknown>, key: string): boolean => typeof value[key] === 'number' && Number.isFinite(value[key]);

const isSavedGameState = (value: unknown): value is GameState => {
  if (!isRecord(value)) return false;
  return (
    hasNumber(value, 'cash') &&
    hasNumber(value, 'reputation') &&
    hasNumber(value, 'day') &&
    hasNumber(value, 'dayElapsedSeconds') &&
    hasNumber(value, 'minute') &&
    isRecord(value.inventory) &&
    Array.isArray(value.batches) &&
    isRecord(value.equipment) &&
    isRecord(value.upgrades) &&
    isRecord(value.demand) &&
    typeof value.selectedEquipmentId === 'string' &&
    hasNumber(value, 'salesToday')
  );
};

const parseSavedGame = (rawSave: string): GameState | null => {
  const parsed = JSON.parse(rawSave) as unknown;
  if (!isRecord(parsed) || parsed.version !== SAVE_VERSION || !isSavedGameState(parsed.state)) return null;
  return parsed.state;
};

export const loadSavedGame = (storage: BrowserStorage | null = getBrowserStorage()): GameState => {
  if (!storage) return createInitialState();

  try {
    const rawSave = storage.getItem(STORAGE_KEY);
    if (!rawSave) return createInitialState();
    return parseSavedGame(rawSave) ?? createInitialState();
  } catch {
    return createInitialState();
  }
};

export const saveGameState = (state: GameState, storage: BrowserStorage | null = getBrowserStorage()): void => {
  if (!storage) return;

  try {
    const save: SaveEnvelope = { version: SAVE_VERSION, state };
    storage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Browser storage can be unavailable or full. The game should remain playable without persistence.
  }
};

export const resetSavedGame = (storage: BrowserStorage | null = getBrowserStorage()): void => {
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures so reset never breaks the local prototype.
  }
};
