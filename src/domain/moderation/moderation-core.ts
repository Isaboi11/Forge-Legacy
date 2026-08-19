/**
 * REPORTING AND BLOCKING — the pure half.
 *
 * ══ WHY THIS EXISTS AT ALL ══
 *
 * App Store Review Guideline 1.2 requires an app carrying user-generated content to offer filtering,
 * reporting **with timely response**, blocking, and published contact details. Forge had the last of those
 * and one Report control that showed a toast reading *"Reporting a squad is coming soon"*. This is the
 * vocabulary the rest of the feature is built from — kept pure so the copy rules can be tested without a
 * store, a session or a screen.
 */

/** What can be reported. Mirrors `0171`'s `content_reports.target_kind` check constraint exactly. */
export type ReportTargetKind = 'post' | 'comment' | 'checkin' | 'athlete' | 'squad';

/** Why. Mirrors `0171`'s `reason` check constraint exactly. */
export type ReportReason =
  | 'abuse'
  | 'harassment'
  | 'spam'
  | 'nudity'
  | 'violence'
  | 'impersonation'
  | 'other';

export const REPORT_REASONS: readonly ReportReason[] = [
  'harassment',
  'abuse',
  'nudity',
  'violence',
  'spam',
  'impersonation',
  'other',
];

/**
 * ⚠ THE ORDER ABOVE IS THE ORDER SHOWN, AND IT IS NOT THE SQL ORDER.
 *
 * `harassment` is first because it is what a person reaching this sheet is most often actually
 * experiencing, and a reporter scanning a list under stress should find their reason in the first line
 * rather than the last. `other` is last because a list that opens with an escape hatch collects escape
 * hatches — and an `other` report costs an operator far more to triage than a categorised one.
 */

/** What each reason says on the sheet. Plain, and deliberately not euphemistic. */
export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  harassment: 'Harassment or bullying',
  abuse: 'Hate speech or abuse',
  nudity: 'Nudity or sexual content',
  violence: 'Violence or threats',
  spam: 'Spam or a scam',
  impersonation: 'Pretending to be someone else',
  other: 'Something else',
};

/** What each target is called when the sheet names what is being reported. */
export const REPORT_TARGET_LABEL: Record<ReportTargetKind, string> = {
  post: 'post',
  comment: 'comment',
  checkin: 'check-in',
  athlete: 'person',
  squad: 'squad',
};

export function isReportReason(value: unknown): value is ReportReason {
  return typeof value === 'string' && (REPORT_REASONS as readonly string[]).includes(value);
}

export function isReportTargetKind(value: unknown): value is ReportTargetKind {
  return (
    value === 'post' || value === 'comment' || value === 'checkin' || value === 'athlete' || value === 'squad'
  );
}

/** `content_reports.note` is free text and stays that way — see `0171`'s comment on the column. */
export const REPORT_NOTE_MAX = 1000;

/**
 * A note is optional except on `other`.
 *
 * ⚠ THE ONE REQUIRED FIELD IN THE WHOLE FLOW, AND IT IS REQUIRED FOR THE OPERATOR'S SAKE. An `other`
 * report with no note is a row saying "something was wrong somewhere" — unactionable, and it still has to
 * be read and closed by a person. Every other reason carries its meaning in the reason itself.
 */
export function reportNoteRequired(reason: ReportReason): boolean {
  return reason === 'other';
}

export function canSubmitReport(reason: ReportReason | null, note: string): boolean {
  if (reason == null) return false;
  if (reportNoteRequired(reason) && note.trim().length === 0) return false;
  return note.length <= REPORT_NOTE_MAX;
}

/**
 * What the athlete is told after a report is filed.
 *
 * ⚠ IT PROMISES REVIEW, NOT AN OUTCOME. "We'll take it down" is a promise made before anyone has looked,
 * and it is the promise a reporter will hold the product to. Guideline 1.2 asks for *timely responses to
 * concerns*, which this sentence commits to and `content_reports.status` is the mechanism for.
 */
export const REPORT_SENT_MESSAGE = 'Report sent. We’ll review it.';

/**
 * The confirmation shown before blocking.
 *
 * ══ ⚠ EVERY CLAUSE HERE IS ENFORCED SOMEWHERE, AND THAT IS THE RULE FOR EDITING IT ══
 *
 * · "won't see each other" — `0171` §2's four RESTRICTIVE policies, plus §2b's four predicates in
 *   `friends_feed`. Symmetric, because `is_blocked()` tests both directions.
 * · "removed from your friends" — `block_athlete()` deletes the `friendships` row in the same transaction.
 * · "stay in the squad" — the PO decision of 2026-08-19: a squad is a third party's space, so neither is
 *   ejected. Saying it up front stops the block reading as broken when the person is still in the roster.
 *
 * ⛔ Do not add a clause this list cannot point at. The failure this whole pass exists to correct was a
 *    control that described something the app did not do.
 */
export function blockConfirmBody(name: string): string {
  return `You and ${name} won’t see each other’s posts, comments or check-ins. They’ll be removed from your friends, and they won’t be told. If you’re in a squad together you’ll both stay in it — you just won’t see each other.`;
}

export const BLOCK_CONFIRM_TITLE = 'Block this person?';
export const UNBLOCK_CONFIRM_TITLE = 'Unblock this person?';

/**
 * ⚠ SAYS THE FRIENDSHIP DOES NOT COME BACK. `unblock_athlete()` deliberately does not restore it — a
 * relationship silently reinstated by lifting a block is one nobody consented to twice — and an athlete
 * who expects their friend back and does not get them will read that as a bug.
 */
export const UNBLOCK_CONFIRM_BODY =
  'You’ll be able to see each other again. You won’t be friends again — you can send a new request if you want to be.';

/** Empty-state copy for the blocked list in Settings. */
export const NO_BLOCKS_MESSAGE = 'You haven’t blocked anyone.';
