/**
 * Sanity bounds for what a client may log. They are the same numbers the Firestore security rules
 * enforced before the move to MongoDB, and they are now enforced here, by the API, because the app
 * can no longer talk to the database directly. They are limits on plausibility, not nutrition advice.
 */
export const MAX_KCAL_PER_ENTRY = 10_000;
export const MAX_GRAMS_PER_ENTRY = 1_000;
export const MAX_DURATION_MIN = 1_440;

export const MAX_KCAL_PER_DAY = 30_000;
export const MAX_GRAMS_PER_DAY = 3_000;
export const MAX_WATER_ML_PER_DAY = 20_000;

/** A day holds at most this many log entries. */
export const MAX_ENTRIES_PER_DAY = 500;

/** The totals kept on every daily log, and the most each may reach in one day. */
export const DAY_CAPS = {
  consumedCalories: MAX_KCAL_PER_DAY,
  caloriesBurned: MAX_KCAL_PER_DAY,
  totalCarbs: MAX_GRAMS_PER_DAY,
  totalProtein: MAX_GRAMS_PER_DAY,
  totalFat: MAX_GRAMS_PER_DAY,
  totalFiber: MAX_GRAMS_PER_DAY,
  totalWater: MAX_WATER_ML_PER_DAY,
} as const;

export type TotalField = keyof typeof DAY_CAPS;

export const TOTAL_FIELDS = Object.keys(DAY_CAPS) as TotalField[];
