import { createHash } from 'node:crypto';
import { ApiError } from '../http/errors';

/** Decoded size cap. The route's body-parser limit is sized to fit this after base64 overhead. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

type Mime = 'image/jpeg' | 'image/png' | 'image/webp';

/** Identifies the real format from magic bytes; the client's claim is never trusted on its own. */
function sniffMime(b: Buffer): Mime | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (b.length >= 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

export interface ValidatedImage {
  bytes: Buffer;
  mimeType: Mime;
  /** SHA-256 of the FULL decoded image (content address for the server cache). */
  sha256: string;
}

export function validateImage(base64: string, claimedMime: string): ValidatedImage {
  // Reject on encoded length first so an oversized payload is never decoded.
  if (Math.floor((base64.length * 3) / 4) > MAX_IMAGE_BYTES) throw new ApiError(413, 'PAYLOAD_TOO_LARGE');

  if (!BASE64_RE.test(base64)) {
    throw new ApiError(400, 'INVALID_IMAGE', { internal: { reason: 'NOT_BASE64' } });
  }

  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > MAX_IMAGE_BYTES) throw new ApiError(413, 'PAYLOAD_TOO_LARGE');

  const sniffed = sniffMime(bytes);
  if (!sniffed) throw new ApiError(400, 'INVALID_IMAGE', { internal: { reason: 'UNRECOGNISED_FORMAT' } });
  if (sniffed !== claimedMime) {
    throw new ApiError(400, 'INVALID_IMAGE', { internal: { reason: 'MIME_MISMATCH', claimedMime, sniffed } });
  }

  return { bytes, mimeType: sniffed, sha256: createHash('sha256').update(bytes).digest('hex') };
}
