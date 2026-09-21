/**
 * The message a user is shown when a data call fails. The point of the helper is that the four very
 * different reasons a write can fail do not all read as "try again".
 */

import { ApiError } from '../services/apiClient';
import { describeDataError, isSessionExpired } from '../services/dataErrors';
import type { AiErrorCode, ServerErrorCode } from '../types/ai';

jest.mock('../firebaseConfig', () => ({ auth: { currentUser: null } }));

describe('describeDataError', () => {
  it('says the day limit stopped the write, not that it should be retried', () => {
    const message = describeDataError(new ApiError('DAY_LIMIT_EXCEEDED', 422), 'save that meal');
    expect(message).toMatch(/limit/i);
    expect(message).toMatch(/nothing was saved/i);
  });

  it('distinguishes no connection from a server that is down', () => {
    expect(describeDataError(new ApiError('NETWORK'))).toMatch(/connection/i);
    expect(describeDataError(new ApiError('DATABASE_UNAVAILABLE', 503))).toMatch(/database/i);
    expect(describeDataError(new ApiError('NETWORK'))).not.toEqual(describeDataError(new ApiError('DATABASE_UNAVAILABLE', 503)));
  });

  it('tells a rate-limited user to wait', () => {
    expect(describeDataError(new ApiError('RATE_LIMITED', 429))).toMatch(/wait a minute/i);
  });

  it('names the action for a failure it has no specific message for', () => {
    expect(describeDataError(new Error('boom'), 'save that meal')).toBe('Could not save that meal. Try again in a moment.');
    expect(describeDataError(undefined)).toBe('Could not do that. Try again in a moment.');
  });

  it('never leaks a raw error message to the user', () => {
    const raw = 'MongoServerSelectionError: connect ECONNREFUSED 10.1.2.3:27017';
    expect(describeDataError(new Error(raw), 'save that')).not.toContain('27017');
  });

  it('has a message for every error code the API client can produce', () => {
    const serverCodes: ServerErrorCode[] = [
      'INVALID_REQUEST', 'INVALID_IMAGE', 'UNAUTHENTICATED', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'PAYLOAD_TOO_LARGE',
      'RATE_LIMITED', 'AI_INVALID_OUTPUT', 'AI_UNAVAILABLE', 'NOT_FOUND', 'DAY_LIMIT_EXCEEDED', 'DATABASE_UNAVAILABLE',
      'INTERNAL_ERROR',
    ];
    const clientCodes: AiErrorCode[] = ['NOT_SIGNED_IN', 'NETWORK', 'TIMEOUT', 'INVALID_RESPONSE', 'IMAGE_TOO_LARGE', 'CONFIG'];

    for (const code of [...serverCodes, ...clientCodes]) {
      const message = describeDataError(new ApiError(code), 'save that');
      expect(message.length).toBeGreaterThan(0);
      // A fallback is acceptable for codes the data API cannot return; a nonsense message is not.
      expect(message).toMatch(/\.$/);
    }
  });
});

describe('isSessionExpired', () => {
  it('is true only when signing in again is the way out', () => {
    for (const code of ['NOT_SIGNED_IN', 'UNAUTHENTICATED', 'INVALID_TOKEN', 'TOKEN_EXPIRED'] as const) {
      expect(isSessionExpired(new ApiError(code))).toBe(true);
    }
    expect(isSessionExpired(new ApiError('NETWORK'))).toBe(false);
    expect(isSessionExpired(new ApiError('DATABASE_UNAVAILABLE'))).toBe(false);
    expect(isSessionExpired(new Error('nope'))).toBe(false);
  });
});
