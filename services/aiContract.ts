import { PORTION_CATEGORIES, type ProfilePlanDto, type VisionApiAnalysis, type VisionApiItem, type VisionApiNutrition, type VisionApiResponse } from '../types/ai';

/**
 * Runtime guards for server responses. The server validates before sending;
 * checking again on the device means a bad deploy or an intercepting proxy can
 * never feed malformed (or fabricated) nutrition into the app.
 */

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isPortion = (v: unknown): boolean => typeof v === 'string' && (PORTION_CATEGORIES as readonly string[]).includes(v);
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

const isNutrition = (v: unknown): v is VisionApiNutrition =>
  isRecord(v) &&
  isFiniteNumber(v.calories) && v.calories >= 0 &&
  isFiniteNumber(v.carbs) && v.carbs >= 0 &&
  isFiniteNumber(v.protein) && v.protein >= 0 &&
  isFiniteNumber(v.fat) && v.fat >= 0 &&
  isNonEmptyString(v.servingSize);

const isItem = (v: unknown): v is VisionApiItem =>
  isRecord(v) &&
  isNonEmptyString(v.itemName) &&
  isPortion(v.portionCategory) &&
  isFiniteNumber(v.confidence) && v.confidence >= 0 && v.confidence <= 1 &&
  isNutrition(v.estimatedNutrition);

const isAnalysis = (v: unknown): v is VisionApiAnalysis =>
  isRecord(v) &&
  isNonEmptyString(v.itemName) &&
  isNonEmptyString(v.searchHint) &&
  isPortion(v.portionCategory) &&
  isFiniteNumber(v.confidence) &&
  typeof v.isPackaged === 'boolean' &&
  (v.brandName === undefined || typeof v.brandName === 'string') &&
  (v.imageNotes === undefined || typeof v.imageNotes === 'string') &&
  isNutrition(v.estimatedNutrition) &&
  Array.isArray(v.items) && v.items.length > 0 && v.items.every(isItem);

export const isVisionApiResponse = (v: unknown): v is VisionApiResponse =>
  isRecord(v) &&
  isAnalysis(v.analysis) &&
  isRecord(v.meta) &&
  isNonEmptyString(v.meta.model) &&
  typeof v.meta.cached === 'boolean' &&
  isNonEmptyString(v.meta.promptVersion) &&
  isNonEmptyString(v.meta.requestId);

const isPlan = (v: unknown): v is ProfilePlanDto =>
  isRecord(v) &&
  isFiniteNumber(v.dailyCalories) && v.dailyCalories > 0 &&
  isRecord(v.macros) && isNonEmptyString(v.macros.carbs) && isNonEmptyString(v.macros.protein) && isNonEmptyString(v.macros.fats) &&
  isNonEmptyString(v.waterIntake) &&
  isNonEmptyString(v.planSummary) &&
  isStringArray(v.fitnessTips) &&
  isNonEmptyString(v.ayurvedicTip) &&
  isRecord(v.indianMealTiming) &&
  isStringArray(v.recommendedIndianFoods) &&
  isStringArray(v.foodsToAvoid);

export const isCoachTextResponse = (v: unknown): v is { task: string; text: string } =>
  isRecord(v) && isNonEmptyString(v.task) && isNonEmptyString(v.text) && isRecord(v.meta);

export const isCoachPlanResponse = (v: unknown): v is { task: 'profile_plan'; plan: ProfilePlanDto } =>
  isRecord(v) && v.task === 'profile_plan' && isPlan(v.plan) && isRecord(v.meta);
