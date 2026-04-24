import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import { FoodData } from './logService';
import {
  analyzeFoodImage,
  GeminiFoodAnalysis,
  PortionCategory,
} from './geminiVisionService';
import { normalizePortionCategory } from '../utils/portionUtils';
import {
  getCachedBarcodeResult,
  getCachedImageResult,
  setCachedBarcodeResult,
  setCachedImageResult,
} from './scanCache';
import { OpenFoodFactsMatch, lookupBarcodeFood, searchFoodsByText, toFoodData } from './openFoodFactsService';

export type { PortionCategory };

export interface ScanDetectedItem {
  id: string;
  label: string;
  detectedQuantity: number;
  confidence: number;
  basePortionCategory: PortionCategory;
  portionCategory: PortionCategory;
  portionOptions: PortionCategory[];
  foodData: FoodData;
}

export interface ScanResolution {
  id: string;
  source: 'barcode' | 'gemini' | 'manual';
  label: string;
  detectedQuantity: number;
  subtitle?: string;
  confidence: number;
  basePortionCategory: PortionCategory;
  portionCategory: PortionCategory;
  portionOptions: PortionCategory[];
  foodData: FoodData;
  imageUri?: string;
  barcode?: string;
  searchHint?: string;
  productImageUrl?: string;
  alternatives?: OpenFoodFactsMatch[];
  analysis?: GeminiFoodAnalysis;
  detectedItems?: ScanDetectedItem[];
}

const PORTION_MULTIPLIERS: Record<PortionCategory, number> = {
  small: 0.75,
  medium: 1,
  large: 1.5,
  '1 bowl': 1,
  '1 plate': 1.5,
  '1 piece': 1,
};

const IMAGE_HASH_SAMPLE_LENGTH = 10 * 1024;

const isValidFoodData = (value: any): value is FoodData => {
  return Boolean(
    value &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.calories === 'number' &&
    typeof value.carbs === 'number' &&
    typeof value.protein === 'number' &&
    typeof value.fat === 'number' &&
    typeof value.servingSize === 'string'
  );
};

const isValidScanResolution = (value: any): value is ScanResolution => {
  return Boolean(
    value &&
    typeof value.id === 'string' &&
    typeof value.source === 'string' &&
    typeof value.label === 'string' &&
    typeof value.confidence === 'number' &&
    isValidFoodData(value.foodData)
  );
};

const scaleFoodDataByRatio = (foodData: FoodData, ratio: number): FoodData => {
  return {
    ...foodData,
    calories: Math.max(0, Math.round(foodData.calories * ratio)),
    carbs: Math.max(0, Math.round(foodData.carbs * ratio)),
    protein: Math.max(0, Math.round(foodData.protein * ratio)),
    fat: Math.max(0, Math.round(foodData.fat * ratio)),
  };
};

const isLinearPortion = (value: PortionCategory): boolean => {
  return value === 'small' || value === 'medium' || value === 'large';
};

export const scaleDetectedItemForPortion = (item: ScanDetectedItem, portionCategory: PortionCategory): ScanDetectedItem => {
  const normalized = normalizePortionCategory(portionCategory);
  const baseMultiplier = PORTION_MULTIPLIERS[item.basePortionCategory] || 1;
  const targetMultiplier = PORTION_MULTIPLIERS[normalized] || 1;
  const ratio = baseMultiplier > 0 ? targetMultiplier / baseMultiplier : 1;

  return {
    ...item,
    portionCategory: normalized,
    foodData: {
      ...scaleFoodDataByRatio(item.foodData, ratio),
      servingSize: normalized === item.basePortionCategory
        ? item.foodData.servingSize
        : `${normalized} • ${item.foodData.servingSize}`,
    },
  };
};

export const resolveDetectedItemForPortion = async ({
  item,
  portionCategory,
  source,
  analysis,
}: {
  item: ScanDetectedItem;
  portionCategory: PortionCategory;
  source: ScanResolution['source'];
  analysis?: GeminiFoodAnalysis;
}): Promise<ScanDetectedItem> => {
  const normalized = normalizePortionCategory(portionCategory);
  const scaled = scaleDetectedItemForPortion(item, normalized);

  if (source !== 'gemini') {
    return scaled;
  }

  if (normalized === item.basePortionCategory) {
    return scaled;
  }

  if (!analysis) {
    return scaled;
  }

  // Fallback to scaled if function missing
  return scaled;
};

const buildBarcodeResolution = (match: OpenFoodFactsMatch): ScanResolution => ({
  id: match.id,
  source: 'barcode',
  label: match.name,
  detectedQuantity: 1,
  subtitle: match.brandName || 'Open Food Facts',
  confidence: match.confidence,
  basePortionCategory: 'medium',
  portionCategory: 'medium',
  portionOptions: ['medium'],
  foodData: toFoodData(match),
  barcode: match.barcode,
  productImageUrl: match.imageUrl,
  searchHint: match.name,
});

const buildManualResolution = (match: OpenFoodFactsMatch): ScanResolution => ({
  id: match.id,
  source: 'manual',
  label: match.name,
  detectedQuantity: 1,
  subtitle: match.brandName || 'Open Food Facts result',
  confidence: match.confidence,
  basePortionCategory: 'medium',
  portionCategory: 'medium',
  portionOptions: ['medium'],
  foodData: toFoodData(match),
  productImageUrl: match.imageUrl,
  searchHint: match.name,
});

const buildGeminiResolution = (
  analysis: GeminiFoodAnalysis,
  imageUri?: string
): ScanResolution => {
  const groupedItems = new Map<string, ScanDetectedItem>();

  for (const item of (analysis.items || [])) {
    const basePortionCategory = normalizePortionCategory(item.portionCategory);
    const dedupeKey = `${item.itemName.trim().toLowerCase()}::${basePortionCategory}`;
    const quantity = Math.max(1, (item as any).quantity || 1);

    const existing = groupedItems.get(dedupeKey);
    if (existing) {
      existing.detectedQuantity += quantity;
      existing.confidence = Math.max(existing.confidence, item.confidence);
      continue;
    }

    const id = `${item.itemName}-${groupedItems.size}`;
    groupedItems.set(dedupeKey, {
      id,
      label: item.itemName,
      detectedQuantity: quantity,
      confidence: item.confidence,
      basePortionCategory,
      portionCategory: basePortionCategory,
      portionOptions: ['small', 'medium', 'large'],
      foodData: {
        id,
        name: item.itemName,
        calories: item.estimatedNutrition.calories,
        carbs: item.estimatedNutrition.carbs,
        protein: item.estimatedNutrition.protein,
        fat: item.estimatedNutrition.fat,
        servingSize: item.estimatedNutrition.servingSize,
      },
    });
  }

  const detectedItems: ScanDetectedItem[] = Array.from(groupedItems.values());

  const primary = detectedItems[0] || {
    id: analysis.itemName,
    label: analysis.itemName,
    detectedQuantity: 1,
    confidence: analysis.confidence,
    basePortionCategory: normalizePortionCategory(analysis.portionCategory),
    portionCategory: normalizePortionCategory(analysis.portionCategory),
    portionOptions: ['small', 'medium', 'large'],
    foodData: {
      id: analysis.itemName,
      name: analysis.itemName,
      calories: analysis.estimatedNutrition.calories,
      carbs: analysis.estimatedNutrition.carbs,
      protein: analysis.estimatedNutrition.protein,
      fat: analysis.estimatedNutrition.fat,
      servingSize: analysis.estimatedNutrition.servingSize,
    },
  };

  return {
    id: primary.id,
    source: 'gemini',
    label: primary.label,
    detectedQuantity: primary.detectedQuantity,
    subtitle: analysis.brandName || analysis.imageNotes || 'Gemini vision result',
    confidence: primary.confidence,
    basePortionCategory: primary.basePortionCategory,
    portionCategory: primary.portionCategory,
    portionOptions: primary.portionOptions,
    foodData: primary.foodData,
    imageUri,
    searchHint: analysis.searchHint,
    analysis,
    detectedItems,
  };
};

export const resolveBarcodeScan = async (barcode: string): Promise<ScanResolution | null> => {
  const trimmedBarcode = barcode.trim();
  if (!trimmedBarcode) {
    return null;
  }

  const cached = await getCachedBarcodeResult<ScanResolution>(trimmedBarcode);
  if (cached && isValidScanResolution(cached)) {
    return cached;
  }

  const product = await lookupBarcodeFood(trimmedBarcode);
  if (!product) {
    return null;
  }

  const resolution = buildBarcodeResolution(product);
  await setCachedBarcodeResult(trimmedBarcode, resolution);
  return resolution;
};

export const resolveImageScan = async ({
  imageBase64,
  imageUri,
}: {
  imageBase64: string;
  imageUri?: string;
}): Promise<ScanResolution> => {
  const hashInput = imageBase64.slice(0, IMAGE_HASH_SAMPLE_LENGTH);
  const cacheKey = await digestStringAsync(CryptoDigestAlgorithm.SHA256, hashInput);
  const cached = await getCachedImageResult<ScanResolution>(cacheKey);
  if (cached && isValidScanResolution(cached)) {
    return cached;
  }

  const analysis = await analyzeFoodImage({ imageBase64 });
  const resolution = buildGeminiResolution(analysis, imageUri);

  // Do NOT cache "Unknown food" results — they indicate a transient Gemini failure.
  // If we cached them, the user would see "Unknown food" forever for that image.
  const isUnknown = resolution.label?.toLowerCase().includes('unknown');
  if (!isUnknown) {
    await setCachedImageResult(cacheKey, resolution);
  } else {
    console.warn('[ScanService] Skipping cache for unknown-food result');
  }

  return resolution;
};

export const searchManualFoods = async (query: string): Promise<ScanResolution[]> => {
  const results = await searchFoodsByText(query, 5);
  return results.map((result) => buildManualResolution(result));
};
