import { arrayRemove, arrayUnion, doc, getDoc, increment, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { showSmartToast } from '../components/SmartToast';

export interface ExerciseData {
    id: string;
    type: 'cardio' | 'weight' | 'manual';
    name: string;
    duration: number;
    calories: number;
    intensity: string;
    createdAt?: Date;
}

/**
 * Adds an exercise log entry and updates the daily calories burned total.
 */
export const addExerciseLog = async (
    userId: string,
    dateString: string,
    exerciseData: ExerciseData
) => {
    try {
        const logDocRef = doc(db, 'users', userId, 'dailyLogs', dateString);
        const timestamp = new Date();
        
        const fullExerciseData = {
            ...exerciseData,
            createdAt: timestamp
        };

        const updateData: any = {
            exercises: arrayUnion(fullExerciseData),
            logs: arrayUnion({
                ...fullExerciseData,
                time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                amount: `${exerciseData.duration > 0 ? exerciseData.duration : 0} min`
            }),
            caloriesBurned: increment(exerciseData.calories),
            lastUpdated: timestamp
        };

        await setDoc(logDocRef, updateData, { merge: true });
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
 * Adds a food log entry and updates the daily calories consumed total.
 */
export const addFoodLog = async (
    userId: string,
    dateString: string,
    foodData: FoodData
) => {
    try {
        const logDocRef = doc(db, 'users', userId, 'dailyLogs', dateString);
        const timestamp = new Date();

        const fullFoodData = { ...foodData, createdAt: timestamp };

        const updateData: any = {
    foods: arrayUnion(fullFoodData),
    logs: arrayUnion({
        id: foodData.id,
        type: 'food',
        name: foodData.name,
        calories: foodData.calories,
        amount: foodData.servingSize || '1 serving',
        time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: timestamp,
    }),

    consumedCalories: increment(foodData.calories),
    totalCarbs: increment(foodData.carbs),
    totalProtein: increment(foodData.protein),
    totalFat: increment(foodData.fat),
    ...(foodData.fiber !== undefined ? { totalFiber: increment(foodData.fiber) } : {}),
    lastUpdated: timestamp
};

        await setDoc(logDocRef, updateData, { merge: true });
        
        // Trigger In-App Alert
        const isHealthy = foodData.protein > (foodData.calories * 0.05) && foodData.fat < (foodData.calories * 0.03);
        const isUnhealthy = foodData.calories > 600 || foodData.fat > 25;

        if (isUnhealthy) {
            showSmartToast({
                message: `Logged ${foodData.name}. Warning: High calorie/fat content.`,
                type: 'unhealthy'
            });
        } else if (isHealthy) {
            showSmartToast({
                message: `Excellent choice! Healthy ${foodData.name} logged.`,
                type: 'success'
            });
        } else {
            showSmartToast({
                message: `${foodData.name} logged successfully!`,
                type: 'success'
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Error adding food log:", error);
        throw error;
    }
};

// ── Delete a food log entry and reverse its nutritional contribution ─────────

export const deleteFoodLog = async (
    userId: string,
    dateString: string,
    logEntry: {
        id: string;
        name: string;
        calories: number;
        carbs?: number;
        protein?: number;
        fat?: number;
        fiber?: number;
        servingSize?: string;
        type?: string;
        amount?: string;
        time?: string;
        createdAt?: Date;
    }
): Promise<void> => {
    try {
        const logDocRef = doc(db, 'users', userId, 'dailyLogs', dateString);

        // We need to remove the exact object stored in the logs array.
        // arrayRemove uses deep equality, so we must pass the matching shape.
        const updateData: any = {
            logs: arrayRemove(logEntry),
            lastUpdated: new Date(),
        };

        // Reverse the nutritional totals
        if (logEntry.type === 'food' || !logEntry.type) {
            if (logEntry.calories) updateData.consumedCalories = increment(-logEntry.calories);
            if (logEntry.carbs)    updateData.totalCarbs   = increment(-logEntry.carbs);
            if (logEntry.protein)  updateData.totalProtein = increment(-logEntry.protein);
            if (logEntry.fat)      updateData.totalFat     = increment(-logEntry.fat);
            if (logEntry.fiber)    updateData.totalFiber   = increment(-logEntry.fiber);
        } else if (logEntry.type === 'exercise') {
            if (logEntry.calories) updateData.caloriesBurned = increment(-logEntry.calories);
        } else if (logEntry.type === 'water') {
            const waterMl = logEntry.amount
                ? parseFloat(logEntry.amount)
                : 250;
            updateData.totalWater = increment(-waterMl);
        }

        await setDoc(logDocRef, updateData, { merge: true });
    } catch (error) {
        console.error('Error deleting food log:', error);
        throw error;
    }
};

/**
 * Loads 7 days of perfect demo data for the presentation.
 */
export const loadDemoData = async (userId: string) => {
    try {
        const batch = [];
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const logDocRef = doc(db, 'users', userId, 'dailyLogs', dateStr);
            
            // Perfect balance: 1800-2200 cals, high protein, low fat, 2L water
            const demoData = {
                consumedCalories: 2000 - (i * 50),
                totalProtein: 65 + (i % 3),
                totalCarbs: 220 - (i * 10),
                totalFat: 55 + (i * 2),
                totalWater: 2000 + (i * 100),
                caloriesBurned: 300 + (i * 20),
                logs: [
                    { id: `demo-f1-${i}`, type: 'food', name: 'Oatmeal with Fruits', calories: 350, protein: 12, carbs: 60, fat: 5, amount: '1 bowl', time: '08:30 AM', createdAt: d },
                    { id: `demo-f2-${i}`, type: 'food', name: 'Grilled Paneer Salad', calories: 450, protein: 25, carbs: 15, fat: 20, amount: '1 plate', time: '01:15 PM', createdAt: d },
                    { id: `demo-f3-${i}`, type: 'food', name: 'Dal Tadka & Brown Rice', calories: 550, protein: 18, carbs: 80, fat: 12, amount: '1 plate', time: '08:00 PM', createdAt: d },
                    { id: `demo-w-${i}`, type: 'water', name: 'Paani', calories: 0, amount: '2000ml', time: '09:00 PM', createdAt: d },
                    { id: `demo-e-${i}`, type: 'exercise', name: 'Morning Yoga', calories: 200, duration: 30, intensity: 'Medium', time: '07:00 AM', createdAt: d }
                ],
                lastUpdated: new Date()
            };
            
            batch.push(setDoc(logDocRef, demoData, { merge: true }));
        }
        
        await Promise.all(batch);
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
export const getStreakCount = async (userId: string, targetCalories: number, targetWater: number) => {
    try {
        let streak = 0;
        const today = new Date();
        
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const logDocRef = doc(db, 'users', userId, 'dailyLogs', dateStr);
            const snap = await getDoc(logDocRef);
            
            if (snap.exists()) {
                const data = snap.data();
                const consumedCals = data.consumedCalories || 0;
                
                // Rule 1: Calories between 80% and 120% of target
                const calMet = consumedCals >= targetCalories * 0.8 && consumedCals <= targetCalories * 1.2;
                
                // Rule 2: Water at least 80%
                const waterMet = (data.totalWater || 0) >= targetWater * 0.8;

                // Rule 3: Exercise logged
                const exerciseLogs = data.logs?.filter((l: any) => l.type === 'exercise') || [];
                const exerciseMet = exerciseLogs.length > 0;
                
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
