import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfileData {
    gender: string;
    goal: string;
    activityLevel: string;
    birthdate: {
        day: string;
        month: string;
        year: string;
    };
    heightFeet: string;
    heightInches: string;
    weightKg: string;
    generatedPlan?: {
        dailyCalories: number;
        macros: {
            carbs: string;
            protein: string;
            fats: string;
        };
        waterIntake: string;
        planSummary: string;
        fitnessTips: string[];
    };
}

const PROFILE_KEY = '@user_profile_data';

export const saveUserProfileToStorage = async (data: UserProfileData) => {
    try {
        const jsonValue = JSON.stringify(data);
        await AsyncStorage.setItem(PROFILE_KEY, jsonValue);
    } catch (e) {
        console.error('Error saving user profile to async storage', e);
    }
};

export const getUserProfileFromStorage = async (): Promise<UserProfileData | null> => {
    try {
        const jsonValue = await AsyncStorage.getItem(PROFILE_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
        console.error('Error reading user profile from async storage', e);
        return null;
    }
};

export const hasCompletedOnboarding = async (): Promise<boolean> => {
    const profile = await getUserProfileFromStorage();
    return profile !== null;
};
