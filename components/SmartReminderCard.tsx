import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  sendDemoReminder,
  scheduleAllHealthReminders,
  cancelAllNotifications,
} from "../services/notificationService";

export default function SmartReminderCard() {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const handleDemoReminder = async () => {
    try {
      setLoading(true);

      const success = await sendDemoReminder();

      if (success) {
        Alert.alert(
          "Demo Reminder Scheduled",
          "A Sattva notification will appear in 5 seconds."
        );
      } else {
        Alert.alert(
          "Permission Needed",
          "Please allow notifications to test Sattva reminders."
        );
      }
    } catch (error) {
      console.log("[SmartReminderCard] Demo error:", error);
      Alert.alert("Unable to send reminder", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnableReminders = async () => {
    try {
      setLoading(true);

      const success = await scheduleAllHealthReminders();

      if (success) {
        setEnabled(true);
        Alert.alert(
          "Health Reminders Enabled",
          "Sattva will remind you to log meals, drink water, and check your daily progress."
        );
      } else {
        Alert.alert(
          "Permission Needed",
          "Please allow notifications to enable reminders."
        );
      }
    } catch (error) {
      console.log("[SmartReminderCard] Enable error:", error);
      Alert.alert("Unable to enable reminders", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReminders = async () => {
    try {
      setLoading(true);
      await cancelAllNotifications();
      setEnabled(false);
      Alert.alert("Reminders Disabled", "All Sattva reminders are turned off.");
    } catch (error) {
      console.log("[SmartReminderCard] Cancel error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons name="notifications" size={24} color="#16A34A" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Smart Health Reminders</Text>
          <Text style={styles.subtitle}>
            Stay consistent with meals, hydration, and daily check-ins.
          </Text>
        </View>

        <View style={[styles.statusBadge, enabled && styles.statusBadgeActive]}>
          <Text style={[styles.statusText, enabled && styles.statusTextActive]}>
            {enabled ? "ON" : "OFF"}
          </Text>
        </View>
      </View>

      <View style={styles.benefitsBox}>
        <Text style={styles.benefit}>🍱 Meal logging reminder</Text>
        <Text style={styles.benefit}>💧 Water intake reminder</Text>
        <Text style={styles.benefit}>🌿 Daily health check-in</Text>
      </View>

      <View style={styles.scheduleBox}>
        <Text style={styles.scheduleTitle}>Reminder Schedule</Text>

        <View style={styles.scheduleRow}>
          <Text style={styles.scheduleName}>Lunch Log</Text>
          <Text style={styles.scheduleTime}>1:30 PM</Text>
        </View>

        <View style={styles.scheduleRow}>
          <Text style={styles.scheduleName}>Hydration Check</Text>
          <Text style={styles.scheduleTime}>5:00 PM</Text>
        </View>

        <View style={styles.scheduleRow}>
          <Text style={styles.scheduleName}>Daily Review</Text>
          <Text style={styles.scheduleTime}>9:00 PM</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleDemoReminder}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="flash" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Send Demo Reminder</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={enabled ? handleCancelReminders : handleEnableReminders}
        disabled={loading}
      >
        <Ionicons
          name={enabled ? "close-circle-outline" : "alarm-outline"}
          size={18}
          color="#16A34A"
        />
        <Text style={styles.secondaryButtonText}>
          {enabled ? "Disable Daily Reminders" : "Enable Daily Reminders"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Demo reminder appears after 5 seconds to verify local notification support.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFDF7",
    borderRadius: 24,
    padding: 18,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#F3E7C8",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
    lineHeight: 17,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: "#F3F4F6",
  },
  statusBadgeActive: {
    backgroundColor: "#DCFCE7",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
  },
  statusTextActive: {
    color: "#16A34A",
  },
  benefitsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 12,
    marginTop: 14,
    gap: 6,
  },
  benefit: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  scheduleBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#FFF7ED",
  },
  scheduleTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#9A3412",
    marginBottom: 8,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  scheduleName: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  scheduleTime: {
    fontSize: 13,
    color: "#16A34A",
    fontWeight: "800",
  },
  primaryButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    marginTop: 10,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  secondaryButtonText: {
    color: "#16A34A",
    fontSize: 14,
    fontWeight: "800",
  },
  note: {
    marginTop: 10,
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
  },
});
