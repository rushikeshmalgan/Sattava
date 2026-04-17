import Constants from "expo-constants";

export interface FoodSearchItem {
  food_id: string;
  food_name: string;
  food_description: string;
  food_url: string;
  food_type: string;
  brand_name?: string;
}

const PROXY_PORT = 3000;

/**
 * Resolves the proxy base URL using a 3-tier strategy:
 *
 * 1. **Explicit env var** (best for production / deployed proxy)
 *    Set `EXPO_PUBLIC_PROXY_BASE_URL=https://your-proxy.example.com` in .env
 *
 * 2. **Auto-detect from Expo debugger host** (works automatically in development)
 *    Expo's Metro bundler exposes `debuggerHost` which contains the dev machine
 *    LAN IP (e.g. "192.168.1.5:8081"). We extract the IP and swap the port to
 *    the backend proxy port (3000). This means physical devices on the same Wi-Fi
 *    can reach the proxy without any manual configuration.
 *
 * 3. **Fail fast** with a clear error if neither is available.
 */
const getProxyBaseUrl = (): string => {
  // ── Tier 1: Explicit env var (production / custom setup) ──
  const configuredUrl = process.env.EXPO_PUBLIC_PROXY_BASE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  // ── Tier 2: Auto-detect from Expo dev server (development) ──
  const debuggerHost =
    Constants.expoConfig?.hostUri ?? // Expo SDK 49+
    (Constants.manifest2?.extra?.expoGo?.debuggerHost as string | undefined) ??
    (Constants.manifest as any)?.debuggerHost;

  if (debuggerHost) {
    // debuggerHost looks like "192.168.1.5:8081" — extract just the IP
    const lanIp = debuggerHost.split(":")[0];
    if (lanIp && lanIp !== "localhost" && lanIp !== "127.0.0.1") {
      const autoUrl = `http://${lanIp}:${PROXY_PORT}`;
      console.log(`[FatSecret] Auto-detected proxy URL: ${autoUrl}`);
      return autoUrl;
    }
  }

  // ── Tier 3: Fail with a clear message ──
  throw new Error(
    "[FatSecret] Cannot determine proxy URL.\n\n" +
      "For DEVELOPMENT:\n" +
      "  • Make sure your phone and computer are on the same Wi-Fi network.\n" +
      "  • The proxy server should be running: cd backend && node server.js\n" +
      "  • If auto-detection fails, set EXPO_PUBLIC_PROXY_BASE_URL in .env\n" +
      "    to your LAN IP, e.g.: EXPO_PUBLIC_PROXY_BASE_URL=http://192.168.1.5:3000\n\n" +
      "For PRODUCTION:\n" +
      "  • Deploy the backend proxy and set EXPO_PUBLIC_PROXY_BASE_URL to its URL.\n"
  );
};

export const searchFoods = async (
  query: string
): Promise<FoodSearchItem[]> => {
  const proxyBaseUrl = getProxyBaseUrl(); // throws with clear message if unresolvable
  const proxyUrl = `${proxyBaseUrl}/api/foods/search?query=${encodeURIComponent(query)}`;

  console.log("[FatSecret] Requesting:", proxyUrl);

  const response = await fetch(proxyUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    // Try to parse the JSON error body from our proxy
    let errorBody: any = null;
    try {
      errorBody = await response.json();
    } catch {
      // Not JSON — fall through to generic error
    }

    // ── IP Restriction error (FatSecret Error Code 21) ──
    if (errorBody?.code === "IP_RESTRICTED") {
      const ip = errorBody.publicIp;
      throw new Error(
        `FatSecret blocked this server's IP address.${ip ? `\n\nYour IP: ${ip}` : ""}\n\n` +
          "Fix: Go to platform.fatsecret.com → Your App → IP Restrictions → " +
          `Add ${ip || "your public IP"} → Save and wait 1-2 min.`
      );
    }

    console.error("[FatSecret] HTTP error:", response.status, errorBody);
    throw new Error(
      response.status === 0 || !response.status
        ? "Cannot reach the food search server. Make sure:\n• The proxy is running (cd backend && node server.js)\n• Your phone is on the same Wi-Fi as the server"
        : errorBody?.error || `Food search failed (${response.status})`
    );
  }

  const data = await response.json();
  return data;
};

