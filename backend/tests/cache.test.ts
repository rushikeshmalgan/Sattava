import request from 'supertest';
import { LruTtlCache, visionCacheKey } from '../src/ai/cache';
import { goodModelJson, makeImage, makeTestApp, providerFailure, scriptedProvider } from './helpers';

describe('LruTtlCache', () => {
  it('expires entries after the TTL', () => {
    let now = 0;
    const cache = new LruTtlCache<string>(10, 1_000, () => now);
    cache.set('k', 'v');
    expect(cache.get('k')).toBe('v');
    now = 1_001;
    expect(cache.get('k')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('evicts the least recently used entry at capacity', () => {
    const cache = new LruTtlCache<number>(2, 60_000);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // a is now most recent
    cache.set('c', 3); // evicts b
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });

  it('keys on content hash + mime + promptVersion', () => {
    const base = visionCacheKey('h', 'image/jpeg', 'v1');
    expect(visionCacheKey('h2', 'image/jpeg', 'v1')).not.toBe(base);
    expect(visionCacheKey('h', 'image/png', 'v1')).not.toBe(base);
    expect(visionCacheKey('h', 'image/jpeg', 'v2')).not.toBe(base);
  });
});

describe('POST /api/v1/vision/analyze-food: caching', () => {
  const post = (app: any, img: { base64: string; mimeType: string }, token = 'good-token') =>
    request(app).post('/api/v1/vision/analyze-food').set('Authorization', `Bearer ${token}`).send({ image: img.base64, mimeType: img.mimeType });

  it('cache miss calls the provider once; an identical image is then a hit with zero provider calls', async () => {
    const { app, provider } = makeTestApp();
    const img = makeImage('jpeg', 1);

    const first = await post(app, img);
    expect(first.status).toBe(200);
    expect(first.body.meta.cached).toBe(false);
    expect(provider.calls).toHaveLength(1);

    const second = await post(app, img);
    expect(second.status).toBe(200);
    expect(second.body.meta.cached).toBe(true);
    expect(provider.calls).toHaveLength(1);
    expect(second.body.analysis).toEqual(first.body.analysis);
    expect(second.body.meta.model).toBe(first.body.meta.model);
  });

  it('a different image is a miss', async () => {
    const { app, provider } = makeTestApp();
    await post(app, makeImage('jpeg', 10));
    await post(app, makeImage('jpeg', 11));
    expect(provider.calls).toHaveLength(2);
  });

  it('REGRESSION: two images with an identical first 10 KB but different tails do not collide', async () => {
    const { app, provider } = makeTestApp();
    const head = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(12_000, 7)]);
    const a = Buffer.concat([head, Buffer.from('tail-A')]).toString('base64');
    const b = Buffer.concat([head, Buffer.from('tail-B')]).toString('base64');
    await post(app, { base64: a, mimeType: 'image/jpeg' });
    const second = await post(app, { base64: b, mimeType: 'image/jpeg' });
    expect(second.body.meta.cached).toBe(false);
    expect(provider.calls).toHaveLength(2);
  });

  it('cache is shared across users (analysis is user-independent) but auth is still required', async () => {
    const { app, provider } = makeTestApp();
    const img = makeImage('jpeg', 20);
    await post(app, img, 'good-token');
    const other = await post(app, img, 'other-token');
    expect(other.body.meta.cached).toBe(true);
    expect(provider.calls).toHaveLength(1);
    const anon = await request(app).post('/api/v1/vision/analyze-food').send({ image: img.base64, mimeType: img.mimeType });
    expect(anon.status).toBe(401);
  });

  it('a FAILED analysis is never cached: the next identical request calls the provider again', async () => {
    const provider = scriptedProvider([
      ...Array.from({ length: 4 }, () => providerFailure('MODEL_FAILED', 'MODEL_OVERLOADED', 503)),
      goodModelJson(),
    ]);
    const { app } = makeTestApp({ provider });
    const img = makeImage('jpeg', 30);

    const failed = await post(app, img);
    expect(failed.status).toBe(503);
    expect(provider.calls).toHaveLength(4);

    const retried = await post(app, img);
    expect(retried.status).toBe(200);
    expect(retried.body.meta.cached).toBe(false);
    expect(provider.calls).toHaveLength(5);
  });

  it('invalid model output is never cached', async () => {
    const provider = scriptedProvider(['garbage', 'garbage', 'garbage', 'garbage', goodModelJson()]);
    const { app } = makeTestApp({ provider });
    const img = makeImage('jpeg', 40);
    expect((await post(app, img)).status).toBe(502);
    const second = await post(app, img);
    expect(second.status).toBe(200);
    expect(second.body.meta.cached).toBe(false);
  });
});
