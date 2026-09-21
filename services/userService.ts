import type { NewLogEntry, UserPatch } from '../types/data';
import { addLogEntry, patchCurrentUser } from './dataApi';

/**
 * Updates the daily nutritional targets. Only these fields change; the rest of the plan (summary, tips) is kept.
 */
export const updateUserTargets = async (
    targets: {
        calories: number;
        macros: {
            protein: string;
            fats: string;
            carbs: string;
        };
        waterIntake: string;
    }
) => {
    try {
        await patchCurrentUser({
            generatedPlan: {
                dailyCalories: targets.calories,
                macros: {
                    protein: targets.macros.protein,
                    fats: targets.macros.fats,
                    carbs: targets.macros.carbs,
                },
                waterIntake: targets.waterIntake,
            },
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating user targets:", error);
        throw error;
    }
};

/**
 * Updates profile fields. Nested objects are merged field by field, so `{ userProfile: { goal } }` never wipes the name.
 */
export const updateUserProfile = async (updates: UserPatch) => {
    try {
        await patchCurrentUser(updates);
        return { success: true };
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw error;
    }
};

/**
 * Millilitres in a water amount as the water screen writes it ("250ml", "1L", "1.5l"). No amount means a glass, 250 ml.
 */
export const toWaterMl = (amount?: string): number => {
    if (!amount) return 250;
    const text = amount.trim().toLowerCase();
    const value = text.endsWith('l') && !text.endsWith('ml') ? parseFloat(text) * 1000 : parseFloat(text);
    return Number.isFinite(value) && value > 0 ? Math.min(Math.round(value), 20000) : 250;
};

export interface ActivityInput {
    id: string;
    name: string;
    calories: number;
    time: string;
    type: 'food' | 'exercise' | 'water';
    amount?: string;
    macros?: {
        carbs?: number;
        protein?: number;
        fat?: number;
    };
    intensity?: string;
    duration?: number;
    /** Some callers put macros at the top level instead of under `macros`. */
    carbs?: number;
    protein?: number;
    fat?: number;
}

/** Turns what a log screen collected into the entry the API accepts; fields the API does not know are left out. */
export const activityToEntry = (activity: ActivityInput): NewLogEntry => {
    const base = { itemId: activity.id, name: activity.name, time: activity.time };

    if (activity.type === 'water') {
        return { ...base, type: 'water', amountMl: toWaterMl(activity.amount), ...(activity.amount ? { amount: activity.amount } : {}) };
    }

    if (activity.type === 'exercise') {
        return {
            ...base,
            type: 'exercise',
            calories: activity.calories,
            ...(activity.duration !== undefined ? { duration: activity.duration } : {}),
            ...(activity.intensity ? { intensity: activity.intensity } : {}),
        };
    }

    const carbs = activity.macros?.carbs ?? activity.carbs;
    const protein = activity.macros?.protein ?? activity.protein;
    const fat = activity.macros?.fat ?? activity.fat;
    return {
        ...base,
        type: 'food',
        calories: activity.calories,
        ...(carbs ? { carbs } : {}),
        ...(protein ? { protein } : {}),
        ...(fat ? { fat } : {}),
        ...(activity.amount ? { amount: activity.amount } : {}),
    };
};

/**
 * Adds a food, exercise or water entry from the log screens. The server works out which totals it moves.
 */
export const addActivityLog = async (dateString: string, activity: ActivityInput) => {
    try {
        await addLogEntry(dateString, activityToEntry(activity));
        return { success: true };
    } catch (error) {
        console.error("Error adding activity log:", error);
        throw error;
    }
};
