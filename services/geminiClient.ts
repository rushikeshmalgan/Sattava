import { GoogleGenerativeAI, type GenerationConfig } from '@google/generative-ai';

// ── API Setup ───────────────────────────────────────────────────────────────
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
let genAI: GoogleGenerativeAI | null = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
} else {
  console.warn('[Gemini] Missing EXPO_PUBLIC_GEMINI_API_KEY — AI features disabled');
}

// ── Model fallback chain ────────────────────────────────────────────────────
// gemini-2.0-flash* and gemini-1.5-flash* have SEPARATE quota pools,
// so if the 2.0 daily quota is exhausted, 1.5 models will still respond.
export const MODEL_PRIORITY = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
] as const;

export type GeminiModelName = (typeof MODEL_PRIORITY)[number];

// ── Error classifiers ───────────────────────────────────────────────────────
export const isRateLimit = (err: unknown): boolean => {
  const msg = String((err as any)?.message ?? '');
  return msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED');
};

export const isApiKeyError = (err: unknown): boolean => {
  const msg = String((err as any)?.message ?? '');
  return msg.includes('API_KEY') || msg.includes('401') || msg.includes('403') || msg.includes('invalid');
};

export const isNetworkError = (err: unknown): boolean => {
  const msg = String((err as any)?.message ?? '');
  return msg.includes('Network request failed') || msg.includes('aborted') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND');
};

export const getFailureCategory = (err: unknown): 'API_KEY_INVALID' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'MODEL_FAILED' | 'UNKNOWN' => {
  if (isApiKeyError(err)) return 'API_KEY_INVALID';
  if (isRateLimit(err)) return 'RATE_LIMITED';
  if (isNetworkError(err)) return 'NETWORK_ERROR';
  return 'MODEL_FAILED';
};

// ── Core: try models in priority order ───────────────────────────────────────
export async function tryModels(
  promptFn: (modelName: GeminiModelName) => Promise<string>,
  context = 'Gemini',
): Promise<{ text: string | null; modelUsed: string | null; failureCategory: string | null }> {
  if (!genAI) {
    console.warn(`[${context}] No API key — check EXPO_PUBLIC_GEMINI_API_KEY in .env`);
    return { text: null, modelUsed: null, failureCategory: 'API_KEY_INVALID' };
  }

  let lastErr: unknown = null;

  for (const modelName of MODEL_PRIORITY) {
    try {
      const text = await promptFn(modelName);
      console.log(`[${context}] Success with model: ${modelName}`);
      return { text, modelUsed: modelName, failureCategory: null };
    } catch (err) {
      lastErr = err;
      const category = getFailureCategory(err);

      if (category === 'API_KEY_INVALID') {
        console.error(`[${context}] API key invalid — aborting all models:`, (err as any)?.message);
        return { text: null, modelUsed: null, failureCategory: 'API_KEY_INVALID' };
      }

      if (category === 'RATE_LIMITED') {
        console.warn(`[${context}] Rate limit on ${modelName}, trying next model...`);
        continue;
      }

      console.warn(`[${context}] Model ${modelName} failed (${category}):`, (err as any)?.message);
    }
  }

  console.error(`[${context}] All models failed — last error:`, lastErr);
  return {
    text: null,
    modelUsed: null,
    failureCategory: getFailureCategory(lastErr),
  };
}

// ── Model factory ───────────────────────────────────────────────────────────
export function getGenerativeModel(modelName: GeminiModelName, generationConfig?: GenerationConfig) {
  if (!genAI) {
    throw new Error('Gemini not initialized — check EXPO_PUBLIC_GEMINI_API_KEY');
  }
  return genAI.getGenerativeModel({ model: modelName, ...(generationConfig ? { generationConfig } : {}) });
}
