import express from 'express';
import request from 'supertest';
import { requestId } from '../src/middleware/requestId';
import { requireAuth } from '../src/middleware/requireAuth';
import { errorHandler } from '../src/middleware/errorHandler';
import { createLogger } from '../src/logger';
import { makeLogSink, makeVerifier } from './helpers';

function buildApp(verifier = makeVerifier({ 'good-token': { uid: 'verified-uid' } })) {
  const sink = makeLogSink();
  const app = express();
  app.use(requestId(createLogger({ destination: sink.stream })));
  app.use(express.json());
  app.post('/protected', requireAuth(verifier), (req, res) => {
    res.json({ uid: req.auth?.uid, bodyUserId: req.body?.userId });
  });
  app.use(errorHandler({ hashUid: (u) => `h(${u})`, secrets: [] }));
  return { app, sink };
}

describe('requireAuth', () => {
  it('rejects a missing Authorization header with 401 UNAUTHENTICATED in the envelope', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/protected').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });

  it.each(['good-token', 'Basic good-token', 'Bearer', 'Bearer a b'])('rejects malformed header %p', async (header) => {
    const { app } = buildApp();
    const res = await request(app).post('/protected').set('Authorization', header).send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects an invalid token with 401 INVALID_TOKEN', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/protected').set('Authorization', 'Bearer forged').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects an expired token with 401 TOKEN_EXPIRED so the client can refresh', async () => {
    const { app } = buildApp(makeVerifier({ old: 'expired' }));
    const res = await request(app).post('/protected').set('Authorization', 'Bearer old').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('accepts a valid token and exposes the VERIFIED uid', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/protected').set('Authorization', 'Bearer good-token').send({});
    expect(res.status).toBe(200);
    expect(res.body.uid).toBe('verified-uid');
  });

  it('never lets a client-supplied userId override the verified uid', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/protected')
      .set('Authorization', 'Bearer good-token')
      .send({ userId: 'victim-uid', uid: 'victim-uid' });
    expect(res.body.uid).toBe('verified-uid');
  });

  it('treats verifier infrastructure failures as 500, not 401', async () => {
    const { app, sink } = buildApp(makeVerifier({ t: new Error('certificate fetch failed') }));
    const res = await request(app).post('/protected').set('Authorization', 'Bearer t').send({});
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('certificate');
    expect(sink.raw()).toContain('certificate fetch failed');
  });

  it('does not log the bearer token', async () => {
    const { app, sink } = buildApp();
    await request(app).post('/protected').set('Authorization', 'Bearer forged-secret-token-value').send({});
    expect(sink.raw()).not.toContain('forged-secret-token-value');
  });
});
