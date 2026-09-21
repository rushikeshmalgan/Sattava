import { MongoMemoryServer } from 'mongodb-memory-server';
import { createDataRepository, type DataRepository } from '../src/data/repository';
import { connectDatabase, type Database } from '../src/db/mongo';

/** A generous ceiling for starting the in-memory server (the first start on a machine can be slow). */
export const DB_START_TIMEOUT_MS = 120_000;

/**
 * Every test that imports this helper talks to a real database, so give each one more than Jest's 5 s. A test that
 * times out does not stop its own work: it carries on in the background and can corrupt the next test, which is
 * exactly how a slow first run on a cold machine once turned one timeout into three failures.
 */
export const DB_TEST_TIMEOUT_MS = 30_000;
jest.setTimeout(DB_TEST_TIMEOUT_MS);

export interface TestDatabase extends Database {
  uri: string;
  repo: DataRepository;
  /** Empties every collection between tests. */
  reset(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * A real MongoDB (an in-memory mongod process), so the tests exercise real operator semantics: $inc, $push,
 * pipeline updates and unique indexes. Nothing is mocked and no external service is needed.
 */
export async function startTestDatabase(now?: () => Date): Promise<TestDatabase> {
  const server = await MongoMemoryServer.create();
  const uri = server.getUri();
  const database = await connectDatabase({ uri, dbName: 'sattava_test' });

  return {
    ...database,
    uri,
    repo: createDataRepository(database.db, now ? { now } : {}),
    reset: async () => {
      await database.db.collection('users').deleteMany({});
      await database.db.collection('dailyLogs').deleteMany({});
    },
    stop: async () => {
      await database.close();
      await server.stop();
    },
  };
}
