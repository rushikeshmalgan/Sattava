/**
 * Runs the backend against a throwaway in-memory MongoDB, so the whole app can be tried with no database set up.
 *   npm run dev:memory
 *
 * The data disappears when this stops. For anything you want to keep, set MONGODB_URI (a local MongoDB or Atlas)
 * and use `npm run dev`. Everything else (Firebase project, Gemini key, the rest of backend/.env) is read as usual.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

async function main() {
  const server = await MongoMemoryServer.create();
  // dotenv never overrides a variable that is already set, so this wins over any MONGODB_URI in backend/.env.
  process.env.MONGODB_URI = server.getUri();
  console.log('Using an in-memory MongoDB. Everything you log is lost when this stops.');

  // The server's own SIGINT/SIGTERM handling drains requests and exits; this only makes sure mongod goes too.
  process.on('exit', () => void server.stop());

  await import('../src/index');
}

main().catch((err) => {
  console.error('dev:memory failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
