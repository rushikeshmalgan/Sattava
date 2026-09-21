/**
 * Public contract of the Sattava data API (backend: /api/v1/me and /api/v1/logs). The server owns the
 * authoritative Zod schemas (backend/src/data/schemas.ts); this file mirrors what the app sends and receives.
 * Dates travel as ISO strings.
 */

export type LogEntryType = 'food' | 'exercise' | 'cardio' | 'weight' | 'manual' | 'water';

/** One line in a day's log. `id` is unique per entry and is what a delete refers to. */
export interface LogEntryDoc {
  id: string;
  type: LogEntryType;
  /** The food's or dish's own id from the app's datasets. */
  itemId?: string;
  name: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  fiber?: number;
  amountMl?: number;
  servingSize?: string;
  amount?: string;
  time?: string;
  duration?: number;
  intensity?: string;
  createdAt: string;
}

export interface DailyLogDoc {
  date: string;
  consumedCalories: number;
  caloriesBurned: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  totalFiber: number;
  totalWater: number;
  logs: LogEntryDoc[];
  lastUpdated: string;
}

export interface PhysicalProfileDoc {
  gender: string;
  goal: string;
  activityLevel: string;
  birthdate: { day: string; month: string; year: string };
  heightFeet: string;
  heightInches: string;
  weightKg: string;
}

export interface UserProfileFields {
  name?: string;
  goal?: string;
  activityLevel?: string;
  coachType?: string;
  dietType?: string;
}

export interface GeneratedPlanFields {
  dailyCalories?: number;
  macros?: { carbs?: string; protein?: string; fats?: string };
  waterIntake?: string;
  planSummary?: string;
  fitnessTips?: string[];
}

export interface UserDoc {
  id: string;
  email?: string;
  name?: string;
  photo?: string;
  provider?: string;
  imageUrl?: string;
  createdAt?: string;
  lastLoginAt?: string;
  lastUpdated?: string;
  onboardingCompletedAt?: string;
  onboardingCompleted?: boolean;
  isSetupCompleted?: boolean;
  generatedPlanStale?: boolean;
  physicalProfile?: PhysicalProfileDoc;
  userProfile?: UserProfileFields;
  generatedPlan?: GeneratedPlanFields;
}

/** What may be changed with PATCH /me. Profile and plan fields are merged one by one; the physical profile is replaced. */
export interface UserPatch {
  physicalProfile?: PhysicalProfileDoc;
  userProfile?: UserProfileFields;
  generatedPlan?: GeneratedPlanFields;
  onboardingCompleted?: boolean;
  isSetupCompleted?: boolean;
  generatedPlanStale?: boolean;
  imageUrl?: string;
}

export interface SyncUserInput {
  email?: string;
  name?: string;
  photo?: string;
  provider?: string;
}

interface EntryBase {
  itemId?: string;
  name: string;
  time?: string;
}

/** A new log entry. The server adds the id and the timestamp, and works out which totals it moves. */
export type NewLogEntry =
  | (EntryBase & {
      type: 'food';
      calories: number;
      carbs?: number;
      protein?: number;
      fat?: number;
      fiber?: number;
      servingSize?: string;
      amount?: string;
    })
  | (EntryBase & {
      type: 'exercise' | 'cardio' | 'weight' | 'manual';
      calories: number;
      duration?: number;
      intensity?: string;
    })
  | (EntryBase & { type: 'water'; amountMl: number; amount?: string });

export interface LogsQuery {
  from?: string;
  to?: string;
  limit?: number;
}
