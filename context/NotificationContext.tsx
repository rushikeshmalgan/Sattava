import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as notificationService from '../services/notificationService';

interface NotificationSettings {
  mealReminders: boolean;
  waterReminders: boolean;
  achievements: boolean;
  smartAlerts: boolean;
}

interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  sendDemoReminder: () => Promise<boolean>;
  scheduleAllHealthReminders: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = '@sattva_notification_settings';

const defaultSettings: NotificationSettings = {
  mealReminders: true,
  waterReminders: true,
  achievements: true,
  smartAlerts: true,
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(parsed);
        applySettings(parsed);
      } else {
        // First time
        applySettings(defaultSettings);
      }
    } catch (error) {
      console.error('Failed to load notification settings', error);
    }
  };

  const applySettings = async (s: NotificationSettings) => {
    await notificationService.cancelAllNotifications();
    if (s.mealReminders) await notificationService.scheduleMealReminder();
    if (s.waterReminders) await notificationService.scheduleWaterReminder();
    if (s.achievements || s.smartAlerts) await notificationService.scheduleDailyCheckIn();
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      await applySettings(updated);
    } catch (error) {
      console.error('Failed to save notification settings', error);
    }
  };

  const requestPermissions = async () => {
    return await notificationService.requestNotificationPermission();
  };

  const sendDemoReminder = async () => {
    return await notificationService.sendDemoReminder();
  };

  const scheduleAllHealthReminders = async () => {
    const success = await notificationService.scheduleAllHealthReminders();
    if (success) {
      // Sync local settings to match "All enabled"
      const updated = {
        mealReminders: true,
        waterReminders: true,
        achievements: true,
        smartAlerts: true,
      };
      setSettings(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return success;
  };

  return (
    <NotificationContext.Provider value={{ 
      settings, 
      updateSettings, 
      requestPermissions, 
      sendDemoReminder, 
      scheduleAllHealthReminders 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
