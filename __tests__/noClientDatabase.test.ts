/**
 * Guard: the mobile app must contain no database client, no database credential and no direct database access.
 * Users and daily logs live in MongoDB and are reached only through the authenticated backend API. This fails the
 * build if a connection string, a driver, or a Firestore client creeps back into the app.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIRS = ['app', 'components', 'services', 'config', 'context', 'utils', 'hooks', 'constants', 'types', 'data'];
const SOURCE_FILES = ['firebaseConfig.ts', 'app.json'];
const SOURCE_EXT = /\.(tsx?|jsx?|json)$/;

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (SOURCE_EXT.test(entry.name)) out.push(full);
  }
  return out;
}

const files = [
  ...SOURCE_DIRS.flatMap((d) => walk(path.join(ROOT, d))),
  ...SOURCE_FILES.map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f)),
];

const rel = (f: string) => path.relative(ROOT, f).replace(/\\/g, '/');
const offenders = (pattern: RegExp) =>
  files.filter((f) => pattern.test(fs.readFileSync(f, 'utf8'))).map(rel);

describe('mobile app has no direct database access', () => {
  it('scans a meaningful number of source files', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('never holds a MongoDB connection string', () => {
    expect(offenders(/mongodb(\+srv)?:\/\//)).toEqual([]);
  });

  it('never references the MongoDB variable, or exposes one to the client', () => {
    expect(offenders(/MONGODB_URI|EXPO_PUBLIC_MONGO/)).toEqual([]);
  });

  it('never imports a MongoDB driver', () => {
    expect(offenders(/(from|require\()\s*['"](mongodb|mongoose)['"]/)).toEqual([]);
  });

  it('has no Firestore client: the data layer is the backend API', () => {
    expect(offenders(/firebase\/firestore/)).toEqual([]);
  });

  it('does not declare a database driver as a dependency', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(Object.keys(deps).filter((d) => /^(mongodb|mongoose|mongodb-memory-server)$/.test(d))).toEqual([]);
  });

  it('the env template and the EAS config expose no database setting to the client', () => {
    const example = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
    const eas = fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8');
    // The template may say in a comment that the database is configured on the server; it may not set anything.
    expect(example).not.toMatch(/^\s*#?\s*[A-Z_]*MONGO[A-Z_]*\s*=/im);
    expect(example).not.toMatch(/mongodb(\+srv)?:\/\//i);
    expect(eas).not.toMatch(/MONGO/i);
  });

  it('sends no user id to the data API: identity is the signed-in token', () => {
    // The data client builds every request from a path and a body; none of them may name a user.
    const source = fs.readFileSync(path.join(ROOT, 'services', 'dataApi.ts'), 'utf8');
    expect(source).not.toMatch(/\b(uid|userId)\b/);
  });
});
