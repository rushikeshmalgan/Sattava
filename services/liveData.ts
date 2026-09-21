import { AppState } from 'react-native';
import type { DailyLogDoc, UserDoc } from '../types/data';
import { fetchCurrentUser, fetchDailyLog } from './dataApi';
import { onInvalidate, type Topic } from './dataEvents';

/**
 * "Live" data for the screens, without a database connection in the app.
 *
 * A subscription behaves like a database listener: you get the current value, then a new value only
 * when it actually changes. It refreshes on a slow poll while the app is in the foreground, and immediately after
 * any successful write made by this app (services/dataEvents.ts), so logging a meal still updates the screen at once.
 *
 * Subscribers to the same topic share one request. When the last one leaves, polling stops.
 */

export const POLL_INTERVAL_MS = 30_000;

export type Unsubscribe = () => void;

interface Subscriber<T> {
  onData: (value: T | null) => void;
  onError?: (error: unknown) => void;
}

interface LiveTopic<T> {
  subscribe(subscriber: Subscriber<T>): Unsubscribe;
  refresh(): Promise<void>;
}

function createTopic<T>(fetchValue: () => Promise<T | null>, onIdle: () => void): LiveTopic<T> {
  const subscribers = new Set<Subscriber<T>>();
  let timer: ReturnType<typeof setInterval> | undefined;
  let lastJson: string | undefined;
  let lastValue: T | null | undefined;
  let inflight = false;
  let again = false;

  const refresh = async (): Promise<void> => {
    if (inflight) {
      // A change arrived while a request was out: ask once more when it lands, so the answer is not stale.
      again = true;
      return;
    }
    inflight = true;
    try {
      const value = await fetchValue();
      const json = JSON.stringify(value);
      if (json !== lastJson) {
        lastJson = json;
        lastValue = value;
        for (const subscriber of [...subscribers]) subscriber.onData(value);
      }
    } catch (error) {
      for (const subscriber of [...subscribers]) subscriber.onError?.(error);
    } finally {
      inflight = false;
      if (again && subscribers.size > 0) {
        again = false;
        void refresh();
      }
    }
  };

  return {
    refresh,
    subscribe(subscriber) {
      subscribers.add(subscriber);
      // Someone already fetched this: hand it over now. A first fetch still in flight will reach this subscriber too.
      if (lastValue !== undefined) subscriber.onData(lastValue);

      // Only the first subscriber starts the polling and the first request; later ones share them.
      if (subscribers.size === 1) {
        timer = setInterval(() => {
          if (AppState.currentState === 'active') void refresh();
        }, POLL_INTERVAL_MS);
        void refresh();
      }

      return () => {
        subscribers.delete(subscriber);
        if (subscribers.size > 0) return;
        if (timer) clearInterval(timer);
        timer = undefined;
        lastJson = undefined;
        lastValue = undefined;
        again = false;
        onIdle();
      };
    },
  };
}

const topics = new Map<Topic, LiveTopic<never>>();

function topicFor<T>(key: Topic, fetchValue: () => Promise<T | null>): LiveTopic<T> {
  const existing = topics.get(key);
  if (existing) return existing as unknown as LiveTopic<T>;
  const created = createTopic(fetchValue, () => topics.delete(key));
  topics.set(key, created as unknown as LiveTopic<never>);
  return created;
}

// A write made anywhere in the app refreshes what is on screen at once.
onInvalidate((topic) => {
  if (topic === 'logs') {
    for (const [key, live] of topics) if (key.startsWith('log:')) void live.refresh();
    return;
  }
  void topics.get(topic)?.refresh();
});

/** The signed-in user's profile. `null` means it has not been created yet. */
export const subscribeToUser = (onData: (user: UserDoc | null) => void, onError?: (error: unknown) => void): Unsubscribe =>
  topicFor('user', fetchCurrentUser).subscribe({ onData, onError });

/** One day of the log (`YYYY-MM-DD`). `null` means nothing has been logged that day. */
export const subscribeToDailyLog = (
  date: string,
  onData: (day: DailyLogDoc | null) => void,
  onError?: (error: unknown) => void,
): Unsubscribe => topicFor(`log:${date}`, () => fetchDailyLog(date)).subscribe({ onData, onError });
