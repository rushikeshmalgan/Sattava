import { GoogleGenerativeAI } from '@google/generative-ai';
import { CommonPortionCategory, normalizePortionCategory } from '../utils/portionUtils';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Ordered fallback chain. If the first model is unavailable for a user/project,
// the next model is tried automatically.
const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
];

const configuredModels = process.env.EXPO_PUBLIC_GEMINI_VISION_MODELS
  ?.split(',')
  .map((model) => model.trim())
  .filter(Boolean);

const modelFallbackOrder =
  configuredModels && configuredModels.length > 0 ? configuredModels : FALLBACK_MODELS;

export type PortionCategory = CommonPortionCategory;

export interface GeminiEstimatedNutrition {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  servingSize: string;
}

export interface GeminiFoodAnalysis {
  itemName: string;
  searchHint: string;
  portionCategory: PortionCategory;
  portionOptions: PortionCategory[];
  confidence: number;
  modelUsed?: string;
  isPackaged: boolean;
  brandName?: string;
  imageNotes?: string;
  estimatedNutrition: GeminiEstimatedNutrition;
  items: GeminiDetectedItem[];
}

export interface GeminiDetectedItem {
  itemName: string;
  quantity: number;
  portionCategory: PortionCategory;
  portionOptions: PortionCategory[];
  confidence: number;
  estimatedNutrition: GeminiEstimatedNutrition;
}

export interface GeminiPortionNutritionRequest {
  itemName: string;
  basePortionCategory: PortionCategory;
  targetPortionCategory: PortionCategory;
  baseNutrition: GeminiEstimatedNutrition;
  imageNotes?: string;
}

const DEFAULT_ANALYSIS: GeminiFoodAnalysis = {
  itemName: 'Unknown food',
  searchHint: 'food',
  portionCategory: 'medium',
  portionOptions: ['small', 'medium', 'large'],
  confidence: 0.5,
  isPackaged: false,
  estimatedNutrition: {
    calories: 250,
    carbs: 25,
    protein: 8,
    fat: 10,
    servingSize: '1 serving',
  },
  items: [
    {
      itemName: 'Unknown food',
      quantity: 1,
      portionCategory: 'medium',
      portionOptions: ['small', 'medium', 'large'],
      confidence: 0.5,
      estimatedNutrition: {
        calories: 250,
        carbs: 25,
        protein: 8,
        fat: 10,
        servingSize: '1 serving',
      },
    },
  ],
};

const stripJsonFence = (text: string): string => {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) || fallback : fallback;
  }

  return fallback;
};

const normalizeNutrition = (estimatedNutrition: any): GeminiEstimatedNutrition => {
  return {
    calories: Math.max(0, Math.round(toNumber(estimatedNutrition?.calories, DEFAULT_ANALYSIS.estimatedNutrition.calories))),
    carbs: Math.max(0, Math.round(toNumber(estimatedNutrition?.carbs, DEFAULT_ANALYSIS.estimatedNutrition.carbs))),
    protein: Math.max(0, Math.round(toNumber(estimatedNutrition?.protein, DEFAULT_ANALYSIS.estimatedNutrition.protein))),
    fat: Math.max(0, Math.round(toNumber(estimatedNutrition?.fat, DEFAULT_ANALYSIS.estimatedNutrition.fat))),
    servingSize: String(estimatedNutrition?.servingSize || DEFAULT_ANALYSIS.estimatedNutrition.servingSize),
  };
};

const normalizePortionOptions = (rawOptions: unknown, selectedPortion: PortionCategory): PortionCategory[] => {
  if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
    return [selectedPortion];
  }

  const normalized = rawOptions
    .map((value) => normalizePortionCategory(String(value || ''), selectedPortion));

  const deduped: PortionCategory[] = [];
  for (const option of normalized) {
    if (!deduped.includes(option)) {
      deduped.push(option);
    }
  }

  if (!deduped.includes(selectedPortion)) {
    deduped.unshift(selectedPortion);
  }

  return deduped;
};

const normalizeDetectedItem = (rawItem: any): GeminiDetectedItem => {
  const itemName = String(rawItem?.itemName || 'Unknown food');
  const portionCategory = normalizePortionCategory(String(rawItem?.portionCategory || ''), 'medium');
  const portionOptions = normalizePortionOptions(rawItem?.portionOptions, portionCategory);
  const quantity = Math.max(1, Math.round(toNumber(rawItem?.quantity, 1)));

  return {
    itemName,
    quantity,
    portionCategory,
    portionOptions,
    confidence: Math.min(1, Math.max(0, toNumber(rawItem?.confidence, DEFAULT_ANALYSIS.confidence))),
    estimatedNutrition: normalizeNutrition(rawItem?.estimatedNutrition),
  };
};

const normalizeAnalysis = (raw: any): GeminiFoodAnalysis => {
  const estimatedNutrition = raw?.estimatedNutrition || {};

  const normalizedRoot = normalizeDetectedItem({
    itemName: raw?.itemName,
    portionCategory: raw?.portionCategory,
    confidence: raw?.confidence,
    estimatedNutrition,
  });

  const itemsSource = Array.isArray(raw?.items) && raw.items.length > 0
    ? raw.items
    : [normalizedRoot];
  const items = itemsSource.map((item: any) => normalizeDetectedItem(item));
  const primary = items[0] || normalizedRoot;

  return {
    itemName: primary.itemName,
    searchHint: String(raw?.searchHint || primary.itemName || DEFAULT_ANALYSIS.searchHint),
    portionCategory: primary.portionCategory,
    portionOptions: primary.portionOptions,
    confidence: primary.confidence,
    modelUsed: raw?.modelUsed ? String(raw.modelUsed) : undefined,
    isPackaged: Boolean(raw?.isPackaged),
    brandName: raw?.brandName ? String(raw.brandName) : undefined,
    imageNotes: raw?.imageNotes ? String(raw.imageNotes) : undefined,
    estimatedNutrition: primary.estimatedNutrition,
    items,
  };
};

export const analyzeFoodImage = async ({
  imageBase64,
  mimeType = 'image/jpeg',
}: {
  imageBase64: string;
  mimeType?: string;
}): Promise<GeminiFoodAnalysis> => {
  if (!genAI || !apiKey) {
    throw new Error('Missing Gemini API Key. Please set EXPO_PUBLIC_GEMINI_API_KEY in your .env file.');
  }

  const prompt = `Identify the food in this image and return JSON only.

Rules:
- Detect all visible food items in the plate/meal. Return 1 to 5 items.
- Do not return duplicate rows for the same food item. Use quantity for repeated same items.
- Return the most specific Indian dish or packaged product name for each item.
- If it is a packaged product, include the brand name.
- Do NOT guess exact grams or exact serving weight.
- Return a portion category per item only: small, medium, large, 1 bowl, 1 plate, or 1 piece.
- Return portionOptions per item: an array of 1 to 4 relevant presets chosen only from small, medium, large, 1 bowl, 1 plate, 1 piece.
- Ensure each item's portionCategory is included in its portionOptions array.
- Portion options must match the specific dish/product context (e.g., bowls for curries, piece for bread/slice items).
- Include estimated nutrition per item for that item's chosen portion category.
- If unsure, provide the best searchHint to use in a product database.

Return this JSON shape exactly:
{
  "itemName": "string",
  "searchHint": "string",
  "portionCategory": "small | medium | large | 1 bowl | 1 plate | 1 piece",
  "portionOptions": ["small", "medium"],
  "confidence": 0.0,
  "isPackaged": true,
  "brandName": "string",
  "imageNotes": "string",
  "estimatedNutrition": {
    "calories": 0,
    "carbs": 0,
    "protein": 0,
    "fat": 0,
    "servingSize": "1 serving"
  },
  "items": [
    {
      "itemName": "chole masala",
      "quantity": 1,
      "portionCategory": "1 bowl",
      "portionOptions": ["small", "1 bowl", "1 plate"],
      "confidence": 0.9,
      "estimatedNutrition": {
        "calories": 0,
        "carbs": 0,
        "protein": 0,
        "fat": 0,
        "servingSize": "1 bowl"
      }
    }
  ]
}`;

  try {
    for (const modelName of modelFallbackOrder) {
      try {
        const visionModel = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const result = await visionModel.generateContent([
          prompt,
          {
            inlineData: {
              data: imageBase64,
              mimeType,
            },
          },
        ]);

        const text = result.response.text();
        const parsed = JSON.parse(stripJsonFence(text));
        return normalizeAnalysis({
          ...parsed,
          modelUsed: parsed?.modelUsed || modelName,
        });
      } catch (modelError) {
        console.warn(`Gemini model failed (${modelName}), trying fallback...`, modelError);
      }
    }

    throw new Error('All configured Gemini vision models failed.');
  } catch (error) {
    console.error('Gemini image analysis failed:', error);
    throw error;
  }
};

export const estimateNutritionForPortionFallback = async ({
  itemName,
  basePortionCategory,
  targetPortionCategory,
  baseNutrition,
  imageNotes,
}: GeminiPortionNutritionRequest): Promise<GeminiEstimatedNutrition> => {
  if (!genAI || !apiKey) {
    return baseNutrition;
  }

  const prompt = `Estimate nutrition for this already-detected food portion change and return JSON only.

Food item: ${itemName}
Base portion category: ${basePortionCategory}
Target portion category: ${targetPortionCategory}
Base nutrition (for base portion):
- calories: ${baseNutrition.calories}
- carbs: ${baseNutrition.carbs}
- protein: ${baseNutrition.protein}
- fat: ${baseNutrition.fat}
- servingSize: ${baseNutrition.servingSize}
Image notes: ${imageNotes || 'none'}

Rules:
- Keep estimates realistic for the same dish/product and only adjust for portion change.
- Never return negative values.
- Return integers for calories, carbs, protein, fat.
- servingSize should match the target portion category in plain text.

Return JSON shape exactly:
{
  "calories": 0,
  "carbs": 0,
  "protein": 0,
  "fat": 0,
  "servingSize": "string"
}`;

  try {
    for (const modelName of modelFallbackOrder) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const result = await model.generateContent([prompt]);
        const text = result.response.text();
        const parsed = JSON.parse(stripJsonFence(text));
        const normalized = normalizeNutrition(parsed);
        return {
          ...normalized,
          servingSize: parsed?.servingSize ? String(parsed.servingSize) : `${targetPortionCategory}`,
        };
      } catch (modelError) {
        console.warn(`Gemini portion fallback failed (${modelName}), trying fallback...`, modelError);
      }
    }
  } catch (error) {
    console.warn('Gemini portion nutrition fallback failed:', error);
  }

  return {
    ...baseNutrition,
    servingSize: `${targetPortionCategory}`,
  };
};
