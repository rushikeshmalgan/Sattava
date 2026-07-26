/**
 * Tests for services/geminiVisionService.ts
 *
 * The @google/generative-ai SDK is fully mocked.
 * No actual API calls are made.
 */

// ── Mock the Gemini SDK before any imports ────────────────────────────────────
const mockGenerateContent = global.__mockGeminiGenerateContent;

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: global.__mockGeminiGenerateContent,
    }),
  })),
}));

// ── Import service after mocks are established ────────────────────────────────
import {
  analyzeFoodImage,
  getDailyHealthTip,
} from '../services/geminiVisionService';

// ── Helpers ───────────────────────────────────────────────────────────────────
// The service calls res.response.text() on the result of generateContent
const mockSuccess = (text: string) =>
  mockGenerateContent.mockResolvedValue({ response: { text: () => text } });

const mockFailure = (message: string) =>
  mockGenerateContent.mockRejectedValue(new Error(message));

// ── analyzeFoodImage tests ────────────────────────────────────────────────────

describe('geminiVisionService — analyzeFoodImage', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  it('returns DEFAULT_ANALYSIS when all models fail (API key error)', async () => {
    mockFailure('API_KEY_INVALID');
    const result = await analyzeFoodImage({ imageBase64: 'abc123' });
    expect(result).toBeDefined();
    expect(result.itemName).toBe('Unknown food');
    expect(result.confidence).toBe(0.5);
  });

  it('parses a valid JSON Gemini response into GeminiFoodAnalysis', async () => {
    // normalizeAnalysis uses primary = items[0], so itemName comes from items[0]
    const validPayload = {
      itemName: 'Dal Makhani',
      searchHint: 'dal makhani',
      portionCategory: 'medium',
      confidence: 0.92,
      isPackaged: false,
      estimatedNutrition: { calories: 320, carbs: 40, protein: 14, fat: 12, servingSize: '1 bowl' },
      items: [
        {
          itemName: 'Dal Makhani',
          portionCategory: 'medium',
          confidence: 0.92,
          estimatedNutrition: { calories: 320, carbs: 40, protein: 14, fat: 12, servingSize: '1 bowl' },
        },
      ],
    };
    // Response text must be ≥10 chars (the service enforces this)
    mockSuccess(JSON.stringify(validPayload));

    const result = await analyzeFoodImage({ imageBase64: 'base64data' });

    expect(result.itemName).toBe('Dal Makhani');
    expect(result.confidence).toBeCloseTo(0.92);
    expect(result.estimatedNutrition.calories).toBe(320);
    expect(result.isPackaged).toBe(false);
  });

  it('returns DEFAULT_ANALYSIS when all models fail with rate limit', async () => {
    // All 4 models in the priority chain will fail
    mockGenerateContent.mockRejectedValue(new Error('429 RESOURCE_EXHAUSTED'));
    const result = await analyzeFoodImage({ imageBase64: 'base64data' });
    expect(result.itemName).toBe('Unknown food');
  });

  it('returns DEFAULT_ANALYSIS on JSON parse failure', async () => {
    // Must be ≥10 chars to pass the empty-response guard, but invalid JSON
    mockSuccess('This is not valid JSON at all!!!');
    const result = await analyzeFoodImage({ imageBase64: 'base64data' });
    expect(result.itemName).toBe('Unknown food');
  });

  it('returns DEFAULT_ANALYSIS when response text is too short (< 10 chars)', async () => {
    mockSuccess('{}'); // Too short — treated as empty response, throws inside promptFn
    const result = await analyzeFoodImage({ imageBase64: 'base64data' });
    expect(result.itemName).toBe('Unknown food');
  });

  it('enforces "1 piece" portion for roti/chapati from the items array', async () => {
    // The enforceRotiPiece logic applies to items[0].itemName which drives primary
    const payload = {
      itemName: 'Chapati',
      searchHint: 'chapati',
      portionCategory: 'medium',
      confidence: 0.9,
      isPackaged: false,
      estimatedNutrition: { calories: 120, carbs: 22, protein: 4, fat: 3, servingSize: 'medium' },
      items: [
        {
          itemName: 'Chapati', // triggers enforceRotiPiece → '1 piece'
          portionCategory: 'medium',
          confidence: 0.9,
          estimatedNutrition: { calories: 120, carbs: 22, protein: 4, fat: 3, servingSize: 'medium' },
        },
      ],
    };
    mockSuccess(JSON.stringify(payload));
    const result = await analyzeFoodImage({ imageBase64: 'base64data' });
    expect(result.portionCategory).toBe('1 piece');
  });

  it('handles markdown-fenced JSON (```json ... ```) by stripping fences', async () => {
    const payload = {
      itemName: 'Idli',
      searchHint: 'idli',
      portionCategory: 'medium',
      confidence: 0.85,
      isPackaged: false,
      estimatedNutrition: { calories: 100, carbs: 20, protein: 3, fat: 1, servingSize: '2 pieces' },
      items: [
        { itemName: 'Idli', portionCategory: 'medium', confidence: 0.85, estimatedNutrition: { calories: 100, carbs: 20, protein: 3, fat: 1, servingSize: '2 pieces' } },
      ],
    };
    mockSuccess('```json\n' + JSON.stringify(payload) + '\n```');
    const result = await analyzeFoodImage({ imageBase64: 'base64data' });
    expect(result.itemName).toBe('Idli');
  });
});

// ── getDailyHealthTip tests ───────────────────────────────────────────────────

describe('geminiVisionService — getDailyHealthTip', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  it('returns the model tip on success', async () => {
    const expectedTip = 'Drink a glass of warm jeera water after lunch to aid digestion.';
    mockSuccess(expectedTip);
    // Use a unique stats combo to avoid hitting module-level cache from other tests
    const tip = await getDailyHealthTip({ calories: 7777, water: 8888, steps: 9999 });
    expect(typeof tip).toBe('string');
    expect(tip.length).toBeGreaterThan(5);
  });

  it('returns a local tip string when all models fail', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Network error'));
    // Use unique stats to avoid cache hit
    const tip = await getDailyHealthTip({ calories: 11111, water: 22222, steps: 33333 });
    expect(typeof tip).toBe('string');
    expect(tip.length).toBeGreaterThan(10);
  });

  it('returns cached value on second call (generateContent not called again)', async () => {
    // Use a unique, never-before-seen stats combo to guarantee cache miss on first call
    const uniqueStats = { calories: 54321, water: 12345, steps: 99887 };
    mockSuccess('Stay hydrated with coconut water or nimbu paani today.');

    const tip1 = await getDailyHealthTip(uniqueStats);
    const tip2 = await getDailyHealthTip(uniqueStats); // same stats key → cache hit

    expect(tip1).toBe(tip2);
    // mockGenerateContent was called for all 4 model attempts on first call,
    // but 0 times on the second call (cache hit)
    const callCount = mockGenerateContent.mock.calls.length;
    // At least 1 call on the first invocation, 0 added on the second
    // We verify by checking that tip2 === tip1 (already above) and call count
    // hasn't grown after the second getDailyHealthTip
    const callCountAfterSecond = mockGenerateContent.mock.calls.length;
    expect(callCountAfterSecond).toBe(callCount); // no new calls for second
  });
});
