export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_IMAGE'
  | 'UNAUTHENTICATED'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'AI_INVALID_OUTPUT'
  | 'AI_UNAVAILABLE'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

/** Client-facing messages. Deliberately generic: provider details never reach the client. */
export const SAFE_MESSAGES: Record<ErrorCode, string> = {
  INVALID_REQUEST: 'The request was invalid.',
  INVALID_IMAGE: 'The image could not be accepted.',
  UNAUTHENTICATED: 'Authentication is required.',
  INVALID_TOKEN: 'The authentication token is invalid.',
  TOKEN_EXPIRED: 'The authentication token has expired.',
  PAYLOAD_TOO_LARGE: 'The request is too large.',
  RATE_LIMITED: 'Too many requests. Please try again shortly.',
  AI_INVALID_OUTPUT: 'Food analysis could not produce a usable result.',
  AI_UNAVAILABLE: 'Food analysis is temporarily unavailable.',
  NOT_FOUND: 'Resource not found.',
  INTERNAL_ERROR: 'Something went wrong.',
};

export interface ApiErrorOptions {
  /** Seconds. Sets the Retry-After header. */
  retryAfter?: number;
  /** Internal-only context (logged, never returned). */
  internal?: Record<string, unknown>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    public readonly options: ApiErrorOptions = {},
  ) {
    super(code);
  }
}

export interface ErrorEnvelope {
  error: { code: ErrorCode; message: string; requestId: string };
}

export const toEnvelope = (code: ErrorCode, requestId: string): ErrorEnvelope => ({
  error: { code, message: SAFE_MESSAGES[code], requestId },
});
