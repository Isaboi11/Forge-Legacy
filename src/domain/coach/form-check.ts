/**
 * FORM CHECK — the frames, the caps, and the guard that stands between a model and a medical sentence.
 *
 * ══ WHAT THIS IS ══
 *
 * An athlete films a set, the app pulls a handful of stills out of the clip, and Holt says what he sees
 * about the TECHNIQUE. `CA-D5` gives the job its cost ceiling (*"form check 900"* output tokens) and its
 * device rule (*"photos resized on the device — downscale to the size the model would reduce it to
 * anyway"*). This module holds every decision in that sentence that does not need a camera: which
 * timestamps to sample, how many frames and how big, what shape the answer has, and what is not allowed
 * to survive in it.
 *
 * Pure and import-free on purpose. The Edge Function (`supabase/functions/coach-form-check/index.ts`)
 * imports it and has it inlined into its dashboard paste copy; the app imports it through
 * `src/data/form-check-live.ts`; `node --test` runs it as-is. Three consumers, one set of rules, no drift.
 * Import-free is a hard requirement, not a style: `scripts/build-coach-form-check-deploy.mjs` refuses to
 * inline a module that has imports of its own, and `@/` is type-only in domain code anyway.
 *
 * ══ ⛔ THE LEGAL LINE, AND WHY IT IS CODE ══
 *
 * PO, 2026-09-22: *"stay away from anything that would get us into legal trouble."* For this feature that
 * means a very short list of things Holt may talk about — bar path, brace, depth, joint timing, bar
 * position, tempo — and a much more important list of things he may not:
 *
 *   · He never diagnoses anything.
 *   · He never mentions pain or an injury, even to be reassuring. *"That shouldn't hurt"* is a medical
 *     claim wearing a coach's voice.
 *   · He never comments on the athlete's body, physique, weight or appearance.
 *   · He never calls a lift safe, and never calls one dangerous for them.
 *   · He never puts a number on their max.
 *
 * The system prompt says all of that. **The prompt is a request.** `sanitizeFormRead()` below is the
 * boundary: it runs AFTER the model answers, on the model's own words, and DROPS every sentence that
 * crosses the line. It is the same posture `photo-transcript.ts` states for the photo importer (*"the
 * function cannot describe a body because it has no channel that carries a sentence"*) and the same one
 * `medical-routing.ts` states for the chat. A model that ignores the whole prompt cannot get a diagnosis
 * onto the screen, because the only route to the screen deletes it.
 *
 * ⚠ AND IT ONLY EVER DROPS. There is no path here that writes a sentence, softens one, or replaces one
 * with a safer version. A guard that rewrites is a guard that can be argued with about what it meant.
 *
 * ══ WHERE THE ATHLETE'S OWN WORDS ARE STOPPED ══
 *
 * Not here. A note that says *"my knee hurts on rep three"* is stopped by `medicalRoute()` in the Edge
 * Function BEFORE the credit is reserved and before the model is called — one classifier for the whole
 * product. This file guards the other direction: what comes back.
 */

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The caps
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * How many stills a read is built from.
 *
 * Three is the floor because a lift has a top, a bottom and a turnaround, and two frames cannot show
 * which way the bar was travelling. Six is the ceiling because every frame is a whole image on the
 * request — the cost of a read is very nearly linear in this number — and a squat filmed for eight
 * seconds does not contain a seventh moment worth paying for.
 */
export const FORM_FRAMES_MIN = 3;
export const FORM_FRAMES_MAX = 6;

/** What the app asks for when nothing says otherwise: the four moments of a rep, plus one. */
export const FORM_FRAMES_DEFAULT = 5;

/**
 * How much of the clip is read, in seconds.
 *
 * ⚠ THIS IS A CAP, NOT A REJECTION. A longer clip is sampled across its first {@link FORM_CLIP_SECONDS}
 * and the athlete is TOLD that is what happened ({@link formClipNotice}). Refusing a 40-second video
 * outright would be the app throwing away work someone already did; silently reading the middle of it
 * would be worse, because a read of the wrong reps is indistinguishable from a bad read.
 *
 * Ten seconds is a working set of most things and comfortably more than one rep, which is all a technique
 * read needs. `MAX_VIDEO_SECONDS` in `useMediaPicker` (30) is the app-wide recording ceiling and stays
 * where it is; this is narrower because reading is not storing.
 */
export const FORM_CLIP_SECONDS = 10;
export const FORM_CLIP_MS = FORM_CLIP_SECONDS * 1000;

/**
 * Longest edge of a frame, in pixels — CA-D5's *"downscale to the size the model would reduce it to
 * anyway"*.
 *
 * The Messages API scales any image whose long edge is over 1568px, and costs an image at roughly
 * (width × height) / 750 tokens, so pixels are the bill. A form read looks at a silhouette and a bar:
 * where the hips are relative to the knees, whether the bar tracked over the mid-foot, whether the
 * elbows moved. 1024 carries all of that on a phone-shot frame and costs about a third of what 1568
 * would. It is deliberately smaller than `MAX_EDGE` (1600) in `image-downscale-core.ts`, which sizes
 * photos that get STORED and looked at by people.
 */
export const FORM_FRAME_MAX_EDGE = 1024;

/** JPEG quality for a frame. It is read once by a model and never displayed, so this is lower than 0.85. */
export const FORM_FRAME_COMPRESS = 0.7;

/**
 * Per-frame and whole-request ceilings, in base64 characters.
 *
 * The per-frame number is the Messages API's own 5 MB-per-image limit expressed in base64 (×4/3, with
 * margin) — the same arithmetic and the same reason as `MAX_BASE64_CHARS` in `program-photo-read`: an
 * image between the limit and whatever we allowed spends a credit and then fails upstream, so the
 * athlete pays and is told the service is down when the true answer was "too large".
 *
 * A 1024px JPEG at 0.7 is ~120 KB, so a six-frame request is ~1 MB and nothing legitimate is anywhere
 * near either number. Anything that is came from a client that skipped the resize.
 */
export const FORM_FRAME_BASE64_CHARS = 6_990_000;
export const FORM_TOTAL_BASE64_CHARS = 14_000_000;

/** CA-D5: the form-check output cap. A ceiling, not a target — the answer is four short sentences. */
export const FORM_OUTPUT_CAP = 900;

/** The lift name, and the athlete's optional note. Both go in the user turn; neither is the cache key. */
export const FORM_LIFT_CHARS = 60;
export const FORM_NOTE_CHARS = 300;

/** One sentence of the read. Long enough for a cue, short enough that a paragraph cannot hide in it. */
export const FORM_LINE_CHARS = 200;

/** At most two things to fix (the prompt's rule, enforced here), and at most three that looked good. */
export const FORM_FIX_MAX = 2;
export const FORM_GOOD_MAX = 3;

/**
 * The meter's action name. Its credit weight lives in `coach_ai_config.action_credits` and NOWHERE else
 * — MA3-D16: *every cap and allowance is server-side config, never a constant in `src/`*.
 *
 * ⚠ `form_check` IS ALREADY PRICED (migration `0144`, at 6) so this needs no migration of its own. It is
 * its own action rather than `photo_read` (3) for the reason `0174` spells out about `photo_import`: a
 * ledger that cannot tell two capabilities apart cannot price either, and a read built from up to six
 * images is not the same call as a read of one.
 */
export const FORM_ACTION = 'form_check';

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
export function frameTimestamps(durationMs: unknown, count: number = FORM_FRAMES_DEFAULT): number[] {
  const n = Math.min(FORM_FRAMES_MAX, Math.max(FORM_FRAMES_MIN, Math.round(Number(count) || 0) || FORM_FRAMES_DEFAULT));
  const raw = typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs > 0 ? durationMs : FORM_CLIP_MS;
  const window = Math.min(raw, FORM_CLIP_MS);
  const slice = window / n;
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) out.push(Math.round(slice * (i + EDGE_INSET)));
  return out;
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

/**
 * The frames, narrowed to what the function accepts: base64 strings only, in the order given, count and
 * size both capped. Null when there is nothing worth sending.
 *
 * Runs on the server against whatever a client sent, which is why it re-checks everything the app already
 * checked. A client is not a boundary.
 */
export function capFrames(frames: unknown): string[] | null {
  if (!Array.isArray(frames)) return null;
  const kept: string[] = [];
  let total = 0;
  for (const f of frames) {
    if (kept.length >= FORM_FRAMES_MAX) break;
    if (typeof f !== 'string') return null;
    const data = f.trim();
    // A data-URI prefix is a client that forgot to strip it. Stripping it here is not "improving" the
    // input — the API takes raw base64 and would reject the prefix, after the credit was spent.
    const bare = data.startsWith('data:') ? data.slice(data.indexOf(',') + 1) : data;
    if (bare.length < 100) return null;
    if (bare.length > FORM_FRAME_BASE64_CHARS) return null;
    total += bare.length;
    if (total > FORM_TOTAL_BASE64_CHARS) return null;
    kept.push(bare);
  }
  return kept.length >= FORM_FRAMES_MIN ? kept : null;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The read
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What Holt says about a set, after the guard has been over it.
 *
 * Deliberately three narrow fields rather than prose. A shape is a channel, and a narrow channel is the
 * cheapest safety mechanism there is: there is no `assessment`, no `severity`, no `risk`, no `recommended
 * weight`, so a model inclined to produce one has nowhere to put it.
 */
export interface FormRead {
  /** The lift, as the athlete named it. Echoed back so the line reads as being about their set. */
  lift: string;
  /** What is already right. Up to {@link FORM_GOOD_MAX} short sentences. May be empty. */
  looksGood: string[];
  /**
   * What to change, biggest first, at most {@link FORM_FIX_MAX}.
   *
   * ⚠ ALSO WHERE HONESTY LIVES. If the frames do not show the lift clearly, the model is told to say so
   * here and stop, rather than inventing a read of a video it could not see.
   */
  fix: string[];
  /** One thing to say to themselves on the next rep. May be empty. */
  cue: string;
}

// ── The banned families ────────────────────────────────────────────────────
//
// ⚠ EVERY ONE OF THESE IS A WHOLE-SENTENCE VETO, and the sentence is dropped rather than edited.
//
// ⚠ AND THEY ARE DELIBERATELY NOT `medical-routing.ts`. That file classifies what an ATHLETE typed and is
// tuned so ordinary gym words ("broke my PR", "torn between two programs") do not stop a request. This
// one reads what a MODEL wrote about a body it was shown, where the tuning runs the other way: a dropped
// technique sentence costs one line of coaching, and a kept medical sentence is the thing the PO said to
// stay away from.

/**
 * Pain, injury, symptoms, and anything clinical.
 *
 * ⚠ `pinch` IS NOT IN HERE, ON PURPOSE. *"Pinch your shoulder blades together"* is one of the most common
 * legitimate cues in lifting, and banning the word would delete good coaching to catch a case `nerve`,
 * `impinge` and `pain` already catch. Verified in both directions by the tests beside this file, which is
 * what `feedback_verify_guards_empirically` asks for.
 */
const MEDICAL_SENTENCE =
  /\b(pain\w*|hurt\w*|sore\w*|ach(e|es|ed|ing|y)|discomfort|injur\w*|tweak\w*|strain\w*|sprain\w*|ruptur\w*|tear\w*|torn|herniat\w*|impinge\w*|tendin\w*|tendon|ligament|bursit\w*|arthrit\w*|inflam\w*|sciatic\w*|nerve|numb\w*|tingl\w*|swell\w*|swollen|bruis\w*|flare[-\s]?up|discs?|meniscus|acl|mcl|labrum|rotator\s+cuff|diagnos\w*|symptom\w*|condition|physio\w*|physical\s+therap\w*|chiroprac\w*|doctor|clinic\w*|medical|rehab\w*|prehab|treatment|heal(s|ed|ing)?)\b/i;

/**
 * Telling somebody to stop training, or to go and get looked at. A referral is not a technique note.
 *
 * ⚠ THE BODY PART GOES IN THE MIDDLE. *"Get that BACK looked at"* is the sentence a model actually writes,
 * and an exact `get that looked at` missed every one of them, so up to two words are allowed between.
 */
const REFERRAL_SENTENCE =
  /\b(stop\s+(lifting|training|squatting|benching|deadlifting|pressing|doing)|see\s+(a|your)\s+(doctor|physio\w*|specialist|professional|pt\b)|get\s+(it|that|this)(\s+[\w'-]+){0,2}\s+(checked|looked\s+at|seen)|seek\s+(help|advice|attention))\b/i;

/**
 * A verdict on whether the lift is safe.
 *
 * ⚠ `safety` IS EXCEPTED WHEN IT NAMES A PIECE OF EQUIPMENT — a safety squat bar is a bar, and the pins
 * in a rack are safeties. Everything else in this family is a claim the PO ruled out.
 */
const VERDICT_SENTENCE =
  /\b(safe(r|st|ly)?|unsafe|safety(?!\s*(squat\s+)?(bar|bars|pin|pins|strap|straps))|dangerous|danger|risky|risk\w*|injury\s+risk|harmful|hazard\w*|you'?ll\s+(get\s+hurt|blow|wreck|destroy)|wreck(ing)?\s+your|bad\s+for\s+your)\b/i;

/**
 * The athlete's body as an object of judgement.
 *
 * ⚠ BODY PARTS ARE NOT IN HERE AND MUST NEVER BE. Technique is almost entirely a sentence about knees,
 * hips, a back, a chest and elbows — *"your knees cave on the way up"* is the coaching, not the problem.
 * What is banned is a judgement about how the body looks or what it weighs.
 *
 * `lean` is excepted the same way `pinch` is: *"don't lean back at the top"* is a cue, so only
 * `leaner`/`leanness`/`lean mass` are caught. `your weight` is excepted for the same reason and it is the
 * sharpest of the three — *"shift your weight back into your heels"* is textbook coaching, and banning
 * the phrase to catch a body-weight remark would delete the cue. `overweight`, `obese` and *"lose
 * weight"* carry that case instead. *"Leaned out"* IS caught, except when it is followed by "over" —
 * *"you're leaning out over the bar"* is a torso-position note, and *"you've leaned out since last time"*
 * is a remark about a body.
 *
 * ⚠ THIS PATTERN IS DUPLICATED IN `appearance.ts`, ON PURPOSE, AND A TEST HOLDS THE TWO IDENTICAL.
 * `training-gaps.ts` needs the same guarantee and cannot reach this file: import-free is a hard
 * requirement here (see the header — the deploy builder refuses to inline a module with imports), so the
 * usual fix of extracting a shared module is not available. `__tests__/training-gaps.test.mjs` reads BOTH
 * files off disk and fails if the two regex sources differ by one byte. Change this and you change that,
 * in the same commit, or the suite stops you.
 */
const BODY_SENTENCE =
  /\b(body\s?fat|physique|overweight|obese|obesity|skinny|chubby|fat\b|flabby|slim|bulky|belly|gut\b|love\s+handles|lean(er|ness)\b|lean\s+(body|mass|muscle)|lean(ed|ing)?\s+out\b(?!\s+over)|put(ting)?\s+on\s+(some\s+)?(muscle|size|mass)|your\s+(physique|frame|build)\b|(los(e|ing)|drop(ping)?|gain(ing)?|shed(ding)?)\s+(some\s+|a\s+few\s+|a\s+bit\s+of\s+)?(weight|fat|pounds|lbs?|kg)|you\s+look\s+(strong|big|small|heavy|light|thin|fit))\b/i;

/**
 * A number for a load or a max.
 *
 * The model cannot weigh a plate from a video, so any figure it produces is invented, and an invented
 * prescription is the one kind of wrong answer an athlete will act on immediately. `3 sets of 8` is fine
 * and stays fine; `185 lb` and `your max is around 300` do not.
 */
const NUMBER_SENTENCE =
  /(\b\d+(\.\d+)?\s*(lb|lbs|pound|pounds|kg|kgs|kilo|kilos|plate|plates)\b|\b(1\s?rm|e1rm|one[-\s]?rep\s+max|your\s+(true\s+|estimated\s+)?max|max\s+out|rep\s+max)\b|\b\d+\s*%\s*(of\s+)?(your\s+)?(1\s?rm|max)\b)/i;

const BANNED = [MEDICAL_SENTENCE, REFERRAL_SENTENCE, VERDICT_SENTENCE, BODY_SENTENCE, NUMBER_SENTENCE];

/** Which family vetoed this sentence, or null when nothing did. Exported so the tests can name a miss. */
export function bannedFamily(sentence: string): 'medical' | 'referral' | 'verdict' | 'body' | 'number' | null {
  const names = ['medical', 'referral', 'verdict', 'body', 'number'] as const;
  for (let i = 0; i < BANNED.length; i += 1) if (BANNED[i].test(sentence)) return names[i];
  return null;
}

/** Does any banned family match? The one question most callers have. */
export const isBannedSentence = (sentence: string): boolean => bannedFamily(sentence) !== null;

/**
 * Split a line into sentences, keeping their terminators.
 *
 * Sentence-level rather than line-level because the realistic failure is a good note with a bad tail —
 * *"Depth is fine. It shouldn't hurt at the bottom, so get that checked."* Dropping the whole line would
 * throw away the coaching; dropping the whole FIELD would throw away the read. Dropping the sentence
 * keeps what was useful and deletes what was not allowed.
 */
function sentences(line: string): string[] {
  return line
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** One line of the read, with every banned sentence removed. Empty string when nothing survives. */
function cleanLine(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const flat = raw.replace(/\s+/g, ' ').trim().slice(0, FORM_LINE_CHARS);
  if (!flat) return '';
  const kept = sentences(flat).filter((s) => !isBannedSentence(s));
  return kept.join(' ').trim();
}

function cleanLines(raw: unknown, max: number): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  const out: string[] = [];
  for (const item of list) {
    if (out.length >= max) break;
    const line = cleanLine(item);
    if (line) out.push(line);
  }
  return out;
}

/**
 * THE BOUNDARY. Whatever the model returned, turned into a read that is safe to show, or null.
 *
 * ⚠ RUNS AFTER THE MODEL AND OVERRULES IT — the rule `photo-transcript.ts` and `medical-routing.ts` both
 * state about themselves. It never throws, never writes a sentence of its own, and never returns text it
 * was not given. Null means there is nothing left worth showing, which the caller renders as "I couldn't
 * get a read" rather than as a verdict on the athlete.
 *
 * `lift` is taken from the REQUEST by the caller, not trusted from the model, so a model that renames the
 * exercise cannot put words in the athlete's mouth about what they were doing.
 */
export function sanitizeFormRead(raw: unknown, lift?: string): FormRead | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;

  const named = typeof lift === 'string' && lift.trim() ? lift : typeof r.lift === 'string' ? r.lift : '';
  const cleanLift = named.replace(/\s+/g, ' ').trim().slice(0, FORM_LIFT_CHARS);

  const looksGood = cleanLines(r.looksGood, FORM_GOOD_MAX);
  const fix = cleanLines(r.fix, FORM_FIX_MAX);
  const cue = cleanLine(r.cue);

  // Nothing survived in either direction: there is no read here, and saying so is the honest outcome.
  if (!looksGood.length && !fix.length && !cue) return null;
  return { lift: cleanLift, looksGood, fix, cue };
}

/**
 * The model's text turned into a read: fences stripped, the first JSON object parsed, then the guard.
 *
 * Fences first because a model asked for bare JSON wraps it in ```json anyway often enough to matter, and
 * a read lost to a markdown habit costs the athlete a credit for nothing.
 */
export function parseFormRead(text: unknown, lift?: string): FormRead | null {
  if (typeof text !== 'string' || !text.trim()) return null;
  const stripped = text.replace(/```[a-zA-Z]*\n?/g, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
  return sanitizeFormRead(parsed, lift);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// What Holt says
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** When there is no read. Not an apology and not a verdict on the athlete — just what to do next. */
export const FORM_NO_READ =
  "I couldn't get a read on that one. Film it from the side, whole body in frame, and I'll look again.";

/**
 * The read as the lines Holt actually says, in order, top to bottom.
 *
 * Holt-Voice-Amendment-001: plain text, no markdown, no labels, short lines someone can read between
 * sets, specific rather than generic. So there is no "Good:" / "Fix:" heading anywhere in here — the
 * first line is what went right, then the biggest thing to change, then the second one if there is one,
 * then the cue as a thing to say to themselves.
 *
 * The fix order is the model's, which the prompt requires to be biggest first, and `sanitizeFormRead`
 * preserves. "Then" on the second line is what makes the ordering audible instead of implied.
 */
export function formCheckSummary(read: FormRead | null | undefined): string[] {
  if (!read) return [FORM_NO_READ];
  const lines: string[] = [];
  const lift = read.lift.trim();

  if (read.looksGood.length) {
    const good = read.looksGood.join(' ');
    lines.push(lift ? `${lift} — ${good}` : good);
  } else if (lift && read.fix.length) {
    // Without a "what's good" line the lift is never named, and the first thing Holt says reads as being
    // about nothing in particular.
    lines.push(`${lift} — here's the one thing I'd change.`);
  }

  if (read.fix[0]) lines.push(read.fix[0]);
  if (read.fix[1]) lines.push(`Then: ${read.fix[1]}`);
  if (read.cue) lines.push(`Next set, think: "${read.cue.replace(/^["“']|["”']$/g, '')}"`);

  return lines.length ? lines : [FORM_NO_READ];
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
  /** We looked at the frames and could not read the lift in them. A better clip may work. */
  | { kind: 'unreadable' }
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
export function formResultFrom(body: unknown, lift?: string): FormCheckResult {
  if (!body || typeof body !== 'object') return { kind: 'unavailable' };
  const d = body as {
    ok?: boolean;
    read?: unknown;
    route?: string;
    reason?: string;
    remaining?: number;
    allowance?: number;
  };

  if (d.route === 'crisis' || d.route === 'urgent' || d.route === 'care' || d.route === 'medical_stop') {
    return { kind: 'stopped', route: d.route };
  }

  if (d.ok) {
    // ⚠ THE GUARD RUNS ON THIS END TOO. The function already sanitised; doing it again costs nothing and
    // means a stale deployment of the function cannot put a medical sentence on the screen of a current
    // build. Same reason `coach-ask` re-trims history the app already trimmed: a peer is not a boundary.
    const read = sanitizeFormRead(d.read, lift);
    if (!read) return { kind: 'unreadable' };
    return { kind: 'ok', read, remaining: typeof d.remaining === 'number' ? d.remaining : null };
  }

  switch (d.reason) {
    case 'unreadable':
      return { kind: 'unreadable' };
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
