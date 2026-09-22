/**
 * HOLT'S VIEW OF THE ATHLETE'S TRAINING — a few hundred characters of their own logged history.
 *
 * Coach-AI-Amendment-001 CA-D2 puts "the last few sessions" in the athlete brief, and CA-D5 says the brief
 * carries only what the job needs. So this is attached to an `ask` question ONLY when the question is
 * about the athlete's training (`isTrainingQuestion`) — "am I getting stronger", "how much should I bench",
 * "what did I do last week" — and an ordinary question pays nothing for it.
 *
 * ══ WHAT IT SAYS ══
 *
 *   Last 8 wks: 3.5 sessions/wk. Weights in lb.
 *   Barbell Bench Press — best 225×5, e1RM 245→262 (up 7%), 3d ago.
 *   Barbell Back Squat — best 275×3, e1RM 300→300 (flat), 5d ago. …
 *
 * The top lifts by how often they were trained lately (ties to the most recent), each with its heaviest
 * recent set, its estimated-1RM trend across the window, and when it was last done. ≤ ~400 characters.
 *
 * ⚠ GREEN-TIER DATA ONLY: sets, reps, loads, dates. Nothing about the body (Preflight Gates Part 2).
 *
 * ⚠ THE BEST SET IS A WEIGHT ACTUALLY MOVED; THE TREND IS AN ESTIMATE, AND IS LABELLED ONE. `lift-series.ts`
 *   settles why a chart must not plot e1RM. A trend line for a coach is a different job — comparing a
 *   5×5 month with a triples month needs a common currency — so Epley is used, but only over sets of 1–10
 *   reps (the estimate inflates badly beyond that) and it is always written "e1RM", never as a lift.
 *
 * ⚠ IN THE ATHLETE'S UNITS. Storage is pounds (`settings/units.ts`); conversion happens once, here, at the
 *   edge. A single set keeps its half plate (`exactWeight`); an estimate rounds to a whole number.
 *
 * Pure. The read is `fetchRecentTraining` in `data/lift-history-live.ts` (the one lift-history module);
 * the live wrapper is `data/holt-training-live.ts`.
 */

import { displayWeight, exactWeight, type UnitSystem } from '../settings/units.ts';
import { e1rm } from '../workout/metrics.ts';

/** One set. Weight in POUNDS (`0` = bodyweight, `null` = nothing entered). */
export interface TrainingSet {
  weight: number | null;
  reps: number | null;
}

/** One lift inside one session. `id` is the identity `liftId` gives (catalogue key, else the name). */
export interface TrainingLiftEntry {
  id: string;
  name: string;
  sets: TrainingSet[];
}

export interface TrainingSession {
  /** ISO timestamp. */
  startedAt: string;
  lifts: TrainingLiftEntry[];
}

export interface TrainingSummaryOptions {
  units: UnitSystem;
  /** "Now", as an ISO date or timestamp. Injected so tests are deterministic. */
  today: string;
  /** The window, in weeks. Default 8. */
  weeks?: number;
  /** How many lifts to describe. Default 5. */
  maxLifts?: number;
  /** Ceiling on the result. Default 400. */
  maxChars?: number;
}

const DAY = 86_400_000;
/** Epley is trusted up to here; a 25-rep set says nothing about a single. */
const E1RM_MAX_REPS = 10;
/** Inside ±2% across a window is noise, not a trend. */
const FLAT_BAND = 0.02;
const NAME_CHARS = 30;

interface LiftDay {
  at: number;
  sets: TrainingSet[];
}

interface LiftAgg {
  id: string;
  name: string;
  days: LiftDay[];
  last: number;
}

const valid = (s: TrainingSet): s is { weight: number | null; reps: number } =>
  typeof s.reps === 'number' && Number.isFinite(s.reps) && s.reps > 0;

const loaded = (s: TrainingSet): s is { weight: number; reps: number } =>
  valid(s) && typeof s.weight === 'number' && Number.isFinite(s.weight) && s.weight > 0;

/** The day's best estimate, or null when nothing that day is estimable. */
function dayE1rm(d: LiftDay): number | null {
  let best: number | null = null;
  for (const s of d.sets) {
    if (!loaded(s) || s.reps > E1RM_MAX_REPS) continue;
    const v = e1rm(s.weight, s.reps);
    if (best == null || v > best) best = v;
  }
  return best;
}

/** The day's most reps in one set — the bodyweight lift's measure. */
function dayReps(d: LiftDay): number | null {
  let best: number | null = null;
  for (const s of d.sets) if (valid(s) && (best == null || s.reps > best)) best = s.reps;
  return best;
}

/** Older half vs newer half, best of each, so one bad day at either end cannot flip the verdict. */
function trendOf(values: readonly number[]): { from: number; to: number; pct: number } | null {
  if (values.length < 2) return null;
  const cut = Math.floor(values.length / 2);
  const from = Math.max(...values.slice(0, cut));
  const to = Math.max(...values.slice(cut));
  if (!(from > 0)) return null;
  return { from, to, pct: (to - from) / from };
}

const word = (pct: number): string =>
  pct >= FLAT_BAND ? `up ${Math.round(pct * 100)}%` : pct <= -FLAT_BAND ? `down ${Math.round(-pct * 100)}%` : 'flat';

const ago = (days: number): string => (days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`);

const nameOf = (n: string): string => {
  const t = n.replace(/\s+/g, ' ').trim();
  return t.length > NAME_CHARS ? `${t.slice(0, NAME_CHARS - 1)}…` : t;
};

const num = (n: number): string => String(n);

/** One lift's line, or null when nothing about it can be said honestly. */
function liftLine(l: LiftAgg, units: UnitSystem, now: number): string | null {
  const days = [...l.days].sort((a, b) => a.at - b.at);
  const when = ago(Math.floor((now - l.last) / DAY));
  const isLoaded = days.some((d) => d.sets.some(loaded));

  if (isLoaded) {
    let top: { weight: number; reps: number } | null = null;
    for (const d of days)
      for (const s of d.sets)
        if (loaded(s) && (!top || s.weight > top.weight || (s.weight === top.weight && s.reps > top.reps))) top = s;
    if (!top) return null;
    const parts = [`best ${num(exactWeight(top.weight, units).value)}×${top.reps}`];
    const est = days.map(dayE1rm).filter((v): v is number => v != null);
    const t = trendOf(est);
    const w = (lb: number) => num(displayWeight(lb, units).value);
    if (t) parts.push(`e1RM ${w(t.from)}→${w(t.to)} (${word(t.pct)})`);
    else if (est.length === 1) parts.push(`e1RM ${w(est[0])}`);
    parts.push(when);
    return `${nameOf(l.name)} — ${parts.join(', ')}.`;
  }

  const reps = days.map(dayReps).filter((v): v is number => v != null);
  if (reps.length === 0) return null;
  const t = trendOf(reps);
  const parts = [`best ${Math.max(...reps)} reps`];
  if (t) parts.push(`top set ${t.from}→${t.to} reps (${word(t.pct)})`);
  parts.push(when);
  return `${nameOf(l.name)} — ${parts.join(', ')}.`;
}

/**
 * The summary, or null when the window holds no training at all (a new athlete, or a long break) — the
 * caller then attaches nothing, and the prompt tells Holt not to pretend he can see a history.
 */
export function summarizeTraining(sessions: readonly TrainingSession[], opts: TrainingSummaryOptions): string | null {
  const now = Date.parse(opts.today);
  if (!Number.isFinite(now)) return null;
  const weeks = Math.max(1, Math.round(opts.weeks ?? 8));
  const maxLifts = Math.max(1, opts.maxLifts ?? 5);
  const maxChars = Math.max(80, opts.maxChars ?? 400);
  // End of "today", so a session logged this morning is inside the window whatever the clock says.
  const end = now + DAY;
  const start = now - weeks * 7 * DAY;

  const inWindow = sessions
    .map((s) => ({ at: Date.parse(s.startedAt), lifts: s.lifts ?? [] }))
    .filter((s) => Number.isFinite(s.at) && s.at >= start && s.at < end);
  if (inWindow.length === 0) return null;

  // Sessions a week over the last four weeks — or since the first session, for a newer athlete, so ten
  // days of training is not averaged over a month they had not started.
  const recent = inWindow.filter((s) => s.at >= now - 28 * DAY);
  const first = Math.min(...inWindow.map((s) => s.at));
  const spanDays = Math.min(28, Math.max(7, Math.ceil((now - first) / DAY) + 1));
  const perWeek = recent.length / (spanDays / 7);

  const byLift = new Map<string, LiftAgg>();
  for (const s of inWindow) {
    const seen = new Set<string>();
    for (const l of s.lifts) {
      if (!l || !l.id || seen.has(l.id)) continue;
      const sets = (l.sets ?? []).filter(valid);
      if (sets.length === 0) continue;
      seen.add(l.id);
      const agg = byLift.get(l.id) ?? { id: l.id, name: l.name, days: [], last: 0 };
      agg.days.push({ at: s.at, sets });
      if (s.at >= agg.last) {
        agg.last = s.at;
        agg.name = l.name || agg.name;
      }
      byLift.set(l.id, agg);
    }
  }

  const ranked = [...byLift.values()].sort((a, b) => b.days.length - a.days.length || b.last - a.last);

  const unit = opts.units === 'metric' ? 'kg' : 'lb';
  const rate = perWeek >= 10 ? Math.round(perWeek) : Math.round(perWeek * 10) / 10;
  let out = `Last ${weeks} wks: ${rate} session${rate === 1 ? '' : 's'}/wk. Weights in ${unit}.`;
  let described = 0;
  for (const l of ranked) {
    if (described >= maxLifts) break;
    const line = liftLine(l, opts.units, now);
    if (!line) continue;
    if (out.length + 1 + line.length > maxChars) break;
    out += ` ${line}`;
    described += 1;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Which questions need it
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const LIFT = '(?:lift|bench|squat|deadlift|dead ?lift|press|row|curl|pull|use|put on|load|go|do|start|add)';

const TRAINING: RegExp[] = [
  // "am I getting stronger", "am I progressing", "am I improving", "am I on track"
  /\b(am i|i'?m|have i been|have i|are my \w+)\s+(getting\s+)?(stronger|weaker|better|improving|progressing|on track|stalling|stalled|plateau(ing|ed)?|stuck|going up)\b/i,
  /\b(my|i'?ve)\s+(progress|progression|gains|numbers|lifts|strength)\b/i,
  /\bhow('?s| is| are) my (progress|bench|squat|deadlift|press|training|lifts?|strength|numbers)\b/i,
  /\bhow am i (doing|progressing|going)\b/i,
  /\b(plateau(ed|ing)?|stall(ed|ing)?|stuck)\b.*\b(bench|squat|deadlift|press|lift|weight|numbers)\b/i,
  /\b(bench|squat|deadlift|press|lift|weight|numbers)\b.*\b(plateau(ed|ing)?|stall(ed|ing)?|stuck|going up|went up|gone up|dropped)\b/i,
  // "how much should I lift", "what weight should I use", "how heavy should I go"
  new RegExp(`\\bhow (much|heavy|many (kg|kilos|lbs?|pounds|plates))\\b.*\\b(should|can|could|do|would)\\s+i\\s+${LIFT}`, 'i'),
  /\b(what|which) (weight|load)\b/i,
  /\b(add|increase|up|bump|raise)\s+(the\s+)?(weight|load)\b/i,
  // maxes and records
  /\b(my|a|new|estimated)\s+(max|maxes|1\s?rm|one[- ]rep[- ]max|pr|prs|personal (best|record)s?|best)\b/i,
  /\b(e1rm|1rm|one[- ]rep[- ]max)\b/i,
  // "what did I do last week", "how was my last session"
  /\bwhat did i (do|lift|train|bench|squat|deadlift|hit)\b/i,
  /\b(last|past|previous)\s+(week|session|workout|time|month|few weeks)\b.*\b(i|my)\b/i,
  /\b(my|i)\b.*\b(last|past|previous)\s+(week|session|workout|month)\b/i,
  // consistency
  /\bhow (often|many times|many sessions|many workouts|consistent)\b.*\b(have i|did i|i'?ve|am i|been)\b/i,
  /\b(have i|did i|i'?ve|am i)\b.*\b(consistent|sessions|workouts|days)\b.*\b(a|per|this|last)\s+(week|month)\b/i,
];

/** Things that look like the above but are about the program, the form or the app, not the history. */
const NOT_TRAINING = /\b(form|technique|cue|cues|how do i (do|perform|set up)|what is an?|what'?s an?)\b/i;

/**
 * Is this a question about the athlete's OWN training — progress, loads, maxes, recent sessions,
 * consistency? True attaches the training summary to the `ask` context; false sends nothing.
 *
 * Errs toward false: a miss costs an answer from general knowledge, which the prompt already handles,
 * and a false positive costs ~100 tokens. Neither is dangerous; the second is paid on every message.
 */
export function isTrainingQuestion(text: string): boolean {
  const t = (text ?? '').trim();
  if (!t) return false;
  if (!TRAINING.some((re) => re.test(t))) return false;
  // "what's a good weight for a beginner" and "how do I do a deadlift" are not about THEIR history —
  // unless they also say "my"/"I" about loads or progress, which the patterns above already demanded.
  if (NOT_TRAINING.test(t) && !/\b(my|i)\b/i.test(t)) return false;
  return true;
}
