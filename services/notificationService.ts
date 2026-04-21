import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { INDIAN_MEAL_SCHEDULE } from '../data/mealPlans';
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
      title: '🌿 Sattva — Morning Detox',
      body: 'Start your day right with warm water, lemon, or your preferred detox drink.',
    },
    breakfast: {
      title: '🍳 Breakfast Time',
      body: 'Time to fuel up for the day. Remember to log your morning meal.',
    },
    mid_morning: {
      title: '🍎 Mid-Morning Snack',
      body: 'Opt for a light snack — consider fresh fruits, nuts, or seeds.',
    },
    lunch: {
      title: '🍛 Lunch Time',
      body: 'Take a break for a balanced lunch. Keep an eye on your macros.',
    },
    evening: {
      title: '☕ Evening Tea Break',
      body: 'A perfect time for herbal tea and a mindful, light snack.',
    },
    dinner: {
      title: '🌙 Dinner Time',
      body: 'Keep dinner light for better digestion and sleep quality.',
    },
    bedtime: {
      title: '🌙 Time to Rest',
      body: 'Prepare for a restful night. Hydrate slightly if needed.',
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
      '💧 Hydration Check!',
      'Stay hydrated. Remember to drink a glass of water.',
      hour,
      0
    ).catch(() => {});
  }
};

// ── Contextual / Smart Alerts (triggered immediately) ─────────────────────
export const sendFoodAlert = async (foodName: string, calories: number): Promise<void> => {
  const lower = foodName.toLowerCase();

  let body = `You logged ${foodName} (${calories} kcal).`;

  if (lower.includes('samosa')) body = 'Fried snacks are dense in calories. Be sure to balance your next meal.';
  else if (lower.includes('chai') || lower.includes('tea')) body = 'Limit added sugar in your tea for a healthier metabolic response.';
  else if (lower.includes('gulab jamun') || lower.includes('mithai') || lower.includes('sweet')) body = 'Sweets have high sugar content. Enjoy in strict moderation.';
  else if (lower.includes('pickle') || lower.includes('achar')) body = 'Pickles can be high in sodium. Be mindful of your portion size.';
  else if (calories > 400) body = `⚠️ High calorie item: ${foodName} (${calories} kcal). Consider balancing your daily macros.`;
  else if (calories < 100) body = `✅ Excellent choice! ${foodName} is a light and healthy option.`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🥗 Sattva Nutrition Alert',
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
      body: `${steps.toLocaleString('en-IN')} steps completed! Fantastic progress! 🎉`,
      sound: true,
    },
    trigger: null,
  });
};

export const sendWaterAlert = async (): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💧 Hydration Alert!',
      body: 'Time to drink your hourly water and stay refreshed.',
      sound: false,
    },
    trigger: null,
  });
};

export const sendCalorieBurnAlert = async (calories: number): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔥 Calorie Burn!',
      body: `Great job! You burned ${calories} kcal.`,
      sound: true,
    },
    trigger: null,
  });
};
