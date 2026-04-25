import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const requestNotificationPermission = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Notifications] Permission denied");
      return false;
    }

    if (Platform.OS === "android") {
      // In SDK 53+, remote functionality is removed from Expo Go.
      // While local channels should be fine, we apply extra caution.
      await Notifications.setNotificationChannelAsync("sattva-reminders", {
        name: "Sattva Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#16A34A",
      });
    }

    return true;
  } catch (error) {
    console.log("[Notifications] Permission error:", error);
    return false;
  }
};

export const sendDemoReminder = async () => {
  try {
    const hasPermission = await requestNotificationPermission();

    if (!hasPermission) return false;

    // Use a delay for demo purposes (5 seconds)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Sattva Meal Reminder 🍱",
        body: "Time to log your meal and stay on track with your nutrition goal.",
        sound: true,
        data: {
          type: "demo_meal_reminder",
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        repeats: false,
      } as any,
    });

    return true;
  } catch (error) {
    console.log("[Notifications] Demo reminder error:", error);
    return false;
  }
};

export const scheduleMealReminder = async () => {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time to log your lunch 🍱",
        body: "Add your meal in Sattva and keep your calorie tracking accurate.",
        sound: true,
        data: {
          type: "meal_reminder",
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 13,
        minute: 30,
      } as any,
    });

    return true;
  } catch (error) {
    console.log("[Notifications] Meal reminder error:", error);
    return false;
  }
};

export const scheduleWaterReminder = async () => {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Hydration check 💧",
        body: "Drink water and keep your body refreshed.",
        sound: true,
        data: {
          type: "water_reminder",
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 17,
        minute: 0,
      } as any,
    });

    return true;
  } catch (error) {
    console.log("[Notifications] Water reminder error:", error);
    return false;
  }
};

export const scheduleDailyCheckIn = async () => {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Sattva daily check-in 🌿",
        body: "Review your meals, streaks, water intake, and today’s progress.",
        sound: true,
        data: {
          type: "daily_checkin",
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      } as any,
    });

    return true;
  } catch (error) {
    console.log("[Notifications] Daily check-in error:", error);
    return false;
  }
};

export const scheduleAllHealthReminders = async () => {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;

    await cancelAllNotifications();
    await scheduleMealReminder();
    await scheduleWaterReminder();
    await scheduleDailyCheckIn();

    return true;
  } catch (error) {
    console.log("[Notifications] Schedule all error:", error);
    return false;
  }
};

export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return true;
  } catch (error) {
    console.log("[Notifications] Cancel error:", error);
    return false;
  }
};
