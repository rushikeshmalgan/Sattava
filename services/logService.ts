import { isExerciseLogType } from '../utils/logEntryTypes';
import { addLogEntry, fetchDailyLogs, loadDemoDays, removeLogEntry } from './dataApi';

export interface ExerciseData {
    id: string;
    type: 'cardio' | 'weight' | 'manual';
    name: string;
    duration: number;
    calories: number;
    intensity: string;
    createdAt?: Date;
}

/** The time shown next to a log entry: the device's own clock, which only the device knows. */
const currentTime = (): string => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Adds an exercise entry. The server raises the day's calories burned by exactly this entry's calories.
 */
export const addExerciseLog = async (dateString: string, exerciseData: ExerciseData) => {
    try {
        await addLogEntry(dateString, {
            type: exerciseData.type,
            itemId: exerciseData.id,
            name: exerciseData.name,
            calories: exerciseData.calories,
            duration: Math.max(0, exerciseData.duration),
            intensity: exerciseData.intensity,
            time: currentTime(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding exercise log:", error);
        throw error;
    }
};

export interface FoodData {
    id: string;
    name: string;
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber?: number;
    servingSize: string;
    createdAt?: Date;
}

/**
 * Adds a food entry. The server raises the day's calories and macros by exactly what this entry holds.
 */
export const addFoodLog = async (dateString: string, foodData: FoodData) => {
    try {
        await addLogEntry(dateString, {
            type: 'food',
            itemId: foodData.id,
            name: foodData.name,
            calories: foodData.calories,
            carbs: foodData.carbs,
            protein: foodData.protein,
            fat: foodData.fat,
            ...(foodData.fiber !== undefined ? { fiber: foodData.fiber } : {}),
            servingSize: foodData.servingSize || '1 serving',
            time: currentTime(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding food log:", error);
        throw error;
    }
};

/**
 * Deletes one entry of a day. The server takes back exactly what the entry added (calories, macros,
 * calories burned or water), so the totals stay equal to the sum of what is left.
 */
export const deleteLogEntry = async (dateString: string, entryId: string): Promise<void> => {
    try {
        await removeLogEntry(dateString, entryId);
    } catch (error) {
        console.error('Error deleting log entry:', error);
        throw error;
    }
};

/**
 * Replaces the last 7 days with balanced sample data for the presentation.
 */
export const loadDemoData = async () => {
    try {
        await loadDemoDays();
        return { success: true };
    } catch (error) {
        console.error("Error loading demo data:", error);
        throw error;
    }
};

/**
 * Calculates the current healthy streak.
 * Strict Gamification Rules:
 * - Calories must be between 80% and 120% of target.
 * - Water must be at least 80% of target.
 * - At least 1 exercise must be logged.
 */
export const getStreakCount = async (targetCalories: number, targetWater: number) => {
    try {
        const today = new Date();
        const dates: string[] = [];
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            dates.push(d.toISOString().split('T')[0]!);
        }

        // One request for the whole window instead of one per day.
        const days = await fetchDailyLogs({ from: dates[dates.length - 1]!, to: dates[0]!, limit: 30 });
        const byDate = new Map(days.map((day) => [day.date, day]));

        let streak = 0;
        for (let i = 0; i < dates.length; i++) {
            const data = byDate.get(dates[i]!);

            if (data) {
                const consumedCals = data.consumedCalories || 0;

                // Rule 1: Calories between 80% and 120% of target
                const calMet = consumedCals >= targetCalories * 0.8 && consumedCals <= targetCalories * 1.2;

                // Rule 2: Water at least 80%
                const waterMet = (data.totalWater || 0) >= targetWater * 0.8;

                // Rule 3: Exercise logged
                const exerciseMet = data.logs.some((entry) => isExerciseLogType(entry.type));

                if (calMet && waterMet && exerciseMet) {
                    streak++;
                } else if (i === 0) {
                    // Today not met yet, continue to check yesterday
                    continue;
                } else {
                    // Streak broken
                    break;
                }
            } else if (i === 0) {
                continue;
            } else {
                break;
            }
        }
        return streak;
    } catch (error) {
        console.error("Error calculating streak:", error);
        return 0;
    }
};
