import { useAuth } from "../context/AuthContext";
import { useRouter } from "expo-router";
import { fetchCurrentUser } from "../services/dataApi";
import { describeDataError } from "../services/dataErrors";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/Colors";

/**
 * Decides where a signed-in user starts: the home screen, or onboarding when there is no profile yet.
 *
 * The profile comes from the backend, so the check can fail. A failure is shown as a failure: sending a user
 * who already has a profile into onboarding would ask them to fill it in a second time.
 */
export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/(auth)/sign-in");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setError(null);
        const profile = await fetchCurrentUser();
        if (cancelled) return;

        const hasOnboardingData = !!(
          profile?.onboardingCompleted === true ||
          profile?.isSetupCompleted === true ||
          profile?.physicalProfile ||
          profile?.generatedPlan
        );

        router.replace(hasOnboardingData ? "/(tabs)/home" : "/onboarding");
      } catch (err) {
        if (!cancelled) setError(describeDataError(err, "load your profile"));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user?.uid, router, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Cannot reach Sattava</Text>
        <Text style={styles.message}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={retry} accessibilityRole="button">
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.PRIMARY} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    backgroundColor: Colors.BACKGROUND,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.TEXT_MAIN,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: Colors.PRIMARY,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});