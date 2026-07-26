/**
 * SwasthBharat — Meal Scheduler Service
 * Manages meal plans, grocery lists, and smart scheduling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MealPlanTemplate,
  ScheduledMeal,
  getMealPlan,
  getTodaysMeals,
  getNextMeal,
  getCurrentMeal,
  generateWeeklyGroceryList,
} from '../data/mealPlans';

const PLAN_STORAGE_KEY = 'swasthbharat_meal_plan';
const PREFERENCES_KEY = 'swasthbharat_meal_prefs';

export interface MealPreferences {
  goal: 'weight_loss' | 'maintain' | 'weight_gain' | 'muscle_gain';
  dietType: 'Veg' | 'Non-Veg' | 'Vegan';
  region: 'North' | 'South' | 'East' | 'West' | 'Pan-India';
  targetCalories: number;
}

// ── Save & Load Plan ───────────────────────────────────────────────────────
export const saveMealPlan = async (plan: MealPlanTemplate): Promise<void> => {
  await AsyncStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
};

export const loadMealPlan = async (): Promise<MealPlanTemplate | null> => {
  try {
    const val = await AsyncStorage.getItem(PLAN_STORAGE_KEY);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};

// ── Save & Load Preferences ───────────────────────────────────────────────
export const saveMealPreferences = async (prefs: MealPreferences): Promise<void> => {
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
};

export const loadMealPreferences = async (): Promise<MealPreferences | null> => {
  try {
    const val = await AsyncStorage.getItem(PREFERENCES_KEY);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};

// ── Generate a plan ────────────────────────────────────────────────────────
export const generateMealPlan = async (prefs: MealPreferences): Promise<MealPlanTemplate> => {
  const plan = getMealPlan(prefs.goal, prefs.dietType);
  await saveMealPlan(plan);
  await saveMealPreferences(prefs);
  return plan;
};

// ── Get today's schedule ───────────────────────────────────────────────────
export const getTodaysSchedule = async (): Promise<ScheduledMeal[]> => {
  let plan = await loadMealPlan();
  if (!plan) {
    plan = getMealPlan('maintain', 'Veg');
  }
  return getTodaysMeals(plan);
};

// ── Get next upcoming meal ─────────────────────────────────────────────────
export const getUpcomingMeal = async (): Promise<ScheduledMeal | null> => {
  const meals = await getTodaysSchedule();
  return getNextMeal(meals);
};

export const getActiveMeal = async (): Promise<ScheduledMeal | null> => {
  const meals = await getTodaysSchedule();
  return getCurrentMeal(meals);
};

// ── Grocery list ───────────────────────────────────────────────────────────
export const getWeeklyGroceryList = async (): Promise<string[]> => {
  const plan = await loadMealPlan();
  if (!plan) return [];
  return generateWeeklyGroceryList(plan);
};

// ── Time utilities ─────────────────────────────────────────────────────────
export const getMealIcon = (category: ScheduledMeal['mealCategory']): string => {
  const icons: Record<ScheduledMeal['mealCategory'], string> = {
    morning_detox: '🌿',
    breakfast: '🍳',
    mid_morning: '🍎',
    lunch: '🍛',
    evening: '☕',
    dinner: '🌙',
    bedtime: '🥛',
  };
  return icons[category] || '🍽️';
};

export const isMealTime = (meal: ScheduledMeal, windowMinutes = 30): boolean => {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [h, m] = meal.time.split(':').map(Number);
  const mealTime = h * 60 + m;
  return Math.abs(currentTime - mealTime) <= windowMinutes;
};

export const getMealStatus = (meal: ScheduledMeal): 'upcoming' | 'current' | 'past' => {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [h, m] = meal.time.split(':').map(Number);
  const mealTime = h * 60 + m;

  if (currentTime < mealTime - 30) return 'upcoming';
  if (currentTime > mealTime + 60) return 'past';
  return 'current';
};

export const formatTimeAgo = (time: string): string => {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [h, m] = time.split(':').map(Number);
  const mealTime = h * 60 + m;
  const diff = currentTime - mealTime;

  if (diff < 0) return `in ${Math.abs(diff)} min`;
  if (diff === 0) return 'now';
  if (diff < 60) return `${diff} min ago`;
  return `${Math.round(diff / 60)}h ago`;
};

// Re-export helpers
export { getTodaysMeals, getNextMeal, getCurrentMeal, ScheduledMeal };
