import fs from 'node:fs';
import path from 'node:path';
import { EntryBody, SyncUserBody, UserPatchBody } from '../src/data/schemas';

/**
 * The request bodies the app sends (__fixtures__/data-requests.json at the repository root) must pass the server's
 * strict schemas exactly as they are. The app's tests check that its services build these same bodies, so a field
 * renamed or dropped on either side fails a test instead of shipping.
 */

const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '__fixtures__', 'data-requests.json'), 'utf8')) as Record<string, unknown>;
const fixture = (name: string): unknown => {
  if (!(name in fixtures)) throw new Error(`no fixture named ${name}`);
  return fixtures[name];
};

describe('what the app sends is what the API accepts', () => {
  it('sign-in sync', () => {
    expect(SyncUserBody.safeParse(fixture('syncUser')).success).toBe(true);
  });

  it.each(['onboardingProfile', 'planGenerated', 'targets', 'coachChoice', 'goalChange'])('profile patch: %s', (name) => {
    const result = UserPatchBody.safeParse(fixture(name));
    expect(result.success).toBe(true);
  });

  it.each(['foodEntry', 'exerciseEntry', 'waterActivity', 'foodActivity', 'exerciseActivity'])('log entry: %s', (name) => {
    // The log services add the device's time; the schema must accept an entry with or without one.
    const body = fixture(name) as Record<string, unknown>;
    expect(EntryBody.safeParse(body).success).toBe(true);
    expect(EntryBody.safeParse({ ...body, time: '08:30 AM' }).success).toBe(true);
  });

  it('accepts the values unchanged: nothing is stripped or coerced on the way in', () => {
    const parsed = EntryBody.parse(fixture('foodEntry'));
    expect(parsed).toEqual(fixture('foodEntry'));
    expect(UserPatchBody.parse(fixture('planGenerated'))).toEqual(fixture('planGenerated'));
  });

  it('a body with any field the fixtures do not have is refused (the schemas are strict)', () => {
    expect(EntryBody.safeParse({ ...(fixture('foodEntry') as object), createdAt: '2026-01-15' }).success).toBe(false);
    expect(UserPatchBody.safeParse({ ...(fixture('targets') as object), updatedAt: '2026-01-15' }).success).toBe(false);
  });
});
