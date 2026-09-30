/**
 * Feedback — copy and validation, pure.
 *
 * The screen (`src/app/feedback.tsx`) renders this; the data layer (`src/data/feedback-live.ts`) sends
 * it. Nothing here touches Supabase, React or `@/` — a runtime `@/` import breaks `node --test`, so
 * domain modules import relatively or not at all.
 *
 * ⚠ THE VALIDATION HERE IS A COURTESY, NOT THE RULE. `feedback`'s CHECK constraints and its rate-limit
 *   trigger (migration 0167) are the real limits. This exists so an athlete is told "that's too long"
 *   while typing rather than by a database error after tapping Send. If the two ever disagree, the
 *   database is right and this file is stale.
 */

export type FeedbackKind = 'BUG' | 'SUGGESTION' | 'PRAISE' | 'OTHER';

/**
 * The four buckets, in the order they are offered.
 *
 * "Something's broken" leads because it is the most urgent and the most common reason somebody goes
 * looking for a feedback form at all. Praise is included deliberately — not for the ego, but because a
 * channel that only accepts complaints teaches people it is a complaints channel, and the message that
 * begins "I love X, but…" is the most useful one there is.
 *
 * ⚠ Wire values are UPPERCASE and must match 0167's CHECK constraint exactly. The labels are free to
 *   change; the `key`s are not.
 */
export const FEEDBACK_KINDS: readonly {
  key: FeedbackKind;
  label: string;
  hint: string;
}[] = [
  { key: 'BUG', label: 'Something’s broken', hint: 'Tell us what you expected and what happened instead.' },
  { key: 'SUGGESTION', label: 'I have an idea', hint: 'What would you like the app to do?' },
  { key: 'PRAISE', label: 'Something’s good', hint: 'What’s working? It tells us what not to break.' },
  { key: 'OTHER', label: 'Something else', hint: 'Anything that doesn’t fit the others.' },
];

/** Mirrors 0167's `length(btrim(body)) between 1 and 2000`. */
export const BODY_MAX = 2000;

/**
 * The shortest message worth a person's time (settings-12, QA 09-26).
 *
 * The form took "hi" and said *"Thank you — that reached us."* — and it had: a two-letter row on the CRM
 * Bugs board that somebody has to open, read and close. Ten characters is about two short words ("app
 * crashed", "love the PRs"), so it turns away a greeting without turning away a terse report.
 *
 * ⚠ STRICTER THAN THE DATABASE ON PURPOSE. 0167 allows 1; this is the courtesy half described in the
 * header, and the column stays the rule. Nothing server-side changes and no migration is needed.
 */
export const BODY_MIN = 10;

export const FEEDBACK_COPY = {
  title: 'Send Feedback',
  intro:
    'A real person reads every message. Tell us what happened and we’ll get back to you — usually within a couple of days.',
  bodyLabel: 'Your message',
  bodyPlaceholder: 'What happened, and what did you expect instead?',
  contactLabel: 'You can reply to me about this',
  /*
   * ⚠ NAMES WHAT IS ATTACHED, BEFORE IT IS SENT. `site/privacy.html` §2 "Support messages and feedback"
   *   discloses that the screen, app version and platform ride along. A disclosure only somebody who
   *   reads the policy ever sees is a worse disclosure than one sentence at the point of collection.
   */
  attachNote: 'We attach your app version and your device type, so we can reproduce the problem.',
  /*
   * ⚠ ONLY WHEN IT IS TRUE (settings-12). This sentence used to be the only one, and the screen was never
   *   attached: the one way in is the Settings row, which carries no `?from=`, so `screen` was null on
   *   every row ever filed. A disclosure that names something we do not collect is as wrong as one that
   *   omits something we do. A screen that links here WITH its route gets this line; everything else
   *   gets `attachNote`. `feedbackAttachNote` picks.
   */
  attachNoteWithScreen:
    'We attach the screen you were on, your app version and your device type, so we can reproduce the problem.',
  send: 'Send',
  sending: 'Sending…',
  sent: 'Thank you — that reached us.',
  emailFallback: 'Or email support@forgelegacy.app',
} as const;

export type FeedbackDraft = {
  kind: FeedbackKind | null;
  body: string;
  contactOk: boolean;
};

export type FeedbackProblem = 'no_kind' | 'empty' | 'too_short' | 'too_long';

/**
 * What is wrong with this draft, or null if it can be sent.
 *
 * Returns the FIRST problem rather than a list: the screen shows one message under one field, and an
 * athlete who has picked nothing and typed nothing does not need to be told twice.
 */
export function feedbackProblem(draft: FeedbackDraft): FeedbackProblem | null {
  if (draft.kind == null) return 'no_kind';
  const trimmed = draft.body.trim();
  if (trimmed.length === 0) return 'empty';
  if (trimmed.length < BODY_MIN) return 'too_short';
  if (trimmed.length > BODY_MAX) return 'too_long';
  return null;
}

export function canSendFeedback(draft: FeedbackDraft): boolean {
  return feedbackProblem(draft) === null;
}

/** The sentence shown for a problem. `null` renders nothing, which is the state before first submit. */
export function feedbackProblemMessage(problem: FeedbackProblem | null): string | null {
  switch (problem) {
    case 'no_kind':
      return 'Pick what kind of message this is.';
    case 'empty':
      return 'Add a message so we know what to look at.';
    case 'too_short':
      return 'Add a little more — a sentence about what happened is enough for us to act on.';
    case 'too_long':
      return `That’s longer than ${BODY_MAX} characters. Trim it a little, or email us instead.`;
    default:
      return null;
  }
}

/** Which disclosure line is true for this send: the screen is named only when one is actually attached. */
export function feedbackAttachNote(screen: string | null | undefined): string {
  return screen && screen.trim() ? FEEDBACK_COPY.attachNoteWithScreen : FEEDBACK_COPY.attachNote;
}

/**
 * ⚠ THE ONE PLACE A RATE-LIMIT REFUSAL IS TURNED INTO ENGLISH.
 *
 * 0167's trigger raises `P0001` with a human sentence rather than returning quietly, because a support
 * form that says "sent" and drops the message is the single worst failure this screen can have. The
 * database's own text is used when we have it — it already reads as a sentence — and anything else
 * falls back to something that does not blame the athlete for our outage.
 */
export function feedbackSendError(e: unknown): string {
  const err = e as { code?: string; message?: string } | null;
  if (err?.code === 'P0001' && err.message) return err.message;
  if (err?.code === 'PGRST205' || err?.code === 'PGRST202') {
    return 'Feedback isn’t switched on yet. Please email support@forgelegacy.app.';
  }
  return 'That didn’t send. Check your connection and try again, or email support@forgelegacy.app.';
}
