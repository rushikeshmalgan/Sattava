/**
 * Sattva — Unified Food Search Service
 * Single entry point using exclusively the robust local Indian CSV database.
 */
import { searchLocalIndianFoods } from './localFoodService';
import type { LocalIndianFood } from './localFoodService';

export type { LocalIndianFood };

export interface UnifiedFoodResult {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber?: number;
  servingSize: string;
  source: 'local' | 'online';
}

/** Convert a local Indian CSV item into the unified shape, flooring decimals as requested */
const fromLocal = (item: LocalIndianFood): UnifiedFoodResult => ({
  id: item.id,
  name: item.name,
  brand: item.brand,
  calories: Math.floor(item.calories || 0),
  carbs: Math.floor(item.carbs || 0),
  protein: Math.floor(item.protein || 0),
  fat: Math.floor(item.fat || 0),
  fiber: Math.floor(item.fiber || 0),
  servingSize: item.servingSize,
  source: 'local',
});

/**
 * Search all food sources.
 * Returns local Indian database results instantly. FatSecret has been removed.
 */
export const searchAllFoods = async (
  query: string,
  onPartial?: (results: UnifiedFoodResult[]) => void
): Promise<UnifiedFoodResult[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // Instantly return local results with floored values
  const local = searchLocalIndianFoods(trimmed).map(fromLocal);
  
  if (onPartial) onPartial(local);

  return local;
};
