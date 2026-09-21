import * as fs from 'fs';
import * as path from 'path';
import {
  MAX_DURATION_MIN,
  MAX_GRAMS_PER_ENTRY,
  MAX_KCAL_PER_ENTRY,
  parseNumberField,
} from '../utils/nutritionInput';

const parse = (raw: string, opts?: { required?: boolean }) =>
  parseNumberField(raw, 'calories', MAX_KCAL_PER_ENTRY, opts);

describe('parseNumberField', () => {
  it.each([
    ['0', 0],
    ['250', 250],
    ['  250  ', 250],
    ['12.5', 12.5],
    ['.5', 0.5],
    ['5.', 5],
    ['10000', 10000],
  ])('accepts %p', (raw, expected) => {
    expect(parse(raw)).toEqual({ value: expected });
  });

  it.each([['-1'], ['-500'], ['-0.5'], ['  -3'], ['--5']])('rejects negative %p', (raw) => {
    expect(parse(raw)).toEqual({ error: "Calories can't be negative" });
  });

  it.each([
    ['abc'],
    ['12abc'],
    ['1,000'],
    ['12,5'],
    ['1e3'],
    ['0x10'],
    ['Infinity'],
    ['NaN'],
    ['+5'],
    ['1 2'],
    ['.'],
  ])('rejects %p as not a plain number', (raw) => {
    expect(parse(raw, { required: true })).toEqual({ error: 'Please enter a valid number for calories' });
  });

  it('rejects a value above the maximum, including one too large to be finite', () => {
    expect(parse('10001')).toEqual({ error: "Calories can't be more than 10000" });
    expect(parse('9'.repeat(400))).toEqual({ error: "Calories can't be more than 10000" });
  });

  it('treats an empty optional field as 0 and an empty required field as an error', () => {
    expect(parse('')).toEqual({ value: 0 });
    expect(parse('   ')).toEqual({ value: 0 });
    expect(parse('', { required: true })).toEqual({ error: 'Please enter a valid number for calories' });
  });

  it('uses the label in the messages', () => {
    expect(parseNumberField('-2', 'protein', MAX_GRAMS_PER_ENTRY)).toEqual({ error: "Protein can't be negative" });
    expect(parseNumberField('2000', 'protein', MAX_GRAMS_PER_ENTRY)).toEqual({
      error: "Protein can't be more than 1000",
    });
  });

  it('never returns a negative, NaN or infinite value', () => {
    const inputs = ['-1', 'abc', 'Infinity', '1e999', '', '0', '5', '99999999999', '0x1', '.'];
    for (const raw of inputs) {
      const result = parse(raw);
      if ('value' in result) {
        expect(Number.isFinite(result.value)).toBe(true);
        expect(result.value).toBeGreaterThanOrEqual(0);
        expect(result.value).toBeLessThanOrEqual(MAX_KCAL_PER_ENTRY);
      }
    }
  });
});

describe('limits match the backend', () => {
  // The backend is the source of truth: a form that allows more than it does
  // would let the user type a value that then fails to save.
  const source = fs.readFileSync(path.join(__dirname, '..', 'backend', 'src', 'data', 'limits.ts'), 'utf8');
  const limit = (name: string): number => {
    const match = new RegExp(`export const ${name} = ([0-9_]+);`).exec(source);
    if (!match) throw new Error(`${name} not found in backend/src/data/limits.ts`);
    return Number(String(match[1]).replace(/_/g, ''));
  };

  it('per-entry calories', () => {
    expect(MAX_KCAL_PER_ENTRY).toBe(limit('MAX_KCAL_PER_ENTRY'));
  });

  it('per-entry grams', () => {
    expect(MAX_GRAMS_PER_ENTRY).toBe(limit('MAX_GRAMS_PER_ENTRY'));
  });

  it('exercise duration', () => {
    expect(MAX_DURATION_MIN).toBe(limit('MAX_DURATION_MIN'));
  });
});
