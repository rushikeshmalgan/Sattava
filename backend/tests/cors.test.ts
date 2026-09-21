import request from 'supertest';
import { makeTestApp } from './helpers';

/** Native apps do not use CORS. Browsers (Expo web) need an origin allowed, and only the right ones. */

const allowedOrigin = async (env: Record<string, string>, origin: string): Promise<string | undefined> => {
  const { app } = makeTestApp({ env });
  const res = await request(app).get('/health').set('Origin', origin);
  return res.headers['access-control-allow-origin'];
};

describe('CORS', () => {
  it.each(['http://localhost:8081', 'http://localhost:19006'])('development allows the Expo web dev server at %s without any configuration', async (origin) => {
    expect(await allowedOrigin({ NODE_ENV: 'development' }, origin)).toBe(origin);
  });

  it('development still refuses every other origin', async () => {
    expect(await allowedOrigin({ NODE_ENV: 'development' }, 'https://evil.example')).toBeUndefined();
    expect(await allowedOrigin({ NODE_ENV: 'development' }, 'http://localhost:9999')).toBeUndefined();
  });

  it.each(['production', 'test'])('%s allows no browser origin unless CORS_ORIGINS names it', async (nodeEnv) => {
    expect(await allowedOrigin({ NODE_ENV: nodeEnv }, 'http://localhost:8081')).toBeUndefined();
  });

  it('CORS_ORIGINS replaces the development default, in any environment', async () => {
    const env = { NODE_ENV: 'development', CORS_ORIGINS: 'https://app.example.com' };

    expect(await allowedOrigin(env, 'https://app.example.com')).toBe('https://app.example.com');
    expect(await allowedOrigin(env, 'http://localhost:8081')).toBeUndefined();
    expect(await allowedOrigin({ NODE_ENV: 'production', CORS_ORIGINS: 'https://app.example.com' }, 'https://app.example.com')).toBe('https://app.example.com');
  });

  it('an allowed browser origin passes the preflight for a call that carries the token', async () => {
    const { app } = makeTestApp({ env: { NODE_ENV: 'development' } });

    const res = await request(app)
      .options('/api/v1/logs')
      .set('Origin', 'http://localhost:8081')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:8081');
    expect(res.headers['access-control-allow-headers']?.toLowerCase()).toContain('authorization');
  });
});
