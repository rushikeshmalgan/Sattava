import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEV_PORT = 3000;

/**
 * Base URL of the Sattava API (AI gateway and food proxy).
 *
 * 1. EXPO_PUBLIC_PROXY_BASE_URL (production / deployed backend)
 * 2. In development, the LAN IP of the machine running Metro plus the dev port
 * 3. In a browser (Expo web) on the same machine, localhost plus the dev port
 * 4. Otherwise fail with an actionable message
 *
 * Nothing secret lives here: this is only a URL.
 */
export const getApiBaseUrl = (): string => {
  const configured = process.env.EXPO_PUBLIC_PROXY_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    (Constants.manifest2?.extra?.expoGo?.debuggerHost as string | undefined) ??
    (Constants.manifest as { debuggerHost?: string } | null)?.debuggerHost;

  if (debuggerHost) {
    const lanIp = debuggerHost.split(':')[0];
    if (lanIp && lanIp !== 'localhost' && lanIp !== '127.0.0.1') {
      return `http://${lanIp}:${DEV_PORT}`;
    }
  }

  // Expo web in development runs in a browser on the same machine as the backend.
  if (Platform.OS === 'web' && __DEV__) return `http://localhost:${DEV_PORT}`;

  throw new Error(
    'Cannot determine the API URL. Set EXPO_PUBLIC_PROXY_BASE_URL in .env, or (development) run the backend ' +
      'with `cd backend && npm run dev` on the same Wi-Fi network as your phone.',
  );
};
