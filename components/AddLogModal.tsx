import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";

interface AddLogModalProps {
  isVisible: boolean;
  onClose: () => void;
  userId: string | undefined;
}

import { useRouter } from "expo-router";

const AddLogModal = ({ isVisible, onClose, userId }: AddLogModalProps) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const options = [
    { id: "exercise", title: "Log Exercise",   icon: "walk",              color: Colors.SECONDARY,       subtitle: 'Activity' },
    { id: "water",    title: "Log Water",    icon: "water-outline",      color: Colors.ACCENT,       subtitle: 'Hydration' },
    { id: "food",     title: "Log Meal",icon: "restaurant",         color: Colors.PRIMARY,  subtitle: 'Indian Food' },
    { id: "yoga",     title: "Yoga & Flow",icon: "body-outline",      color: Colors.ACCENT,       subtitle: 'Wellness' },
    { id: "scan",     title: "AI Scan",     icon: "scan-outline",       color: Colors.PRIMARY,       subtitle: 'Photo log', isPremium: true },
    { id: "manual",   title: "Manual Entry",icon: "calculator-outline", color: Colors.ACCENT_GOLD, subtitle: 'Custom' },
  ];

  const handleOptionPress = async (id: string) => {
    if (!userId) {
      alert("Please sign in to log data");
      onClose();
      return;
    }

    if (id === "scan") {
      onClose();
      router.push("/log/scan-food" as any);
      return;
    } else if (id === "exercise") {
      onClose();
      router.push("/log");
      return;
    } else if (id === "food") {
      onClose();
      router.push("/food-search");
      return;
    } else if (id === "water") {
      onClose();
      router.push("/log/water-intake");
      return;
    } else if (id === "yoga") {
      onClose();
      router.push("/log/yoga" as any);
      return;
    } else if (id === "manual") {
      onClose();
      router.push("/log/manual-calories" as any);
      return;
    }
    onClose();
  };

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[styles.modalContainer, { paddingBottom: insets.bottom + 90 }]}
        >
          <View style={styles.handle} />
          <Text style={styles.modalTitle}>Sattva — Log Activity</Text>
          <Text style={styles.modalSubtitle}>What would you like to log today?</Text>
          <View style={styles.grid}>
            {options.map((option) => (
              <Pressable
                key={option.id}
                style={({ pressed }) => [
                  styles.optionCard,
                  pressed && styles.optionCardPressed,
                ]}
                onPress={() => handleOptionPress(option.id)}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: `${option.color}15` },
                  ]}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={28}
                    color={option.color}
                  />
                  {option.isPremium && (
                    <View style={styles.premiumBadge}>
                      <Ionicons name="star" size={10} color="#FFD700" />
                    </View>
                  )}
                </View>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{(option as any).subtitle}</Text>
                {option.isPremium && (
                  <Text style={styles.premiumLabel}>Premium</Text>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

export default AddLogModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    padding: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Colors.BACKGROUND,
    borderTopWidth: 1.5,
    borderTopColor: Colors.BORDER,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.BORDER,
    alignSelf: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.TEXT_MAIN,
    textAlign: "center",
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 18,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  optionCard: {
    flexBasis: "30%",
    flexGrow: 1,
    maxWidth: "31%",
    backgroundColor: Colors.SURFACE,
    borderRadius: 22,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  optionCardPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: Colors.SURFACE_DARK,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    position: "relative",
  },
  optionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.TEXT_MAIN,
    textAlign: "center",
    marginTop: 4,
  },
  optionSubtitle: {
    fontSize: 9,
    color: Colors.TEXT_MUTED,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 2,
  },
  premiumBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: Colors.SURFACE,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.BORDER,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  premiumLabel: {
    fontSize: 10,
    color: Colors.PRIMARY,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 4,
  },
});
