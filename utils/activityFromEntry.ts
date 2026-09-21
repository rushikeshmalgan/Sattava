import type { Activity } from '../components/RecentActivity';
import type { LogEntryDoc } from '../types/data';

/**
 * A log entry as the activity feed shows it. The feed needs a calorie figure and a time on every row, and shows
 * water as its amount, so what the API leaves out is filled in here rather than in the component.
 */
export const activityFromEntry = (entry: LogEntryDoc): Activity => ({
  id: entry.id,
  name: entry.name,
  calories: entry.calories ?? 0,
  time: entry.time ?? '',
  type: entry.type,
  amount: entry.amount ?? (entry.amountMl !== undefined ? `${entry.amountMl}ml` : undefined),
  intensity: entry.intensity,
  duration: entry.duration,
  carbs: entry.carbs,
  protein: entry.protein,
  fat: entry.fat,
  fiber: entry.fiber,
  createdAt: entry.createdAt,
});
