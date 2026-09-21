import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createShutdown } from '../src/lifecycle';
import { createLogger } from '../src/logger';
import { makeLogSink } from './helpers';

/** Closing the database after connections drain, and never letting a failing close block the exit. */

const servers: http.Server[] = [];

afterEach(() => {
  for (const s of servers.splice(0)) {
    s.closeAllConnections();
    s.close();
  }
});

async function listen(): Promise<http.Server> {
  const server = http.createServer((_req, res) => res.end('ok'));
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  expect((server.address() as AddressInfo).port).toBeGreaterThan(0);
  return server;
}

describe('createShutdown with afterDrain', () => {
  it('runs the cleanup after the server has closed and before exiting', async () => {
    const server = await listen();
    const order: string[] = [];
    const sink = makeLogSink();
    const exit = jest.fn((code: number) => void order.push(`exit ${code}`));
    const shutdown = createShutdown(server, {
      logger: createLogger({ destination: sink.stream }),
      exit,
      afterDrain: async () => {
        order.push(server.listening ? 'cleanup (still listening)' : 'cleanup');
        await new Promise((resolve) => setTimeout(resolve, 30));
        order.push('cleanup finished');
      },
    });

    await shutdown('SIGTERM');

    expect(order).toEqual(['cleanup', 'cleanup finished', 'exit 0']);
  });

  it('still exits 0 when the cleanup fails, and logs the failure', async () => {
    const server = await listen();
    const sink = makeLogSink();
    const exit = jest.fn();
    const shutdown = createShutdown(server, {
      logger: createLogger({ destination: sink.stream }),
      exit,
      afterDrain: async () => Promise.reject(new Error('close failed')),
    });

    await shutdown('SIGTERM');

    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
    expect(sink.lines().find((l) => l.event === 'server.shutdown_cleanup_error')).toMatchObject({ message: 'close failed' });
  });

  it('behaves exactly as before when no cleanup is given', async () => {
    const server = await listen();
    const exit = jest.fn();
    const shutdown = createShutdown(server, { logger: createLogger({ destination: makeLogSink().stream }), exit });

    await shutdown('SIGTERM');

    expect(exit).toHaveBeenCalledWith(0);
  });
});
