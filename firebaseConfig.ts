import { initializeApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { Platform } from 'react-native';

// ── Environment variable validation ─────────────────────────────────────────
// Firebase will silently fail with undefined values if keys are missing.
// We fail fast here so misconfiguration is caught immediately.
const REQUIRED_FIREBASE_VARS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

const missingVars = REQUIRED_FIREBASE_VARS.filter(
  (key) => !process.env[key]
);

if (missingVars.length > 0) {
  const message =
    `[Firebase] Missing required environment variables:\n` +
    missingVars.map((k) => `  • ${k}`).join('\n') +
    `\n\nCopy .env.example to .env and fill in your Firebase project values, ` +
    `or (in production) register them as EAS environment variables and rebuild.`;

  // IMPORTANT: never throw here. This file is imported transitively from
  // app/_layout.tsx (via SyncUser) before that layout's own
  // module code runs — including its SplashScreen.preventAutoHideAsync()
  // call. A throw at this point happens before anything has taken control
  // of the splash screen, so the app hangs on it forever with no visible
  // error. Log loudly instead and let API calls fail normally (as
  // rejected promises) at the point of use, where existing try/catch
  // blocks (e.g. SyncUser) already handle and log failures.
  console.error(message);
}

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase. Wrapped defensively: some Firebase SDK calls can
// throw synchronously on malformed config (e.g. missing projectId), which
// would otherwise crash the module — and, per the note above, crash before
// the splash screen can be dismissed.
let app;
let auth: Auth | null = null;
try {
  app = initializeApp(firebaseConfig);

  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } else {
    const { getAuth } = require('firebase/auth');
    auth = getAuth(app);
  }
} catch (err) {
  console.error('[Firebase] Failed to initialize — sign-in will be unavailable:', err);
}

// Firebase is used for sign-in only. Users and daily logs live in MongoDB and are reached through the backend API
// (services/dataApi.ts), so there is no database client, and no database credential, in the app.
export { app, auth };