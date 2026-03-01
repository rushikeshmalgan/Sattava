import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from '../constants/Colors';
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function Index() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
  const checkOnboarding = async () => {
    if (!user?.id) return;

    try {
      const userDoc = await getDoc(doc(db, "users", user.id));

      const completed =
        userDoc.exists() && userDoc.data()?.onboardingCompleted === true;

      if (!completed) {
        router.replace("/onboarding");
      } else {
        setIsChecking(false);
      }
    } catch (error) {
      console.error("Failed to check onboarding:", error);
      setIsChecking(false);
    }
  };

  checkOnboarding();
}, [user?.id]);

  if (isChecking) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello, {user?.firstName || 'User'}!</Text>
      <Text style={styles.subtitle}>Welcome to your AI Calories Tracker.</Text>

      <TouchableOpacity style={styles.button} onPress={() => signOut()}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.BACKGROUND,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Colors.TEXT_MAIN,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.TEXT_MUTED,
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.ERROR,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  }
});
