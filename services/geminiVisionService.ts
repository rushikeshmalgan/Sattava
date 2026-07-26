/**
 * Sattva – Gemini AI Service
 * ──────────────────────────
 * • Uses v1beta (required for gemini-2.0-flash multimodal)
 * • Tries models in order; falls back gracefully to local data
 * • Caches tips/insights for 5 min to avoid burning quota
 * • All public functions NEVER throw — they return safe defaults
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ── API Setup ───────────────────────────────────────────────────────────────
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

// v1beta is required for gemini-2.0-flash vision capabilities
// v1 does NOT support multimodal with the new model names
const genAI = new GoogleGenerativeAI(apiKey);

// Ordered fallback chain – fastest/cheapest first.
// gemini-2.0-flash* and gemini-1.5-flash* have SEPARATE quota pools,
// so if the 2.0 daily quota is exhausted, 1.5 models will still respond.
const MODEL_PRIORITY = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

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
const isRateLimit = (err: unknown): boolean => {
  const msg = String((err as any)?.message ?? '');
  return msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED');
};

const isApiKeyError = (err: unknown): boolean => {
  const msg = String((err as any)?.message ?? '');
  return msg.includes('API_KEY') || msg.includes('401') || msg.includes('403') || msg.includes('invalid');
};

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

// ── Core: try models in priority order ───────────────────────────────────────
async function tryModels(
  promptFn: (modelName: string) => Promise<string>,
  supportsVision = false,
): Promise<string | null> {
  if (!apiKey) {
    console.warn('[Gemini] No API key — check EXPO_PUBLIC_GEMINI_API_KEY in .env');
    return null;
  }

  for (const modelName of MODEL_PRIORITY) {
    try {
      const result = await promptFn(modelName);
      console.log(`[Gemini] Success with model: ${modelName}`);
      return result;
    } catch (err) {
      const errMsg = (err as any)?.message ?? String(err);
      if (isApiKeyError(err)) {
        console.error('[Gemini] API key invalid:', errMsg);
        return null; // No point trying other models
      }
      if (isRateLimit(err)) {
        // Rate-limited on this model — try the next one instead of stopping
        console.warn(`[Gemini] Rate limit on ${modelName}, trying next model...`);
        continue;
      }
      console.warn(`[Gemini] Model ${modelName} failed (${errMsg}), trying next...`);
    }
  }
  console.error('[Gemini] All models failed — returning null');
  return null;
}

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

  const result = await tryModels(async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      // Note: do NOT use responseMimeType here — some model versions reject it
      // and return an empty response, which causes JSON parse failures.
      generationConfig: { temperature: 0.1 },
    });
    const res = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64, mimeType } },
    ]);
    const text = res.response.text();
    if (!text || text.trim().length < 10) {
      throw new Error('Empty response from model');
    }
    return text;
  });

  if (!result) {
    console.warn('[Gemini] analyzeFoodImage: no result from any model — using default');
    return DEFAULT_ANALYSIS;
  }

  try {
    const stripped = stripFence(result);
    console.log('[Gemini] Raw response preview:', stripped.slice(0, 200));
    const parsed = JSON.parse(stripped);
    const analysis = normalizeAnalysis(parsed);
    console.log('[Gemini] Detected food:', analysis.itemName, '| confidence:', analysis.confidence);
    return analysis;
  } catch (parseErr) {
    console.warn('[Gemini] Failed to parse JSON response:', (parseErr as any)?.message);
    console.warn('[Gemini] Raw response was:', result.slice(0, 300));
    return DEFAULT_ANALYSIS;
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

  const result = await tryModels(async (modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.7 } });
    const res = await model.generateContent(prompt);
    return res.response.text().trim();
  });

  const text = result ?? LOCAL_INSIGHTS[Math.floor(Math.random() * LOCAL_INSIGHTS.length)];
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

  const result = await tryModels(async (modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.8, maxOutputTokens: 80 } });
    const res = await model.generateContent(prompt);
    return res.response.text().trim();
  });

  const text = result ?? LOCAL_TIPS[Math.floor(Math.random() * LOCAL_TIPS.length)];
  toCache(cacheKey, text);
  return text;
};

/**
 * Generic text generation wrapper
 */
export const generateText = async (prompt: string): Promise<string | null> => {
  return tryModels(async (modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.7 } });
    const res = await model.generateContent(prompt);
    return res.response.text().trim();
  });
};