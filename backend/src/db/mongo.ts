import { MongoClient, type Db } from 'mongodb';

export interface Database {
  db: Db;
  /** Throws if the database cannot be reached. */
  ping(): Promise<void>;
  close(): Promise<void>;
}

export interface DatabaseOptions {
  uri: string;
  dbName: string;
  /** How long to look for a reachable server before giving up. Tests shorten it. */
  serverSelectionTimeoutMs?: number;
}

/** The strings that must never reach a log: the whole connection string and the password inside it. */
export function secretsFromUri(uri: string): string[] {
  const secrets = [uri];
  try {
    const password = new URL(uri).password;
    if (password) secrets.push(password, decodeURIComponent(password));
  } catch {
    // Not parseable as a URL; the whole string is still covered.
  }
  return secrets;
}

/**
 * Indexes the queries rely on. Creating one that already exists is a no-op, so this is safe on every start.
 * One document per user per day; the unique index also makes two racing first writes resolve cleanly.
 */
export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection('dailyLogs').createIndex({ uid: 1, date: -1 }, { unique: true, name: 'uid_date' });
}

/** Connects, then makes sure the indexes exist. Rejects if the server cannot be reached in a few seconds. */
export async function connectDatabase(options: DatabaseOptions): Promise<Database> {
  const client = new MongoClient(options.uri, {
    serverSelectionTimeoutMS: options.serverSelectionTimeoutMs ?? 8_000,
    maxPoolSize: 10,
    appName: 'sattava-backend',
  });

  try {
    await client.connect();
    const db = client.db(options.dbName);
    await ensureIndexes(db);
    return {
      db,
      ping: async () => {
        await db.command({ ping: 1 });
      },
      close: () => client.close(),
    };
  } catch (err) {
    await client.close().catch(() => undefined);
    throw err;
  }
}
