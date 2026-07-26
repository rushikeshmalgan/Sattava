import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { tokenCache } from "../utils/cache";
import { SyncUserToFirestore } from "../utils/SyncUserToFirestore";
import { ThemeProvider } from "../context/ThemeContext";
import SmartToast from "../components/SmartToast";
import { ErrorBoundary } from "../components/ErrorBoundary";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env");
}

const InitialLayout = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    console.log('[BOOT] useAuth state — isLoaded:', isLoaded, 'isSignedIn:', isSignedIn);
    if (!isLoaded) return;

    const clerkTimeout = setTimeout(() => {
      console.error('[BOOT] TIMEOUT: Clerk useAuth did not respond in 10s');
    }, 10000);

    const inTabsGroup = segments[0] === "(auth)";

    // If signed in and in an auth screen, redirect to root
    if (isSignedIn && inTabsGroup) {
      router.replace("/");
    } else if (!isSignedIn && !inTabsGroup) {
      // If not signed in and NOT in the auth group, redirect to sign-in
      router.replace("/(auth)/sign-in");
    }

    return () => clearTimeout(clerkTimeout);
  }, [isSignedIn, isLoaded, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
};

export default function RootLayout() {
  console.log('[BOOT] Layout mounting, publishableKey present:', !!publishableKey);

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ThemeProvider>
        <SyncUserToFirestore />
        <ErrorBoundary>
          <InitialLayout />
          <SmartToast />
        </ErrorBoundary>
      </ThemeProvider>
    </ClerkProvider>
  );
}
