import { arrayUnion, doc, increment, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Updates the daily nutritional targets for a user in Firestore.
 */
export const updateUserTargets = async (
    userId: string,
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
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
            'generatedPlan.dailyCalories': targets.calories,
            'generatedPlan.macros.protein': targets.macros.protein,
            'generatedPlan.macros.fats': targets.macros.fats,
            'generatedPlan.macros.carbs': targets.macros.carbs,
            'generatedPlan.waterIntake': targets.waterIntake,
            lastUpdated: new Date(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating user targets:", error);
        throw error;
    }
};

/**
 * Updates generic user profile fields in Firestore.
 */
export const updateUserProfile = async (
    userId: string,
    updates: Record<string, any>
) => {
    try {
        const userDocRef = doc(db, 'users', userId);
        const updateData = {
            ...updates,
            lastUpdated: new Date(),
        };
        await updateDoc(userDocRef, updateData);
        return { success: true };
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw error;
    }
};

/**
 * Updates the consumed values for a specific date in Firestore.
 */
export const logConsumption = async (
    userId: string,
    dateString: string,
    values: {
        calories?: number;
        carbs?: number;
        protein?: number;
        fat?: number;
        water?: number;
    }
) => {
    try {
        const logDocRef = doc(db, 'users', userId, 'dailyLogs', dateString);
        await setDoc(logDocRef, {
            consumedCalories: values.calories ?? 0,
            totalCarbs: values.carbs ?? 0,
            totalProtein: values.protein ?? 0,
            totalFat: values.fat ?? 0,
            totalWater: values.water ?? 0,
            lastUpdated: new Date(),
        }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error logging consumption:", error);
        throw error;
    }
};

/**
 * Increments the consumed values for a specific date.
 */
export const incrementConsumption = async (
    userId: string,
    dateString: string,
    increments: {
        calories?: number;
        carbs?: number;
        protein?: number;
        fat?: number;
        water?: number;
    }
) => {
    try {
        const logDocRef = doc(db, 'users', userId, 'dailyLogs', dateString);
        const updateData: any = {
            lastUpdated: new Date(),
        };
        if (increments.calories !== undefined) updateData.consumedCalories = increment(increments.calories);
        if (increments.carbs !== undefined) updateData.totalCarbs = increment(increments.carbs);
        if (increments.protein !== undefined) updateData.totalProtein = increment(increments.protein);
        if (increments.fat !== undefined) updateData.totalFat = increment(increments.fat);
        if (increments.water !== undefined) {
            updateData.totalWater = increment(increments.water);
        }

        await setDoc(logDocRef, updateData, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error incrementing consumption:", error);
        throw error;
    }
};


export const addActivityLog = async (
    userId: string,
    dateString: string,
    activity: {
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
        createdAt?: Date;
    }
) => {
    try {
        const logDocRef = doc(db, 'users', userId, 'dailyLogs', dateString);
        const timestamp = activity.createdAt || new Date();

        const updateData: any = {
            logs: arrayUnion({
                ...activity,
                createdAt: timestamp
            }),
            lastUpdated: timestamp
        };

        if (activity.type === 'exercise') {
            updateData.caloriesBurned = increment(activity.calories);
        } else if (activity.type === 'food') {
            updateData.consumedCalories = increment(activity.calories);

            if (activity.macros) {
                if (activity.macros.carbs) updateData.totalCarbs = increment(activity.macros.carbs);
                if (activity.macros.protein) updateData.totalProtein = increment(activity.macros.protein);
                if (activity.macros.fat) updateData.totalFat = increment(activity.macros.fat);
            }
        } else if (activity.type === 'water') {
            let waterAmount = 0;
            if (activity.amount) {
                const amountStr = activity.amount.toLowerCase();
                if (amountStr.endsWith('l') && !amountStr.endsWith('ml')) {
                    waterAmount = parseFloat(amountStr) * 1000;
                } else {
                    waterAmount = parseFloat(amountStr);
                }
            } else {
                waterAmount = 250; // Default to 250ml
            }
            updateData.totalWater = increment(waterAmount);
            updateData.waterIntake = increment(waterAmount); 
        }

        await setDoc(logDocRef, updateData, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error adding activity log:", error);
        throw error;
    }
};
