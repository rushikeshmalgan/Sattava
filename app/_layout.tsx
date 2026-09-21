import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import { SyncUser } from "../utils/SyncUser";
import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import SmartToast from "../components/SmartToast";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useFonts, Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';

SplashScreen.preventAutoHideAsync().catch(() => {});

const InitialLayout = () => {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    SplashScreen.hideAsync().catch(() => {});

    const isAuthRoute = segments[0] === "(auth)";

    if (user && isAuthRoute) {
      router.replace("/");
    } else if (!user && !isAuthRoute) {
      router.replace("/(auth)/sign-in");
    }
  }, [user, loading, segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <SyncUser />
        <ErrorBoundary>
          <InitialLayout />
          <SmartToast />
        </ErrorBoundary>
      </ThemeProvider>
    </AuthProvider>
  );
}

