/**
 * Tests for services/aiService.ts (the client-side AI facade).
 * The API client is mocked; nothing here can reach a network.
 */

import fixture from '../__fixtures__/vision-response.json';
import { AiApiError, requestCoachText, requestFoodAnalysis, requestProfilePlan } from '../services/aiApiClient';
import {
  analyzeFoodImage,
  generateCoachText,
  generateProfilePlan,
  getDailyHealthTip,
  getDietScoreInsight,
} from '../services/aiService';

jest.mock('../firebaseConfig', () => ({ auth: { currentUser: null } }));
jest.mock('../services/aiApiClient', () => {
  const actual = jest.requireActual('../services/aiApiClient');
  return {
    ...actual,
    requestFoodAnalysis: jest.fn(),
    requestCoachText: jest.fn(),
    requestProfilePlan: jest.fn(),
  };
});


const mFood = requestFoodAnalysis as jest.Mock;
const mText = requestCoachText as jest.Mock;
const mPlan = requestProfilePlan as jest.Mock;

beforeEach(() => {
  mFood.mockReset();
  mText.mockReset();
  mPlan.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('analyzeFoodImage', () => {
  it('returns the validated analysis and records which model served it', async () => {
    mFood.mockResolvedValue(fixture);
    const out = await analyzeFoodImage({ imageBase64: 'IMG' });
    expect(out.itemName).toBe('Dal Makhani');
    expect(out.modelUsed).toBe('gemini-3.6-flash');
    expect(out.items).toHaveLength(2);
    expect(mFood).toHaveBeenCalledWith('IMG', 'image/jpeg');
  });

  it('passes an explicit mime type through', async () => {
    mFood.mockResolvedValue(fixture);
    await analyzeFoodImage({ imageBase64: 'IMG', mimeType: 'image/png' });
    expect(mFood).toHaveBeenCalledWith('IMG', 'image/png');
  });

  it.each(['AI_UNAVAILABLE', 'AI_INVALID_OUTPUT', 'RATE_LIMITED', 'NETWORK', 'TIMEOUT', 'INVALID_RESPONSE'] as const)(
    'REJECTS on %s instead of fabricating an "Unknown food" result',
    async (code) => {
      mFood.mockRejectedValue(new AiApiError(code));
      await expect(analyzeFoodImage({ imageBase64: 'IMG' })).rejects.toMatchObject({ code });
    },
  );
});

describe('getDailyHealthTip', () => {
  it('returns the server tip and caches it for repeat calls', async () => {
    mText.mockResolvedValue('Walk after dinner.');
    const stats = { calories: 1111, water: 900, steps: 4321 };
    expect(await getDailyHealthTip(stats)).toBe('Walk after dinner.');
    expect(await getDailyHealthTip(stats)).toBe('Walk after dinner.');
    expect(mText).toHaveBeenCalledTimes(1);
    expect(mText).toHaveBeenCalledWith('daily_tip', stats);
  });

  it('falls back to local copy and never throws when the backend fails', async () => {
    mText.mockRejectedValue(new AiApiError('AI_UNAVAILABLE'));
    const tip = await getDailyHealthTip({ calories: 5, water: 5, steps: 5 });
    expect(typeof tip).toBe('string');
    expect(tip.length).toBeGreaterThan(10);
  });

  it('does not cache the local fallback (the next call retries the backend)', async () => {
    const stats = { calories: 777, water: 1, steps: 2 };
    mText.mockRejectedValueOnce(new AiApiError('NETWORK')).mockResolvedValueOnce('Real tip.');
    await getDailyHealthTip(stats);
    expect(await getDailyHealthTip(stats)).toBe('Real tip.');
  });

  it('sanitises non-finite and negative numbers so a UI quirk cannot disable the feature', async () => {
    mText.mockResolvedValue('ok tip here');
    await getDailyHealthTip({ calories: NaN, water: -3, steps: 25.26 });
    expect(mText).toHaveBeenCalledWith('daily_tip', { calories: 0, water: 0, steps: 25.3 });
  });
});

describe('getDietScoreInsight', () => {
  const targets = { calories: 2000, protein: 60, carbs: 250, fat: 70 };

  it('returns the server insight', async () => {
    mText.mockResolvedValue('Balanced day.\nMore dal.\nKeep going!');
    expect(await getDietScoreInsight({ calories: 1500, protein: 40, carbs: 200, fat: 50 }, targets)).toContain('Balanced day');
  });

  it('REGRESSION: negative inputs (CaloriesCard passes 60 - protein) are clamped, not rejected by the server', async () => {
    mText.mockResolvedValue('Fine insight text.');
    await getDietScoreInsight({ calories: 1500, protein: -20, carbs: 200, fat: -5 }, targets);
    expect(mText.mock.calls[0][1].consumed).toMatchObject({ protein: 0, fat: 0 });
  });

  it('falls back to local copy on failure', async () => {
    mText.mockRejectedValue(new AiApiError('RATE_LIMITED'));
    const text = await getDietScoreInsight({ calories: 1, protein: 1, carbs: 1, fat: 1 }, targets);
    expect(text.length).toBeGreaterThan(10);
  });
});

describe('generateCoachText / generateProfilePlan', () => {
  it('returns the text on success', async () => {
    mText.mockResolvedValue('Weekly summary.');
    expect(await generateCoachText('weekly_report', { daysLogged: 3, avgCals: 1800, highestProteinGrams: 70, highestProteinDay: null })).toBe('Weekly summary.');
  });

  it('returns null on any failure so callers keep their own fallback copy', async () => {
    mText.mockRejectedValue(new AiApiError('AI_INVALID_OUTPUT'));
    expect(await generateCoachText('voice_coach', { transcript: 'x' })).toBeNull();
  });

  it('generateProfilePlan returns null on failure so onboarding uses its default plan', async () => {
    mPlan.mockRejectedValue(new AiApiError('TIMEOUT'));
    expect(
      await generateProfilePlan({
        gender: 'Male', goal: 'Lose Weight', activityLevel: '3-4 Days / Week',
        birthdate: { day: '1', month: '1', year: '2000' }, heightFeet: '5', heightInches: '9', weightKg: '70',
      }),
    ).toBeNull();
  });
});
