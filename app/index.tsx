import { useAuth } from "../context/AuthContext";
import { useRouter } from "expo-router";
import { fetchCurrentUser } from "../services/dataApi";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Colors } from "../constants/Colors";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (loading) {
      console.log("[INDEX] Waiting for Firebase auth...");
      return;
    }

    console.log("[INDEX] Firebase state:", { loading, userId: user?.uid });

    if (!user) {
      console.log("[INDEX] User is not authenticated → navigating to /(auth)/sign-in");
      router.replace("/(auth)/sign-in");
      return;
    }

    console.log("[INDEX] Authenticated user:", user.uid);
    console.log("[INDEX] Checking the profile for user:", user.uid);

    const checkOnboardingStatus = async () => {
      try {
        // The profile decides whether onboarding still has to be done.

        const userDoc = await fetchCurrentUser();

        if (userDoc) {
          const data = userDoc;

          const hasOnboardingData = !!(
            data.onboardingCompleted === true ||
            data.isSetupCompleted === true ||
            data.physicalProfile ||
            data.generatedPlan
          );

          if (hasOnboardingData) {
            console.log("[INDEX] Onboarding complete → navigating to /(tabs)/home");
            router.replace("/(tabs)/home");
          } else {
            console.log("[INDEX] Onboarding not complete → navigating to /onboarding");
            router.replace("/onboarding");
          }
        } else {
          console.log("[INDEX] No user doc found → navigating to /onboarding");
          router.replace("/onboarding");
        }
      } catch (error) {
        console.error("[INDEX] Profile check failed:", error);
        console.log("[INDEX] Profile check failed — redirecting to /onboarding as fallback");
        router.replace("/onboarding");
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboardingStatus();
  }, [loading, user?.uid, router]);

  if (isChecking || loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.BACKGROUND,
  },
});