/**
 * Pulls a JSON value out of model text. Models often wrap JSON in ```json
 * fences or add a sentence around it, so try a clean parse first and then fall
 * back to the outermost {...} / [...] span. The result is still untrusted and
 * must go through schema validation.
 */
export function extractJson(text: string): unknown | undefined {
  const stripped = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  const direct = tryParse(stripped);
  if (direct !== undefined) return direct;

  for (const [open, close] of [
    ['{', '}'],
    ['[', ']'],
  ] as const) {
    const start = stripped.indexOf(open);
    const end = stripped.lastIndexOf(close);
    if (start !== -1 && end > start) {
      const inner = tryParse(stripped.slice(start, end + 1));
      if (inner !== undefined) return inner;
    }
  }
  return undefined;
}

function tryParse(s: string): unknown | undefined {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/** Zod issues reduced to path + code so offending values (which may be model text) are never logged. */
export function summarizeIssues(issues: readonly { path: PropertyKey[]; code: string }[]): { path: string; code: string }[] {
  return issues.slice(0, 10).map((i) => ({ path: i.path.map(String).join('.'), code: i.code }));
}
