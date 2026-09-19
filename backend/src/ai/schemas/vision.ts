import { z } from 'zod';

export const PORTION_CATEGORIES = ['small', 'medium', 'large', '1 bowl', '1 plate', '1 piece'] as const;
export const PortionCategorySchema = z.enum(PORTION_CATEGORIES);
export type PortionCategory = z.infer<typeof PortionCategorySchema>;

/**
 * Per-portion sanity bounds. Values outside these are treated as invalid model
 * output (hallucination), not clamped: silently "fixing" 99,999 kcal into 3,000
 * would still be fabricated data.
 */
export const NUTRITION_BOUNDS = { calories: 3000, protein: 150, carbs: 400, fat: 200 } as const;

// ── Final contract (what the mobile app receives) ───────────────────────────

export const NutritionSchema = z.strictObject({
  calories: z.number().int().min(0).max(NUTRITION_BOUNDS.calories),
  carbs: z.number().int().min(0).max(NUTRITION_BOUNDS.carbs),
  protein: z.number().int().min(0).max(NUTRITION_BOUNDS.protein),
  fat: z.number().int().min(0).max(NUTRITION_BOUNDS.fat),
  servingSize: z.string().min(1).max(60),
});

export const DetectedItemSchema = z.strictObject({
  itemName: z.string().min(1).max(80),
  portionCategory: PortionCategorySchema,
  confidence: z.number().min(0).max(1),
  estimatedNutrition: NutritionSchema,
});

/** Same shape the app has always used for GeminiFoodAnalysis (minus modelUsed, which is in meta). */
export const VisionAnalysisSchema = z.strictObject({
  itemName: z.string().min(1).max(80),
  searchHint: z.string().min(1).max(80),
  portionCategory: PortionCategorySchema,
  confidence: z.number().min(0).max(1),
  isPackaged: z.boolean(),
  brandName: z.string().min(1).max(60).optional(),
  imageNotes: z.string().min(1).max(200).optional(),
  estimatedNutrition: NutritionSchema,
  items: z.array(DetectedItemSchema).min(1).max(5),
});

export const VisionResponseSchema = z.strictObject({
  analysis: VisionAnalysisSchema,
  meta: z.strictObject({
    model: z.string().min(1),
    cached: z.boolean(),
    promptVersion: z.string().min(1),
    requestId: z.string().min(1),
  }),
});

export type VisionAnalysis = z.infer<typeof VisionAnalysisSchema>;
export type VisionResponse = z.infer<typeof VisionResponseSchema>;

// ── Request ─────────────────────────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Strict: unknown keys (including any client-supplied userId/uid) are rejected,
 * not silently ignored. Identity comes from the verified token only.
 */
export const VisionRequestSchema = z.strictObject({
  image: z.string().min(1),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
});

// ── Raw model output (structural, tolerant of known Gemini quirks) ──────────

/** Accepts 250, "250", "250 kcal", "~250". Rejects anything with no number in it. */
const looseNumber = z.preprocess((v) => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = v.match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : v;
  }
  return v;
}, z.number());

const looseBool = z.union([z.boolean(), z.enum(['true', 'false']).transform((s) => s === 'true')]);

const RawNutritionSchema = z.object({
  calories: looseNumber,
  carbs: looseNumber,
  protein: looseNumber,
  fat: looseNumber,
  servingSize: z.string().nullish(),
});

const RawItemSchema = z.object({
  itemName: z.string().trim().min(1),
  portionCategory: z.string().nullish(),
  confidence: looseNumber.nullish(),
  estimatedNutrition: RawNutritionSchema,
});

export const RawVisionSchema = z.object({
  items: z.array(RawItemSchema).min(1),
  searchHint: z.string().nullish(),
  isPackaged: looseBool.nullish(),
  brandName: z.string().nullish(),
  imageNotes: z.string().nullish(),
});

export type RawVision = z.infer<typeof RawVisionSchema>;
