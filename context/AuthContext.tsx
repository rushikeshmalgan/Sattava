import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import {
  onAuthStateChanged,
  User,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<void>;
  signInWithPhone: (phoneNumber: string) => Promise<ConfirmationResult>;
  verifyPhoneCode: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => Promise.resolve({} as User),
  signInWithGoogle: async () => {},
  signInWithPhone: async () => Promise.resolve({ verifyPhoneCode: async () => {}, verificationId: '', confirm: async () => ({ user: {} as User } as any) } as unknown as ConfirmationResult),
  verifyPhoneCode: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const createRecaptchaVerifier = () => {
    if (!auth || Platform.OS !== 'web') return undefined;
    const containerId = 'recaptcha-container';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.display = 'none';
      document.body.appendChild(container);
    }
    return new RecaptchaVerifier(auth, container, {
      size: 'invisible',
      callback: () => {},
    });
  };

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error('[AUTH] Email sign-in error:', err);
      throw new Error(getFriendlyAuthError(err));
    }
  };

  const signUp = async (email: string, password: string): Promise<User> => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(credential.user);
      return credential.user;
    } catch (err: any) {
      console.error('[AUTH] Email sign-up error:', err);
      throw new Error(getFriendlyAuthError(err));
    }
  };

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase Auth is not initialized');

    try {
      if (Platform.OS === 'web') {
        await signInWithPopup(auth, new GoogleAuthProvider());
      } else {
        const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        if (!webClientId) {
          throw new Error('Google Web Client ID is not configured');
        }

        // Derived from the app's own scheme (app.json "scheme"), never written out by hand: a literal that
        // does not match the installed app means the browser never comes back and sign-in hangs.
        // The same URI must be registered as an authorized redirect URI for this client in the Google console.
        const redirectUri = Linking.createURL('');
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(webClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=openid%20email%20profile`;

        const result = await WebBrowser.openAuthSessionAsync(googleAuthUrl, redirectUri);

        if (result.type === 'success') {
          const params = new URLSearchParams(result.url.split('#')[1] || '');
          const accessToken = params.get('access_token') || '';
          if (!accessToken) {
            throw new Error('Failed to get Google access token');
          }
          await signInWithCredential(auth, GoogleAuthProvider.credential(null, accessToken));
        } else if (result.type === 'cancel') {
          throw new Error('Google sign-in was cancelled');
        } else {
          throw new Error('Google sign-in failed');
        }
      }
    } catch (err: any) {
      console.error('[AUTH] Google sign-in error:', err);
      throw new Error(getFriendlyAuthError(err));
    }
  };

  const signInWithPhone = async (phoneNumber: string): Promise<ConfirmationResult> => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    try {
      const verifier = createRecaptchaVerifier();
      return await signInWithPhoneNumber(auth, phoneNumber, verifier);
    } catch (err: any) {
      console.error('[AUTH] Phone sign-in error:', err);
      throw new Error(getFriendlyAuthError(err));
    }
  };

  const verifyPhoneCode = async (confirmationResult: ConfirmationResult, code: string) => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    try {
      await confirmationResult.confirm(code);
    } catch (err: any) {
      console.error('[AUTH] Phone verification error:', err);
      throw new Error(getFriendlyAuthError(err));
    }
  };

  const signOutAsync = async () => {
    if (auth) await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signInWithPhone, verifyPhoneCode, signOut: signOutAsync }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

function getFriendlyAuthError(error: any): string {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code.includes('invalid-credential') || message.includes('invalid-credential')) {
    return 'Invalid email or password. Please try again.';
  }
  if (code.includes('user-not-found') || message.includes('user-not-found')) {
    return 'No account found with this email.';
  }
  if (code.includes('wrong-password') || message.includes('wrong-password')) {
    return 'Incorrect password. Please try again.';
  }
  if (code.includes('email-already-in-use') || message.includes('email-already-in-use')) {
    return 'An account with this email already exists.';
  }
  if (code.includes('weak-password') || message.includes('weak-password')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code.includes('popup-closed-by-user') || message.includes('popup-closed-by-user')) {
    return 'Google sign-in was cancelled.';
  }
  if (code.includes('network-request-failed') || message.includes('network-request-failed')) {
    return 'Network error. Please check your connection.';
  }
  if (code.includes('too-many-requests') || message.includes('too-many-requests')) {
    return 'Too many attempts. Please try again later.';
  }
  if (code.includes('invalid-phone-number') || message.includes('invalid-phone-number')) {
    return 'Invalid phone number format. Please check and try again.';
  }
  if (code.includes('quota-exceeded') || message.includes('quota-exceeded')) {
    return 'SMS quota exceeded. Please try again later.';
  }
  if (code.includes('invalid-verification-code') || message.includes('invalid-verification-code')) {
    return 'Invalid verification code. Please try again.';
  }
  if (code.includes('missing-phone-number') || message.includes('missing-phone-number')) {
    return 'Please enter your phone number.';
  }
  if (code.includes('configuration-not-found') || message.includes('configuration-not-found')) {
    return 'Firebase Authentication is not configured for this project. Please enable it in the Firebase Console.';
  }
  if (code.includes('argument-error') || message.includes('argument-error')) {
    return 'Phone authentication setup is incomplete. Please check your Firebase Console configuration.';
  }

  return message || 'Authentication failed. Please try again.';
}
