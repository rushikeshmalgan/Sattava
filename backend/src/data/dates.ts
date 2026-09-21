const DATE_ID = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A real calendar date written YYYY-MM-DD ("2026-02-30" and "2026-1-5" are not). */
export const isValidDateId = (value: string): boolean => {
  if (!DATE_ID.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const EARLIEST = '2020-01-01';
/** Clients name days by their own clock, so a day or two ahead of the server is normal. */
const FUTURE_SLACK_DAYS = 7;

/**
 * A date a person could plausibly be logging against. It stops one account from creating
 * unbounded documents for far-future or far-past dates.
 */
export const isReasonableDate = (value: string, nowMs: number): boolean => {
  if (!isValidDateId(value)) return false;
  const latest = new Date(nowMs + FUTURE_SLACK_DAYS * DAY_MS).toISOString().slice(0, 10);
  return value >= EARLIEST && value <= latest;
};

/** The UTC date `daysAgo` days before `nowMs`, as YYYY-MM-DD. */
export const dateDaysAgo = (nowMs: number, daysAgo: number): string =>
  new Date(nowMs - daysAgo * DAY_MS).toISOString().slice(0, 10);
