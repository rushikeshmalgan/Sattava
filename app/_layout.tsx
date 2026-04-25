import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { tokenCache } from "../utils/cache";
import { SyncUserToFirestore } from "../utils/SyncUserToFirestore";
import { ThemeProvider } from "../context/ThemeContext";
import { NotificationProvider } from "../context/NotificationContext";
import SmartToast from "../components/SmartToast";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env");
}

const InitialLayout = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inTabsGroup = segments[0] === "(auth)";

    // If signed in and in an auth screen, redirect to root
    if (isSignedIn && inTabsGroup) {
      router.replace("/");
    } else if (!isSignedIn && !inTabsGroup) {
      // If not signed in and NOT in the auth group, redirect to sign-in
      router.replace("/(auth)/sign-in");
    }
  }, [isSignedIn, isLoaded, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
};

export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ThemeProvider>
        <NotificationProvider>
          <SyncUserToFirestore />
          <InitialLayout />
          <SmartToast />
        </NotificationProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
