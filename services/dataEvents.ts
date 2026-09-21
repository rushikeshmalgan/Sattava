/**
 * A tiny in-process signal: "this data just changed on the server". Every successful write announces it, and the
 * live subscriptions (services/liveData.ts) refresh straight away instead of waiting for their next poll.
 *
 * It has no imports on purpose: the data API emits, the live layer listens, and neither needs the other.
 */

/** 'user' is the profile; `log:YYYY-MM-DD` is one day; 'logs' means every day at once (for example demo data). */
export type Topic = 'user' | 'logs' | `log:${string}`;

type Listener = (topic: Topic) => void;

const listeners = new Set<Listener>();

export const onInvalidate = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitInvalidate = (topic: Topic): void => {
  for (const listener of [...listeners]) listener(topic);
};
