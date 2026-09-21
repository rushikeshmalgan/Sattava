import { ConfigError, loadConfig } from '../src/config';
import { baseEnv } from './helpers';

const PASSWORD = 'S3cretPass';
const URI = `mongodb+srv://sattava_user:${PASSWORD}@cluster0.example.mongodb.net/?retryWrites=true&w=majority`;

const load = (over: Record<string, string | undefined> = {}) => loadConfig({ ...baseEnv(), ...over } as NodeJS.ProcessEnv);
const message = (over: Record<string, string | undefined>): string => {
  try {
    load(over);
  } catch (err) {
    expect(err).toBeInstanceOf(ConfigError);
    return (err as Error).message;
  }
  throw new Error('expected loadConfig to throw');
};

describe('loadConfig: MongoDB', () => {
  it('is null when MONGODB_URI is not set, so the AI scripts still run (the server itself insists on it)', () => {
    expect(load().mongo).toBeNull();
  });

  it('treats an empty MONGODB_URI, as left in a copied .env file, as not set', () => {
    expect(load({ MONGODB_URI: '' }).mongo).toBeNull();
  });

  it('reads the connection string and the database name', () => {
    expect(load({ MONGODB_URI: URI, MONGODB_DB: 'sattava_prod' }).mongo).toEqual({ uri: URI, dbName: 'sattava_prod' });
  });

  it('defaults the database name and the per-user data limit', () => {
    const config = load({ MONGODB_URI: URI });
    expect(config.mongo?.dbName).toBe('sattava');
    expect(config.limits.dataPerMinute).toBe(120);
  });

  it.each(['mongodb://127.0.0.1:27017', 'mongodb://127.0.0.1:27017/sattava', URI])('accepts %s', (uri) => {
    expect(load({ MONGODB_URI: uri }).mongo?.uri).toBe(uri);
  });

  it.each(['http://example.com', 'postgres://user:pw@host/db', 'localhost:27017', 'cluster0.example.mongodb.net', 'mongo://x'])(
    'rejects %s, naming the variable but not repeating the value',
    (value) => {
      const msg = message({ MONGODB_URI: value });
      expect(msg).toContain('MONGODB_URI');
      expect(msg).not.toContain(value);
    },
  );

  it.each(['has space', 'a.b', 'a/b', '', 'x'.repeat(64)])('rejects the database name %p', (name) => {
    expect(message({ MONGODB_DB: name })).toContain('MONGODB_DB');
  });

  it('never puts the connection string or its password in an error about something else', () => {
    const msg = message({ MONGODB_URI: URI, PORT: 'not-a-port' });
    expect(msg).toContain('PORT');
    expect(msg).not.toContain(PASSWORD);
    expect(msg).not.toContain(URI);
  });

  it('lets the per-user data limit be tuned, and rejects nonsense', () => {
    expect(load({ DATA_RATE_PER_MINUTE: '30' }).limits.dataPerMinute).toBe(30);
    expect(message({ DATA_RATE_PER_MINUTE: '0' })).toContain('DATA_RATE_PER_MINUTE');
  });
});
