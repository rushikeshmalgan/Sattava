/**
 * Public contract of the Sattava AI gateway (backend: /api/v1/*).
 * The server owns the authoritative Zod schemas (backend/src/ai/schemas); this
 * file mirrors them, and __fixtures__/vision-response.json is validated on both
 * sides so drift fails a test instead of shipping.
 */

export type PortionCategory = 'small' | 'medium' | 'large' | '1 bowl' | '1 plate' | '1 piece';

export const PORTION_CATEGORIES: readonly PortionCategory[] = ['small', 'medium', 'large', '1 bowl', '1 plate', '1 piece'];

export interface VisionApiNutrition {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  servingSize: string;
}

export interface VisionApiItem {
  itemName: string;
  portionCategory: PortionCategory;
  confidence: number;
  estimatedNutrition: VisionApiNutrition;
}

export interface VisionApiAnalysis {
  itemName: string;
  searchHint: string;
  portionCategory: PortionCategory;
  confidence: number;
  isPackaged: boolean;
  brandName?: string;
  imageNotes?: string;
  estimatedNutrition: VisionApiNutrition;
  items: VisionApiItem[];
}

export interface VisionApiResponse {
  analysis: VisionApiAnalysis;
  meta: { model: string; cached: boolean; promptVersion: string; requestId: string };
}

// ── Coach tasks ─────────────────────────────────────────────────────────────

export interface CoachInputs {
  diet_insight: {
    consumed: { calories: number; protein: number; carbs: number; fat: number };
    targets: { calories: number; protein: number; carbs: number; fat: number };
  };
  daily_tip: { calories: number; water: number; steps: number };
  diet_score_explanation: {
    score: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    water: number;
  };
  weekly_report: {
    daysLogged: number;
    avgCals: number;
    highestProteinGrams: number;
    highestProteinDay: string | null;
  };
  voice_coach: { transcript: string };
  profile_plan: {
    gender: string;
    goal: string;
    activityLevel: string;
    birthdate: { day: string; month: string; year: string };
    heightFeet: string;
    heightInches: string;
    weightKg: string;
  };
}

export type CoachTask = keyof CoachInputs;
export type CoachTextTask = Exclude<CoachTask, 'profile_plan'>;

export interface ProfilePlanDto {
  dailyCalories: number;
  macros: { carbs: string; protein: string; fats: string };
  waterIntake: string;
  planSummary: string;
  fitnessTips: string[];
  ayurvedicTip: string;
  indianMealTiming: { morning: string; breakfast: string; lunch: string; dinner: string };
  recommendedIndianFoods: string[];
  foodsToAvoid: string[];
}

// ── Errors ──────────────────────────────────────────────────────────────────

/** Codes the server sends in { error: { code } }. */
export type ServerErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_IMAGE'
  | 'UNAUTHENTICATED'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'AI_INVALID_OUTPUT'
  | 'AI_UNAVAILABLE'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

/** Failures that originate on the device. */
export type ClientErrorCode = 'NOT_SIGNED_IN' | 'NETWORK' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'IMAGE_TOO_LARGE' | 'CONFIG';

export type AiErrorCode = ServerErrorCode | ClientErrorCode;
