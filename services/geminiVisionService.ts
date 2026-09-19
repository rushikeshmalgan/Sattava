/**
 * Sattva – Gemini AI Service
 * ──────────────────────────
 * • Uses v1beta (required for gemini-2.0-flash multimodal)
 * • Tries models in order; falls back gracefully to local data
 * • Caches tips/insights for 5 min to avoid burning quota
 * • All public functions NEVER throw — they return safe defaults
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  MODEL_PRIORITY,
  tryModels,
  getGenerativeModel,
  isRateLimit,
  isApiKeyError,
  isNetworkError,
  getFailureCategory,
} from './geminiClient';

// ── Types ────────────────────────────────────────────────────────────────────
export type PortionCategory = 'small' | 'medium' | 'large' | '1 bowl' | '1 plate' | '1 piece';

export interface GeminiEstimatedNutrition {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  servingSize: string;
}

export interface GeminiDetectedItem {
  itemName: string;
  portionCategory: PortionCategory;
  confidence: number;
  estimatedNutrition: GeminiEstimatedNutrition;
}

export interface GeminiFoodAnalysis {
  itemName: string;
  searchHint: string;
  portionCategory: PortionCategory;
  confidence: number;
  modelUsed?: string;
  isPackaged: boolean;
  brandName?: string;
  imageNotes?: string;
  estimatedNutrition: GeminiEstimatedNutrition;
  items: GeminiDetectedItem[];
}

// ── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_NUTRITION: GeminiEstimatedNutrition = {
  calories: 250,
  carbs: 25,
  protein: 8,
  fat: 10,
  servingSize: '1 serving',
};

const DEFAULT_ANALYSIS: GeminiFoodAnalysis = {
  itemName: 'Unknown food',
  searchHint: 'food',
  portionCategory: 'medium',
  confidence: 0.5,
  isPackaged: false,
  estimatedNutrition: DEFAULT_NUTRITION,
  items: [
    {
      itemName: 'Unknown food',
      portionCategory: 'medium',
      confidence: 0.5,
      estimatedNutrition: DEFAULT_NUTRITION,
    },
  ],
};

// ── Local AI fallbacks (used when Gemini is unavailable) ─────────────────────
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

// ── Cache ─────────────────────────────────────────────────────────────────────
const _cache = new Map<string, { text: string; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function fromCache(key: string): string | null {
  const entry = _cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.text;
  return null;
}

function toCache(key: string, text: string): void {
  _cache.set(key, { text, ts: Date.now() });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const stripFence = (text: string): string =>
  text
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/```\s*$/im, '')
    .trim();

const toNum = (v: unknown, fallback = 0): number => {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string') {
    const m = v.match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) || fallback : fallback;
  }
  return fallback;
};

const toPortionCategory = (v: unknown, def: PortionCategory = 'medium'): PortionCategory => {
  const s = String(v ?? def).toLowerCase().trim();
  if (['small', 'medium', 'large', '1 bowl', '1 plate', '1 piece'].includes(s)) {
    return s as PortionCategory;
  }
  return def;
};

const normalizeNutrition = (n: any): GeminiEstimatedNutrition => ({
  calories: Math.max(0, Math.round(toNum(n?.calories, DEFAULT_NUTRITION.calories))),
  carbs:    Math.max(0, Math.round(toNum(n?.carbs,    DEFAULT_NUTRITION.carbs))),
  protein:  Math.max(0, Math.round(toNum(n?.protein,  DEFAULT_NUTRITION.protein))),
  fat:      Math.max(0, Math.round(toNum(n?.fat,       DEFAULT_NUTRITION.fat))),
  servingSize: String(n?.servingSize ?? DEFAULT_NUTRITION.servingSize),
});

const enforceRotiPiece = (name: string, portion: PortionCategory): PortionCategory => {
  if (/(chapati|roti|phulka|paratha|naan|kulcha)/i.test(name) && ['small', 'medium', 'large'].includes(portion)) {
    return '1 piece';
  }
  return portion;
};

const normalizeItem = (raw: any): GeminiDetectedItem => {
  const name = String(raw?.itemName ?? 'Unknown food');
  const portion = enforceRotiPiece(name, toPortionCategory(raw?.portionCategory));
  return {
    itemName: name,
    portionCategory: portion,
    confidence: Math.min(1, Math.max(0, toNum(raw?.confidence, 0.5))),
    estimatedNutrition: normalizeNutrition(raw?.estimatedNutrition),
  };
};

const normalizeAnalysis = (raw: any, modelUsed?: string): GeminiFoodAnalysis => {
  const rootItem = normalizeItem({ itemName: raw?.itemName, portionCategory: raw?.portionCategory, confidence: raw?.confidence, estimatedNutrition: raw?.estimatedNutrition });
  const rawItems = Array.isArray(raw?.items) && raw.items.length > 0 ? raw.items : [raw];
  const items = rawItems.map(normalizeItem);
  const primary = items[0] ?? rootItem;

  return {
    itemName: primary.itemName,
    searchHint: String(raw?.searchHint ?? primary.itemName ?? 'food'),
    portionCategory: primary.portionCategory,
    confidence: primary.confidence,
    modelUsed: modelUsed ?? raw?.modelUsed,
    isPackaged: Boolean(raw?.isPackaged),
    brandName: raw?.brandName ? String(raw.brandName) : undefined,
    imageNotes: raw?.imageNotes ? String(raw.imageNotes) : undefined,
    estimatedNutrition: primary.estimatedNutrition,
    items,
  };
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Analyzes a food image and returns structured nutrition data.
 * Falls back to DEFAULT_ANALYSIS if Gemini is unavailable.
 */
export const analyzeFoodImage = async ({
  imageBase64,
  mimeType = 'image/jpeg',
}: {
  imageBase64: string;
  mimeType?: string;
}): Promise<GeminiFoodAnalysis> => {
  const prompt = `You are an expert Indian nutrition assistant. Analyze the food in this image.

Return ONLY valid JSON (no markdown, no explanation) with this exact shape:
{
  "itemName": "string — most specific Indian dish name",
  "searchHint": "string — best keyword for food database search",
  "portionCategory": "small | medium | large | 1 bowl | 1 plate | 1 piece",
  "confidence": 0.0,
  "isPackaged": false,
  "brandName": "string or null",
  "imageNotes": "string — brief observation about the image",
  "estimatedNutrition": {
    "calories": 0,
    "carbs": 0,
    "protein": 0,
    "fat": 0,
    "servingSize": "1 serving"
  },
  "items": [
    {
      "itemName": "string",
      "portionCategory": "1 bowl",
      "confidence": 0.9,
      "estimatedNutrition": { "calories": 0, "carbs": 0, "protein": 0, "fat": 0, "servingSize": "1 bowl" }
    }
  ]
}

Rules:
- Detect 1-5 visible food items
- Use specific Indian names (e.g., "Dal Makhani" not "lentil soup")
- For roti/chapati/paratha, always use "1 piece" portionCategory
- Estimate nutrition per the chosen portionCategory
- Return confidence 0-1 (1 = very sure)`;

  const { text, modelUsed, failureCategory } = await tryModels(
    async (modelName) => {
      const model = getGenerativeModel(modelName, { temperature: 0.1 });
      // Note: do NOT use responseMimeType here — some model versions reject it
      // and return an empty response, which causes JSON parse failures.
      const res = await model.generateContent([
        prompt,
        { inlineData: { data: imageBase64, mimeType } },
      ]);
      const text = res.response.text();
      if (!text || text.trim().length < 10) {
        throw new Error('Empty response from model');
      }
      return text;
    },
    'analyzeFoodImage',
  );

  if (!text) {
    console.warn('[analyzeFoodImage] No result from any model — using default', { failureCategory });
    return { ...DEFAULT_ANALYSIS, modelUsed: undefined };
  }

  try {
    const stripped = stripFence(text);
    console.log('[analyzeFoodImage] Raw response preview:', stripped.slice(0, 200));
    const parsed = JSON.parse(stripped);
    const analysis = normalizeAnalysis(parsed, modelUsed ?? undefined);
    console.log('[analyzeFoodImage] Detected food:', analysis.itemName, '| confidence:', analysis.confidence);
    return analysis;
  } catch (parseErr) {
    console.warn('[analyzeFoodImage] Failed to parse JSON response:', (parseErr as any)?.message);
    console.warn('[analyzeFoodImage] Raw response was:', text.slice(0, 300));
    return { ...DEFAULT_ANALYSIS, modelUsed: undefined };
  }
};

/**
 * Returns a 3-line AI insight about the user's daily nutrition.
 * Uses local pool if Gemini is unavailable.
 */
export const getDietScoreInsight = async (
  consumed: { calories: number; protein: number; carbs: number; fat: number },
  targets: { calories: number; protein: number; carbs: number; fat: number },
): Promise<string> => {
  const cacheKey = `insight-${consumed.calories}-${consumed.protein}-${consumed.carbs}-${consumed.fat}`;
  const cached = fromCache(cacheKey);
  if (cached) return cached;

  const calPct   = targets.calories > 0 ? Math.round((consumed.calories / targets.calories) * 100) : 0;
  const protPct  = targets.protein  > 0 ? Math.round((consumed.protein  / targets.protein)  * 100) : 0;

  const prompt = `You are a friendly Indian nutrition coach. Give a 3-line insight for this user.

Stats today:
- Calories: ${consumed.calories} / ${targets.calories} kcal (${calPct}%)
- Protein: ${consumed.protein}g / ${targets.protein}g (${protPct}%)
- Carbs: ${consumed.carbs}g / ${targets.carbs}g
- Fat: ${consumed.fat}g / ${targets.fat}g

Write exactly 3 short lines (max 60 chars each):
Line 1: Overall balance summary
Line 2: One specific win OR area to improve (mention an Indian food if relevant)
Line 3: Short encouragement

No bullet points. No numbering. No markdown.`;

  const { text, failureCategory } = await tryModels(
    async (modelName) => {
      const model = getGenerativeModel(modelName, { temperature: 0.7 });
      const res = await model.generateContent(prompt);
      return res.response.text().trim();
    },
    'getDietScoreInsight',
  );

  if (!text) {
    console.warn('[getDietScoreInsight] No result from any model — using local fallback', { failureCategory });
    return LOCAL_INSIGHTS[Math.floor(Math.random() * LOCAL_INSIGHTS.length)];
  }

  toCache(cacheKey, text);
  return text;
};

/**
 * Returns a one-sentence daily health tip personalized to the user's stats.
 * Uses local pool if Gemini is unavailable.
 */
export const getDailyHealthTip = async (stats: {
  calories: number;
  water: number;
  steps: number;
}): Promise<string> => {
  const cacheKey = `tip-${stats.calories}-${stats.water}-${stats.steps}`;
  const cached = fromCache(cacheKey);
  if (cached) return cached;

  const prompt = `You are a friendly Indian health coach. Give ONE practical health tip (max 100 characters) for this user.

Stats: ${stats.calories} kcal eaten, ${stats.water}ml water, ${stats.steps} steps today.

Make it actionable and culturally relevant (mention Indian foods, habits, or ayurvedic wisdom).
Reply with ONLY the tip sentence. No intro, no quotes, no punctuation at the start.`;

  const { text, failureCategory } = await tryModels(
    async (modelName) => {
      const model = getGenerativeModel(modelName, { temperature: 0.8, maxOutputTokens: 80 });
      const res = await model.generateContent(prompt);
      return res.response.text().trim();
    },
    'getDailyHealthTip',
  );

  if (!text) {
    console.warn('[getDailyHealthTip] No result from any model — using local fallback', { failureCategory });
    return LOCAL_TIPS[Math.floor(Math.random() * LOCAL_TIPS.length)];
  }

  toCache(cacheKey, text);
  return text;
};

/**
 * Generic text generation wrapper
 */
export const generateText = async (prompt: string): Promise<string | null> => {
  const { text, failureCategory } = await tryModels(
    async (modelName) => {
      const model = getGenerativeModel(modelName, { temperature: 0.7 });
      const res = await model.generateContent(prompt);
      return res.response.text().trim();
    },
    'generateText',
  );

  if (!text) {
    console.warn('[generateText] No result from any model', { failureCategory });
  }
  return text;
};
