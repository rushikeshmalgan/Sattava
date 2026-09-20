import { AiApiError, MAX_UPLOAD_BASE64_CHARS } from './aiApiClient';

/**
 * JPEG qualities tried in order, best first.
 *
 * Photos are captured at the camera's native resolution, so file size varies a
 * lot by device: a high-resolution sensor can push a quality-0.75 photo past the
 * 5 MB the backend accepts. Lowering the quality is the only size lever
 * expo-camera exposes to JavaScript on both platforms (`scale` is web-only, and
 * `pictureSize` changes the preview geometry, which needs on-device validation).
 */
export const CAPTURE_QUALITIES = [0.75, 0.5, 0.3] as const;

export interface CapturedPhoto {
  uri: string;
  base64: string;
  /** The JPEG quality that produced a photo small enough to upload. */
  quality: number;
}

export interface CaptureAttempt {
  quality: number;
  base64Chars: number;
}

interface RawPhoto {
  uri?: string;
  base64?: string;
}

/**
 * Takes a photo that is guaranteed to fit the upload limit, retaking at a lower
 * JPEG quality when the first attempt is too large. Throws
 * AiApiError('IMAGE_TOO_LARGE') if even the lowest quality does not fit.
 *
 * `onAttempt` reports every attempt's size, which is how real-device photo sizes
 * can be measured (the remaining validation gate for the image limit).
 */
export async function captureUploadablePhoto(
  takePicture: (quality: number) => Promise<RawPhoto | undefined>,
  options: { maxBase64Chars?: number; onAttempt?: (attempt: CaptureAttempt) => void } = {},
): Promise<CapturedPhoto> {
  const maxBase64Chars = options.maxBase64Chars ?? MAX_UPLOAD_BASE64_CHARS;

  for (const quality of CAPTURE_QUALITIES) {
    const photo = await takePicture(quality);
    if (!photo?.base64 || !photo?.uri) {
      throw new Error('Missing camera image data.');
    }

    options.onAttempt?.({ quality, base64Chars: photo.base64.length });

    if (photo.base64.length <= maxBase64Chars) {
      return { uri: photo.uri, base64: photo.base64, quality };
    }
  }

  throw new AiApiError('IMAGE_TOO_LARGE');
}
