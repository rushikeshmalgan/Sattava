import { fetchCurrentUser, fetchDailyLog } from '../services/dataApi';
import { emitInvalidate } from '../services/dataEvents';
import { POLL_INTERVAL_MS, subscribeToDailyLog, subscribeToUser } from '../services/liveData';

jest.mock('../services/dataApi', () => ({ fetchCurrentUser: jest.fn(), fetchDailyLog: jest.fn() }));
jest.mock('react-native', () => ({ AppState: { currentState: 'active' } }));

const mockedUser = fetchCurrentUser as jest.Mock;
const mockedDay = fetchDailyLog as jest.Mock;
const { AppState } = jest.requireMock('react-native') as { AppState: { currentState: string } };

/** Lets a fetch that has resolved deliver its result to the subscribers. */
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

const unsubscribers: (() => void)[] = [];
const track = (unsubscribe: () => void) => {
  unsubscribers.push(unsubscribe);
  return unsubscribe;
};

beforeEach(() => {
  jest.useFakeTimers();
  mockedUser.mockReset();
  mockedDay.mockReset();
  AppState.currentState = 'active';
});
afterEach(() => {
  for (const unsubscribe of unsubscribers.splice(0)) unsubscribe();
  jest.useRealTimers();
});

describe('a subscription', () => {
  it('delivers the current value straight away', async () => {
    mockedUser.mockResolvedValue({ id: 'u1' });
    const onData = jest.fn();

    track(subscribeToUser(onData));
    await flush();

    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith({ id: 'u1' });
  });

  it('delivers null once when there is nothing yet, like a document that does not exist', async () => {
    mockedDay.mockResolvedValue(null);
    const onData = jest.fn();

    track(subscribeToDailyLog('2026-01-15', onData));
    await flush();
    jest.advanceTimersByTime(POLL_INTERVAL_MS * 2);
    await flush();

    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith(null);
  });

  it('polls, but only speaks up when the value has actually changed', async () => {
    mockedUser.mockResolvedValue({ id: 'u1', userProfile: { goal: 'Lose Weight' } });
    const onData = jest.fn();
    track(subscribeToUser(onData));
    await flush();

    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await flush();
    expect(mockedUser).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenCalledTimes(1); // same value: no repeat

    mockedUser.mockResolvedValue({ id: 'u1', userProfile: { goal: 'Gain Weight' } });
    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await flush();
    expect(onData).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenLastCalledWith({ id: 'u1', userProfile: { goal: 'Gain Weight' } });
  });

  it('does not poll while the app is in the background', async () => {
    mockedUser.mockResolvedValue({ id: 'u1' });
    track(subscribeToUser(jest.fn()));
    await flush();

    AppState.currentState = 'background';
    jest.advanceTimersByTime(POLL_INTERVAL_MS * 3);
    await flush();
    expect(mockedUser).toHaveBeenCalledTimes(1);

    AppState.currentState = 'active';
    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await flush();
    expect(mockedUser).toHaveBeenCalledTimes(2);
  });

  it('reports a failed request, keeps polling, and recovers', async () => {
    mockedUser.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ id: 'u1' });
    const onData = jest.fn();
    const onError = jest.fn();

    track(subscribeToUser(onData, onError));
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onData).not.toHaveBeenCalled();

    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await flush();
    expect(onData).toHaveBeenCalledWith({ id: 'u1' });
  });

  it('stops polling once the last subscriber leaves', async () => {
    mockedUser.mockResolvedValue({ id: 'u1' });
    const unsubscribe = subscribeToUser(jest.fn());
    await flush();

    unsubscribe();
    jest.advanceTimersByTime(POLL_INTERVAL_MS * 5);
    await flush();

    expect(mockedUser).toHaveBeenCalledTimes(1);
  });

  it('starts fresh when someone subscribes again, instead of replaying a stale value', async () => {
    mockedUser.mockResolvedValueOnce({ id: 'u1', v: 1 }).mockResolvedValue({ id: 'u1', v: 2 });
    const first = subscribeToUser(jest.fn());
    await flush();
    first();

    const onData = jest.fn();
    track(subscribeToUser(onData));
    await flush();

    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith({ id: 'u1', v: 2 });
  });
});

describe('several subscribers to one topic', () => {
  it('share one request, and a late one gets the value it missed at once', async () => {
    mockedUser.mockResolvedValue({ id: 'u1' });
    const a = jest.fn();
    const b = jest.fn();

    track(subscribeToUser(a));
    track(subscribeToUser(b));
    await flush();
    expect(mockedUser).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledWith({ id: 'u1' });
    expect(b).toHaveBeenCalledWith({ id: 'u1' });

    const late = jest.fn();
    track(subscribeToUser(late));
    expect(late).toHaveBeenCalledWith({ id: 'u1' }); // immediately, without waiting for the network
    expect(mockedUser).toHaveBeenCalledTimes(1);
  });

  it('keep the topic alive until the last one leaves', async () => {
    mockedUser.mockResolvedValue({ id: 'u1' });
    const first = subscribeToUser(jest.fn());
    const second = track(subscribeToUser(jest.fn()));
    await flush();

    first();
    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await flush();
    expect(mockedUser).toHaveBeenCalledTimes(2); // still polling for the second

    second();
    jest.advanceTimersByTime(POLL_INTERVAL_MS * 3);
    await flush();
    expect(mockedUser).toHaveBeenCalledTimes(2);
  });

  it('keep separate days separate', async () => {
    mockedDay.mockImplementation(async (date: string) => ({ date }));
    const jan15 = jest.fn();
    const jan14 = jest.fn();

    track(subscribeToDailyLog('2026-01-15', jan15));
    track(subscribeToDailyLog('2026-01-14', jan14));
    await flush();

    expect(jan15).toHaveBeenCalledWith({ date: '2026-01-15' });
    expect(jan14).toHaveBeenCalledWith({ date: '2026-01-14' });
    expect(mockedDay).toHaveBeenCalledTimes(2);
  });
});

describe('a write made in the app refreshes the screen at once', () => {
  it("'user' refreshes the profile topic", async () => {
    mockedUser.mockResolvedValueOnce({ id: 'u1', v: 1 }).mockResolvedValue({ id: 'u1', v: 2 });
    const onData = jest.fn();
    track(subscribeToUser(onData));
    await flush();

    emitInvalidate('user');
    await flush();

    expect(onData).toHaveBeenLastCalledWith({ id: 'u1', v: 2 });
    expect(mockedUser).toHaveBeenCalledTimes(2);
  });

  it('a day refreshes only that day', async () => {
    mockedDay.mockImplementation(async (date: string) => ({ date, n: mockedDay.mock.calls.length }));
    track(subscribeToDailyLog('2026-01-15', jest.fn()));
    track(subscribeToDailyLog('2026-01-14', jest.fn()));
    await flush();
    mockedDay.mockClear();

    emitInvalidate('log:2026-01-15');
    await flush();

    expect(mockedDay).toHaveBeenCalledTimes(1);
    expect(mockedDay).toHaveBeenCalledWith('2026-01-15');
  });

  it("'logs' refreshes every day but not the profile", async () => {
    mockedDay.mockImplementation(async (date: string) => ({ date }));
    mockedUser.mockResolvedValue({ id: 'u1' });
    track(subscribeToDailyLog('2026-01-15', jest.fn()));
    track(subscribeToDailyLog('2026-01-14', jest.fn()));
    track(subscribeToUser(jest.fn()));
    await flush();
    mockedDay.mockClear();
    mockedUser.mockClear();

    emitInvalidate('logs');
    await flush();

    expect(mockedDay).toHaveBeenCalledTimes(2);
    expect(mockedUser).not.toHaveBeenCalled();
  });

  it('does nothing, and does not fail, when nobody is listening', async () => {
    expect(() => emitInvalidate('log:2026-02-01')).not.toThrow();
    expect(() => emitInvalidate('user')).not.toThrow();
    await flush();

    expect(mockedUser).not.toHaveBeenCalled();
    expect(mockedDay).not.toHaveBeenCalled();
  });

  it('asks once more when a change lands while a request is already out, so the answer is not stale', async () => {
    let release: (value: unknown) => void = () => undefined;
    mockedUser
      .mockImplementationOnce(() => new Promise((resolve) => (release = resolve)))
      .mockResolvedValue({ id: 'u1', v: 2 });
    const onData = jest.fn();
    track(subscribeToUser(onData));

    emitInvalidate('user'); // the first request has not answered yet
    release({ id: 'u1', v: 1 });
    await flush();
    await flush();

    expect(mockedUser).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenLastCalledWith({ id: 'u1', v: 2 });
  });
});
