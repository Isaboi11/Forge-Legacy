import { useSyncExternalStore } from 'react';

import { fetchConsents, recordConsent } from '@/data/consent-live';
import { createConsentGate, type ConsentSnapshot } from '@/domain/consent/gate';
import { isNutritionRoute, type ConsentKind } from '@/domain/consent/consent';

/**
 * THE APP'S ONE CONSENT GATE (Washington MHMDA / Nevada SB 370 — `domain/consent/consent.ts`).
 *
 *   ensureConsent('ai_sharing')  → every client call to an Anthropic-backed Edge Function awaits this
 *                                  first, in the data layer, so no screen can forget it. It resolves at
 *                                  once when consent is in place; otherwise it raises the sheet.
 *   ensureConsent('nutrition')   → the Nutrition tab, and every door into a nutrition screen from outside it.
 *   consentAllowsNow(kind)       → synchronous, never asks — for work nobody tapped (a chat summary).
 *   useConsent()                 → the live snapshot, for the tab's door and Settings.
 *
 * Not a React context on purpose: the data layer has to reach it, and a provider missing from a tree
 * must never be what lets a call through. The sheet itself is `ConsentHost`, mounted once at the root; with
 * no host mounted a prompt answers "Not now" — the safe side.
 */

type Prompter = (kind: ConsentKind) => Promise<boolean>;
let prompter: Prompter | null = null;
/** One sheet at a time: a second kind asked while the first is open waits for it. */
let queue: Promise<unknown> = Promise.resolve();

const gate = createConsentGate({
  load: fetchConsents,
  record: recordConsent,
  now: () => new Date().toISOString(),
  prompt: (kind) => {
    const next = queue.then(() => (prompter ? prompter(kind) : false)).catch(() => false);
    queue = next;
    return next;
  },
});

/** Called by `ConsentHost`. Returns the unregister. */
export function registerConsentPrompter(fn: Prompter): () => void {
  prompter = fn;
  return () => {
    if (prompter === fn) prompter = null;
  };
}

/**
 * A different athlete signed in, or nobody: forget the last one's answers. Told by `ConsentHost` from the
 * auth session, rather than subscribing here at import time — the web build renders statically, and a
 * module-level auth listener would run there too.
 */
let lastUser: string | null | undefined;
export function consentUserIs(uid: string | null): void {
  if (lastUser !== undefined && uid !== lastUser) gate.reset();
  lastUser = uid;
}

export const ensureConsent = (kind: ConsentKind): Promise<boolean> => gate.ensure(kind);
export const consentAllowsNow = (kind: ConsentKind): boolean => gate.allowsNow(kind);
/** Settings: withdraw. Honoured on this phone at once; resolves whether the server stored it. */
export const withdrawConsent = (kind: ConsentKind): Promise<boolean> => gate.answer(kind, 'withdrawn');
export const refreshConsents = (): Promise<void> => gate.refresh();
/** Start the read without waiting on it (a screen that wants the answer ready before it is needed). */
export const warmConsents = (): void => void gate.ready();

/**
 * Before pushing a route from OUTSIDE the Nutrition tab: a nutrition screen asks for the Nutrition consent
 * first, exactly as the tab does. Any other route answers true at once.
 */
export async function consentForRoute(path: string): Promise<boolean> {
  return isNutritionRoute(path) ? ensureConsent('nutrition') : true;
}

export function useConsent(): ConsentSnapshot {
  return useSyncExternalStore(gate.subscribe, gate.snapshot, gate.snapshot);
}

/** The result every AI data function returns when the athlete chose "Not now". Nothing was sent. */
export const NO_AI_CONSENT = { kind: 'no_consent' } as const;
export type NoAiConsent = typeof NO_AI_CONSENT;
