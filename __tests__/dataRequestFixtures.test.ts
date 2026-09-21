import fixtures from '../__fixtures__/data-requests.json';
import { addLogEntry, patchCurrentUser } from '../services/dataApi';
import { addExerciseLog, addFoodLog } from '../services/logService';
import { addActivityLog, updateUserProfile, updateUserTargets } from '../services/userService';

/**
 * The bodies the app's services build must be exactly the ones in __fixtures__/data-requests.json, which the
 * backend's tests (backend/tests/dataContract.test.ts) check against the server's strict schemas. Between them,
 * a field renamed or dropped on either side fails a test.
 */

jest.mock('../services/dataApi', () => ({ addLogEntry: jest.fn(), patchCurrentUser: jest.fn() }));

const mockedAdd = addLogEntry as jest.Mock;
const mockedPatch = patchCurrentUser as jest.Mock;

beforeEach(() => {
  mockedAdd.mockReset().mockResolvedValue({});
  mockedPatch.mockReset().mockResolvedValue({});
});

describe('entries the log services send', () => {
  it('addFoodLog', async () => {
    await addFoodLog('2026-01-15', { id: 'csv-12', name: 'Dal', calories: 300, carbs: 40, protein: 15, fat: 8, fiber: 6, servingSize: '1 bowl' });

    expect(mockedAdd.mock.calls[0][1]).toEqual({ ...fixtures.foodEntry, time: expect.any(String) });
  });

  it('addExerciseLog', async () => {
    await addExerciseLog('2026-01-15', { id: 'run', type: 'cardio', name: 'Running', duration: 30, calories: 250, intensity: 'Medium' });

    expect(mockedAdd.mock.calls[0][1]).toEqual({ ...fixtures.exerciseEntry, time: expect.any(String) });
  });

  it('addActivityLog: water', async () => {
    await addActivityLog('2026-01-15', { id: 'w1', name: 'Paani (Water)', calories: 0, time: '09:00 AM', type: 'water', amount: '1L' });

    expect(mockedAdd.mock.calls[0][1]).toEqual(fixtures.waterActivity);
  });

  it('addActivityLog: food with macros', async () => {
    await addActivityLog('2026-01-15', {
      id: 'f1',
      name: 'Homemade Poha',
      calories: 350,
      time: '08:30 AM',
      type: 'food',
      macros: { protein: 8, carbs: 60, fat: 9 },
    });

    expect(mockedAdd.mock.calls[0][1]).toEqual(fixtures.foodActivity);
  });

  it('addActivityLog: exercise', async () => {
    await addActivityLog('2026-01-15', {
      id: 'y1',
      name: 'Surya Namaskar (5 rounds)',
      calories: 90,
      time: '07:00 AM',
      type: 'exercise',
      duration: 10,
      intensity: 'Medium',
    });

    expect(mockedAdd.mock.calls[0][1]).toEqual(fixtures.exerciseActivity);
  });
});

describe('profile changes the services send', () => {
  it('updateUserTargets', async () => {
    await updateUserTargets({ calories: 2200, macros: { protein: '80g', fats: '60g', carbs: '250g' }, waterIntake: '3L' });

    expect(mockedPatch.mock.calls[0][0]).toEqual(fixtures.targets);
  });

  it('updateUserProfile: coach and goal', async () => {
    await updateUserProfile({ userProfile: { coachType: 'Friendly' } });
    await updateUserProfile({ userProfile: { goal: 'Gain Weight' }, generatedPlanStale: true });

    expect(mockedPatch.mock.calls[0][0]).toEqual(fixtures.coachChoice);
    expect(mockedPatch.mock.calls[1][0]).toEqual(fixtures.goalChange);
  });
});
