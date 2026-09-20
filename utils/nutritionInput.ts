/**
 * Validation for the numbers typed into the manual logging forms.
 *
 * `Number(text)` accepts much more than anyone means to type ("-500", "0x10",
 * "1e3", "Infinity"), and the Firestore rules refuse negative or absurd values
 * with a generic permission error, so the form has to say what is wrong before
 * it tries to save.
 *
 * The maximums mirror the per-entry caps in firestore.rules (maxKcalPerEntry,
 * maxGramsPerEntry, maxDurationMin); __tests__/nutritionInput.test.ts fails if
 * they drift apart.
 */
export const MAX_KCAL_PER_ENTRY = 10000;
export const MAX_GRAMS_PER_ENTRY = 1000;
export const MAX_DURATION_MIN = 1440;

export type NumberField = { value: number } | { error: string };

// Digits with an optional decimal part: "5", "5.", "5.25", ".5". No sign, exponent, hex or spaces.
const PLAIN_DECIMAL = /^(\d+\.?\d*|\.\d+)$/;

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Parses one form field. An empty optional field is 0; an empty required field is an error.
 * `label` is lower-case ("calories", "protein") because it is used inside the messages.
 */
export const parseNumberField = (
  raw: string,
  label: string,
  max: number,
  { required = false }: { required?: boolean } = {}
): NumberField => {
  const text = raw.trim();

  if (text === '') {
    return required ? { error: `Please enter a valid number for ${label}` } : { value: 0 };
  }
  if (text.startsWith('-')) {
    return { error: `${capitalize(label)} can't be negative` };
  }
  if (!PLAIN_DECIMAL.test(text)) {
    return { error: `Please enter a valid number for ${label}` };
  }

  // Very long digit strings become Infinity, which this also catches.
  const value = Number(text);
  if (!(value <= max)) {
    return { error: `${capitalize(label)} can't be more than ${max}` };
  }
  return { value };
};
