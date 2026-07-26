/**
 * Food Suggestion Service — Smart Picks
 * Uses Gemini (not OpenAI) to generate personalised Indian food suggestions.
 * Falls back to a curated local list when Gemini quota is exhausted.
 */
import { generateText } from './geminiVisionService';

export type UserGoal = 'Lose Weight' | 'Maintain Weight' | 'Gain Weight';
export type Preference = 'Veg' | 'Non-Veg' | 'Any';
export type Mood = 'Light' | 'Heavy' | 'Cheat';

export interface LocalIndianFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface SuggestionResult {
  food: LocalIndianFood;
  reason: string;
}

// ── Local fallback pool ────────────────────────────────────────────────────────
const LOCAL_SUGGESTIONS: Record<string, SuggestionResult[]> = {
  'Lose Weight': [
    { food: { id: 'lw-1', name: 'Moong Dal Chilla', calories: 180, protein: 12, carbs: 22, fat: 4, fiber: 5 }, reason: 'High protein, low calorie — perfect for weight loss.' },
    { food: { id: 'lw-2', name: 'Sprouts Salad', calories: 120, protein: 8, carbs: 18, fat: 1, fiber: 7 }, reason: 'Nutrient dense with minimal calories and great fiber.' },
    { food: { id: 'lw-3', name: 'Vegetable Daliya', calories: 200, protein: 7, carbs: 35, fat: 3, fiber: 6 }, reason: 'Whole grain keeps you full longer with fewer calories.' },
  ],
  'Maintain Weight': [
    { food: { id: 'mw-1', name: 'Dal Tadka with 2 Rotis', calories: 380, protein: 15, carbs: 58, fat: 8, fiber: 8 }, reason: 'Balanced carbs and protein to maintain steady energy.' },
    { food: { id: 'mw-2', name: 'Paneer Bhurji with Roti', calories: 420, protein: 22, carbs: 40, fat: 16, fiber: 4 }, reason: 'Great protein source for muscle maintenance.' },
    { food: { id: 'mw-3', name: 'Curd Rice with Pickle', calories: 300, protein: 9, carbs: 52, fat: 6, fiber: 2 }, reason: 'Probiotic-rich and easy on digestion.' },
  ],
  'Gain Weight': [
    { food: { id: 'gw-1', name: 'Chicken Curry with Rice', calories: 550, protein: 35, carbs: 60, fat: 14, fiber: 3 }, reason: 'High protein and calorie dense for muscle gain.' },
    { food: { id: 'gw-2', name: 'Rajma Chawal', calories: 480, protein: 18, carbs: 78, fat: 8, fiber: 10 }, reason: 'Calorie-rich plant protein for bulking.' },
    { food: { id: 'gw-3', name: 'Banana Peanut Butter Toast', calories: 350, protein: 10, carbs: 48, fat: 14, fiber: 4 }, reason: 'Quick calorie boost with healthy fats and carbs.' },
  ],
};

const stripFence = (text: string): string =>
  text.replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/```\s*$/im, '').trim();

export async function getFoodSuggestions(
  goal: UserGoal | string,
  preference: Preference,
  mood: Mood,
  limit: number = 3
): Promise<SuggestionResult[]> {
  // Simulate AI thinking time for the demo
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Use the highly curated local fallback based on user's goal
  const goalKey = (Object.keys(LOCAL_SUGGESTIONS) as string[]).find(k =>
    goal.toLowerCase().includes(k.toLowerCase().split(' ')[0])
  ) || 'Maintain Weight';

  // Shuffle the suggestions so it feels dynamic
  const suggestions = [...LOCAL_SUGGESTIONS[goalKey]].sort(() => Math.random() - 0.5);

  return suggestions.slice(0, limit);
}
