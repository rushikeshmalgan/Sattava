/**
 * Verifies a Firebase ID token and returns the *verified* uid.
 * Implementations throw TokenError for problems with the token itself and any
 * other error for infrastructure failures (which must not become a 401).
 */
export type TokenVerifier = (idToken: string) => Promise<{ uid: string }>;

export class TokenError extends Error {
  constructor(public readonly kind: 'expired' | 'invalid') {
    super(kind);
  }
}
