import { kv } from './kv';
import { useSyncExternalStore } from 'react';

const KEY = 'kairo.onboarding.v1';

export type OnboardingState = {
  completed: boolean;
  joinsMeetings: boolean | null;
  notifications: 'granted' | 'provisional' | 'denied' | 'skipped' | null;
  calendar: 'granted' | 'denied' | 'skipped' | null;
  testReminder: 'joined' | 'delivered' | 'skipped' | null;
};

const initial: OnboardingState = {
  completed: false,
  joinsMeetings: null,
  notifications: null,
  calendar: null,
  testReminder: null,
};

function read(): OnboardingState {
  try {
    const raw = kv.get(KEY);
    return raw ? { ...initial, ...JSON.parse(raw) } : initial;
  } catch {
    return initial;
  }
}

let state = read();
const listeners = new Set<() => void>();

export function getOnboarding(): OnboardingState {
  return state;
}

export function updateOnboarding(patch: Partial<OnboardingState>) {
  state = { ...state, ...patch };
  try {
    kv.set(KEY, JSON.stringify(state));
  } catch {
    // Keep the in-memory value; onboarding must never block on storage.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useOnboarding(): OnboardingState {
  return useSyncExternalStore(subscribe, getOnboarding, getOnboarding);
}
