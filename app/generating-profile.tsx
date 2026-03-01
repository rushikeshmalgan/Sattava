import { useUser } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { model } from '../config/AiModel';
import { Colors } from '../constants/Colors';
import { db } from '../firebaseConfig';
import { saveUserProfileToStorage, UserProfileData } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';

export default function GeneratingProfile() {
    const { data } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useUser();

    const [progress] = useState(new Animated.Value(0));

    /* 🔹 Loading Steps State */
    const [steps, setSteps] = useState([
        { id: 1, label: 'Initializing AI engine', status: 'loading' },
        { id: 2, label: 'Analyzing your profile', status: 'pending' },
        { id: 3, label: 'Calculating metabolic rate', status: 'pending' },
        { id: 4, label: 'Building diet plan', status: 'pending' },
        { id: 5, label: 'Finalizing nutrition targets', status: 'pending' },
    ]);

    /* 🔹 Gemini Loader Rotation */
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        startRotation();

        if (data) {
            const profile = JSON.parse(data as string);
            generateProfile(profile);
            startDummyTimers();
        } else {
            router.replace('/onboarding');
        }
    }, [data]);

    /* 🔄 Infinite Rotation */
    const startRotation = () => {
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 1400,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    };

    const updateStepStatus = (id: number, newStatus: 'pending' | 'loading' | 'completed') => {
        setSteps((prev) =>
            prev.map((step) =>
                step.id === id ? { ...step, status: newStatus } : step
            )
        );
    };

    const startDummyTimers = () => {
        // Step 1 is already loading by default

        // After 1.5s, complete step 1, start step 2
        setTimeout(() => {
            updateStepStatus(1, 'completed');
            updateStepStatus(2, 'loading');
        }, 1500);

        // After 3.5s, complete step 2, start step 3
        setTimeout(() => {
            updateStepStatus(2, 'completed');
            updateStepStatus(3, 'loading');
        }, 3500);

        // After 5.5s, complete step 3, start step 4
        setTimeout(() => {
            updateStepStatus(3, 'completed');
            updateStepStatus(4, 'loading');
        }, 5500);
    };

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const generateProfile = async (profileData: UserProfileData) => {
        try {
            /* Step 1 */
            animateProgress(0.1, 600);

            const prompt = `
        Acting as a professional nutritionist and fitness expert, calculate the daily nutritional requirements for a user with the following profile:
        - Gender: ${profileData.gender}
        - Goal: ${profileData.goal}
        - Activity Level: ${profileData.activityLevel}
        - Birthdate: ${profileData.birthdate.day}/${profileData.birthdate.month}/${profileData.birthdate.year}
        - Height: ${profileData.heightFeet}'${profileData.heightInches}"
        - Weight: ${profileData.weightKg}kg

        Return the response ONLY as a JSON object in this EXACT structure:

        {
          "dailyCalories": number,
          "macros": {
            "carbs": string,
            "protein": string,
            "fats": string
          },
          "waterIntake": string,
          "planSummary": string,
          "fitnessTips": string[]
        }

        Do not include markdown or explanations.
      `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const jsonStr = text.replace(/```json|```/g, '').trim();
            const aiData = JSON.parse(jsonStr);

            /* Dummy delay to ensure user sees some steps if AI is too fast */
            await new Promise(resolve => setTimeout(resolve, 6000));

            /* Auto-complete middle steps if they haven't finished yet */
            updateStepStatus(1, 'completed');
            updateStepStatus(2, 'completed');
            updateStepStatus(3, 'completed');
            updateStepStatus(4, 'loading');
            animateProgress(0.7, 1200);

            const completeProfile: UserProfileData = {
                ...profileData,
                generatedPlan: {
                    dailyCalories: aiData.dailyCalories,
                    macros: {
                        carbs: aiData.macros.carbs,
                        protein: aiData.macros.protein,
                        fats: aiData.macros.fats,
                    },
                    waterIntake: aiData.waterIntake,
                    planSummary: aiData.planSummary,
                    fitnessTips: aiData.fitnessTips,
                },
            };

            await saveUserProfileToStorage(completeProfile);

            if (user?.id) {
                await setDoc(
                    doc(db, 'users', user.id),
                    {
                        generatedPlan: {
                            dailyCalories: aiData.dailyCalories,
                            macros: {
                                carbs: aiData.macros.carbs,
                                protein: aiData.macros.protein,
                                fats: aiData.macros.fats,
                            },
                            waterIntake: aiData.waterIntake,
                            planSummary: aiData.planSummary,
                            fitnessTips: aiData.fitnessTips,
                        },

                        goal: profileData.goal,
                        height: Number(`${profileData.heightFeet}.${profileData.heightInches}`),
                        weight: Number(profileData.weightKg),
                        workoutFreq: profileData.activityLevel,

                        imageUrl: user?.imageUrl || '',
                        isSetupCompleted: true,
                        lastUpdated: new Date().toISOString(),
                    },
                    { merge: true }
                );
            }

            /* Final Step */
            updateStepStatus(4, 'completed');
            updateStepStatus(5, 'loading');
            animateProgress(1, 600);

            setTimeout(() => {
                updateStepStatus(5, 'completed');
                setTimeout(() => {
                    router.replace('/');
                }, 500);
            }, 1000);
        } catch (error) {
            console.error(error);
            // Re-introduce status for error handling
            setSteps((prev) => prev.map((step) => ({ ...step, status: 'pending' }))); // Reset all
            updateStepStatus(1, 'completed'); // Mark first step as completed to show progress
            updateStepStatus(2, 'completed');
            updateStepStatus(3, 'completed');
            updateStepStatus(4, 'completed');
            updateStepStatus(5, 'completed');
            // Optionally, add an error step or modify the last step to show error
            setSteps((prev) =>
                prev.map((step) =>
                    step.id === 5 ? { ...step, label: 'Something went wrong. Please retry.', status: 'loading' } : step
                )
            );
        }
    };

    const animateProgress = (toValue: number, duration: number) => {
        Animated.timing(progress, {
            toValue,
            duration,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: false,
        }).start();
    };

    const width = progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* 🔹 Animated Gemini Loader */}
                <Animated.View
                    style={[
                        styles.loader,
                        { transform: [{ rotate }] },
                    ]}
                />

                <Text style={styles.title}>Creating Your Plan</Text>

                <View style={styles.stepsContainer}>
                    {steps.map((step) => (
                        <View key={step.id} style={styles.stepRow}>
                            <View style={styles.iconBox}>
                                {step.status === 'completed' ? (
                                    <Ionicons name="checkmark-circle" size={24} color={Colors.SUCCESS} />
                                ) : step.status === 'loading' ? (
                                    <ActivityIndicator size="small" color={Colors.PRIMARY} />
                                ) : (
                                    <View style={styles.pendingDot} />
                                )}
                            </View>
                            <Text style={[
                                styles.stepLabel,
                                step.status === 'completed' && styles.completedLabel,
                                step.status === 'loading' && styles.loadingLabel
                            ]}>
                                {step.label}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.progressWrapper}>
                    <View style={styles.progressBarBackground}>
                        <Animated.View style={[styles.progressBarFill, { width }]} />
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

/* 🎨 Styles */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.BACKGROUND,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    loader: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 4,
        borderColor: Colors.PRIMARY,
        borderTopColor: 'transparent',
        marginBottom: 40,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
        marginBottom: 40,
    },
    stepsContainer: {
        width: '100%',
        paddingHorizontal: 20,
        marginBottom: 40,
        gap: 16,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pendingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.BORDER,
    },
    stepLabel: {
        fontSize: 16,
        color: Colors.TEXT_MUTED,
    },
    loadingLabel: {
        color: Colors.TEXT_MAIN,
        fontWeight: '500',
    },
    completedLabel: {
        color: Colors.TEXT_MAIN,
    },
    progressWrapper: {
        width: '100%',
        paddingHorizontal: 20,
    },
    progressBarBackground: {
        width: '100%',
        height: 10,
        backgroundColor: Colors.SURFACE,
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.PRIMARY,
    },
});