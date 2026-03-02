import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Colors } from "../constants/Colors";
import { db } from "../firebaseConfig";

export default function Index() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    const checkOnboardingStatus = async () => {
      try {
        if (!user?.id) {
          setIsChecking(false);
          return;
        }

        const userRef = doc(db, "users", user.id);

        // ✅ HARD GUARANTEE USER DOCUMENT EXISTS
        await setDoc(
          userRef,
          {
            clerkUserId: user.id,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );

        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const data = userDoc.data();

          const hasOnboardingData = !!(
            data.onboardingCompleted === true ||
            data.isSetupCompleted === true ||
            data.physicalProfile ||
            data.generatedPlan
          );

          if (hasOnboardingData) {
            router.replace("/home");
          } else {
            router.replace("/onboarding");
          }
        } else {
          router.replace("/onboarding");
        }
      } catch (error) {
        console.error("[Index] Error:", error);
        router.replace("/onboarding");
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboardingStatus();
  }, [isLoaded, user?.id]);

  if (isChecking || !isLoaded) {
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