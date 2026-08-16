import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { Ionicons } from "@expo/vector-icons";
import { SyncUserToFirestore } from "../utils/SyncUserToFirestore";
import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import SmartToast from "../components/SmartToast";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Colors } from "../constants/Colors";

SplashScreen.preventAutoHideAsync().catch(() => {});

function ConfigErrorScreen() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="warning-outline" size={48} color={Colors.ACCENT_DARK} />
      </View>
      <Text style={styles.title}>App isn't configured correctly</Text>
      <Text style={styles.subtitle}>
        A required setting is missing from this build. Please reinstall the
        latest version, or contact support if this keeps happening.
      </Text>
    </View>
  );
}

const InitialLayout = () => {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    SplashScreen.hideAsync().catch(() => {});

    const currentSegment = segments[0];
    const isAuthRoute = currentSegment === "(auth)";
    const isProtectedRoute = !isAuthRoute;

    console.log("[ROUTER] segments:", segments);
    console.log("[ROUTER] loading:", loading);
    console.log("[ROUTER] user:", user?.uid);
    console.log("[ROUTER] auth route:", isAuthRoute);
    console.log("[ROUTER] protected route:", isProtectedRoute);

    if (user && isAuthRoute) {
      console.log("[ROUTER] Signed in + on auth route → navigating to /");
      router.replace("/");
    } else if (!user && isProtectedRoute) {
      console.log("[ROUTER] Not signed in + on protected route → navigating to sign-in");
      router.replace("/(auth)/sign-in");
    }
  }, [user, loading, segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SyncUserToFirestore />
        <ErrorBoundary>
          <InitialLayout />
          <SmartToast />
        </ErrorBoundary>
      </ThemeProvider>
    </AuthProvider>
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
    fontSize: 14,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 12,
  },
  devError: {
    fontSize: 11,
    color: "#FF6B6B",
    fontFamily: "monospace",
    backgroundColor: "rgba(255,107,107,0.1)",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    textAlign: "left",
    width: "100%",
  },
});