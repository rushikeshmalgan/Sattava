/**
 * Tests for services/aiApiClient.ts + services/aiContract.ts
 * The network and Firebase Auth are fully mocked.
 */

import { auth } from '../firebaseConfig';
import fixture from '../__fixtures__/vision-response.json';
import {
  AiApiError,
  MAX_UPLOAD_BASE64_CHARS,
  requestCoachText,
  requestFoodAnalysis,
  requestProfilePlan,
} from '../services/aiApiClient';
import { isCoachPlanResponse, isVisionApiResponse } from '../services/aiContract';
import type { VisionApiResponse } from '../types/ai';

jest.mock('../firebaseConfig', () => ({ auth: { currentUser: null } }));


const BASE = 'http://localhost:3000'; // from jest.setup.js

const mockUser = (getIdToken: jest.Mock = jest.fn().mockResolvedValue('token-1')) => {
  (auth as unknown as { currentUser: unknown }).currentUser = { getIdToken };
  return getIdToken;
};

const res = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: async () => {
      if (body === undefined) throw new Error('not json');
      return body;
    },
  }) as unknown as Response;

const envelope = (code: string, requestId = 'req-1') => ({ error: { code, message: 'x', requestId } });

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  (auth as unknown as { currentUser: unknown }).currentUser = null;
});

const catchErr = async (p: Promise<unknown>): Promise<AiApiError> => {
  try {
    await p;
  } catch (e) {
    return e as AiApiError;
  }
  throw new Error('expected rejection');
};

describe('contract fixture (shared with the backend)', () => {
  it('is accepted by the client guard and matches the public types', () => {
    expect(isVisionApiResponse(fixture)).toBe(true);
    const typed: VisionApiResponse = fixture as VisionApiResponse;
    expect(typed.analysis.items.length).toBeGreaterThan(0);
  });
});

describe('requestFoodAnalysis', () => {
  it('POSTs { image, mimeType } to the API with the Firebase ID token as a Bearer header', async () => {
    const getIdToken = mockUser();
    fetchMock.mockResolvedValue(res(200, fixture));

    const out = await requestFoodAnalysis('BASE64DATA', 'image/jpeg');

    expect(out.analysis.itemName).toBe('Dal Makhani');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/v1/vision/analyze-food`);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer token-1');
    expect(getIdToken).toHaveBeenCalledWith(false);
  });

  it('never sends an identity in the body (the server derives it from the token)', async () => {
    mockUser();
    fetchMock.mockResolvedValue(res(200, fixture));
    await requestFoodAnalysis('BASE64DATA', 'image/jpeg');
    expect(Object.keys(JSON.parse(fetchMock.mock.calls[0][1].body)).sort()).toEqual(['image', 'mimeType']);
  });

  it('fails with NOT_SIGNED_IN without touching the network', async () => {
    const err = await catchErr(requestFoodAnalysis('x', 'image/jpeg'));
    expect(err.code).toBe('NOT_SIGNED_IN');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes the ID token and retries exactly once on TOKEN_EXPIRED', async () => {
    const getIdToken = jest.fn().mockResolvedValueOnce('stale').mockResolvedValueOnce('fresh');
    mockUser(getIdToken);
    fetchMock.mockResolvedValueOnce(res(401, envelope('TOKEN_EXPIRED'))).mockResolvedValueOnce(res(200, fixture));

    const out = await requestFoodAnalysis('x', 'image/jpeg');

    expect(out.meta.model).toBe('gemini-3.6-flash');
    expect(getIdToken.mock.calls).toEqual([[false], [true]]);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer stale');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh');
  });

  it('does not loop if the refreshed token is also rejected', async () => {
    mockUser();
    fetchMock.mockResolvedValue(res(401, envelope('TOKEN_EXPIRED')));
    const err = await catchErr(requestFoodAnalysis('x', 'image/jpeg'));
    expect(err.code).toBe('TOKEN_EXPIRED');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry other errors, and surfaces code, status, requestId, Retry-After', async () => {
    mockUser();
    fetchMock.mockResolvedValue(res(429, envelope('RATE_LIMITED', 'req-9'), { 'retry-after': '42' }));
    const err = await catchErr(requestFoodAnalysis('x', 'image/jpeg'));
    expect(err).toBeInstanceOf(AiApiError);
    expect(err).toMatchObject({ code: 'RATE_LIMITED', status: 429, requestId: 'req-9', retryAfter: 42 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['AI_UNAVAILABLE', 'AI_INVALID_OUTPUT', 'INVALID_IMAGE', 'PAYLOAD_TOO_LARGE', 'INTERNAL_ERROR'])('maps server code %s', async (code) => {
    mockUser();
    fetchMock.mockResolvedValue(res(503, envelope(code)));
    expect((await catchErr(requestFoodAnalysis('x', 'image/jpeg'))).code).toBe(code);
  });

  it('treats a non-envelope gateway error (e.g. a cold-start HTML page) as AI_UNAVAILABLE', async () => {
    mockUser();
    fetchMock.mockResolvedValue(res(502, undefined));
    expect((await catchErr(requestFoodAnalysis('x', 'image/jpeg'))).code).toBe('AI_UNAVAILABLE');
  });

  it('maps a connection failure to NETWORK', async () => {
    mockUser();
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    expect((await catchErr(requestFoodAnalysis('x', 'image/jpeg'))).code).toBe('NETWORK');
  });

  it('aborts and reports TIMEOUT when the server does not answer', async () => {
    jest.useFakeTimers();
    try {
      mockUser();
      fetchMock.mockImplementation(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
          }),
      );
      const pending = catchErr(requestFoodAnalysis('x', 'image/jpeg'));
      await jest.advanceTimersByTimeAsync(45_000);
      expect((await pending).code).toBe('TIMEOUT');
    } finally {
      jest.useRealTimers();
    }
  });

  it.each([
    ['not JSON', undefined],
    ['missing analysis', { meta: fixture.meta }],
    ['negative calories', { ...fixture, analysis: { ...fixture.analysis, items: [{ ...fixture.analysis.items[0], estimatedNutrition: { ...fixture.analysis.items[0].estimatedNutrition, calories: -5 } }] } }],
    ['unknown portion category', { ...fixture, analysis: { ...fixture.analysis, portionCategory: 'family pack' } }],
    ['empty items', { ...fixture, analysis: { ...fixture.analysis, items: [] } }],
    ['NaN confidence', { ...fixture, analysis: { ...fixture.analysis, confidence: null } }],
    ['missing meta', { analysis: fixture.analysis }],
  ])('rejects a 200 with a malformed body: %s (defence in depth)', async (_n, body) => {
    mockUser();
    fetchMock.mockResolvedValue(res(200, body));
    expect((await catchErr(requestFoodAnalysis('x', 'image/jpeg'))).code).toBe('INVALID_RESPONSE');
  });

  it('refuses to upload an image the server would reject as too large', async () => {
    mockUser();
    const err = await catchErr(requestFoodAnalysis('A'.repeat(MAX_UPLOAD_BASE64_CHARS + 1), 'image/jpeg'));
    expect(err.code).toBe('IMAGE_TOO_LARGE');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('requestCoachText / requestProfilePlan', () => {
  const plan = {
    dailyCalories: 1800,
    macros: { carbs: '220g', protein: '70g', fats: '55g' },
    waterIntake: '2.5L',
    planSummary: 'A balanced plan.',
    fitnessTips: ['Walk'],
    ayurvedicTip: 'Eat lunch as the biggest meal.',
    indianMealTiming: { morning: 'a', breakfast: 'b', lunch: 'c', dinner: 'd' },
    recommendedIndianFoods: ['Dal'],
    foodsToAvoid: ['Sugar'],
  };

  it('returns the text and sends only { task, input }', async () => {
    mockUser();
    fetchMock.mockResolvedValue(res(200, { task: 'daily_tip', text: 'Drink water.', meta: {} }));
    expect(await requestCoachText('daily_tip', { calories: 1, water: 2, steps: 3 })).toBe('Drink water.');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/v1/coach/generate`);
    expect(JSON.parse(init.body)).toEqual({ task: 'daily_tip', input: { calories: 1, water: 2, steps: 3 } });
  });

  it('returns a validated plan', async () => {
    mockUser();
    fetchMock.mockResolvedValue(res(200, { task: 'profile_plan', plan, meta: {} }));
    const out = await requestProfilePlan({
      gender: 'Female', goal: 'Lose Weight', activityLevel: '3-4 Days / Week',
      birthdate: { day: '1', month: '1', year: '2000' }, heightFeet: '5', heightInches: '4', weightKg: '60',
    });
    expect(out.dailyCalories).toBe(1800);
  });

  it('rejects a plan with a missing section', () => {
    const { planSummary: _drop, ...incomplete } = plan;
    expect(isCoachPlanResponse({ task: 'profile_plan', plan: incomplete, meta: {} })).toBe(false);
  });

  it('rejects an empty text body', async () => {
    mockUser();
    fetchMock.mockResolvedValue(res(200, { task: 'daily_tip', text: '', meta: {} }));
    expect((await catchErr(requestCoachText('daily_tip', { calories: 1, water: 2, steps: 3 }))).code).toBe('INVALID_RESPONSE');
  });
});
