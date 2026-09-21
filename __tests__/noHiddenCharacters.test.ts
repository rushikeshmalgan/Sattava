/**
 * Guard: source, config and docs must not contain raw invisible characters.
 *
 * A NUL or a bidirectional override written straight into a file makes git and GitHub treat it as binary or
 * warn about "bidirectional Unicode text" (the Trojan Source pattern), and it hides what the code does from
 * a reviewer. Write such characters as escapes (a backslash, a u and four hex digits) instead. This once happened
 * to the regexes that strip invisible characters from model output, which is exactly where it is easiest to do
 * by accident.
 *
 * Zero-width joiners (code points 0x200C and 0x200D) are allowed: emoji sequences and Indic text need them.
 * The ranges below are plain numbers so that this file holds none of the characters it forbids.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

const DIRS = [
  'app', 'components', 'config', 'constants', 'context', 'data', 'hooks', 'services', 'types', 'utils',
  'scripts', '__tests__', 'firestore-tests', 'docs', '.github', 'backend/src', 'backend/tests', 'backend/scripts',
];
const FILES = [
  'README.md', 'backend/README.md', 'firestore.rules', 'firebase.json', 'app.json', 'eas.json', 'package.json',
  '.env.example', 'backend/.env.example', '.gitignore', '.gitattributes',
];
const TEXT = /\.(tsx?|jsx?|json|md|ya?ml|sh|rules)$/;

// Code point ranges that must never appear raw: C0 controls except tab, LF and CR; DEL; zero-width space;
// left-to-right and right-to-left marks; bidirectional embeddings, overrides and isolates.
const HIDDEN_RANGES: [number, number][] = [
  [0x00, 0x08], [0x0b, 0x0c], [0x0e, 0x1f], [0x7f, 0x7f],
  [0x200b, 0x200b], [0x200e, 0x200f], [0x202a, 0x202e], [0x2066, 0x2069],
];
const BYTE_ORDER_MARK = 0xfeff;

const isHidden = (code: number): boolean => HIDDEN_RANGES.some(([low, high]) => code >= low && code <= high);

/** The 1-based line of the first hidden character, or null. A byte order mark is fine at the very start of a file only. */
const firstOffence = (text: string): number | null => {
  let line = 1;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 10) line++;
    else if (isHidden(code) || (code === BYTE_ORDER_MARK && i > 0)) return line;
  }
  return null;
};

const walk = (dir: string, out: string[] = []): string[] => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (TEXT.test(entry.name)) out.push(full);
  }
  return out;
};

const files = [
  ...DIRS.flatMap((d) => walk(path.join(ROOT, d))),
  ...FILES.map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f)),
];

const rel = (f: string) => path.relative(ROOT, f).replace(/\\/g, '/');
const char = (code: number) => String.fromCharCode(code);

describe('no raw invisible characters in source or docs', () => {
  it('scans a meaningful number of files', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('finds none: write them as escapes', () => {
    const offenders = files.flatMap((f) => {
      const line = firstOffence(fs.readFileSync(f, 'utf8'));
      return line === null ? [] : [`${rel(f)}:${line}`];
    });
    expect(offenders).toEqual([]);
  });

  it('the detector catches what it should and leaves emoji joiners and ordinary text alone', () => {
    for (const code of [0x00, 0x07, 0x1f, 0x7f, 0x200b, 0x200e, 0x200f, 0x202a, 0x202e, 0x2066, 0x2069]) {
      expect(firstOffence(`a${char(code)}b`)).toBe(1);
    }
    expect(firstOffence(`ok\nbroken ${char(BYTE_ORDER_MARK)} here`)).toBe(2);
    expect(firstOffence(`${char(BYTE_ORDER_MARK)}starts with a BOM\nfine`)).toBeNull();

    const emojiWithJoiner = String.fromCodePoint(0x1f469, 0x200d, 0x1f373);
    const devanagari = String.fromCodePoint(0x938, 0x924, 0x94d, 0x935);
    for (const fine of ['plain text\ttabbed\r\nnext line', emojiWithJoiner, devanagari]) {
      expect(firstOffence(fine)).toBeNull();
    }
  });
});
