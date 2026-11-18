/**
 * ══ ONE AI STATE KIT (AI Road to 10 Sprint 3, UX-1) ══
 *
 * Every AI feature says the same five things, and used to say each its own way: it is WORKING (and, for a job in
 * steps, which step), it FAILED (and whether the credit came back — "Not charged."), the athlete is OUT OF CREDITS,
 * or the phone is OFFLINE. This is the one model; `components/forge/AiStatus.tsx` is the one look, both themes from
 * the shared tokens. Pure: no React, no network.
 */
import { NOT_CHARGED } from './ai-failure.ts';

export type AiStepState = 'done' | 'now' | 'waiting' | 'failed';

export interface AiStep {
  label: string;
  state: AiStepState;
}

export type AiStatus =
  | { kind: 'working'; headline: string; detail?: string | null; steps?: readonly AiStep[] }
  /* `detail` (Sprint 3b): the one line under the headline that says what happened or what to do. */
  | { kind: 'failed'; headline: string; detail?: string | null; notCharged: boolean; canRetry: boolean }
  | { kind: 'out_of_credits'; headline: string; detail?: string | null }
  | { kind: 'offline'; headline: string; detail?: string | null; canRetry: boolean };

/** What one photo of an import is doing right now (`readImportPhoto`'s `onStep`). */
export type ImportPhase = 'card' | 'layout';

const PHASE_WORDS: Record<ImportPhase, string> = {
  card: 'Reading the photo',
  layout: 'Laying it out',
};

/**
 * Reading N photos, one after another: a step per photo (done / now / waiting), and what the current one is doing.
 * One photo has no step row — "Reading your photo…" is the whole story.
 */
export function importProgress(total: number, current: number, phase: ImportPhase): AiStatus {
  const n = Math.max(1, Math.floor(total));
  const i = Math.min(Math.max(0, Math.floor(current)), n - 1);
  if (n === 1) return { kind: 'working', headline: 'Reading your photo…', detail: `${PHASE_WORDS[phase]}…` };
  return {
    kind: 'working',
    headline: `Reading photo ${i + 1} of ${n}…`,
    detail: `${PHASE_WORDS[phase]}…`,
    steps: Array.from({ length: n }, (_, k) => ({ label: `Photo ${k + 1}`, state: k < i ? 'done' : k === i ? 'now' : 'waiting' })),
  };
}

/** A meal photo: it looks at the plate, then finds each food in the catalogue — two steps, said as they happen. */
export function mealPhotoProgress(step: 'reading' | 'matching'): AiStatus {
  const reading = step === 'reading';
  return {
    kind: 'working',
    headline: reading ? 'Looking at your meal…' : 'Finding the foods…',
    steps: [
      { label: 'Look at the meal', state: reading ? 'now' : 'done' },
      { label: 'Find the foods', state: reading ? 'waiting' : 'now' },
    ],
  };
}

/**
 * A failure, said once: the line WITHOUT a trailing "Not charged." (the kit shows it as its own sub-line, so a line
 * that already carries it — `withNotCharged` — is not said twice).
 */
export function aiFailed(line: string, refunded: boolean | null | undefined, canRetry = true): AiStatus {
  const notCharged = !!refunded || line.includes(NOT_CHARGED);
  const headline = line.replace(NOT_CHARGED, '').trim();
  return { kind: 'failed', headline, notCharged, canRetry };
}

/** The words a screen reader hears for the kit — one sentence, the same order the eye reads. */
export function aiStatusA11y(s: AiStatus): string {
  switch (s.kind) {
    case 'failed':
      return [s.headline, s.detail, s.notCharged ? NOT_CHARGED : null].filter(Boolean).join(' ');
    default:
      return [s.headline, s.detail].filter(Boolean).join(' ');
  }
}

/* ══ SPRINT 3b (UX-1 rollout): workout write (card read + tidy), Kitchen, Holt's chat ══ */

/**
 * A failure, sorted into the kit's states: OUT OF CREDITS is its own state (a commercial one, not a fault, never
 * offered Try again); anything else is `aiFailed`'s — the line once, "Not charged." on its own line when refunded.
 */
export function aiProblem(line: string, o: { refunded?: boolean | null; outOfCredits?: boolean; canRetry?: boolean } = {}): AiStatus {
  if (o.outOfCredits) return { kind: 'out_of_credits', headline: line.replace(NOT_CHARGED, '').trim() };
  return aiFailed(line, o.refunded, o.canRetry ?? false);
}

/**
 * A workout card from a photo: it reads the card, then lays it out with AI (`workout-card-read`, then `workout-tidy`)
 * — two steps, said as they happen. `layout` is also the quiet pass every photo gets.
 */
export function cardReadProgress(step: 'reading' | 'layout'): AiStatus {
  const reading = step === 'reading';
  return {
    kind: 'working',
    headline: reading ? 'Reading your photo…' : 'Laying it out…',
    steps: [
      { label: 'Read the card', state: reading ? 'now' : 'done' },
      { label: 'Lay it out', state: reading ? 'waiting' : 'now' },
    ],
  };
}

/** A typed or pasted workout, fixed with AI ("Fix it with AI") — one step, so no step row. */
export const TIDY_WORKING: AiStatus = { kind: 'working', headline: 'Tidying it up with AI…' };

/**
 * Holt's chat's failure card (the `error` turn — the one place red appears in the chat) in the kit: its line, then
 * what happened and what to do as one detail line, then "Not charged." — once, whether the turn carries the flag
 * (`askOfflineCard`) or the words (`withNotCharged` in a sub). No Try again in the card: the chat's own Try again
 * chip sits under it and sends the same ask (C-D5).
 */
export function chatFailure(t: { text: string; sub?: string | null; action?: string | null; notCharged?: boolean }): AiStatus {
  const said = [t.sub, t.action].map((x) => (x ?? '').replace(NOT_CHARGED, '').trim()).filter(Boolean);
  const notCharged = !!t.notCharged || [t.text, t.sub, t.action].some((x) => (x ?? '').includes(NOT_CHARGED));
  return { kind: 'failed', headline: t.text.replace(NOT_CHARGED, '').trim(), detail: said.join(' ') || null, notCharged, canRetry: false };
}
