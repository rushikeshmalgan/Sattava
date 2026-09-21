import { randomUUID } from 'node:crypto';
import type { Collection, Db, Filter } from 'mongodb';
import { dateDaysAgo } from './dates';
import { DAY_CAPS, MAX_ENTRIES_PER_DAY, TOTAL_FIELDS, type TotalField } from './limits';
import type { EntryInput, ListQueryInput, SyncUserInput, UserPatchInput } from './schemas';
import type { DayDoc, DayDto, LogEntry, UserDoc, UserDto } from './types';

/** The day already holds the most it may (entries, calories, grams or water). Nothing was written. */
export class DayLimitError extends Error {
  constructor() {
    super('DAY_LIMIT_EXCEEDED');
    this.name = 'DayLimitError';
  }
}

/**
 * Everything the API does to the database. The methods take the verified uid as their first argument and
 * put it in every filter, so one user's request can never reach another user's documents.
 */
export interface DataRepository {
  getUser(uid: string): Promise<UserDto | null>;
  syncUser(uid: string, input: SyncUserInput): Promise<UserDto>;
  patchUser(uid: string, patch: UserPatchInput): Promise<UserDto>;
  getDay(uid: string, date: string): Promise<DayDto | null>;
  listDays(uid: string, query: ListQueryInput): Promise<DayDto[]>;
  /** Throws DayLimitError when the day is full. */
  addEntry(uid: string, date: string, entry: EntryInput): Promise<DayDto>;
  /** Returns null when the day or the entry does not exist. */
  removeEntry(uid: string, date: string, entryId: string): Promise<DayDto | null>;
  /** Replaces the last seven days with sample data for presentations. */
  loadDemoDays(uid: string): Promise<number>;
}

type Deltas = Partial<Record<TotalField, number>>;

/** How an entry moves the day's totals. Used to add it, and again (negated) to take it back out. */
export const totalsFor = (
  entry: Pick<LogEntry, 'type' | 'calories' | 'carbs' | 'protein' | 'fat' | 'fiber' | 'amountMl'>,
): Deltas => {
  const deltas: Deltas = {};
  const add = (field: TotalField, value: number | undefined) => {
    if (value) deltas[field] = value;
  };

  if (entry.type === 'water') {
    add('totalWater', entry.amountMl);
  } else if (entry.type === 'food') {
    add('consumedCalories', entry.calories);
    add('totalCarbs', entry.carbs);
    add('totalProtein', entry.protein);
    add('totalFat', entry.fat);
    add('totalFiber', entry.fiber);
  } else {
    add('caloriesBurned', entry.calories);
  }
  return deltas;
};

const ZERO_TOTALS: Record<TotalField, number> = {
  consumedCalories: 0,
  caloriesBurned: 0,
  totalCarbs: 0,
  totalProtein: 0,
  totalFat: 0,
  totalFiber: 0,
  totalWater: 0,
};

const isDuplicateKey = (err: unknown): boolean => (err as { code?: number } | null)?.code === 11000;

const toDayDto = (doc: DayDoc): DayDto => ({
  date: doc.date,
  consumedCalories: doc.consumedCalories ?? 0,
  caloriesBurned: doc.caloriesBurned ?? 0,
  totalCarbs: doc.totalCarbs ?? 0,
  totalProtein: doc.totalProtein ?? 0,
  totalFat: doc.totalFat ?? 0,
  totalFiber: doc.totalFiber ?? 0,
  totalWater: doc.totalWater ?? 0,
  logs: (doc.logs ?? []).map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })),
  lastUpdated: doc.lastUpdated.toISOString(),
});

const iso = (date: Date | undefined): string | undefined => date?.toISOString();

const toUserDto = (doc: UserDoc): UserDto => {
  const { _id, createdAt, lastLoginAt, lastUpdated, onboardingCompletedAt, ...rest } = doc;
  return {
    id: _id,
    ...rest,
    ...(createdAt ? { createdAt: iso(createdAt) } : {}),
    ...(lastLoginAt ? { lastLoginAt: iso(lastLoginAt) } : {}),
    ...(lastUpdated ? { lastUpdated: iso(lastUpdated) } : {}),
    ...(onboardingCompletedAt ? { onboardingCompletedAt: iso(onboardingCompletedAt) } : {}),
  };
};

export function createDataRepository(db: Db, options: { now?: () => Date } = {}): DataRepository {
  const now = options.now ?? (() => new Date());
  const users: Collection<UserDoc> = db.collection<UserDoc>('users');
  const days: Collection<DayDoc> = db.collection<DayDoc>('dailyLogs');

  /** Creates the day with zeroed totals if it is missing, so the capped update below always has fields to test. */
  async function ensureDay(uid: string, date: string, at: Date): Promise<void> {
    try {
      await days.updateOne({ uid, date }, { $setOnInsert: { ...ZERO_TOTALS, logs: [], lastUpdated: at } }, { upsert: true });
    } catch (err) {
      // Two first writes for the same new day race; the loser sees the winner's document.
      if (!isDuplicateKey(err)) throw err;
    }
  }

  return {
    async getUser(uid) {
      const doc = await users.findOne({ _id: uid });
      return doc ? toUserDto(doc) : null;
    },

    async syncUser(uid, input) {
      const at = now();
      const set: Record<string, unknown> = { lastLoginAt: at };
      for (const key of ['email', 'name', 'photo', 'provider'] as const) {
        if (input[key] !== undefined) set[key] = input[key];
      }
      const doc = await users.findOneAndUpdate(
        { _id: uid },
        { $set: set, $setOnInsert: { createdAt: at } },
        { upsert: true, returnDocument: 'after' },
      );
      return toUserDto(doc as UserDoc);
    },

    async patchUser(uid, patch) {
      const at = now();
      // Field paths are built here from the keys of strictly validated objects (fixed names, never
      // client-chosen), so a client cannot address a path or an operator of its own.
      const set: Record<string, unknown> = { lastUpdated: at };

      if (patch.physicalProfile) set.physicalProfile = patch.physicalProfile;
      if (patch.userProfile) {
        for (const [key, value] of Object.entries(patch.userProfile)) {
          if (value !== undefined) set[`userProfile.${key}`] = value;
        }
      }
      if (patch.generatedPlan) {
        const { macros, ...plan } = patch.generatedPlan;
        for (const [key, value] of Object.entries(plan)) {
          if (value !== undefined) set[`generatedPlan.${key}`] = value;
        }
        for (const [key, value] of Object.entries(macros ?? {})) {
          if (value !== undefined) set[`generatedPlan.macros.${key}`] = value;
        }
      }
      for (const key of ['onboardingCompleted', 'isSetupCompleted', 'generatedPlanStale', 'imageUrl'] as const) {
        if (patch[key] !== undefined) set[key] = patch[key];
      }
      if (patch.onboardingCompleted === true) set.onboardingCompletedAt = at;

      const doc = await users.findOneAndUpdate(
        { _id: uid },
        { $set: set, $setOnInsert: { createdAt: at } },
        { upsert: true, returnDocument: 'after' },
      );
      return toUserDto(doc as UserDoc);
    },

    async getDay(uid, date) {
      const doc = await days.findOne({ uid, date });
      return doc ? toDayDto(doc) : null;
    },

    async listDays(uid, query) {
      const filter: Record<string, unknown> = { uid };
      if (query.from || query.to) {
        filter.date = { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: query.to } : {}) };
      }
      const docs = await days
        .find(filter as Filter<DayDoc>)
        .sort({ date: -1 })
        .limit(query.limit)
        .toArray();
      return docs.map(toDayDto);
    },

    async addEntry(uid, date, input) {
      const at = now();
      const entry: LogEntry = { id: randomUUID(), ...input, createdAt: at };
      const deltas = totalsFor(entry);

      await ensureDay(uid, date, at);

      // One atomic update: the filter refuses it if it would push any total over its cap or the day over its
      // entry limit, so concurrent writes can never overshoot. No match means the day is full.
      const filter: Record<string, unknown> = { uid, date, [`logs.${MAX_ENTRIES_PER_DAY - 1}`]: { $exists: false } };
      for (const field of TOTAL_FIELDS) {
        const delta = deltas[field];
        if (delta) filter[field] = { $lte: DAY_CAPS[field] - delta };
      }

      const update: Record<string, unknown> = { $push: { logs: entry }, $set: { lastUpdated: at } };
      if (Object.keys(deltas).length > 0) update.$inc = deltas;

      const doc = await days.findOneAndUpdate(filter as Filter<DayDoc>, update, { returnDocument: 'after' });
      if (!doc) throw new DayLimitError();
      return toDayDto(doc);
    },

    async removeEntry(uid, date, entryId) {
      const found = await days.findOne({ uid, date, 'logs.id': entryId }, { projection: { logs: { $elemMatch: { id: entryId } } } });
      const entry = found?.logs?.[0];
      if (!entry) return null;

      const at = now();
      const stage: Record<string, unknown> = {
        logs: { $filter: { input: '$logs', cond: { $ne: ['$$this.id', entryId] } } },
        lastUpdated: at,
      };
      for (const [field, delta] of Object.entries(totalsFor(entry))) {
        // Never below zero, and rounded so repeated decimal adds and removals leave no float dust.
        stage[field] = { $max: [0, { $round: [{ $subtract: [`$${field}`, delta] }, 3] }] };
      }

      // Matching on the entry's id makes this safe to race: a second delete of the same entry matches nothing.
      const doc = await days.findOneAndUpdate({ uid, date, 'logs.id': entryId }, [{ $set: stage }], { returnDocument: 'after' });
      return doc ? toDayDto(doc) : null;
    },

    async loadDemoDays(uid) {
      const at = now();
      for (let i = 0; i < 7; i++) {
        const date = dateDaysAgo(at.getTime(), i);
        const entry = (over: Partial<LogEntry> & Pick<LogEntry, 'type' | 'name'>): LogEntry => ({
          id: randomUUID(),
          createdAt: at,
          ...over,
        });
        // Balanced days that keep a streak going: calories near 2,000, water 2 L, one exercise.
        await days.updateOne(
          { uid, date },
          {
            $set: {
              consumedCalories: 2000 - i * 50,
              caloriesBurned: 300 + i * 20,
              totalCarbs: 220 - i * 10,
              totalProtein: 65 + (i % 3),
              totalFat: 55 + i * 2,
              totalFiber: 0,
              totalWater: 2000 + i * 100,
              lastUpdated: at,
              logs: [
                entry({ type: 'food', name: 'Oatmeal with Fruits', calories: 350, protein: 12, carbs: 60, fat: 5, amount: '1 bowl', time: '08:30 AM' }),
                entry({ type: 'food', name: 'Grilled Paneer Salad', calories: 450, protein: 25, carbs: 15, fat: 20, amount: '1 plate', time: '01:15 PM' }),
                entry({ type: 'food', name: 'Dal Tadka & Brown Rice', calories: 550, protein: 18, carbs: 80, fat: 12, amount: '1 plate', time: '08:00 PM' }),
                entry({ type: 'water', name: 'Paani', amountMl: 2000, amount: '2000ml', time: '09:00 PM' }),
                entry({ type: 'exercise', name: 'Morning Yoga', calories: 200, duration: 30, intensity: 'Medium', time: '07:00 AM' }),
              ],
            },
          },
          { upsert: true },
        );
      }
      return 7;
    },
  };
}
