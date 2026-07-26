import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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
    `\n\nCopy .env.example to .env and fill in your Firebase project values.`;

  if (__DEV__) {
    console.warn(message);
  } else {
    throw new Error(message);
  }
}

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
