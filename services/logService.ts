import { arrayUnion, doc, increment, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

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

    // ✅ FIXED FIELD NAME
    consumedCalories: increment(foodData.calories),

    totalCarbs: increment(foodData.carbs),
    totalProtein: increment(foodData.protein),
    totalFat: increment(foodData.fat),
    lastUpdated: timestamp
};

        await setDoc(logDocRef, updateData, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error adding food log:", error);
        throw error;
    }
};
