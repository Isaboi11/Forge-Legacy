/**
 * FORM CHECK — the APP's half of the rules: which moments of a clip to sample, the trim window, how a read
 * is laid out on screen, and what the function's answer means. The Edge Function never needs any of it.
 *
 * ⚠ SPLIT FROM `form-check.ts` SO THE FUNCTION'S DASHBOARD PASTE STAYS UNDER ~40 KB. The builder
 * (`scripts/build-coach-form-check-deploy.mjs`) inlines every module the function imports, whole, and the
 * Supabase editor cuts a paste off near 40 KB (`coach-form-check-source.test.mjs` holds the line). Adding
 * the design's trim, marks and coaching notes (09-25) took it to 43.8 KB. Everything the function uses —
 * caps, the guard, the parser — stays in `form-check.ts`; everything only the app uses lives here.
 *
 * Imports `form-check.ts` by its relative `.ts` path, as domain code must (`feedback_ts_only_alias_imports`:
 * `node --test` cannot resolve `@/`).
 */

import {
  capKnown,
  FORM_CLIP_MS,
  FORM_CLIP_SECONDS,
  FORM_FRAMES_DEFAULT,
  FORM_FRAMES_MAX,
  FORM_FRAMES_MIN,
  FORM_FRAMES_PER_SECOND,
  sanitizeFormRead,
  type FormRead,
  type FormView,
} from './form-check.ts';

/** A coaching record, as much of it as a form read needs. Field names are the library's own. */
export interface CoachingNotes {
  cueHierarchy?: unknown;
  commonMistakes?: unknown;
  mistakeCorrections?: unknown;
  rangeOfMotionNotes?: unknown;
  tempoGuidance?: unknown;
}

const strings = (v: unknown, n: number): string[] =>
  (Array.isArray(v) ? v : typeof v === 'string' ? [v] : [])
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .slice(0, n)
    .map((x) => x.replace(/\s+/g, ' ').trim());

/** The notes as the short reference block the function puts in the user turn. '' when there are none. */
export function knownFromCoaching(rec: CoachingNotes | null | undefined): string {
  if (!rec) return '';
  const parts: string[] = [];
  const cues = strings(rec.cueHierarchy, 4);
  if (cues.length) parts.push(`Cues: ${cues.join(' | ')}`);
  const mistakes = strings(rec.commonMistakes, 4);
  if (mistakes.length) parts.push(`Common mistakes: ${mistakes.join(' | ')}`);
  const fixes = strings(rec.mistakeCorrections, 4);
  if (fixes.length) parts.push(`Corrections: ${fixes.join(' | ')}`);
  const rom = strings(rec.rangeOfMotionNotes, 2);
  if (rom.length) parts.push(`Range of motion: ${rom.join(' | ')}`);
  const tempo = strings(rec.tempoGuidance, 1);
  if (tempo.length) parts.push(`Tempo: ${tempo[0]}`);
  return capKnown(parts.join('\n'));
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Which moments to sample
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** How far inside each end of the sampled window a frame may sit, as a fraction of it. */
const EDGE_INSET = 0.5;

/**
 * The timestamps to grab, in milliseconds, in time order.
 *
 * Evenly spaced across the sampled window, each frame sitting at the MIDDLE of its own slice rather than
 * on a boundary. That is not tidiness: a thumbnail at t=0 is the frame before anybody moved, and a
 * thumbnail at exactly the duration is past the last decodable frame on some encoders and comes back as
 * a black image or an error. Midpoints of N equal slices cannot land on either end, whatever N is.
 *
 * `count` is clamped into [{@link FORM_FRAMES_MIN}, {@link FORM_FRAMES_MAX}] and the window is clamped to
 * {@link FORM_CLIP_MS}, so a caller cannot ask for two frames or for a minute of video by passing a
 * bigger number. A duration that is missing, zero or nonsense is treated as a full-length clip — the
 * caller does not always know how long the file is, and guessing evenly is better than refusing.
 */
export function frameTimestamps(
  durationMs: unknown,
  count: number = FORM_FRAMES_DEFAULT,
  startMs?: number | null,
  endMs?: number | null,
): number[] {
  const n = Math.min(FORM_FRAMES_MAX, Math.max(FORM_FRAMES_MIN, Math.round(Number(count) || 0) || FORM_FRAMES_DEFAULT));
  const raw = typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs > 0 ? durationMs : FORM_CLIP_MS;
  const { start, end } = trimWindow(raw, startMs, endMs);
  const slice = (end - start) / n;
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) out.push(Math.round(start + slice * (i + EDGE_INSET)));
  return out;
}

/** The shortest window the trim handles may close to — a single rep of anything. */
export const FORM_TRIM_MIN_MS = 1000;

/**
 * The part of the clip that is read: the athlete's trim, made valid. Inside the clip, at least
 * {@link FORM_TRIM_MIN_MS} long, at most {@link FORM_CLIP_MS} long (a longer trim keeps its START — the
 * athlete dragged the left handle there on purpose — and is cut at the far end).
 */
export function trimWindow(durationMs: number, startMs?: number | null, endMs?: number | null): { start: number; end: number } {
  const dur = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : FORM_CLIP_MS;
  let start = typeof startMs === 'number' && Number.isFinite(startMs) ? Math.max(0, Math.min(startMs, dur)) : 0;
  let end = typeof endMs === 'number' && Number.isFinite(endMs) ? Math.max(0, Math.min(endMs, dur)) : dur;
  if (end - start < FORM_TRIM_MIN_MS) {
    end = Math.min(dur, start + FORM_TRIM_MIN_MS);
    start = Math.max(0, end - FORM_TRIM_MIN_MS);
  }
  if (end - start > FORM_CLIP_MS) end = start + FORM_CLIP_MS;
  return { start, end };
}

/**
 * How many stills to read from a window: {@link FORM_FRAMES_PER_SECOND} a second, never fewer than eight
 * (a short trim is usually ONE rep the athlete cares about, so it is read densely) and never more than
 * {@link FORM_FRAMES_MAX}.
 */
export function formFrameCount(windowMs: number): number {
  const secs = Number.isFinite(windowMs) && windowMs > 0 ? windowMs / 1000 : FORM_CLIP_SECONDS;
  return Math.min(FORM_FRAMES_MAX, Math.max(8, Math.ceil(secs * FORM_FRAMES_PER_SECOND)));
}

/** Is the clip longer than the window we read? (What {@link formClipNotice} answers in words.) */
export function clipIsLong(durationMs: unknown): boolean {
  return typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs > FORM_CLIP_MS + 500;
}

/**
 * What to tell the athlete about a clip longer than the window, or null when there is nothing to say.
 *
 * ⚠ SAID BEFORE THE READ, NOT AFTER. "I read the first ten seconds" is useful while they can still refilm;
 * attached to the answer it reads as an excuse for it.
 */
export function formClipNotice(durationMs: unknown): string | null {
  if (!clipIsLong(durationMs)) return null;
  return `That clip is longer than I need — I'll read the first ${FORM_CLIP_SECONDS} seconds of it.`;
}

/** "Front view", "Side view"… for the read's meta line. Empty for an unknown view. */
export function viewLabel(view: FormView | null | undefined): string {
  switch (view) {
    case 'side':
      return 'Side view';
    case 'front':
      return 'Front view';
    case 'behind':
      return 'From behind';
    case 'diagonal':
      return 'Diagonal view';
    default:
      return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// What Holt says
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** When there is no read. Not an apology and not a verdict on the athlete — just what to do next. */
export const FORM_NO_READ =
  "I couldn't make out the lift in that one. Any angle works; get your whole body in frame with some light on it, film it again, and I'll look.";

/**
 * 06b — the form check's own stop line when a note mentions pain (`Coach Holt Form Check.dc.html`). The
 * PO wrote it for this screen: it says why the READ stops (a form check cannot look at pain) and where to
 * go instead. Crisis / urgent / care keep the chat's routes word for word.
 */
export const FORM_MEDICAL_STOP =
  'Pain is outside what a form check can look at. Have a doctor or physiotherapist check it before you load this lift again.';

/**
 * The closing lines Holt falls back on when the model's `encourage` was missing or the guard dropped it.
 *
 * ⚠ SCRIPTED, FIXED, AND HELD TO THE SAME GUARD BY A TEST — this is not the guard writing a sentence (it
 * still only drops); it is the summary refusing to end a read on a fault. Belief plus a next step, no
 * exclamation mark, nothing about the body, nothing that sounds like a verdict. Chosen by the read's own
 * text rather than at random, so the same read always closes the same way.
 */
export const FORM_ENCOURAGE_FALLBACK = [
  "That's a good base to build on. Film the next heavy set and we'll see it tighten up.",
  'Keep your warm-ups this deliberate and the heavy sets follow. Send me the next one.',
  'One cue at a time is how this gets better. Take it into the next set and film it.',
] as const;

/** The fallback when nothing looked good — almost always a clip Holt could not read. About the next clip. */
export const FORM_ENCOURAGE_REFILM = "Every clip makes the next read sharper. Film another set when you're ready.";

/** The eyebrow over each part of the read. Uppercase in the source so the plain-text form reads the same. */
export const FORM_LABEL_GOOD = "WHAT'S WORKING";
export const FORM_LABEL_FIX_ONE = 'ONE THING TO CLEAN UP';
export const FORM_LABEL_FIX_TWO = 'TWO THINGS TO CLEAN UP';
export const FORM_LABEL_CUE = 'NEXT SET';

/** One part of the read: an eyebrow (or none, for the closing line) and the sentences under it. */
export interface FormSection {
  kind: 'good' | 'fix' | 'cue' | 'encourage' | 'none';
  label: string | null;
  lines: string[];
}

/** The read as the screen draws it: which lift, then the parts in order. */
export interface FormCheckView {
  lift: string;
  sections: FormSection[];
}

/** "The bar drifts…" → "the bar drifts…" after "First, ". Leaves "I", "RDL" and "Romanian" alone. */
function lowerLead(s: string): string {
  return /^[A-Z][a-z]/.test(s) && !/^(I|I'm|I'd|I've)\b/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}

function fallbackEncourage(read: FormRead): string {
  if (!read.looksGood.length) return FORM_ENCOURAGE_REFILM;
  const seed = `${read.lift}|${read.fix.join('|')}|${read.cue}`;
  let n = 0;
  for (let i = 0; i < seed.length; i += 1) n = (n + seed.charCodeAt(i)) % 9973;
  return FORM_ENCOURAGE_FALLBACK[n % FORM_ENCOURAGE_FALLBACK.length];
}

/**
 * The read as Holt says it, in four parts, always in this order: what's working, what to clean up, the
 * cue for the next set, and a closing line.
 *
 * ⚠ LABELS ARE HERE ON PURPOSE, OVERRIDING THE EARLIER NO-LABELS CHOICE (PO, 2026-09-25). The first
 * version followed Holt-Voice-Amendment-001's "no labels" literally, and the PO found the result *"a
 * little confusing"* — praise, fixes and the cue ran together as unmarked grey lines and he could not tell
 * at a glance which was which. So each part now has a short eyebrow. Everything else in the voice rule
 * still holds: plain text, no markdown, short sentences someone can read between sets.
 *
 * The fix order is the model's, which the prompt requires to be biggest first, and `sanitizeFormRead`
 * preserves. With two, "First," and "Then," make the order audible; with one, the label says "ONE THING"
 * (the old line said "the one thing I'd change" even when there were two).
 *
 * The closing line is never missing: the model's `encourage` when it survived the guard, otherwise a
 * scripted one ({@link FORM_ENCOURAGE_FALLBACK}). A read that ends on a fault is the thing the PO asked
 * to stop.
 */
export function formCheckSummary(read: FormRead | null | undefined): FormCheckView {
  const none: FormCheckView = { lift: '', sections: [{ kind: 'none', label: null, lines: [FORM_NO_READ] }] };
  if (!read || (!read.looksGood.length && !read.fix.length && !read.cue)) return none;
  const sections: FormSection[] = [];

  if (read.looksGood.length) sections.push({ kind: 'good', label: FORM_LABEL_GOOD, lines: [...read.looksGood] });

  if (read.fix.length === 1) {
    sections.push({ kind: 'fix', label: FORM_LABEL_FIX_ONE, lines: [read.fix[0]] });
  } else if (read.fix.length >= 2) {
    sections.push({
      kind: 'fix',
      label: FORM_LABEL_FIX_TWO,
      lines: [`First, ${lowerLead(read.fix[0])}`, `Then, ${lowerLead(read.fix[1])}`],
    });
  }

  if (read.cue) sections.push({ kind: 'cue', label: FORM_LABEL_CUE, lines: [`Think: "${read.cue.replace(/^["“']|["”']$/g, '')}"`] });

  const said = typeof read.encourage === 'string' ? read.encourage.trim() : '';
  sections.push({ kind: 'encourage', label: null, lines: [said || fallbackEncourage(read)] });
  return { lift: read.lift.trim(), sections };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The wire
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What a form check came back as, in the app's words — the same split `photo-read-result.ts` makes, and
 * for the reason the coach brief §6 gives: *"offline and error must be visibly different from a
 * refusal."* Three things that look identical to someone holding a phone feel very different once they
 * are told which one happened.
 */
export type FormCheckResult =
  | { kind: 'ok'; read: FormRead; remaining: number | null }
  /** The code guard stopped it before the model and before any credit. The chat has copy for each route. */
  | { kind: 'stopped'; route: 'crisis' | 'urgent' | 'care' | 'medical_stop' }
  /**
   * We looked at the frames and could not read the lift in them. A better clip may work.
   * `charged` is false when the function said so (0221 onward: only a readable read spends). A function
   * deployed before that does not say, and did charge — so absence reads as true, and the screen only
   * promises "Not charged." when it is.
   */
  | { kind: 'unreadable'; charged: boolean }
  /** The frames were not usable as a request at all — only reachable if the device resize was skipped. */
  | { kind: 'bad_frames' }
  /** The month's credits are gone. A commercial state, not a verdict on the set. */
  | { kind: 'out_of_credits'; remaining: number; allowance: number }
  /** No Premium AI on this account — 0203's gate answers with an allowance of 0, which is not a used-up month. */
  | { kind: 'not_entitled' }
  /** This build cannot pull frames out of a video (see `form-check-live.ts`). Not a failure of the clip. */
  | { kind: 'unavailable_here' }
  /** We reached the server and IT failed — no key, meter down, model error. Not the athlete's connection. */
  | { kind: 'unavailable' }
  /** The app failed. Never conflated with the two above. */
  | { kind: 'offline' };

/** The function's JSON body — from a 200 or a non-2xx alike — as a result. */
export function formResultFrom(body: unknown, lift?: string, frameCount?: number): FormCheckResult {
  if (!body || typeof body !== 'object') return { kind: 'unavailable' };
  const d = body as {
    ok?: boolean;
    read?: unknown;
    route?: string;
    reason?: string;
    remaining?: number;
    allowance?: number;
    charged?: boolean;
  };

  if (d.route === 'crisis' || d.route === 'urgent' || d.route === 'care' || d.route === 'medical_stop') {
    return { kind: 'stopped', route: d.route };
  }

  if (d.ok) {
    // ⚠ THE GUARD RUNS ON THIS END TOO. The function already sanitised; doing it again costs nothing and
    // means a stale deployment of the function cannot put a medical sentence on the screen of a current
    // build. Same reason `coach-ask` re-trims history the app already trimmed: a peer is not a boundary.
    const read = sanitizeFormRead(d.read, lift, frameCount);
    if (!read) return { kind: 'unreadable', charged: true };
    return { kind: 'ok', read, remaining: typeof d.remaining === 'number' ? d.remaining : null };
  }

  switch (d.reason) {
    case 'unreadable':
      return { kind: 'unreadable', charged: d.charged !== false };
    case 'bad_request':
    case 'too_large':
      return { kind: 'bad_frames' };
    case 'out_of_credits':
      if (!d.allowance) return { kind: 'not_entitled' };
      return { kind: 'out_of_credits', remaining: d.remaining ?? 0, allowance: d.allowance };
    default:
      // `unconfigured`, `meter_unavailable`, `upstream_error`, `upstream_unreachable`, or a reason this
      // build has never heard of. The server failed, and none of that is a statement about the set.
      return { kind: 'unavailable' };
  }
}
