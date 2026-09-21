/**
 * The mobile .env.example is the only instruction a new developer gets for configuring the app, and every
 * value in it is baked into the bundle. Two things must stay true: it documents everything the code reads,
 * and it never asks for a server-side secret.
 *
 * The backend has the same guard for its own template (backend/tests/envExample.test.ts).
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const SOURCE_DIRS = ['app', 'components', 'config', 'constants', 'context', 'services', 'utils'];

const sourceFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
};

const template = readFileSync(join(ROOT, '.env.example'), 'utf8');

/** Both `NAME=` and `# NAME=` count as documented: a commented line is how an optional value is shown. */
const documented = new Set(
  template
    .split(/\r?\n/)
    .map((line) => /^\s*#?\s*([A-Z0-9_]+)\s*=/.exec(line)?.[1])
    .filter((name): name is string => Boolean(name)),
);

describe('.env.example (mobile)', () => {
  const files = [...SOURCE_DIRS.flatMap((dir) => sourceFiles(join(ROOT, dir))), join(ROOT, 'firebaseConfig.ts')];

  it('documents every EXPO_PUBLIC_ variable the app reads', () => {
    const used = new Map<string, string>();
    for (const file of files) {
      for (const match of readFileSync(file, 'utf8').matchAll(/process\.env\.(EXPO_PUBLIC_[A-Z0-9_]+)/g)) {
        used.set(match[1]!, file.replace(ROOT, '').replace(/\\/g, '/'));
      }
    }

    expect(used.size).toBeGreaterThan(0);
    const missing = [...used].filter(([name]) => !documented.has(name)).map(([name, file]) => `${name} (read in ${file})`);
    expect(missing).toEqual([]);
  });

  it('asks for no server-side secret', () => {
    // Anything not prefixed EXPO_PUBLIC_ is invisible to the app anyway, so a name here means someone
    // believed a secret belongs in the client. The Gemini key and the MongoDB connection string are the
    // two that must never appear.
    const names = [...documented];
    expect(names.filter((name) => !name.startsWith('EXPO_PUBLIC_'))).toEqual([]);
    expect(names.filter((name) => /GEMINI|MONGO|CLIENT_SECRET|SERVICE_ACCOUNT|PRIVATE_KEY/.test(name))).toEqual([]);
  });

  it('holds placeholders, not real values', () => {
    expect(template).not.toMatch(/AIza[0-9A-Za-z_-]{30,}/);
    expect(template).not.toMatch(/mongodb(\+srv)?:\/\//i);
  });
});
