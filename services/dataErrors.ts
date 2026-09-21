import { ApiError } from './apiClient';
import type { AiErrorCode } from '../types/ai';

/**
 * Turns a failed data-API call into one sentence a user can act on.
 *
 * Every write in the app goes through the backend, so "it did not save" has several very different causes:
 * no network, a server that is down, a limit that was reached, or a session that ended. Telling them apart is
 * the difference between "try again" (which works) and "try again" (which never will).
 */

const MESSAGES: Partial<Record<AiErrorCode, string>> = {
  // Device side
  NOT_SIGNED_IN: 'You are signed out. Sign in again to continue.',
  NETWORK: 'No connection. Check your internet and try again.',
  TIMEOUT: 'The server took too long to answer. Try again in a moment.',
  CONFIG: 'This build is missing its server address, so it cannot reach Sattava.',
  INVALID_RESPONSE: 'The server sent something unexpected. Try again in a moment.',

  // Identity
  UNAUTHENTICATED: 'Your session has ended. Sign in again to continue.',
  INVALID_TOKEN: 'Your session has ended. Sign in again to continue.',
  TOKEN_EXPIRED: 'Your session has ended. Sign in again to continue.',

  // The request itself
  INVALID_REQUEST: 'Those values were refused by the server. Check them and try again.',
  PAYLOAD_TOO_LARGE: 'That was too large to send.',
  NOT_FOUND: 'That entry is already gone.',
  DAY_LIMIT_EXCEEDED: "That would go past this day's limit, so nothing was saved.",

  // The server side
  RATE_LIMITED: 'Too many requests just now. Wait a minute and try again.',
  DATABASE_UNAVAILABLE: 'Sattava cannot reach its database right now. Nothing was saved. Try again shortly.',
  AI_UNAVAILABLE: 'The AI service is busy right now. Try again shortly.',
  INTERNAL_ERROR: 'Something went wrong on the server. Try again shortly.',
};

/** True when signing in again is the only way forward. */
export const isSessionExpired = (error: unknown): boolean =>
  error instanceof ApiError && ['NOT_SIGNED_IN', 'UNAUTHENTICATED', 'INVALID_TOKEN', 'TOKEN_EXPIRED'].includes(error.code);

/**
 * @param action what the app was doing, e.g. "save that meal". Used only for failures with no specific cause,
 *               so the message still says what did not happen.
 */
export function describeDataError(error: unknown, action = 'do that'): string {
  if (error instanceof ApiError) {
    const message = MESSAGES[error.code];
    if (message) return message;
  }
  return `Could not ${action}. Try again in a moment.`;
}
