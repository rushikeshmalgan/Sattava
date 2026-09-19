import type { FailureCategory } from './provider';

export interface HttpFailureInfo {
  status: number;
  /** google.rpc status string, e.g. RESOURCE_EXHAUSTED, UNAVAILABLE, INVALID_ARGUMENT. */
  providerStatus?: string;
  /** error.details[].reason values, e.g. API_KEY_INVALID. */
  reasons: string[];
  message: string;
}

export interface Classification {
  category: FailureCategory;
  reason: string;
}

/**
 * Classifies by HTTP status and structured error fields, NOT by substring
 * matching the message. The old classifier treated any message containing
 * "invalid" as a bad API key, so a plain "invalid argument" (e.g. a rejected
 * image) aborted the whole fallback chain.
 *
 * Only API_KEY_INVALID aborts the chain: the same key fails on every model.
 */
export function classifyHttpFailure(info: HttpFailureInfo): Classification {
  const msg = info.message.toLowerCase();

  // Gemini reports a bad key as HTTP 400 with reason API_KEY_INVALID, so check
  // structured reasons before the generic 400 handling below.
  if (
    info.reasons.includes('API_KEY_INVALID') ||
    info.reasons.includes('API_KEY_EXPIRED') ||
    /api key (not valid|expired)/.test(msg)
  ) {
    return { category: 'API_KEY_INVALID', reason: 'API_KEY_INVALID' };
  }

  if (info.status === 401 || info.status === 403) {
    return { category: 'API_KEY_INVALID', reason: 'PERMISSION_DENIED' };
  }
  if (info.status === 429 || info.providerStatus === 'RESOURCE_EXHAUSTED') {
    return { category: 'RATE_LIMITED', reason: 'QUOTA_OR_RATE_LIMIT' };
  }
  if (info.status === 404) return { category: 'MODEL_FAILED', reason: 'MODEL_NOT_FOUND' };
  if (info.status === 400) return { category: 'MODEL_FAILED', reason: 'BAD_REQUEST' };
  if (info.status === 503 || info.providerStatus === 'UNAVAILABLE') {
    return { category: 'MODEL_FAILED', reason: 'MODEL_OVERLOADED' };
  }
  if (info.status === 504 || info.providerStatus === 'DEADLINE_EXCEEDED') {
    return { category: 'MODEL_FAILED', reason: 'PROVIDER_TIMEOUT' };
  }
  if (info.status >= 500) return { category: 'MODEL_FAILED', reason: 'PROVIDER_ERROR' };
  return { category: 'MODEL_FAILED', reason: 'UNEXPECTED_STATUS' };
}

/** fetch() itself failed: no HTTP response was received. */
export function classifyNetworkFailure(err: unknown): Classification {
  const name = (err as { name?: string } | null)?.name;
  const isTimeout = name === 'TimeoutError' || name === 'AbortError';
  return { category: 'NETWORK_ERROR', reason: isTimeout ? 'TIMEOUT' : 'CONNECTION' };
}
