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
const REQUEST_TIMEOUT_MS = 20000; // 20s to tolerate Render cold-start
const MAX_RETRIES = 1;

/**
 * Resolves the proxy base URL using a 3-tier strategy:
 *
 * 1. **Explicit env var** (best for production / deployed proxy)
 * 2. **Auto-detect from Expo debugger host** (development)
 * 3. **Fail fast** with a clear error if neither is available.
 */
const getProxyBaseUrl = (): string => {
  const configuredUrl = process.env.EXPO_PUBLIC_PROXY_BASE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    (Constants.manifest2?.extra?.expoGo?.debuggerHost as string | undefined) ??
    (Constants.manifest as any)?.debuggerHost;

  if (debuggerHost) {
    const lanIp = debuggerHost.split(":")[0];
    if (lanIp && lanIp !== "localhost" && lanIp !== "127.0.0.1") {
      const autoUrl = `http://${lanIp}:${PROXY_PORT}`;
      console.log(`[FatSecret] Auto-detected proxy URL: ${autoUrl}`);
      return autoUrl;
    }
  }

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

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseFatSecretError(response: Response): string {
  if (response.status === 0 || !response.status) {
    return "Cannot reach the food search server. The backend may be waking up — please wait and try again.";
  }
  return `Food search failed (${response.status})`;
}

export const searchFoods = async (
  query: string
): Promise<FoodSearchItem[]> => {
  const proxyBaseUrl = getProxyBaseUrl();
  const proxyUrl = `${proxyBaseUrl}/api/foods/search?query=${encodeURIComponent(query)}`;

  console.log("[FatSecret] Requesting:", proxyUrl);

  let lastError: string | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(proxyUrl, REQUEST_TIMEOUT_MS);

      if (!response.ok) {
        let errorBody: any = null;
        try {
          errorBody = await response.json();
        } catch {
          // Not JSON — fall through to generic error
        }

        if (errorBody?.code === "IP_RESTRICTED") {
          const ip = errorBody.publicIp;
          throw new Error(
            `FatSecret blocked this server's IP address.${ip ? `\n\nYour IP: ${ip}` : ""}\n\n` +
              "Fix: Go to platform.fatsecret.com → Your App → IP Restrictions → " +
              `Add ${ip || "your public IP"} → Save and wait 1-2 min.`
          );
        }

        console.error("[FatSecret] HTTP error:", response.status, errorBody);
        throw new Error(errorBody?.error || parseFatSecretError(response));
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      const message = err?.message || String(err);
      lastError = message;

      const isNetworkOrTimeout =
        message.includes("Network request failed") ||
        message.includes("aborted") ||
        message.includes("Cannot reach");

      if (isNetworkOrTimeout && attempt < MAX_RETRIES) {
        console.warn(`[FatSecret] Attempt ${attempt + 1} failed (${message}). Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        continue;
      }

      throw new Error(message);
    }
  }

  throw new Error(lastError || "Food search failed. Please try again.");
};

