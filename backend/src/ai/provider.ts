/** The four failure categories the app has always used, preserved. */
export type FailureCategory = 'API_KEY_INVALID' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'MODEL_FAILED';

export class ProviderError extends Error {
  constructor(
    public readonly category: FailureCategory,
    /** Finer-grained machine-readable reason, e.g. MODEL_NOT_FOUND, MODEL_OVERLOADED. */
    public readonly reason: string,
    public readonly httpStatus?: number,
    /** Already scrubbed of credentials and truncated. Safe to log, never returned to clients. */
    public readonly detail: string = '',
  ) {
    super(`${category}:${reason}`);
  }
}

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

export interface GenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: 'application/json' | 'text/plain';
  /** Gemini 3.x models otherwise spend ~1k hidden thought tokens (10s+) on simple extraction. */
  thinkingConfig?: { thinkingLevel: 'minimal' | 'low' };
}

export interface GenerateRequest {
  model: string;
  parts: Part[];
  generationConfig?: GenerationConfig;
  signal: AbortSignal;
}

/** Narrow seam around the LLM vendor so tests can script it and the vendor can change. */
export interface GenerativeProvider {
  generate(req: GenerateRequest): Promise<{ text: string }>;
}
