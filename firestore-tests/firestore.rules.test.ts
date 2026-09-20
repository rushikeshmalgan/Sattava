/**
 * Firestore security-rules tests. Run with `npm run test:rules` (starts the
 * Firestore emulator; needs Java).
 *
 * Two layers:
 *  1. A rule matrix using raw SDK writes, including deliberately bad values.
 *  2. The app's REAL write functions (services/logService.ts, userService.ts)
 *     running against the rules, so a change on either side that would break
 *     the app fails here.
 *
 * Every denial case has an allowed twin elsewhere in the file, so a test cannot
 * pass merely because the rules rejected the request for an unrelated reason.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { addExerciseLog, addFoodLog, deleteFoodLog, loadDemoData } from '../services/logService';
import {
  addActivityLog,
  incrementConsumption,
  logConsumption,
  updateUserProfile,
  updateUserTargets,
} from '../services/userService';

// The real services read `db` from firebaseConfig; point it at whichever test user is active.
jest.mock('../firebaseConfig', () => ({
  get db() {
    return (globalThis as unknown as { __rulesDb?: unknown }).__rulesDb;
  },
}));

const ALICE = 'alice';
const BOB = 'bob';
const DAY = '2026-01-05';
const dayPath = (uid = ALICE, day = DAY) => `users/${uid}/dailyLogs/${day}`;

let env: RulesTestEnvironment;

const setActiveDb = (db: unknown) => {
  (globalThis as unknown as { __rulesDb?: unknown }).__rulesDb = db;
};
// rules-unit-testing types firestore() as the compat interface; at runtime it is the modular instance the app uses.
const asUser = (uid: string): Firestore => {
  const db = env.authenticatedContext(uid).firestore() as unknown as Firestore;
  setActiveDb(db);
  return db;
};
const asAnon = (): Firestore => env.unauthenticatedContext().firestore() as unknown as Firestore;

const userRef = (db: Firestore, uid = ALICE) => doc(db, 'users', uid);
const dayRef = (db: Firestore, uid = ALICE, day = DAY) => doc(db, 'users', uid, 'dailyLogs', day);

/** Writes bypassing rules, for arranging pre-existing (possibly legacy) data. */
const seed = (docPath: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, docPath), data);
  });

const readDoc = async (docPath: string): Promise<Record<string, any> | undefined> => {
  let data: Record<string, any> | undefined;
  await env.withSecurityRulesDisabled(async (ctx) => {
    data = (await getDoc(doc(ctx.firestore() as unknown as Firestore, docPath))).data();
  });
  return data;
};

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Firestore emulator not running. Use `npm run test:rules`, which starts it.');
  }
  setLogLevel('silent'); // expected permission-denied errors would otherwise flood the output
  env = await initializeTestEnvironment({
    projectId: 'demo-sattava',
    firestore: { rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  setActiveDb(undefined);
  // The services log failures with console.error before rethrowing; expected here.
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Payloads that mirror what the app really writes ─────────────────────────

/** utils/SyncUserToFirestore.tsx */
const syncUserPayload = (uid: string, isNewUser: boolean) => ({
  id: uid,
  email: 'alice@example.com',
  name: 'Alice',
  photo: '',
  provider: 'password',
  lastLoginAt: serverTimestamp(),
  ...(isNewUser ? { createdAt: serverTimestamp() } : {}),
});

const physicalProfile = {
  gender: 'Female',
  goal: 'Lose Weight',
  activityLevel: '3-4 Days / Week',
  birthdate: { day: '14', month: '3', year: '1999' },
  heightFeet: '5',
  heightInches: '4',
  weightKg: '62',
};

const generatedPlan = {
  dailyCalories: 1800,
  macros: { carbs: '220g', protein: '70g', fats: '55g' },
  waterIntake: '2.5L',
  planSummary: 'A balanced plan built on dal, roti and sabzi.',
  fitnessTips: ['15 minutes of surya namaskar', 'Evening walk'],
};

/** app/generating-profile.tsx */
const onboardingCompletePayload = () => ({
  onboardingCompleted: true,
  isSetupCompleted: true,
  generatedPlan,
  physicalProfile,
  imageUrl: '',
  onboardingCompletedAt: new Date(),
  lastUpdated: new Date(),
});

const dalMakhani = {
  id: 'csv-dal-makhani',
  name: 'Dal Makhani',
  calories: 320,
  carbs: 30,
  protein: 12,
  fat: 16,
  fiber: 6,
  servingSize: '1 x bowl',
};

// ═════════════════════════════════════════════════════════════════════════════
describe('authentication and ownership', () => {
  it('denies unauthenticated reads and writes on both collections', async () => {
    await seed(`users/${ALICE}`, { id: ALICE, email: 'a@b.com' });
    await seed(dayPath(), { consumedCalories: 100 });
    const db = asAnon();
    await assertFails(getDoc(userRef(db)));
    await assertFails(setDoc(userRef(db, 'newuser'), { id: 'newuser', email: 'x@y.com' }));
    await assertFails(updateDoc(userRef(db), { name: 'Mallory' }));
    await assertFails(getDoc(dayRef(db)));
    await assertFails(setDoc(dayRef(db), { consumedCalories: 100 }));
    await assertFails(deleteDoc(dayRef(db)));
  });

  it('lets a user read and write their own documents', async () => {
    const db = asUser(ALICE);
    await assertSucceeds(setDoc(userRef(db), syncUserPayload(ALICE, true), { merge: true }));
    await assertSucceeds(getDoc(userRef(db)));
    await assertSucceeds(setDoc(dayRef(db), { consumedCalories: 100 }, { merge: true }));
    await assertSucceeds(getDoc(dayRef(db)));
    await assertSucceeds(getDocs(collection(db, 'users', ALICE, 'dailyLogs')));
  });

  it("denies user A reading or writing user B's profile", async () => {
    await seed(`users/${BOB}`, { id: BOB, email: 'bob@example.com' });
    const db = asUser(ALICE);
    await assertFails(getDoc(userRef(db, BOB)));
    await assertFails(setDoc(userRef(db, BOB), { name: 'Hijacked' }, { merge: true }));
    await assertFails(updateDoc(userRef(db, BOB), { name: 'Hijacked' }));
    await assertFails(deleteDoc(userRef(db, BOB)));
  });

  it("denies user A reading, listing or writing user B's daily logs", async () => {
    await seed(dayPath(BOB), { consumedCalories: 500 });
    const db = asUser(ALICE);
    await assertFails(getDoc(dayRef(db, BOB)));
    await assertFails(getDocs(collection(db, 'users', BOB, 'dailyLogs')));
    await assertFails(setDoc(dayRef(db, BOB), { consumedCalories: 1 }, { merge: true }));
    await assertFails(deleteDoc(dayRef(db, BOB)));
  });

  it("denies the real app write functions when they target another user's path", async () => {
    asUser(ALICE);
    await assertFails(addFoodLog(BOB, DAY, dalMakhani));
    await assertFails(addActivityLog(BOB, DAY, { id: 'w', name: 'Water', calories: 0, time: '10:00', type: 'water', amount: '250ml' }));
    await assertFails(updateUserTargets(BOB, { calories: 2000, macros: { protein: '60g', fats: '60g', carbs: '250g' }, waterIntake: '2L' }));
  });

  it('denies every path the app does not use (default deny)', async () => {
    const db = asUser(ALICE);
    await assertFails(setDoc(doc(db, 'announcements', 'a1'), { text: 'hi' }));
    await assertFails(getDoc(doc(db, 'announcements', 'a1')));
    await assertFails(setDoc(doc(db, 'users', ALICE, 'secrets', 's1'), { k: 'v' }));
    await assertFails(getDoc(doc(db, 'users', ALICE, 'secrets', 's1')));
    await assertFails(setDoc(doc(db, 'users', ALICE, 'dailyLogs', DAY, 'nested', 'n1'), { k: 'v' }));
  });

  it('lets a user delete their own documents', async () => {
    await seed(`users/${ALICE}`, { id: ALICE });
    await seed(dayPath(), { consumedCalories: 100 });
    const db = asUser(ALICE);
    await assertSucceeds(deleteDoc(dayRef(db)));
    await assertSucceeds(deleteDoc(userRef(db)));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('ownership field: users/{uid}.id (the schema has no `userId` field)', () => {
  it('accepts an id equal to the owner uid, or no id at all', async () => {
    const db = asUser(ALICE);
    await assertSucceeds(setDoc(userRef(db), { id: ALICE, email: 'a@b.com' }));
    await env.clearFirestore();
    await assertSucceeds(setDoc(userRef(db), { email: 'a@b.com' }));
  });

  it('rejects creating a document whose id points at another user', async () => {
    const db = asUser(ALICE);
    await assertFails(setDoc(userRef(db), { id: BOB, email: 'a@b.com' }));
  });

  it('rejects repointing id after creation (update, merge and full overwrite)', async () => {
    await seed(`users/${ALICE}`, { id: ALICE, email: 'a@b.com' });
    const db = asUser(ALICE);
    await assertFails(updateDoc(userRef(db), { id: BOB }));
    await assertFails(setDoc(userRef(db), { id: BOB }, { merge: true }));
    await assertFails(setDoc(userRef(db), { id: BOB, email: 'a@b.com' }));
  });

  it.each([
    ['null', null],
    ['a number', 123],
    ['an empty string', ''],
    ['a different case', 'ALICE'],
    ['the uid plus whitespace', 'alice '],
    ['a map', { uid: ALICE }],
  ])('rejects an id that is %s', async (_name, value) => {
    await seed(`users/${ALICE}`, { id: ALICE });
    const db = asUser(ALICE);
    await assertFails(updateDoc(userRef(db), { id: value }));
  });

  it('allows updates that leave id in place', async () => {
    await seed(`users/${ALICE}`, { id: ALICE, email: 'a@b.com' });
    const db = asUser(ALICE);
    await assertSucceeds(setDoc(userRef(db), { id: ALICE, lastLoginAt: serverTimestamp() }, { merge: true }));
    await assertSucceeds(updateDoc(userRef(db), { name: 'Alice' }));
  });

  it('does not let another user rewrite id (path ownership still applies)', async () => {
    await seed(`users/${ALICE}`, { id: ALICE });
    const db = asUser(BOB);
    await assertFails(updateDoc(userRef(db, ALICE), { id: BOB }));
    await assertFails(setDoc(userRef(db, ALICE), { id: ALICE, name: 'x' }, { merge: true }));
  });

  it("rejects creating a document under another uid even when its id matches that uid", async () => {
    const db = asUser(ALICE);
    await assertFails(setDoc(userRef(db, BOB), { id: BOB, email: 'bob@example.com' }));
  });

  it('rejects adding a userId field: it is not part of the schema', async () => {
    await seed(`users/${ALICE}`, { id: ALICE });
    const db = asUser(ALICE);
    await assertFails(updateDoc(userRef(db), { userId: BOB }));
    await assertFails(setDoc(dayRef(db), { userId: BOB, consumedCalories: 1 }, { merge: true }));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('user profile document: legitimate app writes', () => {
  it('SyncUserToFirestore: first login, then a later login', async () => {
    const db = asUser(ALICE);
    await assertSucceeds(setDoc(userRef(db), syncUserPayload(ALICE, true), { merge: true }));
    await assertSucceeds(setDoc(userRef(db), syncUserPayload(ALICE, false), { merge: true }));
  });

  it('onboarding: physicalProfile + updatedAt', async () => {
    const db = asUser(ALICE);
    await assertSucceeds(setDoc(userRef(db), { physicalProfile, updatedAt: new Date() }, { merge: true }));
  });

  it('generating-profile: plan, profile and completion flags', async () => {
    const db = asUser(ALICE);
    await assertSucceeds(setDoc(userRef(db), onboardingCompletePayload(), { merge: true }));
  });

  it('profile screen: goal, name and activity edits (dotted updates)', async () => {
    await seed(`users/${ALICE}`, { id: ALICE, userProfile: { name: 'Alice' } });
    const db = asUser(ALICE);
    await assertSucceeds(updateDoc(userRef(db), { 'userProfile.goal': 'Gain Weight', generatedPlanStale: true, lastUpdated: new Date() }));
    await assertSucceeds(updateDoc(userRef(db), { 'userProfile.name': 'Alice M', lastUpdated: new Date() }));
    await assertSucceeds(updateDoc(userRef(db), { 'userProfile.activityLevel': '5-6 Days / Week', generatedPlanStale: true, lastUpdated: new Date() }));
  });

  it('updateUserTargets and updateUserProfile (real service functions)', async () => {
    await seed(`users/${ALICE}`, { id: ALICE, generatedPlan });
    asUser(ALICE);
    await assertSucceeds(updateUserTargets(ALICE, { calories: 2100, macros: { protein: '70g', fats: '60g', carbs: '260g' }, waterIntake: '2.5L' }));
    await assertSucceeds(updateUserProfile(ALICE, { 'userProfile.coachType': 'strict' }));
    const stored = await readDoc(`users/${ALICE}`);
    expect(stored?.generatedPlan.dailyCalories).toBe(2100);
    expect(stored?.userProfile.coachType).toBe('strict');
  });

  it('a stored plan with legacy numeric macros can still have its targets replaced', async () => {
    // Older AI output could store macros as numbers; updateUserTargets replaces all three with strings.
    await seed(`users/${ALICE}`, { id: ALICE, generatedPlan: { dailyCalories: 2000, macros: { carbs: 250, protein: 60, fats: 70 }, waterIntake: 2.5 } });
    asUser(ALICE);
    await assertSucceeds(updateUserTargets(ALICE, { calories: 2000, macros: { protein: '60g', fats: '70g', carbs: '250g' }, waterIntake: '2.5L' }));
  });

  it('realistic calorie targets across the plausible range', async () => {
    await seed(`users/${ALICE}`, { id: ALICE, generatedPlan });
    const db = asUser(ALICE);
    for (const calories of [1200, 1800, 2500, 4000]) {
      await assertSucceeds(updateDoc(userRef(db), { 'generatedPlan.dailyCalories': calories, lastUpdated: new Date() }));
    }
  });
});

describe('user profile document: rejected writes', () => {
  beforeEach(() => seed(`users/${ALICE}`, { id: ALICE, email: 'a@b.com', generatedPlan }));

  it.each([
    ['an unknown top-level field', { isAdmin: true }],
    ['email as a number', { email: 42 }],
    ['a name over 200 characters', { name: 'x'.repeat(201) }],
    ['lastLoginAt as a string', { lastLoginAt: 'now' }],
    ['lastUpdated as a number', { lastUpdated: 1700000000 }],
    ['onboardingCompleted as a string', { onboardingCompleted: 'yes' }],
    ['generatedPlanStale as a number', { generatedPlanStale: 1 }],
    ['physicalProfile as a string', { physicalProfile: 'tall' }],
    ['userProfile with an over-long goal', { userProfile: { goal: 'x'.repeat(201) } }],
    ['userProfile.name as a number', { userProfile: { name: 42 } }],
    ['generatedPlan as a string', { generatedPlan: 'plan' }],
    ['plan calories negative', { 'generatedPlan.dailyCalories': -2000 }],
    ['plan calories absurd', { 'generatedPlan.dailyCalories': 1_000_000_000 }],
    ['plan calories NaN', { 'generatedPlan.dailyCalories': NaN }],
    ['plan calories as a string', { 'generatedPlan.dailyCalories': '2000' }],
    ['a numeric macro target', { 'generatedPlan.macros.protein': 70 }],
    ['an over-long waterIntake', { 'generatedPlan.waterIntake': 'x'.repeat(17) }],
  ])('denies %s', async (_name, patch) => {
    const db = asUser(ALICE);
    await assertFails(updateDoc(userRef(db), patch));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('daily log: legitimate app writes (real service functions)', () => {
  it('addFoodLog: running totals, entries, with and without fiber', async () => {
    asUser(ALICE);
    await assertSucceeds(addFoodLog(ALICE, DAY, dalMakhani));
    await assertSucceeds(addFoodLog(ALICE, DAY, { id: 'roti', name: 'Roti', calories: 100, carbs: 18, protein: 3, fat: 2, servingSize: '1 x piece' }));
    const day = await readDoc(dayPath());
    expect(day).toMatchObject({ consumedCalories: 420, totalCarbs: 48, totalProtein: 15, totalFat: 18, totalFiber: 6 });
    expect(day?.foods).toHaveLength(2);
    expect(day?.logs).toHaveLength(2);
  });

  it('addExerciseLog', async () => {
    asUser(ALICE);
    await assertSucceeds(addExerciseLog(ALICE, DAY, { id: 'run', type: 'cardio', name: 'Running', duration: 30, calories: 300, intensity: 'Medium' }));
    await assertSucceeds(addExerciseLog(ALICE, DAY, { id: 'manual', type: 'manual', name: 'Manual Exercise', duration: 0, calories: 150, intensity: 'N/A' }));
    expect((await readDoc(dayPath()))?.caloriesBurned).toBe(450);
  });

  it('addActivityLog: food (with and without macros), water in ml and L, exercise', async () => {
    asUser(ALICE);
    const time = '08:30 AM';
    await assertSucceeds(addActivityLog(ALICE, DAY, { id: 'a1', name: 'Homemade Poha', calories: 350, time, type: 'food', macros: { protein: 8, carbs: 60, fat: 9 } }));
    await assertSucceeds(addActivityLog(ALICE, DAY, { id: 'a2', name: 'Ghar Ka Khana', calories: 500, time, type: 'food', createdAt: new Date() }));
    await assertSucceeds(addActivityLog(ALICE, DAY, { id: 'a3', name: 'Water', calories: 0, time, type: 'water', amount: '250ml' }));
    await assertSucceeds(addActivityLog(ALICE, DAY, { id: 'a4', name: 'Water', calories: 0, time, type: 'water', amount: '1L' }));
    await assertSucceeds(addActivityLog(ALICE, DAY, { id: 'a5', name: 'Surya Namaskar (5 rounds)', calories: 90, time, type: 'exercise' }));
    expect(await readDoc(dayPath())).toMatchObject({ consumedCalories: 850, totalProtein: 8, totalCarbs: 60, totalFat: 9, totalWater: 1250, caloriesBurned: 90 });
  });

  it('logConsumption and incrementConsumption', async () => {
    asUser(ALICE);
    await assertSucceeds(logConsumption(ALICE, DAY, { calories: 1800, carbs: 210, protein: 70, fat: 55, water: 2000 }));
    await assertSucceeds(incrementConsumption(ALICE, DAY, { calories: 200, protein: 10, water: 250 }));
    expect(await readDoc(dayPath())).toMatchObject({ consumedCalories: 2000, totalProtein: 80, totalWater: 2250 });
  });

  it('deleteFoodLog reverses a food, an exercise and a water entry', async () => {
    const db = asUser(ALICE);
    await addFoodLog(ALICE, DAY, dalMakhani);
    await addActivityLog(ALICE, DAY, { id: 'y1', name: 'Yoga', calories: 60, time: '07:00', type: 'exercise' });
    await addActivityLog(ALICE, DAY, { id: 'w1', name: 'Water', calories: 0, time: '09:00', type: 'water', amount: '250ml' });

    const logs = (await getDoc(dayRef(db))).data()?.logs as Record<string, unknown>[];
    for (const entry of logs) {
      await assertSucceeds(deleteFoodLog(ALICE, DAY, entry as Parameters<typeof deleteFoodLog>[2]));
    }
    const day = await readDoc(dayPath());
    expect(day?.logs).toHaveLength(0);
    expect(day).toMatchObject({ consumedCalories: 0, caloriesBurned: 0, totalWater: 0 });
  });

  it('deleteFoodLog also reverses cardio, weight and manual exercise entries', async () => {
    // These are what addExerciseLog stores (its subtype is the entry type). Deleting one used to
    // remove the log entry but leave its calories in caloriesBurned.
    const db = asUser(ALICE);
    await addExerciseLog(ALICE, DAY, { id: 'run', type: 'cardio', name: 'Running', duration: 30, calories: 300, intensity: 'Medium' });
    await addExerciseLog(ALICE, DAY, { id: 'lift', type: 'weight', name: 'Squats', duration: 20, calories: 120, intensity: 'High' });
    await addExerciseLog(ALICE, DAY, { id: 'manual', type: 'manual', name: 'Manual Exercise', duration: 0, calories: 150, intensity: 'N/A' });
    expect((await readDoc(dayPath()))?.caloriesBurned).toBe(570);

    const logs = (await getDoc(dayRef(db))).data()?.logs as Record<string, unknown>[];
    expect(logs).toHaveLength(3);
    for (const entry of logs) {
      await assertSucceeds(deleteFoodLog(ALICE, DAY, entry as Parameters<typeof deleteFoodLog>[2]));
    }
    const day = await readDoc(dayPath());
    expect(day?.logs).toHaveLength(0);
    expect(day?.caloriesBurned).toBe(0);
  });

  it('loadDemoData writes seven valid days', async () => {
    asUser(ALICE);
    await assertSucceeds(loadDemoData(ALICE));
    const db = env.authenticatedContext(ALICE).firestore() as unknown as Firestore;
    expect((await getDocs(collection(db, 'users', ALICE, 'dailyLogs'))).size).toBe(7);
  });

  it('a write touching EVERY field stays inside the 1,000-expression evaluation budget', async () => {
    // The app never writes this much at once (addFoodLog, its heaviest write, touches 8 fields), so this
    // leaves headroom: if the rules ever get more expensive, this fails before real logging does.
    const db = asUser(ALICE);
    const rich = { id: 'x', name: 'Veg Thali', calories: 650, protein: 32.5, carbs: 85.2, fat: 21.4, fiber: 9, duration: 30, servingSize: '1 x plate', amount: '1 plate', macros: { protein: 1, carbs: 2, fat: 3, fiber: 4 }, createdAt: new Date() };
    await assertSucceeds(setDoc(dayRef(db), {
      consumedCalories: increment(650), caloriesBurned: increment(300), totalCarbs: increment(85), totalProtein: increment(32),
      totalFat: increment(21), totalFiber: increment(9), totalWater: increment(500),
      foods: arrayUnion(rich), exercises: arrayUnion(rich), logs: arrayUnion(rich), lastUpdated: new Date(),
    }, { merge: true }));
  });

  it('realistic nutrition values are accepted, including large but plausible ones', async () => {
    const db = asUser(ALICE);
    await assertSucceeds(setDoc(dayRef(db), {
      consumedCalories: increment(650), totalProtein: increment(32.5), totalCarbs: increment(85.2), totalFat: increment(21.4),
      totalFiber: increment(9), totalWater: increment(500), caloriesBurned: increment(420),
      foods: arrayUnion({ id: 'thali', name: 'Veg Thali', calories: 650, protein: 32.5, carbs: 85.2, fat: 21.4, fiber: 9, servingSize: '1 x plate', createdAt: new Date() }),
      lastUpdated: new Date(),
    }, { merge: true }));
    // A very large single entry (x10 of a 900 kcal item) is still within bounds.
    await assertSucceeds(addFoodLog(ALICE, DAY, { id: 'feast', name: 'Feast', calories: 9000, carbs: 900, protein: 300, fat: 400, servingSize: '10 x plate' }));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('daily log: rejected running totals', () => {
  it.each([
    ['negative calories', { consumedCalories: increment(-100) }],
    ['negative protein', { totalProtein: increment(-5) }],
    ['negative carbs', { totalCarbs: increment(-5) }],
    ['negative fat', { totalFat: increment(-5) }],
    ['negative fiber', { totalFiber: increment(-5) }],
    ['negative water', { totalWater: increment(-250) }],
    ['negative calories burned', { caloriesBurned: increment(-100) }],
    ['absurd calories (1,000,000)', { consumedCalories: increment(1_000_000) }],
    ['calories 1 over the 30,000 daily cap', { consumedCalories: increment(30_001) }],
    ['absurd protein (1,000,000 g)', { totalProtein: increment(1_000_000) }],
    ['carbs 1 over the 3,000 g daily cap', { totalCarbs: increment(3001) }],
    ['absurd fat (1,000,000 g)', { totalFat: increment(1_000_000) }],
    ['absurd fiber', { totalFiber: increment(1_000_000) }],
    ['water 1 over the 20,000 ml daily cap', { totalWater: increment(20_001) }],
    ['absurd calories burned', { caloriesBurned: increment(1_000_000) }],
    ['a string instead of a number', { consumedCalories: '500' }],
    ['NaN', { consumedCalories: NaN }],
    ['Infinity', { consumedCalories: Infinity }],
    ['null', { totalProtein: null }],
    ['a boolean', { totalFat: true }],
    ['a list', { totalCarbs: [1, 2] }],
    ['a map', { totalWater: { ml: 250 } }],
  ])('denies %s', async (_name, patch) => {
    const db = asUser(ALICE);
    await assertFails(setDoc(dayRef(db), { ...patch, lastUpdated: new Date() }, { merge: true }));
  });

  it('accepts a value exactly at each daily cap (the twin of the cap cases above)', async () => {
    const db = asUser(ALICE);
    await assertSucceeds(setDoc(dayRef(db), {
      consumedCalories: increment(30_000), caloriesBurned: increment(30_000),
      totalProtein: increment(3000), totalCarbs: increment(3000), totalFat: increment(3000), totalFiber: increment(3000),
      totalWater: increment(20_000), lastUpdated: new Date(),
    }, { merge: true }));
  });

  it('enforces the daily cap on updates, not only on creation', async () => {
    await seed(dayPath(), { consumedCalories: 25_000 });
    const db = asUser(ALICE);
    await assertFails(setDoc(dayRef(db), { consumedCalories: increment(5001) }, { merge: true })); // 30,001
    await assertSucceeds(setDoc(dayRef(db), { consumedCalories: increment(5000) }, { merge: true })); // 30,000
  });

  it('enforces the daily cap across many legitimate-looking writes', async () => {
    const db = asUser(ALICE);
    for (let i = 0; i < 3; i++) {
      await assertSucceeds(setDoc(dayRef(db), { consumedCalories: increment(10_000) }, { merge: true })); // 10k, 20k, 30k
    }
    await assertFails(setDoc(dayRef(db), { consumedCalories: increment(1) }, { merge: true })); // 30,001
  });

  it('denies the real service functions when given negative or absurd values', async () => {
    asUser(ALICE);
    await assertFails(addFoodLog(ALICE, DAY, { ...dalMakhani, calories: -100 }));
    await assertFails(addFoodLog(ALICE, DAY, { ...dalMakhani, calories: 1_000_000 }));
    await assertFails(addFoodLog(ALICE, DAY, { ...dalMakhani, protein: -12 }));
    await assertFails(addFoodLog(ALICE, DAY, { ...dalMakhani, carbs: 999_999 }));
    await assertFails(addExerciseLog(ALICE, DAY, { id: 'x', type: 'manual', name: 'Manual', duration: 0, calories: -500, intensity: 'N/A' }));
    await assertFails(addActivityLog(ALICE, DAY, { id: 'x', name: 'Typo', calories: -300, time: '10:00', type: 'food' }));
    await assertFails(addActivityLog(ALICE, DAY, { id: 'x', name: 'Typo', calories: 99999999, time: '10:00', type: 'food' }));
    await assertFails(addActivityLog(ALICE, DAY, { id: 'x', name: 'Typo', calories: 100, time: '10:00', type: 'food', macros: { protein: -5 } }));
    await assertFails(incrementConsumption(ALICE, DAY, { calories: 1e9 }));
    await assertFails(logConsumption(ALICE, DAY, { calories: -1 }));
    expect(await readDoc(dayPath())).toBeUndefined(); // nothing was written
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('daily log: rejected entries (foods / logs / exercises)', () => {
  const goodEntry = { id: 'x', name: 'Roti', calories: 100, createdAt: new Date() };

  type BadCase = [string, Record<string, unknown>];

  // Checked for every list.
  const badEverywhere: BadCase[] = [
    ['negative calories', { calories: -100 }],
    ['absurd calories', { calories: 1_000_000 }],
    ['calories over the 10,000 per-entry cap', { calories: 10_001 }],
    ['calories as a string', { calories: '500' }],
    ['calories NaN', { calories: NaN }],
    ['calories null', { calories: null }],
    ['a name as a number', { name: 123 }],
    ['a name over 500 characters', { name: 'x'.repeat(501) }],
    ['createdAt as a string', { createdAt: 'yesterday' }],
  ];
  // `foods` entries are FoodData: macros are top-level fields.
  const badFoods: BadCase[] = [
    ['negative protein', { protein: -1 }],
    ['negative carbs', { carbs: -1 }],
    ['negative fat', { fat: -1 }],
    ['negative fiber', { fiber: -1 }],
    ['absurd protein', { protein: 1_000_000 }],
    ['carbs over the 1,000 g per-entry cap', { carbs: 1001 }],
    ['absurd fat', { fat: 5000 }],
    ['absurd fiber', { fiber: 5000 }],
    ['protein as a string', { protein: 'lots' }],
  ];
  const badExercises: BadCase[] = [
    ['a duration over 24 hours', { duration: 1441 }],
    ['a negative duration', { duration: -5 }],
    ['a duration as a string', { duration: '30' }],
  ];
  // `logs` entries (activity log) carry an optional nested `macros` map.
  const badLogs: BadCase[] = [
    ['macros as a string', { macros: 'many' }],
    ['a negative macro', { macros: { protein: -3 } }],
    ['an absurd macro', { macros: { carbs: 1_000_000 } }],
    ['a macro as a string', { macros: { fat: 'lots' } }],
  ];

  describe.each<[string, BadCase[], Record<string, unknown>]>([
    ['foods', badFoods, { protein: 3, carbs: 18, fat: 2, fiber: 2 }],
    ['exercises', badExercises, { duration: 30 }],
    ['logs', badLogs, { macros: { protein: 3, carbs: 18, fat: 2 } }],
  ])('%s list', (list, badForList, extras) => {
    const good = { ...goodEntry, ...extras };

    it('accepts a realistic entry', async () => {
      const db = asUser(ALICE);
      await assertSucceeds(setDoc(dayRef(db), { [list]: arrayUnion(good), lastUpdated: new Date() }, { merge: true }));
    });

    it.each([...badEverywhere, ...badForList])('denies an entry with %s', async (_name, bad) => {
      const db = asUser(ALICE);
      await assertFails(setDoc(dayRef(db), { [list]: arrayUnion({ ...good, ...bad }), lastUpdated: new Date() }, { merge: true }));
    });
  });

  it('accepts removing an entry and re-adding one that already exists', async () => {
    const db = asUser(ALICE);
    await assertSucceeds(setDoc(dayRef(db), { logs: arrayUnion(goodEntry) }, { merge: true }));
    await assertSucceeds(setDoc(dayRef(db), { logs: arrayUnion(goodEntry) }, { merge: true })); // duplicate: no-op
    await assertSucceeds(setDoc(dayRef(db), { logs: arrayRemove(goodEntry) }, { merge: true }));
  });

  it.each([
    ['a string instead of a list', { foods: 'oops' }],
    ['a map instead of a list', { logs: { a: 1 } }],
    ['a list whose last entry is not a map', { foods: ['just text'] }],
    ['a list longer than 500 entries', { logs: Array.from({ length: 501 }, (_, i) => ({ id: String(i), name: 'x', calories: 1 })) }],
  ])('denies %s', async (_name, patch) => {
    const db = asUser(ALICE);
    await assertFails(setDoc(dayRef(db), { ...patch, lastUpdated: new Date() }, { merge: true }));
  });

  it('accepts a list of exactly 500 entries', async () => {
    const db = asUser(ALICE);
    const logs = Array.from({ length: 500 }, (_, i) => ({ id: String(i), name: 'x', calories: 1 }));
    await assertSucceeds(setDoc(dayRef(db), { logs, lastUpdated: new Date() }, { merge: true }));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('daily log: timestamps, shape and document id', () => {
  it.each([
    ['lastUpdated as a string', { lastUpdated: 'yesterday' }],
    ['lastUpdated as a number', { lastUpdated: 1700000000 }],
    ['lastUpdated as a boolean', { lastUpdated: true }],
  ])('denies %s', async (_name, patch) => {
    const db = asUser(ALICE);
    await assertFails(setDoc(dayRef(db), { consumedCalories: 100, ...patch }, { merge: true }));
  });

  it('accepts a client Date and a server timestamp', async () => {
    const db = asUser(ALICE);
    await assertSucceeds(setDoc(dayRef(db), { consumedCalories: 100, lastUpdated: new Date() }, { merge: true }));
    await assertSucceeds(setDoc(dayRef(db), { consumedCalories: 100, lastUpdated: serverTimestamp() }, { merge: true }));
  });

  it.each([
    ['an unknown field', { isAdmin: true }],
    ['a userId field', { userId: BOB }],
    ['an extra field next to valid ones', { consumedCalories: 100, notes: 'hi' }],
  ])('denies %s', async (_name, patch) => {
    const db = asUser(ALICE);
    await assertFails(setDoc(dayRef(db), patch, { merge: true }));
  });

  it.each(['today', '2026-1-5', '2026-01-05x', '20260105', 'X2026-01-05', '2026-01-050'])('denies creating a day document with the id %p', async (id) => {
    const db = asUser(ALICE);
    await assertFails(setDoc(dayRef(db, ALICE, id), { consumedCalories: 100 }, { merge: true }));
  });

  it('accepts real date ids', async () => {
    const db = asUser(ALICE);
    for (const id of ['2026-01-05', '2026-12-31', '1999-02-28']) {
      await assertSucceeds(setDoc(dayRef(db, ALICE, id), { consumedCalories: 100 }, { merge: true }));
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('existing data never locks a user out', () => {
  it('an old out-of-range total, unknown field or malformed entry does not block an unrelated write', async () => {
    await seed(dayPath(), { consumedCalories: -50, legacyField: 'x', logs: [{ id: 'old', name: 'Old entry', calories: 'nine' }] });
    asUser(ALICE);
    await assertSucceeds(addActivityLog(ALICE, DAY, { id: 'w', name: 'Water', calories: 0, time: '10:00', type: 'water', amount: '250ml' }));
    const day = await readDoc(dayPath());
    expect(day).toMatchObject({ consumedCalories: -50, legacyField: 'x', totalWater: 250 });
    expect(day?.logs).toHaveLength(2);
  });

  it('but a write that touches the bad total must leave it valid', async () => {
    await seed(dayPath(), { consumedCalories: -50 });
    asUser(ALICE);
    await assertFails(incrementConsumption(ALICE, DAY, { calories: 10 })); // -40: still invalid
    await assertSucceeds(incrementConsumption(ALICE, DAY, { calories: 100 })); // 50: repaired
  });

  it('tolerates floating-point drift when entries are removed (0.3 - 0.1 - 0.2 < 0 by ~3e-17)', async () => {
    asUser(ALICE);
    await assertSucceeds(incrementConsumption(ALICE, DAY, { protein: 0.3 }));
    await assertSucceeds(incrementConsumption(ALICE, DAY, { protein: -0.1 }));
    await assertSucceeds(incrementConsumption(ALICE, DAY, { protein: -0.2 }));
    expect((await readDoc(dayPath()))?.totalProtein).toBeCloseTo(0, 9);
  });

  it('a genuinely negative total (not float noise) is still rejected', async () => {
    asUser(ALICE);
    await assertSucceeds(incrementConsumption(ALICE, DAY, { protein: 5 }));
    await assertFails(incrementConsumption(ALICE, DAY, { protein: -5.5 }));
  });
});
