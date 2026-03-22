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
                amount: exerciseData.duration > 0 ? `${exerciseData.duration} min` : undefined
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
