import request from 'supertest';
import type { DataRepository } from '../src/data/repository';
import { makeTestApp } from './helpers';

/**
 * When the database is down or misbehaves, the client gets a fixed message and nothing about the
 * database, and the connection string never reaches a log. No real database is needed here.
 */

const PASSWORD = 'S3cretPass';
const URI = `mongodb+srv://sattava_user:${PASSWORD}@cluster0.example.mongodb.net/?retryWrites=true`;
const env = { MONGODB_URI: URI, DATA_RATE_PER_MINUTE: '1000' };

/** Every repository method rejects with the given error. */
const failingRepo = (error: Error): DataRepository =>
  new Proxy({} as DataRepository, { get: () => async () => Promise.reject(error) });

const named = (name: string, message: string): Error => Object.assign(new Error(message), { name });

describe('a database that cannot be reached', () => {
  it('answers 503 DATABASE_UNAVAILABLE with a fixed message, and keeps the connection string out of the logs', async () => {
    const repo = failingRepo(named('MongoServerSelectionError', `connection to ${URI} timed out (password ${PASSWORD})`));
    const { app, sink } = makeTestApp({ repo, env });

    const res = await request(app).get('/api/v1/me').set('Authorization', 'Bearer good-token');

    expect(res.status).toBe(503);
    expect(res.body.error).toMatchObject({ code: 'DATABASE_UNAVAILABLE', message: 'The database is temporarily unavailable.' });
    expect(JSON.stringify(res.body)).not.toContain(PASSWORD);
    expect(JSON.stringify(res.body)).not.toContain('mongodb');
    expect(sink.raw()).not.toContain(PASSWORD);
    expect(sink.raw()).not.toContain(URI);
    expect(sink.raw()).toContain('[REDACTED]');
  });

  it.each(['MongoNetworkError', 'MongoNetworkTimeoutError', 'MongoTopologyClosedError', 'MongoNotConnectedError', 'MongoPoolClearedError'])(
    'treats %s as an outage too',
    async (name) => {
      const { app } = makeTestApp({ repo: failingRepo(named(name, 'down')), env });
      const res = await request(app).post('/api/v1/logs/2026-01-05/entries').set('Authorization', 'Bearer good-token').send({ type: 'water', name: 'Paani', amountMl: 250 });

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
    },
  );

  it('turns any other database failure into a plain 500 that says nothing', async () => {
    const { app, sink } = makeTestApp({ repo: failingRepo(new Error(`E11000 duplicate key ... ${URI}`)), env });

    const res = await request(app).get('/api/v1/me').set('Authorization', 'Bearer good-token');

    expect(res.status).toBe(500);
    expect(res.body.error).toMatchObject({ code: 'INTERNAL_ERROR', message: 'Something went wrong.' });
    expect(JSON.stringify(res.body)).not.toContain('E11000');
    expect(sink.raw()).not.toContain(PASSWORD);
  });
});

describe('health checks', () => {
  it('liveness does not depend on the database', async () => {
    const { app } = makeTestApp({ repo: failingRepo(named('MongoNetworkError', 'down')), checkDatabase: async () => Promise.reject(new Error('down')), env });

    expect((await request(app).get('/health')).status).toBe(200);
  });

  it('readiness reports the database, and 503 when it cannot be reached', async () => {
    const up = makeTestApp({ checkDatabase: async () => undefined, env });
    const down = makeTestApp({ checkDatabase: async () => Promise.reject(new Error(`cannot reach ${URI}`)), env });

    const ok = await request(up.app).get('/health/ready');
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ status: 'ok', database: 'ok' });

    const bad = await request(down.app).get('/health/ready');
    expect(bad.status).toBe(503);
    expect(bad.body).toEqual({ status: 'unavailable', database: 'unreachable' });
    expect(JSON.stringify(bad.body)).not.toContain(PASSWORD);
  });

  it('readiness says so when no database is wired (the AI-only test app)', async () => {
    const { app } = makeTestApp();
    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'not configured' });
  });
});

describe('an app without a database', () => {
  it('does not mount the data routes', async () => {
    const { app } = makeTestApp();

    expect((await request(app).get('/api/v1/me')).status).toBe(401);
    const res = await request(app).get('/api/v1/me').set('Authorization', 'Bearer good-token');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
