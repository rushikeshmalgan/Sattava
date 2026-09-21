/**
 * Tests for services/scanService.ts: the cache-key fix, the explicit failed
 * state, and the guard that keeps fabricated nutrition out of the log.
 */

import { digestStringAsync } from 'expo-crypto';
import { AiApiError } from '../services/aiApiClient';
import { analyzeFoodImage } from '../services/aiService';
import { getCachedImageResult, setCachedImageResult } from '../services/scanCache';
import {
  describeScanFailure,
  isLoggableScanResolution,
  resolveImageScan,
  type ScanResolution,
} from '../services/scanService';

// Keeps the real Firebase SDK (ESM) out of this suite; scanService reaches it through the API client.
jest.mock('../firebaseConfig', () => ({ auth: { currentUser: null } }));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  // Deterministic stand-in that depends on the FULL input, like a real hash.
  digestStringAsync: jest.fn(async (_alg: string, input: string) => `hash(${input.length}:${input.slice(0, 8)}:${input.slice(-8)})`),
}));
jest.mock('../services/scanCache', () => ({
  getCachedBarcodeResult: jest.fn(),
  getCachedImageResult: jest.fn(),
  setCachedBarcodeResult: jest.fn(),
  setCachedImageResult: jest.fn(),
}));
jest.mock('../services/aiService', () => ({ analyzeFoodImage: jest.fn() }));
jest.mock('../services/openFoodFactsService', () => ({
  lookupBarcodeFood: jest.fn(), searchFoodsByText: jest.fn(), toFoodData: jest.fn(),
}));


const mAnalyze = analyzeFoodImage as jest.Mock;
const mGetCached = getCachedImageResult as jest.Mock;
const mSetCached = setCachedImageResult as jest.Mock;
const mDigest = digestStringAsync as jest.Mock;

const nutrition = { calories: 320, carbs: 30, protein: 12, fat: 16, servingSize: '1 bowl' };
const analysis = (over: Record<string, unknown> = {}, itemOver: Record<string, unknown> = {}) => ({
  itemName: 'Dal Makhani',
  searchHint: 'dal makhani',
  portionCategory: '1 bowl',
  confidence: 0.9,
  isPackaged: false,
  estimatedNutrition: nutrition,
  items: [{ itemName: 'Dal Makhani', portionCategory: '1 bowl', confidence: 0.9, estimatedNutrition: nutrition, ...itemOver }],
  modelUsed: 'example-model',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mGetCached.mockResolvedValue(null);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('resolveImageScan: cache key', () => {
  it('hashes the FULL image, not just the first 10 KB', async () => {
    mAnalyze.mockResolvedValue(analysis());
    const image = 'A'.repeat(50_000);
    await resolveImageScan({ imageBase64: image });
    expect(mDigest).toHaveBeenCalledWith('SHA-256', image);
  });

  it('REGRESSION: two photos with an identical first 10 KB get different cache keys', async () => {
    mAnalyze.mockResolvedValue(analysis());
    const head = 'A'.repeat(12_000);
    await resolveImageScan({ imageBase64: head + 'tail-one' });
    await resolveImageScan({ imageBase64: head + 'tail-two' });
    const keys = mSetCached.mock.calls.map((c) => c[0]);
    expect(new Set(keys).size).toBe(2);
  });

  it('serves a valid cached result without calling the backend', async () => {
    const first = await (async () => {
      mAnalyze.mockResolvedValue(analysis());
      return resolveImageScan({ imageBase64: 'IMG' });
    })();
    mAnalyze.mockClear();
    mGetCached.mockResolvedValue(first);
    const again = await resolveImageScan({ imageBase64: 'IMG' });
    expect(again.label).toBe('Dal Makhani');
    expect(mAnalyze).not.toHaveBeenCalled();
  });

  it('ignores a cached entry that is not loggable and re-analyzes', async () => {
    mGetCached.mockResolvedValue({
      id: 'x', source: 'gemini', label: 'Unknown food', confidence: 0.5, foodData: { id: 'x', name: 'Unknown food', calories: 250, carbs: 25, protein: 8, fat: 10, servingSize: '1 serving' },
      detectedItems: [{ id: 'x', label: 'Unknown food', foodData: { id: 'x', name: 'Unknown food', calories: 250, carbs: 25, protein: 8, fat: 10, servingSize: '1 serving' } }],
    });
    mAnalyze.mockResolvedValue(analysis());
    const out = await resolveImageScan({ imageBase64: 'IMG' });
    expect(mAnalyze).toHaveBeenCalledTimes(1);
    expect(out.label).toBe('Dal Makhani');
  });

  it('caches a successful result', async () => {
    mAnalyze.mockResolvedValue(analysis());
    await resolveImageScan({ imageBase64: 'IMG' });
    expect(mSetCached).toHaveBeenCalledTimes(1);
  });
});

describe('resolveImageScan: failures are explicit, never fabricated', () => {
  it.each(['AI_UNAVAILABLE', 'AI_INVALID_OUTPUT', 'RATE_LIMITED', 'NETWORK', 'TIMEOUT'] as const)(
    'propagates %s and caches nothing',
    async (code) => {
      mAnalyze.mockRejectedValue(new AiApiError(code));
      await expect(resolveImageScan({ imageBase64: 'IMG' })).rejects.toMatchObject({ code });
      expect(mSetCached).not.toHaveBeenCalled();
    },
  );

  it('REGRESSION: an "Unknown food" analysis is rejected, not returned or cached', async () => {
    mAnalyze.mockResolvedValue(analysis({ itemName: 'Unknown food' }, { itemName: 'Unknown food' }));
    await expect(resolveImageScan({ imageBase64: 'IMG' })).rejects.toMatchObject({ code: 'AI_INVALID_OUTPUT' });
    expect(mSetCached).not.toHaveBeenCalled();
  });

  it('rejects an analysis whose calories exceed the loggable ceiling', async () => {
    mAnalyze.mockResolvedValue(analysis({}, { estimatedNutrition: { ...nutrition, calories: 9999 } }));
    await expect(resolveImageScan({ imageBase64: 'IMG' })).rejects.toMatchObject({ code: 'AI_INVALID_OUTPUT' });
    expect(mSetCached).not.toHaveBeenCalled();
  });

  it('rejects an analysis with negative macros', async () => {
    mAnalyze.mockResolvedValue(analysis({}, { estimatedNutrition: { ...nutrition, protein: -1 } }));
    await expect(resolveImageScan({ imageBase64: 'IMG' })).rejects.toMatchObject({ code: 'AI_INVALID_OUTPUT' });
  });
});

describe('isLoggableScanResolution (guard in front of Firestore)', () => {
  const item = (over: Record<string, unknown> = {}) => ({
    id: 'i', label: 'Roti', detectedQuantity: 1, confidence: 0.9, basePortionCategory: 'medium', portionCategory: 'medium', portionOptions: ['medium'],
    foodData: { id: 'i', name: 'Roti', calories: 100, carbs: 18, protein: 3, fat: 2, servingSize: '1 piece' },
    ...over,
  });
  const scan = (over: Record<string, unknown> = {}): ScanResolution =>
    ({ id: 's', source: 'gemini', label: 'Roti', detectedQuantity: 1, confidence: 0.9, basePortionCategory: 'medium', portionCategory: 'medium', portionOptions: ['medium'], foodData: item().foodData, detectedItems: [item()], ...over }) as unknown as ScanResolution;

  it('accepts a real AI scan', () => expect(isLoggableScanResolution(scan())).toBe(true));

  it.each(['Unknown food', 'unknown', '  Unknown item'])('rejects an item labelled %p', (label) => {
    expect(isLoggableScanResolution(scan({ detectedItems: [item({ label })] }))).toBe(false);
  });

  it('does not reject a real food whose name merely contains "unknown"', () => {
    expect(isLoggableScanResolution(scan({ detectedItems: [item({ label: 'Not Unknown Dal' })] }))).toBe(true);
  });

  it('rejects when ANY item is bad, even if others are fine', () => {
    expect(isLoggableScanResolution(scan({ detectedItems: [item(), item({ label: 'Unknown food' })] }))).toBe(false);
  });

  it('rejects an AI scan with no detected items', () => {
    expect(isLoggableScanResolution(scan({ detectedItems: [] }))).toBe(false);
    expect(isLoggableScanResolution(scan({ detectedItems: undefined }))).toBe(false);
  });

  it.each([
    ['NaN calories', { calories: NaN }],
    ['negative fat', { fat: -2 }],
    ['calories over 3000', { calories: 3001 }],
  ])('rejects %s', (_n, patch) => {
    const food = { id: 'i', name: 'Roti', calories: 100, carbs: 18, protein: 3, fat: 2, servingSize: '1 piece', ...patch };
    expect(isLoggableScanResolution(scan({ detectedItems: [item({ foodData: food })] }))).toBe(false);
  });

  it('leaves barcode and manual results (curated data) alone', () => {
    expect(isLoggableScanResolution(scan({ source: 'barcode', detectedItems: undefined }))).toBe(true);
    expect(isLoggableScanResolution(scan({ source: 'manual', detectedItems: undefined }))).toBe(true);
  });
});

describe('describeScanFailure', () => {
  it.each([
    ['RATE_LIMITED', /wait a minute/i],
    ['AI_INVALID_OUTPUT', /couldn't identify/i],
    ['IMAGE_TOO_LARGE', /too large/i],
    ['NETWORK', /connection/i],
    ['TIMEOUT', /connection/i],
    ['TOKEN_EXPIRED', /sign in/i],
    ['NOT_SIGNED_IN', /sign in/i],
    ['AI_UNAVAILABLE', /temporarily unavailable/i],
  ] as const)('%s gets actionable copy', (code, expected) => {
    expect(describeScanFailure(new AiApiError(code))).toMatch(expected);
  });

  it('gives generic copy for unknown errors and never leaks internals', () => {
    const msg = describeScanFailure(new Error('SECRET stack trace at googleapis'));
    expect(msg).toMatch(/temporarily unavailable/i);
    expect(msg).not.toMatch(/SECRET|googleapis|stack/);
  });
});
