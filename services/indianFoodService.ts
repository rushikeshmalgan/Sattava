/**
 * SwasthBharat — Indian Food Service
 * Offline-first search: local Indian DB → FatSecret proxy → OpenFoodFacts
 */

import { INDIAN_FOODS, IndianFood, searchFoodsByName, DietType, MealType } from '../data/indianFoods';
import { FoodData } from './logService';

// Convert IndianFood → FoodData (for existing log flow)
export const indianFoodToFoodData = (food: IndianFood): FoodData => ({
  id: food.id,
  name: food.name,
  calories: food.calories,
  carbs: food.carbs,
  protein: food.protein,
  fat: food.fat,
  servingSize: food.servingSize,
});

/**
 * Search Indian foods locally with rich metadata
 */
export const searchLocalIndianFoods = (query: string, limit = 20): IndianFood[] => {
  const results = searchFoodsByName(query);
  return results.slice(0, limit);
};

/**
 * Get foods for a specific meal time, optionally filtered by diet type
 */
export const getFoodsForMeal = (
  mealType: MealType,
  dietType?: DietType,
  limit = 10
): IndianFood[] => {
  let foods = INDIAN_FOODS.filter(f => f.mealType.includes(mealType));

  if (dietType) {
    if (dietType === 'Veg') {
      foods = foods.filter(f => f.dietType === 'Veg' || f.dietType === 'Jain' || f.dietType === 'Vegan');
    } else if (dietType === 'Vegan') {
      foods = foods.filter(f => f.dietType === 'Vegan');
    } else if (dietType === 'Jain') {
      foods = foods.filter(f => f.dietType === 'Jain' || f.dietType === 'Vegan');
    }
    // Non-Veg: all included
  }

  return foods.slice(0, limit);
};

/**
 * Get popular foods (healthy + moderate) for quick-adding
 */
export const getPopularFoods = (dietType?: DietType): IndianFood[] => {
  let foods = INDIAN_FOODS.filter(
    f => f.tags.some(t => ['popular', 'staple', 'daily', 'protein'].includes(t))
  );
  if (dietType && dietType !== 'Non-Veg') {
    foods = foods.filter(f => f.dietType !== 'Non-Veg');
  }
  return foods.slice(0, 15);
};

/**
 * Get fasting foods (for Navratri, Ekadashi, etc.)
 */
export const getFastingFoods = (): IndianFood[] =>
  INDIAN_FOODS.filter(f => f.tags.some(t => ['fasting', 'ayurvedic', 'light'].includes(t)));

/**
 * Get healthy breakfast options
 */
export const getHealthyBreakfast = (dietType?: DietType): IndianFood[] => {
  return getFoodsForMeal('Breakfast', dietType).filter(f => f.healthRating === 'Healthy');
};

/**
 * Calculate Indian Diet Score (0–100)
 * Based on:
 * - Variety of food groups consumed
 * - Protein adequacy (ICMR: 60g/day)
 * - Fiber intake (ICMR: 40g/day)
 * - Water intake
 * - Calorie balance
 */
export const calculateIndianDietScore = (consumed: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  water: number;
  targetCalories: number;
  targetProtein?: number;
  targetWater?: number;
}): { score: number; breakdown: Record<string, number>; grade: string; message: string } => {
  const ICMR_PROTEIN = consumed.targetProtein || 60;  // grams/day
  const ICMR_FIBER = 40;                              // grams/day
  const ICMR_WATER = consumed.targetWater || 2000;    // ml/day

  // Protein score (0-25)
  const proteinRatio = Math.min(consumed.protein / ICMR_PROTEIN, 1.2);
  const proteinScore = proteinRatio >= 0.8 ? 25 : proteinRatio * 25;

  // Fiber score (0-20)
  const fiberRatio = Math.min((consumed.fiber || 15) / ICMR_FIBER, 1.2);
  const fiberScore = fiberRatio >= 0.8 ? 20 : fiberRatio * 20;

  // Calorie balance score (0-25)
  const calRatio = consumed.calories / consumed.targetCalories;
  const calScore = calRatio >= 0.7 && calRatio <= 1.1 ? 25 : Math.max(0, 25 - Math.abs(calRatio - 0.9) * 30);

  // Water score (0-15)
  const waterRatio = Math.min(consumed.water / ICMR_WATER, 1.2);
  const waterScore = waterRatio >= 0.8 ? 15 : waterRatio * 15;

  // Macro balance score (0-15): carbs 50-60%, fat 20-30%, protein 15-20%
  const total = consumed.calories || 1;
  const carbPct = (consumed.carbs * 4 / total) * 100;
  const fatPct = (consumed.fat * 9 / total) * 100;
  const macroBalance = carbPct >= 45 && carbPct <= 65 && fatPct >= 15 && fatPct <= 35 ? 15 : 8;

  const score = Math.round(Math.min(100, proteinScore + fiberScore + calScore + waterScore + macroBalance));

  const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
  const message =
    score >= 80 ? 'Shabash! Excellent Indian diet! 🎯' :
    score >= 60 ? 'Achi diet! Thoda aur improve karo 👍' :
    score >= 40 ? 'Average diet. Dal-sabzi-roti balance karo 🍛' :
    'Diet sahi karo — more variety needed 📊';

  return {
    score,
    grade,
    message,
    breakdown: {
      protein: Math.round(proteinScore),
      fiber: Math.round(fiberScore),
      calories: Math.round(calScore),
      water: Math.round(waterScore),
      balance: macroBalance,
    },
  };
};

// ICMR Recommended Daily Allowances (Indian RDA)
export const ICMR_RDA = {
  calories: 2000,       // kcal (sedentary adult)
  protein: 60,          // g (average adult)
  carbs: 310,           // g
  fat: 50,              // g
  fiber: 40,            // g
  water: 2000,          // ml
  calcium: 600,         // mg
  iron_female: 21,      // mg
  iron_male: 17,        // mg
  vitaminC: 40,         // mg
};
