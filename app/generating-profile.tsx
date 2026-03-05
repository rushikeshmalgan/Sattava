import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
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

type StepStatus = 'pending' | 'loading' | 'completed';

export default function GeneratingProfile() {
  const { data } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useUser();

  const progress = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const [steps, setSteps] = useState([
    { id: 1, label: 'Initializing AI engine', status: 'loading' as StepStatus },
    { id: 2, label: 'Analyzing your profile', status: 'pending' as StepStatus },
    { id: 3, label: 'Calculating metabolic rate', status: 'pending' as StepStatus },
    { id: 4, label: 'Building diet plan', status: 'pending' as StepStatus },
    { id: 5, label: 'Finalizing nutrition targets', status: 'pending' as StepStatus },
  ]);

  useEffect(() => {
    if (!data) {
      router.replace('/home');
      return;
    }

    startRotation();
    startStepTimers();

    const parsed = JSON.parse(data as string);
    generateProfile(parsed);
  }, [data]);

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

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const updateStep = (id: number, status: StepStatus) => {
    setSteps(prev =>
      prev.map(step =>
        step.id === id ? { ...step, status } : step
      )
    );
  };

  const startStepTimers = () => {
    updateStep(1, 'loading');
    setTimeout(() => {
      updateStep(1, 'completed');
      updateStep(2, 'loading');
      setTimeout(() => {
        updateStep(2, 'completed');
        updateStep(3, 'loading');
      }, 400);
    }, 400);
  };

  const animateProgress = (toValue: number, duration: number) => {
    Animated.timing(progress, {
      toValue,
      duration,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();
  };

  const generateProfile = async (profileData: UserProfileData) => {
    try {
      animateProgress(0.2, 600);

      const prompt = `
You are a professional nutritionist.

User profile:
Gender: ${profileData.gender}
Goal: ${profileData.goal}
Activity Level: ${profileData.activityLevel}
Birthdate: ${profileData.birthdate.day}/${profileData.birthdate.month}/${profileData.birthdate.year}
Height: ${profileData.heightFeet}'${profileData.heightInches}"
Weight: ${profileData.weightKg}kg

Return ONLY valid JSON:
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
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const aiData = JSON.parse(cleanJson);

      updateStep(3, 'completed');
      updateStep(4, 'loading');
      animateProgress(0.8, 400);

      const finalProfile: UserProfileData = {
        ...profileData,
        generatedPlan: {
          dailyCalories: aiData.dailyCalories,
          macros: aiData.macros,
          waterIntake: aiData.waterIntake,
          planSummary: aiData.planSummary,
          fitnessTips: aiData.fitnessTips,
        },
      };

      await saveUserProfileToStorage(finalProfile);

      if (user?.id) {
        await setDoc(
          doc(db, 'users', user.id),
          {
            onboardingCompleted: true,
            isSetupCompleted: true,

            generatedPlan: finalProfile.generatedPlan,
            physicalProfile: {
              gender: profileData.gender,
              goal: profileData.goal,
              activityLevel: profileData.activityLevel,
              birthdate: profileData.birthdate,
              heightFeet: profileData.heightFeet,
              heightInches: profileData.heightInches,
              weightKg: profileData.weightKg,
            },

            imageUrl: user.imageUrl || '',
            onboardingCompletedAt: new Date(),
            lastUpdated: new Date(),
          },
          { merge: true }
        );
      }

      updateStep(4, 'completed');
      updateStep(5, 'loading');
      animateProgress(1, 300);

      setTimeout(() => {
        updateStep(5, 'completed');
        router.replace('/home');
      }, 300);
    } catch (err) {
      console.error('Profile generation failed:', err);
      router.replace('/home');
    }
  };

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.loader, { transform: [{ rotate }] }]} />

        <Text style={styles.title}>Creating Your Plan</Text>

        <View style={styles.stepsContainer}>
          {steps.map(step => (
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

              <Text
                style={[
                  styles.stepLabel,
                  step.status === 'loading' && styles.loadingLabel,
                  step.status === 'completed' && styles.completedLabel,
                ]}
              >
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.progressBarBackground}>
          <Animated.View style={[styles.progressBarFill, { width }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

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
    alignItems: 'center',
    justifyContent: 'center',
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