import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { TokenError, type TokenVerifier } from './auth/tokenVerifier';

const INVALID_TOKEN_CODES = new Set([
  'auth/argument-error',
  'auth/invalid-id-token',
  'auth/id-token-revoked',
  'auth/invalid-user-token',
  'auth/user-disabled',
]);

/**
 * The single place the Firebase Admin SDK is initialised.
 *
 * Only the project ID is supplied: verifyIdToken checks the token signature
 * against Google's public certificates, so no service-account credential is
 * needed (or stored on the server) for this phase. If a later feature needs
 * privileged Admin APIs, add a credential here deliberately.
 */
export function createFirebaseTokenVerifier(projectId: string): TokenVerifier {
  const app = getApps()[0] ?? initializeApp({ projectId });
  const auth = getAuth(app);

  return async (idToken) => {
    try {
      const decoded = await auth.verifyIdToken(idToken);
      return { uid: decoded.uid };
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code === 'auth/id-token-expired') throw new TokenError('expired');
      if (code && INVALID_TOKEN_CODES.has(code)) throw new TokenError('invalid');
      // Anything else (cert fetch failure, network) is our problem, not a bad token.
      throw err;
    }
  };
}
