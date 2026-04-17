import { FoodData } from './logService';

const OPEN_FOOD_FACTS_BASE_URL = 'https://world.openfoodfacts.org';
const OFF_FIELDS = [
  'product_name',
  'generic_name',
  'brands',
  'serving_size',
  'quantity',
  'nutriments',
  'image_front_url',
  'url',
  'code',
].join(',');

export interface OpenFoodFactsMatch {
  id: string;
  name: string;
  brandName?: string;
  servingSize: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  barcode?: string;
  imageUrl?: string;
  productUrl?: string;
  confidence: number;
  source: 'barcode' | 'search';
}

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) || 0 : 0;
  }

  return 0;
};

const parseServingSizeGrams = (servingSize?: string, quantity?: string): number => {
  const source = servingSize || quantity || '';
  const match = source.match(/(\d+(?:\.\d+)?)\s*(g|gram|grams|ml|milliliter|milliliters)/i);
  if (!match) {
    return 100;
  }

  return Number(match[1]) || 100;
};

const scaleNutrition = (per100gValue: number, servingGrams: number): number => {
  if (!Number.isFinite(per100gValue) || per100gValue <= 0) {
    return 0;
  }

  return Math.max(0, Math.round((per100gValue * servingGrams) / 100));
};

const normalizeProduct = (
  product: any,
  source: 'barcode' | 'search',
  confidence: number
): OpenFoodFactsMatch | null => {
  const name = product?.product_name || product?.generic_name || product?.brands;
  if (!name) {
    return null;
  }

  const servingSize = product?.serving_size || product?.quantity || '100g';
  const servingGrams = parseServingSizeGrams(product?.serving_size, product?.quantity);
  const nutriments = product?.nutriments || {};

  const caloriesPer100g =
    parseNumber(nutriments['energy-kcal_100g']) ||
    parseNumber(nutriments['energy-kcal']) ||
    parseNumber(nutriments['energy-kcal_serving']);
  const carbsPer100g =
    parseNumber(nutriments['carbohydrates_100g']) ||
    parseNumber(nutriments['carbohydrates']) ||
    parseNumber(nutriments['carbohydrates_serving']);
  const proteinPer100g =
    parseNumber(nutriments['proteins_100g']) ||
    parseNumber(nutriments['proteins']) ||
    parseNumber(nutriments['proteins_serving']);
  const fatPer100g =
    parseNumber(nutriments['fat_100g']) ||
    parseNumber(nutriments['fat']) ||
    parseNumber(nutriments['fat_serving']);

  return {
    id: String(product?.code || name),
    name: String(name).trim(),
    brandName: product?.brands || undefined,
    servingSize,
    calories: source === 'barcode' ? scaleNutrition(caloriesPer100g, servingGrams) : Math.round(caloriesPer100g),
    carbs: source === 'barcode' ? scaleNutrition(carbsPer100g, servingGrams) : Math.round(carbsPer100g),
    protein: source === 'barcode' ? scaleNutrition(proteinPer100g, servingGrams) : Math.round(proteinPer100g),
    fat: source === 'barcode' ? scaleNutrition(fatPer100g, servingGrams) : Math.round(fatPer100g),
    barcode: product?.code || undefined,
    imageUrl: product?.image_front_url || undefined,
    productUrl: product?.url || undefined,
    confidence,
    source,
  };
};

export const toFoodData = (match: OpenFoodFactsMatch): FoodData => ({
  id: match.id,
  name: match.name,
  calories: match.calories,
  carbs: match.carbs,
  protein: match.protein,
  fat: match.fat,
  servingSize: match.servingSize,
});

export const lookupBarcodeFood = async (barcode: string): Promise<OpenFoodFactsMatch | null> => {
  const trimmedBarcode = barcode.trim();
  if (!trimmedBarcode) {
    return null;
  }

  const response = await fetch(
    `${OPEN_FOOD_FACTS_BASE_URL}/api/v2/product/${encodeURIComponent(trimmedBarcode)}?fields=${encodeURIComponent(OFF_FIELDS)}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch barcode product.');
  }

  const payload = await response.json();
  if (!payload?.product || Number(payload?.status) !== 1) {
    return null;
  }

  return normalizeProduct(payload.product, 'barcode', 0.97);
};

export const searchFoodsByText = async (query: string, limit = 5): Promise<OpenFoodFactsMatch[]> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const response = await fetch(
    `${OPEN_FOOD_FACTS_BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(trimmedQuery)}&search_simple=1&action=process&json=1&page_size=${limit}&fields=${encodeURIComponent(OFF_FIELDS)}`
  );

  if (!response.ok) {
    throw new Error('Failed to search Open Food Facts.');
  }

  const payload = await response.json();
  const products = Array.isArray(payload?.products) ? payload.products : [];

  return products
    .map((product: any, index: number) => normalizeProduct(product, 'search', Math.max(0.75, 0.9 - index * 0.05)))
    .filter((item: OpenFoodFactsMatch | null): item is OpenFoodFactsMatch => Boolean(item));
};
