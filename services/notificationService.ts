/**
 * Sattava — Notification Service
 * ────────────────────────────────
 * Handles push notification permissions, scheduling, and cancellation.
 * Used by the meal scheduler and water reminder features.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Handler config (call once at app startup, e.g. in _layout.tsx) ──────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Permission ───────────────────────────────────────────────────────────────

/**
 * Requests push notification permissions.
 * Returns true if granted, false otherwise.
 * On Android 13+, also requests POST_NOTIFICATIONS permission.
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00BFA5',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

/**
 * Returns the current notification permission status.
 */
export const getNotificationPermissionStatus =
  async (): Promise<Notifications.PermissionStatus> => {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  };

// ── Schedule helpers ─────────────────────────────────────────────────────────

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
}

/**
 * Schedules a one-time local notification after `delaySeconds`.
 * Returns the notification identifier.
 */
export const scheduleNotification = async ({
  title,
  body,
  delaySeconds,
  data = {},
}: {
  title: string;
  body: string;
  delaySeconds: number;
  data?: Record<string, unknown>;
}): Promise<string> => {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds },
  });
};

/**
 * Schedules a daily repeating notification at `hour:minute` (local time).
 * Returns the notification identifier.
 */
export const scheduleDailyNotification = async ({
  title,
  body,
  hour,
  minute,
  data = {},
}: {
  title: string;
  body: string;
  hour: number;
  minute: number;
  data?: Record<string, unknown>;
}): Promise<string> => {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
};

/**
 * Cancels a previously scheduled notification by its identifier.
 */
export const cancelNotification = async (notificationId: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

/**
 * Cancels ALL scheduled notifications for this app.
 */
export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Returns a list of all currently scheduled notifications.
 */
export const getAllScheduledNotifications =
  async (): Promise<Notifications.NotificationRequest[]> => {
    return Notifications.getAllScheduledNotificationsAsync();
  };

// ── Meal reminder helpers ─────────────────────────────────────────────────────

/**
 * Schedules a meal reminder for a specific time (HH:MM string).
 * Returns the notification identifier, or null if permissions are denied.
 */
export const scheduleMealReminder = async (
  mealLabel: string,
  time: string, // "HH:MM"
): Promise<string | null> => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;

  return scheduleDailyNotification({
    title: `🍛 Time for ${mealLabel}`,
    body: 'Log your meal to keep your nutrition on track!',
    hour: h,
    minute: m,
    data: { type: 'meal_reminder', mealLabel },
  });
};

/**
 * Schedules a water reminder N minutes from now.
 * Returns the notification identifier, or null if permissions are denied.
 */
export const scheduleWaterReminder = async (
  delayMinutes = 60,
): Promise<string | null> => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  return scheduleNotification({
    title: '💧 Hydration Check',
    body: "You're behind on water today! Have a glass now.",
    delaySeconds: delayMinutes * 60,
    data: { type: 'water_reminder' },
  });
};
