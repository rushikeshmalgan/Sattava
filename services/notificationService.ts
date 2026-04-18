/**
 * SwasthBharat — Notification Service
 * Indian-context Hinglish smart notifications with meal reminders
 * Uses expo-notifications for local scheduled alerts
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { INDIAN_MEAL_SCHEDULE } from '../data/mealPlans';
import { Strings } from '../constants/HindiStrings';

// Configure how notifications appear when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Permission request ────────────────────────────────────────────────────
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

// ── Cancel all notifications ──────────────────────────────────────────────
export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// ── Schedule a single notification ───────────────────────────────────────
const scheduleDaily = async (
  id: string,
  title: string,
  body: string,
  hour: number,
  minute: number
): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title,
      body,
      sound: true,
      data: { type: 'meal_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
};

// ── Indian Meal Reminders ─────────────────────────────────────────────────
export const scheduleMealReminders = async (): Promise<void> => {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await cancelAllNotifications();

  const mealMessages: Record<string, { title: string; body: string }> = {
    morning_detox: {
      title: '🌿 SwasthBharat — Morning Detox',
      body: Strings.NOTIF_MORNING_DETOX,
    },
    breakfast: {
      title: '🍳 Naashta Time!',
      body: Strings.NOTIF_BREAKFAST,
    },
    mid_morning: {
      title: '🍎 Mid-Morning Snack',
      body: 'Thoda kuch halka khao — fruits ya nuts!',
    },
    lunch: {
      title: '🍛 Lunch Time!',
      body: Strings.NOTIF_LUNCH,
    },
    evening: {
      title: '☕ Chai Break!',
      body: Strings.NOTIF_EVENING,
    },
    dinner: {
      title: '🌙 Dinner Time!',
      body: Strings.NOTIF_DINNER,
    },
    bedtime: {
      title: '🥛 Sone Ka Waqt Aa Gaya',
      body: Strings.NOTIF_BEDTIME,
    },
  };

  for (const meal of INDIAN_MEAL_SCHEDULE) {
    const msg = mealMessages[meal.id];
    if (!msg) continue;
    const [h, m] = meal.time.split(':').map(Number);
    await scheduleDaily(`meal_${meal.id}`, msg.title, msg.body, h, m).catch(() => {});
  }

  // Water reminders every 2 hours during the day (10am, 12pm, 2pm, 6pm)
  const waterHours = [10, 12, 14, 18];
  for (const hour of waterHours) {
    await scheduleDaily(
      `water_${hour}`,
      '💧 Paani Peene Ka Waqt!',
      Strings.NOTIF_WATER_2HR,
      hour,
      0
    ).catch(() => {});
  }
};

// ── Contextual / Smart Alerts (triggered immediately) ─────────────────────
export const sendFoodAlert = async (foodName: string, calories: number): Promise<void> => {
  const lower = foodName.toLowerCase();

  let body = `You logged ${foodName} (${calories} kcal).`;

  if (lower.includes('samosa')) body = Strings.ALERT_SAMOSA;
  else if (lower.includes('chai') || lower.includes('tea')) body = Strings.ALERT_CHAI_EXCESS;
  else if (lower.includes('gulab jamun') || lower.includes('mithai') || lower.includes('sweet')) body = Strings.ALERT_SWEET_EXCESS;
  else if (lower.includes('pickle') || lower.includes('achar')) body = Strings.ALERT_SODIUM_PICKLE;
  else if (calories > 400) body = `⚠️ High calorie item! ${foodName} has ${calories} kcal — balance karo.`;
  else if (calories < 100) body = `✅ Light and healthy choice! ${foodName} — great pick.`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🍛 SwasthBharat Food Alert',
      body,
      sound: true,
    },
    trigger: null, // immediate
  });
};

export const sendStepGoalAlert = async (steps: number): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '👟 Step Goal Reached!',
      body: `${steps.toLocaleString('en-IN')} kadam ho gaye! Shabash! 🎉`,
      sound: true,
    },
    trigger: null,
  });
};

export const sendWaterAlert = async (): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💧 Paani!',
      body: Strings.WATER_REMINDER,
      sound: false,
    },
    trigger: null,
  });
};

export const sendCalorieBurnAlert = async (calories: number): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔥 Calorie Burn!',
      body: Strings.ALERT_CALORIE_BURN(calories),
      sound: true,
    },
    trigger: null,
  });
};
