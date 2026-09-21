import { connectDatabase, ensureIndexes, secretsFromUri } from '../src/db/mongo';
import { DB_START_TIMEOUT_MS, startTestDatabase, type TestDatabase } from './dbHelpers';

describe('secretsFromUri', () => {
  it('returns the whole string and the password, plain and decoded', () => {
    const uri = 'mongodb+srv://sattava_user:p%40ss%2Fword@cluster0.example.mongodb.net/?w=majority';
    expect(secretsFromUri(uri)).toEqual([uri, 'p%40ss%2Fword', 'p@ss/word']);
  });

  it('returns just the string when there is no password or it is not a URL', () => {
    expect(secretsFromUri('mongodb://127.0.0.1:27017')).toEqual(['mongodb://127.0.0.1:27017']);
    expect(secretsFromUri('not a url')).toEqual(['not a url']);
  });
});

describe('connecting', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await startTestDatabase();
  }, DB_START_TIMEOUT_MS);
  afterAll(async () => {
    await db.stop();
  });
  beforeEach(async () => {
    await db.reset();
  });

  it('answers a ping', async () => {
    await expect(db.ping()).resolves.toBeUndefined();
  });

  it('creates the unique day index, and creating it again is harmless', async () => {
    await ensureIndexes(db.db);
    await ensureIndexes(db.db);

    const indexes = await db.db.collection('dailyLogs').indexes();
    expect(indexes.find((i) => i.name === 'uid_date')).toMatchObject({ unique: true, key: { uid: 1, date: -1 } });
  });

  it('refuses a second document for the same user and day', async () => {
    const days = db.db.collection('dailyLogs');
    await days.insertOne({ uid: 'user-1', date: '2026-01-05' });

    await expect(days.insertOne({ uid: 'user-1', date: '2026-01-05' })).rejects.toMatchObject({ code: 11000 });
    await expect(days.insertOne({ uid: 'user-2', date: '2026-01-05' })).resolves.toBeDefined();
  });

  it('gives up quickly on a server that is not there, instead of hanging the deploy', async () => {
    const started = Date.now();

    await expect(connectDatabase({ uri: 'mongodb://127.0.0.1:1', dbName: 'x', serverSelectionTimeoutMs: 400 })).rejects.toThrow();

    expect(Date.now() - started).toBeLessThan(5_000);
  });
});
