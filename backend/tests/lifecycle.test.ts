import http from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  HEADERS_TIMEOUT_MS,
  KEEP_ALIVE_TIMEOUT_MS,
  SHUTDOWN_GRACE_MS,
  configureServerTimeouts,
  createShutdown,
} from '../src/lifecycle';
import { createLogger } from '../src/logger';
import { makeLogSink } from './helpers';

const servers: http.Server[] = [];
const agents: http.Agent[] = [];

afterEach(() => {
  for (const a of agents.splice(0)) a.destroy();
  for (const s of servers.splice(0)) {
    s.closeAllConnections();
    s.close();
  }
});

async function listen(handler: http.RequestListener): Promise<{ server: http.Server; port: number }> {
  const server = http.createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, port: (server.address() as AddressInfo).port };
}

function get(port: number, agent?: http.Agent): Promise<{ status?: number; body: string }> {
  return new Promise((resolve, reject) => {
    const own = agent ?? new http.Agent({ keepAlive: false });
    if (!agent) agents.push(own);
    http
      .get({ port, host: '127.0.0.1', agent: own }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      })
      .on('error', reject);
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const newShutdown = (server: http.Server, timeoutMs?: number) => {
  const exit = jest.fn();
  const sink = makeLogSink();
  const shutdown = createShutdown(server, { logger: createLogger({ destination: sink.stream }), timeoutMs, exit });
  return { shutdown, exit, sink };
};

describe('configureServerTimeouts', () => {
  it('sets keep-alive above typical proxy idle timeouts, and headers timeout above keep-alive', async () => {
    const { server } = await listen((_req, res) => res.end());
    configureServerTimeouts(server);
    expect(server.keepAliveTimeout).toBe(KEEP_ALIVE_TIMEOUT_MS);
    expect(server.keepAliveTimeout).toBeGreaterThan(60_000); // Node's default is 5 s
    expect(server.headersTimeout).toBe(HEADERS_TIMEOUT_MS);
    expect(server.headersTimeout).toBeGreaterThan(server.keepAliveTimeout);
  });

  it('gives in-flight requests less time than a 30 s SIGTERM-to-SIGKILL window', () => {
    expect(SHUTDOWN_GRACE_MS).toBeLessThan(30_000);
  });
});

describe('createShutdown', () => {
  it('lets an in-flight request finish before exiting 0', async () => {
    const { server, port } = await listen((_req, res) => setTimeout(() => res.end('finished'), 150));
    const { shutdown, exit, sink } = newShutdown(server);

    const inFlight = get(port);
    await wait(40); // request is now being handled
    const shutdownDone = shutdown('SIGTERM');
    expect(exit).not.toHaveBeenCalled(); // still draining

    const res = await inFlight;
    await shutdownDone;

    expect(res).toEqual({ status: 200, body: 'finished' });
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
    const events = sink.lines().map((l) => l.event);
    expect(events).toEqual(['server.shutdown_started', 'server.shutdown_complete']);
  });

  it('stops accepting new connections once shutdown has started', async () => {
    const { server, port } = await listen((_req, res) => setTimeout(() => res.end('ok'), 100));
    const { shutdown } = newShutdown(server);

    const inFlight = get(port);
    await wait(30);
    const done = shutdown('SIGTERM');
    await expect(get(port)).rejects.toMatchObject({ code: expect.stringMatching(/ECONNREFUSED|ECONNRESET/) });
    await inFlight;
    await done;
  });

  it('does not wait for idle keep-alive connections', async () => {
    const { server, port } = await listen((_req, res) => res.end('hi'));
    const { shutdown, exit } = newShutdown(server, 5_000);
    const agent = new http.Agent({ keepAlive: true });
    agents.push(agent);

    await get(port, agent); // leaves an idle keep-alive socket open
    const startedAt = Date.now();
    await shutdown('SIGTERM');

    expect(exit).toHaveBeenCalledWith(0);
    expect(Date.now() - startedAt).toBeLessThan(2_000);
  });

  it('forces exit 1 when in-flight requests outlive the grace period', async () => {
    const { server, port } = await listen(() => {
      /* never responds */
    });
    const { shutdown, exit, sink } = newShutdown(server, 80);

    const hung = get(port).catch((e) => e);
    await wait(30);
    await shutdown('SIGTERM');

    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(sink.lines().map((l) => l.event)).toContain('server.shutdown_forced');
    // The client's socket was closed. (Checked by code: the error comes from Node's realm, so `instanceof Error` fails under Jest.)
    expect(await hung).toMatchObject({ code: expect.stringMatching(/ECONNRESET|ECONNABORTED/) });
  });

  it('is idempotent: repeated signals share one shutdown and exit once', async () => {
    const { server } = await listen((_req, res) => res.end());
    const { shutdown, exit } = newShutdown(server);

    const first = shutdown('SIGTERM');
    const second = shutdown('SIGINT');
    expect(second).toBe(first);
    await first;
    expect(exit).toHaveBeenCalledTimes(1);
  });
});
