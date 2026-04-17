import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('Missing Gemini API Key. Please set EXPO_PUBLIC_GEMINI_API_KEY in your .env file.');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Ordered fallback chain. If the first model is unavailable for a user/project,
// the next model is tried automatically.
const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.0-flash',
];

const configuredModels = process.env.EXPO_PUBLIC_GEMINI_VISION_MODELS
  ?.split(',')
  .map((model) => model.trim())
  .filter(Boolean);

const modelFallbackOrder =
  configuredModels && configuredModels.length > 0 ? configuredModels : FALLBACK_MODELS;

export type PortionCategory = 'small' | 'medium' | 'large' | '1 bowl' | '1 plate' | '1 piece';

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
  portionCategory: PortionCategory;
  confidence: number;
  estimatedNutrition: GeminiEstimatedNutrition;
}

const DEFAULT_ANALYSIS: GeminiFoodAnalysis = {
  itemName: 'Unknown food',
  searchHint: 'food',
  portionCategory: 'medium',
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
      portionCategory: 'medium',
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

const normalizePortionCategory = (value: unknown, fallback: PortionCategory = 'medium'): PortionCategory => {
  const normalized = String(value || fallback).toLowerCase().trim();
  if (
    normalized === 'small' ||
    normalized === 'medium' ||
    normalized === 'large' ||
    normalized === '1 bowl' ||
    normalized === '1 plate' ||
    normalized === '1 piece'
  ) {
    return normalized as PortionCategory;
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

const enforceBreadPiecePreset = (itemName: string, suggested: PortionCategory): PortionCategory => {
  const lower = itemName.toLowerCase();
  if (/(chapati|roti|phulka|paratha|naan|kulcha)/i.test(lower) && (suggested === 'medium' || suggested === 'small' || suggested === 'large')) {
    return '1 piece';
  }
  return suggested;
};

const normalizeDetectedItem = (rawItem: any): GeminiDetectedItem => {
  const itemName = String(rawItem?.itemName || 'Unknown food');
  const basePortion = normalizePortionCategory(rawItem?.portionCategory, 'medium');
  const portionCategory = enforceBreadPiecePreset(itemName, basePortion);

  return {
    itemName,
    portionCategory,
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
  const prompt = `Identify the food in this image and return JSON only.

Rules:
- Detect all visible food items in the plate/meal. Return 1 to 5 items.
- Return the most specific Indian dish or packaged product name for each item.
- If it is a packaged product, include the brand name.
- Do NOT guess exact grams or exact serving weight.
- Return a portion category per item only: small, medium, large, 1 bowl, 1 plate, or 1 piece.
- For chapati/roti/paratha/naan default to 1 piece unless clearly multiple pieces are visible.
- Include estimated nutrition per item for that item's chosen portion category.
- If unsure, provide the best searchHint to use in a product database.

Return this JSON shape exactly:
{
  "itemName": "string",
  "searchHint": "string",
  "portionCategory": "small | medium | large | 1 bowl | 1 plate | 1 piece",
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
      "portionCategory": "1 bowl",
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
    return DEFAULT_ANALYSIS;
  }
};
