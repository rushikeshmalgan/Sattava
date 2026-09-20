/**
 * Tests for services/photoCapture.ts: the adaptive-quality capture that keeps
 * uploads under the backend's image limit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AiApiError, MAX_UPLOAD_BASE64_CHARS } from '../services/aiApiClient';
import { CAPTURE_QUALITIES, captureUploadablePhoto } from '../services/photoCapture';

jest.mock('../firebaseConfig', () => ({ auth: { currentUser: null } }));

const LIMIT = 1000;
const photoOf = (chars: number) => ({ uri: `file:///photo-${chars}.jpg`, base64: 'A'.repeat(chars) });

/** A camera stub that returns the given sizes in order and records the qualities it was asked for. */
const camera = (sizes: number[]) => {
  const qualities: number[] = [];
  const take = jest.fn(async (quality: number) => {
    qualities.push(quality);
    return photoOf(sizes[Math.min(qualities.length - 1, sizes.length - 1)]!);
  });
  return { take, qualities };
};

describe('captureUploadablePhoto', () => {
  it('takes a single photo at the best quality when it already fits', async () => {
    const cam = camera([500]);
    const out = await captureUploadablePhoto(cam.take, { maxBase64Chars: LIMIT });
    expect(out.quality).toBe(0.75);
    expect(out.base64).toHaveLength(500);
    expect(out.uri).toBe('file:///photo-500.jpg');
    expect(cam.qualities).toEqual([0.75]);
  });

  it('accepts a photo exactly at the limit', async () => {
    const cam = camera([LIMIT]);
    const out = await captureUploadablePhoto(cam.take, { maxBase64Chars: LIMIT });
    expect(out.quality).toBe(0.75);
    expect(cam.qualities).toHaveLength(1);
  });

  it('retakes at a lower quality when the first photo is one character too large', async () => {
    const cam = camera([LIMIT + 1, 800]);
    const out = await captureUploadablePhoto(cam.take, { maxBase64Chars: LIMIT });
    expect(out.quality).toBe(0.5);
    expect(out.base64).toHaveLength(800);
    expect(cam.qualities).toEqual([0.75, 0.5]);
  });

  it('keeps stepping down to the lowest quality', async () => {
    const cam = camera([5000, 3000, 900]);
    const out = await captureUploadablePhoto(cam.take, { maxBase64Chars: LIMIT });
    expect(out.quality).toBe(0.3);
    expect(cam.qualities).toEqual([...CAPTURE_QUALITIES]);
  });

  it('fails with IMAGE_TOO_LARGE, after trying every quality, when nothing fits', async () => {
    const cam = camera([5000, 4000, 3000]);
    const error = await captureUploadablePhoto(cam.take, { maxBase64Chars: LIMIT }).catch((e) => e);
    expect(error).toBeInstanceOf(AiApiError);
    expect(error.code).toBe('IMAGE_TOO_LARGE');
    expect(cam.take).toHaveBeenCalledTimes(CAPTURE_QUALITIES.length);
  });

  it('never returns a photo over the limit', async () => {
    for (const sizes of [[2000, 1500, 1001], [LIMIT + 1], [9999, 9999, 9999]]) {
      const cam = camera(sizes);
      const result = await captureUploadablePhoto(cam.take, { maxBase64Chars: LIMIT }).catch(() => null);
      if (result) expect(result.base64.length).toBeLessThanOrEqual(LIMIT);
    }
  });

  it.each([
    ['no result', undefined],
    ['no base64', { uri: 'file:///x.jpg' }],
    ['no uri', { base64: 'AAAA' }],
    ['an empty base64 string', { uri: 'file:///x.jpg', base64: '' }],
  ])('fails immediately, without retrying, when the camera returns %s', async (_name, result) => {
    const take = jest.fn(async () => result);
    await expect(captureUploadablePhoto(take, { maxBase64Chars: LIMIT })).rejects.toThrow('Missing camera image data.');
    expect(take).toHaveBeenCalledTimes(1);
  });

  it('propagates a camera failure', async () => {
    const take = jest.fn(async () => {
      throw new Error('camera unavailable');
    });
    await expect(captureUploadablePhoto(take)).rejects.toThrow('camera unavailable');
  });

  it('reports every attempt size (this is how real-device sizes get measured)', async () => {
    const cam = camera([2000, 900]);
    const seen: { quality: number; base64Chars: number }[] = [];
    await captureUploadablePhoto(cam.take, { maxBase64Chars: LIMIT, onAttempt: (a) => seen.push(a) });
    expect(seen).toEqual([
      { quality: 0.75, base64Chars: 2000 },
      { quality: 0.5, base64Chars: 900 },
    ]);
  });

  it('uses the real upload limit by default', async () => {
    const cam = camera([MAX_UPLOAD_BASE64_CHARS + 1, MAX_UPLOAD_BASE64_CHARS]);
    const out = await captureUploadablePhoto(cam.take);
    expect(out.quality).toBe(0.5);
    expect(out.base64).toHaveLength(MAX_UPLOAD_BASE64_CHARS);
  });
});

describe('client upload limit is consistent with the backend', () => {
  const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

  it("never exceeds the backend's decoded image cap", () => {
    const match = read('backend/src/ai/imageValidation.ts').match(/MAX_IMAGE_BYTES\s*=\s*(\d+)\s*\*\s*1024\s*\*\s*1024/);
    expect(match).not.toBeNull();
    const serverBytes = Number(match![1]) * 1024 * 1024;
    expect(Math.floor((MAX_UPLOAD_BASE64_CHARS * 3) / 4)).toBeLessThanOrEqual(serverBytes);
  });

  it("fits inside the backend's request body limit, with room for the JSON envelope", () => {
    const match = read('backend/src/app.ts').match(/VISION_BODY_LIMIT\s*=\s*'(\d+)mb'/);
    expect(match).not.toBeNull();
    const bodyBytes = Number(match![1]) * 1024 * 1024;
    const envelope = 1024; // {"image":"...","mimeType":"image/jpeg"} plus slack
    expect(MAX_UPLOAD_BASE64_CHARS + envelope).toBeLessThanOrEqual(bodyBytes);
  });
});
