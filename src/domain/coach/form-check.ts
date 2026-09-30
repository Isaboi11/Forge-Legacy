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
 * which way the bar was travelling.
 *
 * ⚠ TEN BY DEFAULT, TWELVE AT MOST (PO 2026-09-25: *"it needs to be able to do every angle"*). The first
 * version sent five, two seconds apart — about one rep apart — so each still caught a different rep at a
 * random point and the model rarely saw a bottom position at all. From the side that was thin; from the
 * front or behind, where the useful detail (knees tracking, a hip shift, the bar tilting) lives in one
 * moment of the rep, it was usually nothing, and Holt said the angle was the problem. Ten stills a second
 * apart land on every phase of a rep somewhere across the set. They are sent SMALLER
 * ({@link FORM_FRAME_MAX_EDGE}), so the bill stays about where five large ones put it.
 *
 * ⚠ FORTY AT MOST, ~3 A SECOND (PO 2026-09-29). One a second was still one still per rep: two different
 * deadlift clips came back with the same textbook read ("back rounds", "squatting the pull"), because
 * Holt could not tell the clips apart and fell back on the lift's usual faults. Three a second puts ~6
 * stills on every rep, so he can follow each one. The API takes up to 100 images a request (over 20, each
 * must be ≤ 2000 px — ours are 768), and forty at ~440 tokens is ~18k input tokens, about 5¢ a read.
 */
export const FORM_FRAMES_MIN = 3;
export const FORM_FRAMES_MAX = 40;

/** Stills per second of the trimmed window. See {@link FORM_FRAMES_MAX}. */
export const FORM_FRAMES_PER_SECOND = 3;

/** What the app asks for when nothing says otherwise: a ten-second set at three a second. */
export const FORM_FRAMES_DEFAULT = 30;

/**
 * How much of the clip is read, in seconds.
 *
 * ⚠ THIS IS A CAP, NOT A REJECTION. A longer clip is sampled across its first {@link FORM_CLIP_SECONDS}
 * and the athlete is TOLD that is what happened ({@link formClipNotice}). Refusing a 40-second video
 * outright would be the app throwing away work someone already did; silently reading the middle of it
 * would be worse, because a read of the wrong reps is indistinguishable from a bad read.
 *
 * ⚠ THIRTY, TO MATCH THE TRIM SCREEN (`Coach Holt Form Check.dc.html` 02, PO 2026-09-25: *"Defaults to
 * the whole clip, up to 30 s"*). It was ten, which read the walk-up and unrack of a camera-roll clip and
 * missed the reps. The athlete now drags the handles around the reps they care about, and the frame
 * count scales with the window they chose ({@link formFrameCount}) — a tight trim is read densely.
 * Same number as `MAX_VIDEO_SECONDS` in `useMediaPicker`, the app-wide recording ceiling.
 */
export const FORM_CLIP_SECONDS = 30;
export const FORM_CLIP_MS = FORM_CLIP_SECONDS * 1000;

/**
 * Longest edge of a frame, in pixels — CA-D5's *"downscale to the size the model would reduce it to
 * anyway"*.
 *
 * The Messages API scales any image whose long edge is over 1568px, and costs an image at roughly
 * (width × height) / 750 tokens, so pixels are the bill. A form read looks at a silhouette and a bar:
 * where the hips are relative to the knees, whether the bar tracked over the mid-foot, whether the
 * elbows moved. 768 carries all of that on a phone-shot frame at about 440 tokens a still, so ten of
 * them cost roughly what five at 1024 did — and more moments of the rep beat more pixels of fewer
 * moments. It is deliberately smaller than `MAX_EDGE` (1600) in `image-downscale-core.ts`, which sizes
 * photos that get STORED and looked at by people.
 */
export const FORM_FRAME_MAX_EDGE = 768;

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
 * A 768px JPEG at 0.7 is ~70 KB, so a twelve-frame request is ~1 MB and nothing legitimate is anywhere
 * near either number. Anything that is came from a client that skipped the resize.
 */
export const FORM_FRAME_BASE64_CHARS = 6_990_000;
export const FORM_TOTAL_BASE64_CHARS = 14_000_000;

/** CA-D5: the form-check output cap. A ceiling, not a target — the answer is five or six short sentences. */
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
// What the athlete (and the app) add to the request
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * "What should I look at?" (design 01). `Everything` is the absence of a focus, so it is never sent.
 * A fixed list rather than free text: the athlete's own words already have the note field, which is
 * medical-guarded; these go into the prompt as-is and must not be a second free-text channel.
 */
export const FORM_FOCUS = ['Depth', 'Bar path', 'Knees', 'Back', 'Lockout', 'Tempo'] as const;
export type FormFocus = (typeof FORM_FOCUS)[number];

export function capFocus(raw: unknown): FormFocus[] {
  if (!Array.isArray(raw)) return [];
  return FORM_FOCUS.filter((f) => raw.includes(f));
}

/**
 * The lift's coaching notes from the app's own library (`exercise-coaching`), so Holt checks the known
 * faults and uses the cues the exercise page already teaches (Plan §5.2). Built by the app from a
 * catalogue record; capped here because the function re-checks everything a client sends.
 */
export const FORM_KNOWN_CHARS = 1400;

export function capKnown(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, FORM_KNOWN_CHARS);
}

/**
 * The last SAVED read of this lift, so Holt can say what changed (design 05's trend tags and his
 * "Your bar path has cleaned up since August"). Date + the fix only — never the athlete's note.
 */
export interface FormLast {
  date: string;
  fix: string;
}

export function capLast(raw: unknown): FormLast | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const date = typeof r.date === 'string' ? r.date.replace(/[^\w ,-]/g, '').trim().slice(0, 20) : '';
  const fix = typeof r.fix === 'string' ? r.fix.replace(/\s+/g, ' ').trim().slice(0, FORM_LINE_CHARS) : '';
  return date && fix ? { date, fix } : null;
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

/**
 * When each frame was taken, in milliseconds — narrowed to something safe to label the frames with, or
 * null to send them unlabelled.
 *
 * The model is told the second each still came from, because a set is several reps and ten stills land on
 * different phases of different reps: knowing that frame 4 is 3.5 s in and frame 5 is 4.5 s in is what lets
 * it piece one rep together out of several. Optional on the wire — an older app sends none, and a list that
 * does not line up one-to-one with the frames, is out of order or is out of range is dropped rather than
 * trusted, because a wrong label is worse than none.
 */
export function capFrameTimes(times: unknown, frameCount: number): number[] | null {
  if (!Array.isArray(times) || times.length < frameCount || frameCount < 1) return null;
  const out: number[] = [];
  for (let i = 0; i < frameCount; i += 1) {
    const t = times[i];
    if (typeof t !== 'number' || !Number.isFinite(t) || t < 0 || t > 10 * FORM_CLIP_MS) return null;
    if (i > 0 && t <= out[i - 1]) return null;
    out.push(Math.round(t));
  }
  return out;
}

/**
 * Each frame's size in pixels, `[width, height]`, narrowed like the times: one per frame or nothing.
 *
 * ⚠ WHY THE MODEL IS TOLD THE SIZE (PO device test, 09-25). Marks were asked for as FRACTIONS of the frame
 * and landed on the ceiling above an overhead press. Vision models point far more reliably in PIXELS of the
 * image they were shown when they know its dimensions, so the label carries them and the mark comes back
 * in pixels (`cleanMarks` turns it into a fraction for the screen).
 */
export function capFrameSizes(raw: unknown, frameCount: number): [number, number][] | null {
  if (!Array.isArray(raw) || raw.length < frameCount || frameCount < 1) return null;
  const out: [number, number][] = [];
  for (let i = 0; i < frameCount; i += 1) {
    const v = raw[i];
    if (!Array.isArray(v) || v.length !== 2) return null;
    const [w, h] = v;
    if (typeof w !== 'number' || typeof h !== 'number' || !(w >= 16 && w <= 4096 && h >= 16 && h <= 4096)) return null;
    out.push([Math.round(w), Math.round(h)]);
  }
  return out;
}

/** "Frame 3 of 10 (2.5 s in, 432 x 768 px):" — the label that goes before each still in the user turn. */
export function frameLabel(index: number, total: number, timeMs?: number | null, size?: [number, number] | null): string {
  const parts: string[] = [];
  if (typeof timeMs === 'number' && Number.isFinite(timeMs)) parts.push(`${(timeMs / 1000).toFixed(1)} s in`);
  if (size) parts.push(`${size[0]} x ${size[1]} px`);
  return `Frame ${index + 1} of ${total}${parts.length ? ` (${parts.join(', ')})` : ''}:`;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The read
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What Holt says about a set, after the guard has been over it.
 *
 * Deliberately four narrow fields rather than prose. A shape is a channel, and a narrow channel is the
 * cheapest safety mechanism there is: there is no `assessment`, no `severity`, no `risk`, no `recommended
 * weight`, so a model inclined to produce one has nowhere to put it.
 */
export interface FormRead {
  /** The lift, as the athlete named it. Echoed back so the line reads as being about their set. */
  lift: string;
  /**
   * What is already right. Up to {@link FORM_GOOD_MAX} short sentences. The prompt REQUIRES at least one
   * whenever the frames show the lift (PO 2026-09-25: *"more praise or direction"*), but it is still a
   * model's answer, so this may be empty — and is, on purpose, when the frames could not be read.
   */
  looksGood: string[];
  /**
   * What to change, biggest first, at most {@link FORM_FIX_MAX}.
   *
   * ⚠ ALSO WHERE HONESTY LIVES. If no frame shows the lift at all (dark, blurred, nobody in shot), the
   * model says so here and stops rather than inventing a read. A camera ANGLE is never that case — every
   * angle gets a read of what it shows (PO 2026-09-25).
   */
  fix: string[];
  /** One thing to say to themselves on the next rep. May be empty. */
  cue: string;
  /**
   * The closing line: belief plus what to do next (PO 2026-09-25: *"Encouragement."*). Guarded like every
   * other field, so it may come back EMPTY — the guard only drops. {@link formCheckSummary} is what
   * guarantees the athlete never sees a read without one, by closing on a scripted line instead.
   */
  encourage: string;
  /** Which way the camera was facing, as the model judged it. Null when it did not say. */
  view: FormView | null;
  /** Holt's opening line — *"From the front, three reps."* Guarded like every other sentence. */
  viewLine: string;
  /** How many reps the frames show. A count, not a verdict; null when unsure. */
  reps: number | null;
  /**
   * Where on the athlete's own frame each fix is — the design's bronze dot / dashed line (04, 04b).
   * `fix` is the index into {@link FormRead.fix}; `frame` is 0-based into the frames that were sent.
   * Coordinates are fractions of the frame (0–1 from the top-left). A mark the model got wrong costs a
   * misplaced dot on a picture of their own set; it carries no words, so the guard has nothing to read.
   */
  marks: FormMark[];
  /** One catalogue drill by name (*"Pause Squat"*), or ''. The app shows it only if the name resolves. */
  drill: string;
  /** Against the last saved read of this lift, when the app sent one. Null on a first read. */
  trend: FormTrend | null;
  /** One sentence on what changed since the last saved read, or ''. Guarded. */
  progress: string;
}

export type FormView = 'side' | 'front' | 'behind' | 'diagonal' | 'other';
export type FormTrend = 'better' | 'same' | 'new';

export interface FormMark {
  fix: number;
  frame: number;
  kind: 'dot' | 'line';
  /** 0–1 across. Ignored for a line, which spans the frame. */
  x: number;
  /** 0–1 down. */
  y: number;
  /** The rep the frame is in, 1-based, or null when the model did not say. */
  rep: number | null;
  /** What that frame shows, in a few words ("lockout, bar overhead"). Guarded; '' when absent. */
  shows: string;
}

const VIEWS: readonly FormView[] = ['side', 'front', 'behind', 'diagonal', 'other'];
const TRENDS: readonly FormTrend[] = ['better', 'same', 'new'];

const unit = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null;

/**
 * The marks, narrowed: only for a fix that survived the guard, only on a frame that was sent, at most one
 * per fix. `frameCount` is how many frames went up, so an index outside them is dropped, not clamped.
 *
 * Coordinates arrive in PIXELS when `sizes` is known (the function tells the model each frame's size) and
 * leave as fractions — the only unit the screen draws in. A pair that is already 0–1 is read as fractions,
 * which is what an older function sent and what the app's own re-check sees.
 */
export function cleanMarks(raw: unknown, fixCount: number, frameCount: number, sizes?: [number, number][] | null): FormMark[] {
  if (!Array.isArray(raw) || fixCount < 1 || frameCount < 1) return [];
  const out: FormMark[] = [];
  const seen = new Set<number>();
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue;
    const r = m as Record<string, unknown>;
    const fix = typeof r.fix === 'number' ? Math.round(r.fix) : -1;
    // The model counts frames from 1, as the labels do.
    const frame = typeof r.frame === 'number' ? Math.round(r.frame) - 1 : -1;
    if (fix < 0 || fix >= fixCount || seen.has(fix) || frame < 0 || frame >= frameCount) continue;
    const kind = r.kind === 'line' ? 'line' : 'dot';
    const size = sizes?.[frame] ?? null;
    const rawX = typeof r.x === 'number' ? r.x : null;
    const rawY = typeof r.y === 'number' ? r.y : null;
    const inPixels = !!size && ((rawX != null && rawX > 1) || (rawY != null && rawY > 1));
    const y = unit(inPixels && rawY != null ? rawY / size[1] : rawY);
    const x = kind === 'line' ? 0.5 : unit(inPixels && rawX != null ? rawX / size[0] : rawX);
    if (y == null || x == null) continue;
    const rep = typeof r.rep === 'number' && r.rep >= 1 && r.rep <= 50 ? Math.round(r.rep) : null;
    const showsRaw = typeof r.shows === 'string' ? r.shows.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
    const shows = showsRaw && !isBannedSentence(showsRaw) ? showsRaw : '';
    seen.add(fix);
    out.push({ fix, frame, kind, x, y, rep, shows });
  }
  return out;
}

/** A drill name the app may try to resolve against the catalogue. Plain words only, and guarded. */
function cleanDrill(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const name = raw.replace(/\s+/g, ' ').trim();
  if (!name || name.length > FORM_LIFT_CHARS || /[.!?:;]/.test(name) || isBannedSentence(name)) return '';
  return name;
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
  const flat = raw.replace(/\s+/g, ' ').trim();
  if (!flat) return '';
  // ⚠ WHOLE SENTENCES ONLY. Slicing the raw text at FORM_LINE_CHARS put "…rather than a" on screen (eval
  // 09-25). Keep sentences while they fit; a first sentence that is too long on its own is cut at a word.
  const kept: string[] = [];
  let used = 0;
  for (const s of sentences(flat).filter((x) => !isBannedSentence(x))) {
    if (used + s.length + (kept.length ? 1 : 0) > FORM_LINE_CHARS) {
      if (!kept.length) {
        const cut = s.slice(0, FORM_LINE_CHARS - 1);
        const at = cut.lastIndexOf(' ');
        kept.push(`${(at > 40 ? cut.slice(0, at) : cut).replace(/[\s,;:—-]+$/, '')}…`);
      }
      break;
    }
    kept.push(s);
    used += s.length + (kept.length > 1 ? 1 : 0);
  }
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
export function sanitizeFormRead(
  raw: unknown,
  lift?: string,
  frameCount: number = FORM_FRAMES_MAX,
  sizes?: [number, number][] | null,
): FormRead | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;

  const named = typeof lift === 'string' && lift.trim() ? lift : typeof r.lift === 'string' ? r.lift : '';
  const cleanLift = named.replace(/\s+/g, ' ').trim().slice(0, FORM_LIFT_CHARS);

  const looksGood = cleanLines(r.looksGood, FORM_GOOD_MAX);
  const fix = cleanLines(r.fix, FORM_FIX_MAX);
  const cue = cleanLine(r.cue);
  const encourage = cleanLine(r.encourage);

  // Nothing survived in either direction: there is no read here, and saying so is the honest outcome.
  // `encourage` does not count — a pep talk about a set nobody could see is not a read.
  if (!looksGood.length && !fix.length && !cue) return null;
  // `fix` indices shift when the guard drops a line, so marks are re-keyed by surviving position: a
  // mark for a dropped fix is dropped with it rather than landing on its neighbour.
  const rawFix: unknown[] = Array.isArray(r.fix) ? r.fix : typeof r.fix === 'string' ? [r.fix] : [];
  const keptIdx: number[] = [];
  for (let i = 0; i < rawFix.length && keptIdx.length < FORM_FIX_MAX; i += 1) if (cleanLine(rawFix[i])) keptIdx.push(i);
  const remapped = Array.isArray(r.marks)
    ? (r.marks as unknown[]).map((m) => {
        if (!m || typeof m !== 'object') return m;
        const f = (m as { fix?: unknown }).fix;
        return { ...(m as object), fix: keptIdx.indexOf(typeof f === 'number' ? Math.round(f) : -1) };
      })
    : [];

  const view = typeof r.view === 'string' && (VIEWS as readonly string[]).includes(r.view) ? (r.view as FormView) : null;
  const reps = typeof r.reps === 'number' && r.reps >= 1 && r.reps <= 50 ? Math.round(r.reps) : null;
  const trendRaw = typeof r.vsLast === 'string' ? r.vsLast : typeof r.trend === 'string' ? r.trend : '';
  const trend = (TRENDS as readonly string[]).includes(trendRaw) ? (trendRaw as FormTrend) : null;

  return {
    lift: cleanLift,
    looksGood,
    fix,
    cue,
    encourage,
    view,
    viewLine: cleanLine(r.viewLine),
    reps,
    marks: cleanMarks(remapped, fix.length, frameCount, sizes),
    drill: cleanDrill(r.drill),
    trend,
    progress: cleanLine(r.progress),
  };
}

/**
 * The model's text turned into a read: fences stripped, the first JSON object parsed, then the guard.
 *
 * Fences first because a model asked for bare JSON wraps it in ```json anyway often enough to matter, and
 * a read lost to a markdown habit costs the athlete a credit for nothing.
 */
export function parseFormRead(text: unknown, lift?: string, frameCount?: number, sizes?: [number, number][] | null): FormRead | null {
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
  return sanitizeFormRead(parsed, lift, frameCount, sizes);
}
