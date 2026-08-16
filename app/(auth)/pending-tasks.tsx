import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { Colors } from "../../constants/Colors";

export default function PendingTasksScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    } else if (!loading && !user) {
      router.replace("/(auth)/sign-in");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.ACCENT_DARK} />
      </View>
      <Text style={styles.title}>Complete your profile</Text>
      <Text style={styles.subtitle}>Finish setting up your account to continue.</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace("/(auth)/sign-in")}
      >
        <Text style={styles.buttonText}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: Colors.BACKGROUND,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.ACCENT}20`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.TEXT_MAIN,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.TEXT_MAIN,
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
