import fs from 'node:fs';
import path from 'node:path';
import { EnvSchema } from '../src/config';

const example = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');

// A variable counts as documented when it appears as `NAME=value` or commented out as `# NAME=value`.
const documented = new Set([...example.matchAll(/^#?\s*([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1] as string));

// Read directly from process.env in src/index.ts rather than through the config schema.
const READ_OUTSIDE_SCHEMA = ['LOG_LEVEL'];

describe('backend/.env.example', () => {
  it('documents every variable the server reads', () => {
    const known = new Set([...Object.keys(EnvSchema.shape), ...READ_OUTSIDE_SCHEMA]);
    const missing = [...known].filter((name) => !documented.has(name));
    expect(missing).toEqual([]);
  });

  it('documents no variable the server ignores', () => {
    const known = new Set([...Object.keys(EnvSchema.shape), ...READ_OUTSIDE_SCHEMA]);
    const unknown = [...documented].filter((name) => !known.has(name));
    expect(unknown).toEqual([]);
  });

  it('holds placeholders only, never a real-looking secret', () => {
    expect(example).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/);
    expect(example).toMatch(/^GEMINI_API_KEY=YOUR_GEMINI_API_KEY$/m);
  });

  it('stays loadable: the required variables, filled in, give a valid config', () => {
    // Guards the example against a typo in a variable name or a value the schema rejects.
    const values: Record<string, string> = {};
    for (const [, name, value] of example.matchAll(/^([A-Z][A-Z0-9_]*)=(.*)$/gm)) {
      if (name && value && value.trim() !== '') values[name] = value.trim();
    }
    expect(EnvSchema.safeParse(values).success).toBe(true);
  });
});
