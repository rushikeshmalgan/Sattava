/**
 * Guard: the mobile app must contain no Gemini SDK, no Gemini key, and no
 * direct provider access. This fails the build if any of it creeps back in.
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

describe('mobile app has no direct Gemini access', () => {
  it('scans a meaningful number of source files', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('never references the Gemini API key env var', () => {
    expect(offenders(/EXPO_PUBLIC_GEMINI|GEMINI_API_KEY/)).toEqual([]);
  });

  it('never imports the Gemini SDK', () => {
    expect(offenders(/@google\/generative-ai|@google\/genai/)).toEqual([]);
  });

  it('never calls the Gemini endpoint directly', () => {
    expect(offenders(/generativelanguage\.googleapis\.com/)).toEqual([]);
  });

  it('contains nothing shaped like a Google API key', () => {
    expect(offenders(/AIza[0-9A-Za-z_-]{30,}/)).toEqual([]);
  });

  it('does not declare the SDK as a dependency', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(Object.keys(deps).filter((d) => /generative-ai|genai/.test(d))).toEqual([]);
  });

  it('the env template exposes no Gemini key to the client', () => {
    const example = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
    expect(example).not.toMatch(/GEMINI/);
    expect(example).not.toMatch(/EXPO_PUBLIC_[A-Z_]*(SECRET|API_KEY)\s*=\s*(?!YOUR_API_KEY)/); // only the Firebase web key is allowed
  });

  it('the EAS config wires no secrets into the client build', () => {
    const eas = fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8');
    expect(eas).not.toMatch(/GEMINI|SECRET|AIza/);
  });
});
