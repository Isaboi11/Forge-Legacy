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
  | { kind: 'failed'; headline: string; notCharged: boolean; canRetry: boolean }
  | { kind: 'out_of_credits'; headline: string }
  | { kind: 'offline'; headline: string; canRetry: boolean };

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
    case 'working':
      return [s.headline, s.detail].filter(Boolean).join(' ');
    case 'failed':
      return [s.headline, s.notCharged ? NOT_CHARGED : null].filter(Boolean).join(' ');
    default:
      return s.headline;
  }
}
