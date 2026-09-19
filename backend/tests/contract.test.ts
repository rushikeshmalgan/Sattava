import fixture from '../../__fixtures__/vision-response.json';
import { VisionRequestSchema, VisionResponseSchema } from '../src/ai/schemas/vision';
import { makeImage } from './helpers';

/**
 * The same fixture is type-checked against the mobile client's types
 * (__tests__/aiApiClient.test.ts), so a change to the public contract fails
 * on both sides instead of drifting silently.
 */
describe('public API contract', () => {
  it('the shared fixture is a valid VisionResponse', () => {
    expect(VisionResponseSchema.safeParse(fixture).success).toBe(true);
  });

  it('rejects unknown keys anywhere in the response (strict)', () => {
    const extra = { ...fixture, analysis: { ...fixture.analysis, modelUsed: 'x' } };
    expect(VisionResponseSchema.safeParse(extra).success).toBe(false);
  });

  it('a request is exactly { image, mimeType }', () => {
    const img = makeImage();
    expect(VisionRequestSchema.safeParse({ image: img.base64, mimeType: img.mimeType }).success).toBe(true);
    expect(VisionRequestSchema.safeParse({ image: img.base64, mimeType: img.mimeType, userId: 'x' }).success).toBe(false);
  });
});
