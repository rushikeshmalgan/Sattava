/**
 * SwasthBharat — Step Counter Service
 * Uses expo-sensors Accelerometer for foreground step detection
 * Algorithm: peak detection on magnitude of 3-axis acceleration
 */

import { Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Constants ──────────────────────────────────────────────────────────────
const STEP_THRESHOLD = 1.15;      // g-force peak threshold
const STEP_DEBOUNCE_MS = 280;     // minimum ms between counted steps
const UPDATE_INTERVAL_MS = 80;    // accelerometer polling rate (~12Hz)
const STEPS_STORAGE_KEY = 'swasthbharat_steps_';

// ── State ──────────────────────────────────────────────────────────────────
let subscription: ReturnType<typeof Accelerometer.addListener> | null = null;
let lastStepTime = 0;
let lastMagnitude = 0;
let peakDetected = false;
let sessionSteps = 0;
let userWeightKg = 70; // default

export interface StepData {
  steps: number;
  calories: number;
  distanceKm: number;
  activeMinutes: number;
}

// ── Calorie calculation ────────────────────────────────────────────────────
// Formula: Steps × 0.04 × weight_factor
// Weight factor adjusts relative to 70kg baseline
const calcCalories = (steps: number, weightKg: number): number =>
  Math.round(steps * 0.04 * (weightKg / 70));

const calcDistance = (steps: number): number =>
  Math.round((steps * 0.762) / 1000 * 100) / 100; // avg stride ~0.762m

// ── Storage helpers ────────────────────────────────────────────────────────
const getTodayKey = (): string => {
  const d = new Date().toISOString().split('T')[0];
  return `${STEPS_STORAGE_KEY}${d}`;
};

export const saveDailySteps = async (steps: number): Promise<void> => {
  await AsyncStorage.setItem(getTodayKey(), JSON.stringify(steps));
};

export const loadDailySteps = async (): Promise<number> => {
  try {
    const val = await AsyncStorage.getItem(getTodayKey());
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
};

// ── Core step detector ─────────────────────────────────────────────────────
export const startStepCounting = async (
  weightKg: number,
  onUpdate: (data: StepData) => void
): Promise<() => void> => {
  userWeightKg = weightKg;

  // Load previously saved steps for today
  const savedSteps = await loadDailySteps();
  sessionSteps = savedSteps;

  // Check permissions
  const { status } = await Accelerometer.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('[StepService] Accelerometer permission denied');
    return () => {};
  }

  Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);

  subscription = Accelerometer.addListener(({ x, y, z }) => {
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const now = Date.now();

    // Peak detection: rising edge crosses threshold, then falls below
    if (!peakDetected && magnitude > STEP_THRESHOLD && lastMagnitude <= STEP_THRESHOLD) {
      if (now - lastStepTime > STEP_DEBOUNCE_MS) {
        peakDetected = true;
        lastStepTime = now;
        sessionSteps++;

        const data: StepData = {
          steps: sessionSteps,
          calories: calcCalories(sessionSteps, userWeightKg),
          distanceKm: calcDistance(sessionSteps),
          activeMinutes: Math.round(sessionSteps / 100), // ~100 steps/min walking
        };

        onUpdate(data);

        // Save every 10 steps to preserve data
        if (sessionSteps % 10 === 0) {
          saveDailySteps(sessionSteps).catch(() => {});
        }
      }
    } else if (peakDetected && magnitude < STEP_THRESHOLD) {
      peakDetected = false;
    }

    lastMagnitude = magnitude;
  });

  // Return cleanup function
  return () => {
    subscription?.remove();
    subscription = null;
    saveDailySteps(sessionSteps).catch(() => {});
  };
};

export const stopStepCounting = (): void => {
  subscription?.remove();
  subscription = null;
  saveDailySteps(sessionSteps).catch(() => {});
};

export const getSessionSteps = (): number => sessionSteps;

export const resetDailySteps = async (): Promise<void> => {
  sessionSteps = 0;
  await saveDailySteps(0);
};

// ── Step goal progress ────────────────────────────────────────────────────
export const getStepGoalProgress = (steps: number, goal = 8000): number =>
  Math.min(Math.round((steps / goal) * 100), 100);

export const getStepMotivation = (steps: number, goal = 8000): string => {
  const pct = (steps / goal) * 100;
  if (pct >= 100) return '🎉 Shabash! Step goal complete! Waah!';
  if (pct >= 75)  return `💪 Almost there! ${Math.round(goal - steps).toLocaleString('en-IN')} steps remaining`;
  if (pct >= 50)  return `🚶 Halfway done! Keep walking, ${Math.round(goal - steps).toLocaleString('en-IN')} to go`;
  if (pct >= 25)  return `👟 Good start! ${Math.round(goal - steps).toLocaleString('en-IN')} kadam aur karo`;
  return `🌟 Start walking! Target: ${goal.toLocaleString('en-IN')} kadam aaj`;
};
