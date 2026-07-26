/**
 * Tests for services/mealSchedulerService.ts
 *
 * AsyncStorage is explicitly mocked below so no native module is required.
 */

// ── Mock AsyncStorage with a real in-memory store ─────────────────────────────
const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    removeItem: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(k => delete store[k]);
      return Promise.resolve();
    }),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  saveMealPlan,
  loadMealPlan,
  saveMealPreferences,
  loadMealPreferences,
  generateMealPlan,
  getTodaysSchedule,
  isMealTime,
  getMealStatus,
  getMealIcon,
  formatTimeAgo,
  MealPreferences,
} from '../services/mealSchedulerService';
import type { ScheduledMeal } from '../data/mealPlans';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal ScheduledMeal matching the exact interface in data/mealPlans.ts */
const makeMeal = (id: string, time: string): ScheduledMeal => ({
  id,
  time,
  timeDisplay: time,
  label: `Meal ${id}`,
  labelHindi: `भोजन ${id}`,
  items: ['Poha'],
  estimatedCalories: 250,
  mealCategory: 'breakfast',
});

/** Build a time string for "now + offsetMinutes" */
const timeOffset = (offsetMinutes: number): string => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + offsetMinutes);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('mealSchedulerService — saveMealPlan / loadMealPlan', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    // Re-register mocks after clearAllMocks
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    });
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => Promise.resolve(store[key] ?? null));
    (AsyncStorage.clear as jest.Mock).mockImplementation(() => {
      Object.keys(store).forEach(k => delete store[k]);
      return Promise.resolve();
    });
  });

  it('returns null when no plan has been saved', async () => {
    const plan = await loadMealPlan();
    expect(plan).toBeNull();
  });

  it('round-trips a meal plan through AsyncStorage', async () => {
    const prefs: MealPreferences = { goal: 'maintain', dietType: 'Veg', region: 'North', targetCalories: 2000 };
    const saved = await generateMealPlan(prefs);
    const loaded = await loadMealPlan();

    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe(saved.id);
    expect(loaded?.goal).toBe(saved.goal);
  });

  it('overwrites the previous plan when saved again', async () => {
    const prefs1: MealPreferences = { goal: 'weight_loss', dietType: 'Veg', region: 'North', targetCalories: 1500 };
    const prefs2: MealPreferences = { goal: 'muscle_gain', dietType: 'Non-Veg', region: 'South', targetCalories: 2800 };

    await generateMealPlan(prefs1);
    await generateMealPlan(prefs2);

    const loadedPrefs = await loadMealPreferences();
    expect(loadedPrefs?.goal).toBe('muscle_gain');
  });
});

describe('mealSchedulerService — saveMealPreferences / loadMealPreferences', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    });
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => Promise.resolve(store[key] ?? null));
    (AsyncStorage.clear as jest.Mock).mockImplementation(() => {
      Object.keys(store).forEach(k => delete store[k]);
      return Promise.resolve();
    });
  });

  it('returns null when no preferences have been saved', async () => {
    const prefs = await loadMealPreferences();
    expect(prefs).toBeNull();
  });

  it('round-trips preferences through AsyncStorage', async () => {
    const input: MealPreferences = { goal: 'weight_gain', dietType: 'Vegan', region: 'West', targetCalories: 2500 };
    await saveMealPreferences(input);
    const loaded = await loadMealPreferences();
    expect(loaded).toEqual(input);
  });
});

describe('mealSchedulerService — generateMealPlan', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    });
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => Promise.resolve(store[key] ?? null));
    (AsyncStorage.clear as jest.Mock).mockImplementation(() => {
      Object.keys(store).forEach(k => delete store[k]);
      return Promise.resolve();
    });
  });

  it('returns a plan with id, goal, dietType, targetCalories, and days', async () => {
    const prefs: MealPreferences = { goal: 'maintain', dietType: 'Veg', region: 'North', targetCalories: 2000 };
    const plan = await generateMealPlan(prefs);

    expect(plan).toBeDefined();
    expect(typeof plan.id).toBe('string');
    expect(plan.goal).toBe('maintain');
    expect(plan.dietType).toBe('Veg');
    expect(Array.isArray(plan.days)).toBe(true);
  });

  it('returns different calorie targets for different goals with the same dietType', async () => {
    const maintainPlan = await generateMealPlan({ goal: 'maintain', dietType: 'Veg', region: 'North', targetCalories: 2000 });
    const gainPlan = await generateMealPlan({ goal: 'muscle_gain', dietType: 'Veg', region: 'North', targetCalories: 2800 });

    expect(maintainPlan.targetCalories).toBeLessThan(gainPlan.targetCalories);
    expect(maintainPlan.goal).toBe('maintain');
    expect(maintainPlan.dietType).toBe('Veg');
    expect(gainPlan.goal).toBe('muscle_gain');
    expect(gainPlan.dietType).toBe('Veg');
  });

  it('saves both plan and prefs to storage during generation', async () => {
    const prefs: MealPreferences = { goal: 'weight_loss', dietType: 'Veg', region: 'South', targetCalories: 1500 };
    await generateMealPlan(prefs);

    const savedPlan = await loadMealPlan();
    const savedPrefs = await loadMealPreferences();

    expect(savedPlan).not.toBeNull();
    expect(savedPrefs?.goal).toBe('weight_loss');
    expect(savedPrefs?.dietType).toBe('Veg');
  });
});

describe('mealSchedulerService — getTodaysSchedule', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    });
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => Promise.resolve(store[key] ?? null));
    (AsyncStorage.clear as jest.Mock).mockImplementation(() => {
      Object.keys(store).forEach(k => delete store[k]);
      return Promise.resolve();
    });
  });

  it('returns an array of meals (falls back to default when no plan saved)', async () => {
    const meals = await getTodaysSchedule();
    expect(Array.isArray(meals)).toBe(true);
    expect(meals.length).toBeGreaterThan(0);
  });

  it('returns meals from the saved plan when one exists', async () => {
    const prefs: MealPreferences = { goal: 'muscle_gain', dietType: 'Non-Veg', region: 'North', targetCalories: 2800 };
    await generateMealPlan(prefs);
    const meals = await getTodaysSchedule();
    expect(meals.length).toBeGreaterThan(0);
    meals.forEach((meal: ScheduledMeal) => {
      expect(typeof meal.id).toBe('string');
      expect(typeof meal.time).toBe('string');
      expect(typeof meal.label).toBe('string');
    });
  });
});

describe('mealSchedulerService — isMealTime', () => {
  it('returns true when the meal is within the default 30-min window', () => {
    const meal = makeMeal('m1', timeOffset(10)); // 10 min from now
    expect(isMealTime(meal)).toBe(true);
  });

  it('returns false when the meal is outside the window', () => {
    const meal = makeMeal('m2', timeOffset(60)); // 60 min from now
    expect(isMealTime(meal)).toBe(false);
  });

  it('respects a custom window', () => {
    const meal = makeMeal('m3', timeOffset(45)); // 45 min from now
    expect(isMealTime(meal, 60)).toBe(true);
    expect(isMealTime(meal, 30)).toBe(false);
  });
});

describe('mealSchedulerService — getMealStatus', () => {
  it('returns "upcoming" for a meal more than 30 min in the future', () => {
    const meal = makeMeal('m1', timeOffset(60));
    expect(getMealStatus(meal)).toBe('upcoming');
  });

  it('returns "past" for a meal more than 60 min in the past', () => {
    const meal = makeMeal('m2', timeOffset(-90));
    expect(getMealStatus(meal)).toBe('past');
  });

  it('returns "current" for a meal within the current window', () => {
    const meal = makeMeal('m3', timeOffset(0));
    expect(getMealStatus(meal)).toBe('current');
  });
});

describe('mealSchedulerService — getMealIcon', () => {
  it('returns the correct emoji for each meal category', () => {
    expect(getMealIcon('breakfast')).toBe('🍳');
    expect(getMealIcon('lunch')).toBe('🍛');
    expect(getMealIcon('dinner')).toBe('🌙');
    expect(getMealIcon('morning_detox')).toBe('🌿');
    expect(getMealIcon('evening')).toBe('☕');
  });
});

describe('mealSchedulerService — formatTimeAgo', () => {
  it('returns "in X min" for a future meal', () => {
    const future = timeOffset(20);
    expect(formatTimeAgo(future)).toMatch(/^in \d+ min$/);
  });

  it('returns "X min ago" for a recently past meal', () => {
    const past = timeOffset(-15);
    expect(formatTimeAgo(past)).toMatch(/^\d+ min ago$/);
  });

  it('returns "Xh ago" for a meal more than an hour in the past', () => {
    const past = timeOffset(-90);
    expect(formatTimeAgo(past)).toMatch(/^\d+h ago$/);
  });
});
