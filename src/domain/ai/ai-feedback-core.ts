/**
 * ══ "WAS THAT HELPFUL?" — ONE VOTE PER AI ANSWER (AI Road to 10, Sprint 1 — PL-4; migration 0269) ══
 *
 * Every later quality gate in the plan ("≥ 85% thumbs-up from paying users", Holt chat ⑤) needs a signal from
 * real people, and there was none. Each AI answer gets two quiet controls — Helpful / Not helpful — and the
 * vote lands in `ai_feedback`, one row per athlete per output (`feature` + `ref`). A second tap on the OTHER
 * one changes the vote; a vote is never withdrawn (the table has no delete, on purpose: a changed mind is
 * signal, an empty one is not).
 *
 * Pure and import-free: `node --test` runs it, and the component (`components/forge/AiFeedback.tsx`) and the
 * data module (`data/ai-feedback-live.ts`) both read it.
 */

/** What produced the answer. ⚠ Must equal `ai_feedback_feature_check` in 0269 (a test compares them). */
export type AiFeedbackFeature =
  | 'chat'
  | 'kitchen'
  | 'meal_photo'
  | 'form_check'
  | 'import'
  | 'author'
  | 'interpret'
  | 'recipe_photo';

export const AI_FEEDBACK_FEATURES: readonly AiFeedbackFeature[] = [
  'chat',
  'kitchen',
  'meal_photo',
  'form_check',
  'import',
  'author',
  'interpret',
  'recipe_photo',
];

/** How the AI health page names each one. */
export const AI_FEEDBACK_FEATURE_LABEL: Readonly<Record<AiFeedbackFeature, string>> = {
  chat: 'Holt chat',
  kitchen: 'Kitchen dishes',
  meal_photo: 'Meal photo',
  form_check: 'Form check',
  import: 'Photo import',
  author: 'Holt-written program',
  interpret: 'Typed to Holt',
  recipe_photo: 'Recipe photo',
};

export type AiRating = 1 | -1;

/** The two labels — what is on the control AND what VoiceOver reads. */
export const HELPFUL_LABEL = 'Helpful';
export const NOT_HELPFUL_LABEL = 'Not helpful';
export const AI_FEEDBACK_PROMPT = 'Was this helpful?';
/** Said under the controls when the vote did not save. The selection goes back to what was saved. */
export const AI_FEEDBACK_FAILED_LINE = 'Couldn’t send that. Tap again.';

/** ⚠ Mirrors `ai_feedback_ref_check` in 0269: 1–120 characters of letters, digits, `_ . : -`. */
const REF_PATTERN = /^[A-Za-z0-9_.:-]{1,120}$/;

export function isAiRef(ref: unknown): ref is string {
  return typeof ref === 'string' && REF_PATTERN.test(ref);
}

/**
 * The ref for an answer that has no server id — made ONCE per output, from the instant its chat turn was
 * stamped (`at`, epoch ms, set when the turn is appended and kept with the thread). Null when there is no stamp
 * (a thread stored before v2), and then no control is drawn rather than one that could collide.
 */
export function turnRef(kind: 'chat' | 'kitchen' | 'author', at: number | null | undefined): string | null {
  if (typeof at !== 'number' || !Number.isFinite(at) || at <= 0) return null;
  return `${kind}-${Math.round(at)}`;
}

// ── The control's state ──────────────────────────────────────────────────────────────────────────────────

export interface AiFeedbackState {
  /** What the database holds, as far as this control knows. */
  vote: AiRating | null;
  /** A write in flight. One at a time. */
  pending: AiRating | null;
  /** The last write failed — the line under the controls says so. */
  failed: boolean;
}

export const AI_FEEDBACK_IDLE: AiFeedbackState = { vote: null, pending: null, failed: false };

export type AiFeedbackEvent =
  | { type: 'tap'; rating: AiRating }
  | { type: 'saved'; rating: AiRating }
  | { type: 'failed'; rating: AiRating };

/** Whether a tap on `rating` starts a write: nothing in flight, and it is not the vote already saved. */
export function aiFeedbackWrites(s: AiFeedbackState, rating: AiRating): boolean {
  return s.pending == null && s.vote !== rating;
}

export function aiFeedbackStep(s: AiFeedbackState, e: AiFeedbackEvent): AiFeedbackState {
  switch (e.type) {
    case 'tap':
      return aiFeedbackWrites(s, e.rating) ? { vote: s.vote, pending: e.rating, failed: false } : s;
    case 'saved':
      return s.pending === e.rating ? { vote: e.rating, pending: null, failed: false } : s;
    case 'failed':
      return s.pending === e.rating ? { vote: s.vote, pending: null, failed: true } : s;
  }
}

/** The one drawn as chosen: the vote being sent (optimistic), else the one saved. */
export function shownVote(s: AiFeedbackState): AiRating | null {
  return s.pending ?? s.vote;
}

/** What each control tells VoiceOver. */
export function aiFeedbackA11y(s: AiFeedbackState, rating: AiRating): { label: string; selected: boolean; busy: boolean } {
  return {
    label: rating === 1 ? HELPFUL_LABEL : NOT_HELPFUL_LABEL,
    selected: shownVote(s) === rating,
    busy: s.pending === rating,
  };
}
