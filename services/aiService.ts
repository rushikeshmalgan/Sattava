/**
 * Sattava AI facade.
 *
 * All model calls run on the Sattava backend (authenticated with the user's
 * Firebase ID token); nothing here talks to an AI provider or holds a key.
 *
 * Failure semantics differ on purpose:
 *  - analyzeFoodImage THROWS on failure. There is no default "Unknown food"
 *    result, so a failed analysis can never become a nutrition record.
 *  - Text helpers (tips, insights) never throw: they fall back to local,
 *    non-nutritional copy, which is safe to show.
 */

import { AiApiError, requestCoachText, requestFoodAnalysis, requestProfilePlan } from './aiApiClient';
import type {
  CoachInputs,
  CoachTextTask,
  PortionCategory as ApiPortionCategory,
  ProfilePlanDto,
  VisionApiAnalysis,
  VisionApiItem,
  VisionApiNutrition,
} from '../types/ai';

// ── Types (shape unchanged: consumed by scanService and the scan screen) ─────
export type PortionCategory = ApiPortionCategory;
export type GeminiEstimatedNutrition = VisionApiNutrition;
export type GeminiDetectedItem = VisionApiItem;
export type GeminiFoodAnalysis = VisionApiAnalysis & { modelUsed?: string };

// ── Local fallbacks for non-nutritional copy ─────────────────────────────────
const LOCAL_TIPS = [
  'Try adding a bowl of dal to your next meal — it\'s an excellent source of protein and fiber.',
  'Drinking a glass of warm water with lemon in the morning boosts metabolism.',
  'Include one seasonal sabzi in your lunch for vitamins and minerals.',
  'A small handful of nuts (almonds, walnuts) is a great mid-morning snack.',
  'Replace maida rotis with atta rotis for better fiber and sustained energy.',
  'Add haldi (turmeric) to your dal or milk — it\'s a powerful anti-inflammatory.',
  'Eat your largest meal at lunch, not dinner, for better digestion.',
  'Curd (dahi) with lunch helps digestion and gut health significantly.',
];

const LOCAL_INSIGHTS = [
  'You\'re making progress! Keep logging your meals to build healthy habits.',
  'Great job tracking today! Consistent logging is the first step to better nutrition.',
  'Every meal logged is a step closer to your health goals. Keep it up!',
  'You\'re building a strong foundation. Focus on protein at your next meal.',
  'Stay hydrated! Aim for 8 glasses of water throughout the day.',
];

const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)] as T;

// ── Cache (5 min) for tips/insights to avoid needless requests ───────────────
const _cache = new Map<string, { text: string; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function fromCache(key: string): string | null {
  const entry = _cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.text;
  return null;
}

function toCache(key: string, text: string): void {
  _cache.set(key, { text, ts: Date.now() });
}

/** The server rejects negative/absurd numbers; sanitise so a UI quirk cannot disable a feature. */
const num = (v: number): number => (Number.isFinite(v) ? Math.min(20_000, Math.max(0, Math.round(v * 10) / 10)) : 0);

// ── Vision ────────────────────────────────────────────────────────────────────

/**
 * Analyzes a food photo on the backend and returns validated nutrition data.
 * Throws AiApiError on any failure (rate limit, unavailable, invalid output,
 * network, oversized image). Callers must present an explicit failed state.
 */
export const analyzeFoodImage = async ({
  imageBase64,
  mimeType = 'image/jpeg',
}: {
  imageBase64: string;
  mimeType?: string;
}): Promise<GeminiFoodAnalysis> => {
  const { analysis, meta } = await requestFoodAnalysis(imageBase64, mimeType);
  return { ...analysis, modelUsed: meta.model };
};

// ── Text helpers (never throw) ───────────────────────────────────────────────

/** Returns a 3-line insight about the user's daily nutrition, or local copy if unavailable. */
export const getDietScoreInsight = async (
  consumed: { calories: number; protein: number; carbs: number; fat: number },
  targets: { calories: number; protein: number; carbs: number; fat: number },
): Promise<string> => {
  const input: CoachInputs['diet_insight'] = {
    consumed: { calories: num(consumed.calories), protein: num(consumed.protein), carbs: num(consumed.carbs), fat: num(consumed.fat) },
    targets: { calories: num(targets.calories), protein: num(targets.protein), carbs: num(targets.carbs), fat: num(targets.fat) },
  };
  const cacheKey = `insight-${JSON.stringify(input)}`;
  const cached = fromCache(cacheKey);
  if (cached) return cached;

  try {
    const text = await requestCoachText('diet_insight', input);
    toCache(cacheKey, text);
    return text;
  } catch (err) {
    console.warn('[getDietScoreInsight] unavailable, using local copy:', (err as AiApiError)?.code ?? err);
    return pick(LOCAL_INSIGHTS);
  }
};

/** Returns a one-sentence daily health tip, or local copy if unavailable. */
export const getDailyHealthTip = async (stats: { calories: number; water: number; steps: number }): Promise<string> => {
  const input: CoachInputs['daily_tip'] = { calories: num(stats.calories), water: num(stats.water), steps: num(stats.steps) };
  const cacheKey = `tip-${JSON.stringify(input)}`;
  const cached = fromCache(cacheKey);
  if (cached) return cached;

  try {
    const text = await requestCoachText('daily_tip', input);
    toCache(cacheKey, text);
    return text;
  } catch (err) {
    console.warn('[getDailyHealthTip] unavailable, using local copy:', (err as AiApiError)?.code ?? err);
    return pick(LOCAL_TIPS);
  }
};

/**
 * Generates coach text for a server-owned task. Returns null on any failure so
 * callers keep their own fallback copy.
 */
export const generateCoachText = async <T extends CoachTextTask>(task: T, input: CoachInputs[T]): Promise<string | null> => {
  try {
    return await requestCoachText(task, input);
  } catch (err) {
    console.warn(`[generateCoachText:${task}] unavailable:`, (err as AiApiError)?.code ?? err);
    return null;
  }
};

/** Generates the onboarding plan (validated server-side). Returns null on failure so callers use their default plan. */
export const generateProfilePlan = async (input: CoachInputs['profile_plan']): Promise<ProfilePlanDto | null> => {
  try {
    return await requestProfilePlan(input);
  } catch (err) {
    console.warn('[generateProfilePlan] unavailable:', (err as AiApiError)?.code ?? err);
    return null;
  }
};
