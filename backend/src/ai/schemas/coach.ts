import { z } from 'zod';

/*
 * Server-owned text/JSON tasks. Clients send structured inputs only (numbers and
 * closed enums), never prompt text, so the endpoint cannot be used as a
 * general-purpose LLM proxy and there is nothing free-form to inject.
 */

const macro = z.number().min(0).max(20_000);
const grams = z.number().min(0).max(20_000);

const DietInsightInput = z.strictObject({
  consumed: z.strictObject({ calories: macro, protein: grams, carbs: grams, fat: grams }),
  targets: z.strictObject({ calories: macro, protein: grams, carbs: grams, fat: grams }),
});

const DailyTipInput = z.strictObject({
  calories: macro,
  water: z.number().min(0).max(20_000),
  steps: z.number().min(0).max(200_000),
});

const DietScoreInput = z.strictObject({
  score: z.number().min(0).max(100),
  calories: macro,
  protein: grams,
  carbs: grams,
  fat: grams,
  fiber: grams,
  water: z.number().min(0).max(20_000),
});

const WeeklyReportInput = z.strictObject({
  daysLogged: z.number().int().min(1).max(7),
  avgCals: macro,
  highestProteinGrams: grams,
  highestProteinDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

const VoiceCoachInput = z.strictObject({
  transcript: z.string().trim().min(1).max(300),
});

const ProfilePlanInput = z.strictObject({
  gender: z.enum(['Male', 'Female', 'Other']),
  goal: z.enum(['Lose Weight', 'Maintain Weight', 'Gain Weight']),
  activityLevel: z.enum(['2-3 Days / Week', '3-4 Days / Week', '5-6 Days / Week']),
  birthdate: z.strictObject({
    day: z.string().regex(/^\d{1,2}$/),
    month: z.string().regex(/^\d{1,2}$/),
    year: z.string().regex(/^\d{4}$/),
  }),
  heightFeet: z.string().regex(/^\d$/),
  heightInches: z.string().regex(/^\d{1,2}$/),
  weightKg: z.string().regex(/^\d{2,3}(\.\d{1,2})?$/),
});

export const CoachRequestSchema = z.discriminatedUnion('task', [
  z.strictObject({ task: z.literal('diet_insight'), input: DietInsightInput }),
  z.strictObject({ task: z.literal('daily_tip'), input: DailyTipInput }),
  z.strictObject({ task: z.literal('diet_score_explanation'), input: DietScoreInput }),
  z.strictObject({ task: z.literal('weekly_report'), input: WeeklyReportInput }),
  z.strictObject({ task: z.literal('voice_coach'), input: VoiceCoachInput }),
  z.strictObject({ task: z.literal('profile_plan'), input: ProfilePlanInput }),
]);

export type CoachRequest = z.infer<typeof CoachRequestSchema>;
export type CoachTask = CoachRequest['task'];
export type TextTask = Exclude<CoachTask, 'profile_plan'>;

// ── Profile plan (JSON output) ──────────────────────────────────────────────

/** Bounds mirror what a sane plan looks like; a hallucinated 20,000 kcal target is rejected, not stored. */
export const ProfilePlanSchema = z.strictObject({
  dailyCalories: z.number().int().min(1000).max(5000),
  macros: z.strictObject({
    carbs: z.string().regex(/^\d{2,3}g$/),
    protein: z.string().regex(/^\d{2,3}g$/),
    fats: z.string().regex(/^\d{2,3}g$/),
  }),
  waterIntake: z.string().regex(/^\d(\.\d)?L$/),
  planSummary: z.string().min(1).max(700),
  fitnessTips: z.array(z.string().min(1).max(220)).min(1).max(8),
  ayurvedicTip: z.string().min(1).max(320),
  indianMealTiming: z.strictObject({
    morning: z.string().min(1).max(200),
    breakfast: z.string().min(1).max(200),
    lunch: z.string().min(1).max(200),
    dinner: z.string().min(1).max(200),
  }),
  recommendedIndianFoods: z.array(z.string().min(1).max(60)).min(1).max(15),
  foodsToAvoid: z.array(z.string().min(1).max(60)).min(1).max(15),
});
export type ProfilePlan = z.infer<typeof ProfilePlanSchema>;

const meta = z.strictObject({
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  requestId: z.string().min(1),
});

export const CoachResponseSchema = z.union([
  z.strictObject({
    task: z.enum(['diet_insight', 'daily_tip', 'diet_score_explanation', 'weekly_report', 'voice_coach']),
    text: z.string().min(1),
    meta,
  }),
  z.strictObject({ task: z.literal('profile_plan'), plan: ProfilePlanSchema, meta }),
]);
export type CoachResponse = z.infer<typeof CoachResponseSchema>;

// ── Raw (tolerant) profile output ───────────────────────────────────────────

const looseString = z.preprocess((v) => (typeof v === 'number' ? String(v) : v), z.string());
const looseNumber = z.preprocess((v) => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = v.match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : v;
  }
  return v;
}, z.number());

export const RawProfilePlanSchema = z.object({
  dailyCalories: looseNumber,
  macros: z.object({ carbs: looseString, protein: looseString, fats: looseString }),
  waterIntake: looseString,
  planSummary: z.string(),
  fitnessTips: z.array(z.string()),
  ayurvedicTip: z.string(),
  indianMealTiming: z.object({ morning: z.string(), breakfast: z.string(), lunch: z.string(), dinner: z.string() }),
  recommendedIndianFoods: z.array(z.string()),
  foodsToAvoid: z.array(z.string()),
});
