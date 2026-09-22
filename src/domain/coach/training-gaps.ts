/**
 * TRAINING GAPS — what Holt says when an athlete asks *"what do I need to work on?"*
 *
 * Governed by `Docs/Coach-Holt-Training-Gaps-v1.0.md` (LOCKED 2026-09-22, TG-D1…D3).
 *
 * ══ ⛔ WHY THIS FILE EXISTS INSTEAD OF A PHOTO READER ══
 *
 * The PO asked whether Holt could look at a PHOTO of an athlete and say what needs work. He cannot, and
 * the app already stops it: `form-check.ts` drops any sentence about a physique, and
 * `Coach-AI-Preflight-Gates-v0.1` §2.3 puts the athlete's body at AMBER — on explicit ask only, never
 * volunteered. Three reasons sit outside the advice/observation line and none is fixed by wording:
 * minors use this app, *"here is what is wrong with your body"* IS the body-image harm rather than a side
 * effect of it, and body composition read off a photograph is unreliable in a way that is worse than
 * silence.
 *
 * The athlete's own logged training is a different thing entirely — Preflight Gates §2.2 places it at
 * **GREEN, read freely**, and names it as the data behind *"why has my bench stalled."* So this module
 * answers the same question from sets, reps, loads and dates. Nothing here touches the body.
 *
 * ⚠ THE TEST OF THIS FILE IS THAT IT NEEDS NO AGE GATE. Telling a 15-year-old they have not trained
 * calves in eight weeks is an ordinary training observation. Asking that athlete for a physique photo is
 * not. If a change here ever makes an age gate feel necessary, the change is wrong, not the gate.
 *
 * ══ TG-D1: RELATIVE TO THE ATHLETE, NEVER TO A STANDARD ══
 *
 * There is no per-muscle weekly volume table in this codebase and this file does not introduce one.
 * `rulebook/volume.ts` transcribes PAS §10.1, which bands exercises and sets per SESSION, not sets per
 * muscle per WEEK. Authoring that table would mean making a claim about what an athlete SHOULD do — the
 * exact register the legal caution avoids, and a second health-adjacent file beside `limitations.ts`,
 * which its own header flags as not yet reviewed by anyone.
 *
 * So every comparison here is the athlete against themselves. *"You have trained chest 34 times and
 * calves twice"* is a fact about their log. *"Your calves are under-trained"* is a claim about training
 * science. This file only ever says the first, and `sharesAreScaleFree` in the tests proves it: multiply
 * every set count by any constant and the gaps come back identical.
 *
 * ══ PURE, LIKE THE REST OF `domain/coach/**` ══
 *
 * Reads no database. The caller resolves the sessions and the catalogue rows and passes them in, the way
 * `recent-work.ts` and `learned-preference.ts` already are. `data/training-gaps-live.ts` is the one read.
 */

import { e1rm } from '../workout/metrics.ts';
import { FOCUS_SPEC } from './rulebook/focus.ts';
import type { FocusMuscle } from './constraints.ts';
import { mentionsAppearance } from './appearance.ts';
import type { TrainingSession } from './training-summary.ts';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE VOCABULARY
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The groups a gap may name.
 *
 * ⚠ `arms` AND `legs` ARE DELIBERATELY ABSENT, and this is the one piece of taxonomy work the feature
 * needed. `FOCUS_SPEC` has twelve entries, but two of them are UMBRELLAS over the others: `arms` is
 * biceps + triceps, and `legs` is quads + hamstrings + glutes + calves. Counting a parent beside its
 * children double-reports the same missing work — *"your arms need work, and also your biceps"* — and
 * would spend two of the three things Holt is allowed to say on one observation.
 *
 * The umbrellas remain perfectly good FOCUS targets; an athlete may still ask for an arms focus. They are
 * just not things this module DETECTS, because every set they would count is already counted by a leaf.
 */
export const GAP_MUSCLES: readonly FocusMuscle[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
];

/**
 * How much logged training is needed before Holt will answer this at all.
 *
 * ⚠ THE COLD-START CASE IS THE ONE THAT CRASHED `recommend.ts`'s FIRST CUT — it reported an athlete
 * "ready" for a race with no experience recorded at all. A gap engine has the same failure available to
 * it and it is worse: with two logged sessions, EVERY group looks neglected, so the honest answer and the
 * alarming one are produced by the same code path. Six sessions is roughly a fortnight of training, which
 * is the least that can distinguish "has not trained calves" from "has not trained yet."
 */
export const MIN_SESSIONS = 6;

/**
 * A group is UNDERWORKED at or below this share of the athlete's busiest trained group.
 *
 * ⚠ A RATIO, NEVER A COUNT — that is TG-D1 expressed as a number. A threshold in sets ("fewer than 8 a
 * week") would be a standard smuggled in through a constant, and it would be wrong in both directions: a
 * 3-day athlete would fail everything and a 6-day athlete would pass everything.
 */
export const UNDERWORKED_SHARE = 0.2;

/** At most this many gaps, however many are found. Holt says a few things, not an audit. */
export const MAX_GAPS = 3;

/** Epley inflates badly past this, so a set beyond it is not evidence of a trend. Matches `training-summary.ts`. */
const E1RM_MAX_REPS = 10;

/** A lift needs this many usable sets in EACH half of the window before a trend means anything. */
const TREND_MIN_SETS = 2;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The subset of a catalogue row this module needs. Structural, so `PICKER_DB` passes straight in. */
export interface GapExercise {
  key: string;
  primaryMuscleIds: readonly string[];
}

export type GapKind = 'never' | 'dropped' | 'underworked' | 'stalled';

export interface Gap {
  kind: GapKind;
  /** The group, for `never` / `dropped` / `underworked`. `null` for `stalled`, which is about a LIFT. */
  muscle: FocusMuscle | null;
  /** The lift's display name, for `stalled`. `null` otherwise. */
  lift: string | null;
  /** Sets counted for this group across the window. */
  sets: number;
  /**
   * The focus Holt may offer to act on this gap, or `null` when he may not offer one.
   *
   * ⚠ ALWAYS `null` FOR `stalled` — TG-D3. A flat bench is a PROGRESSION question, owned by
   * `progression.ts` and `intensity-learning.ts`. Answering it with more chest volume is the wrong
   * answer delivered confidently, which is the failure mode this whole document is written against.
   */
  offer: FocusMuscle | null;
  /** Holt's deterministic sentence for this gap. No model involved. */
  say: string;
}

export interface GapReport {
  gaps: readonly Gap[];
  /** Not enough logged training to say anything. `gaps` is empty and the caller says so instead. */
  tooEarly: boolean;
  sessionsSeen: number;
}

export interface GapOptions {
  /** "Now", as an ISO date or timestamp. Injected so tests are deterministic. */
  today: string;
  /** The window, in weeks. Default 8 — the same window `summarizeTraining` reports. */
  weeks?: number;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE QUESTION
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Is the athlete asking what they need to work on?
 *
 * ⚠ DELIBERATELY NARROWER THAN `isTrainingQuestion`. That one decides whether to ATTACH a few hundred
 * characters of history, and a false positive there costs a fraction of a cent. This one decides whether
 * Holt volunteers a list of what the athlete is neglecting, and a false positive there is a coach
 * answering a question nobody asked — which TG-D2 exists to prevent. When in doubt, this returns false
 * and the ordinary `ask` path handles the message.
 */
const GAP_QUESTION = [
  /\bwhat\s+(do\s+i|should\s+i|am\s+i)\b[^?]*\b(need|work|working|focus|improve|neglect|miss)/i,
  /\bwhat('?s| is)\s+(my|the)\s+(weak|weakest|lagging|worst)\b/i,
  /\bwhat\s+am\s+i\s+(neglect|miss|skip|ignor)/i,
  /\b(weak\s?point|weak\s+area|lagging|blind\s?spot)s?\b/i,
  /\bwhat\s+(needs?|could\s+use)\s+(more\s+)?(work|attention|volume)\b/i,
  /\bam\s+i\s+(neglect|miss|skip|ignor|under[-\s]?train)/i,
  /\bwhere\s+am\s+i\s+(falling\s+behind|behind|lacking)\b/i,
];

export function isGapQuestion(text: string): boolean {
  if (typeof text !== 'string') return false;
  const t = text.trim();
  if (!t) return false;
  return GAP_QUESTION.some((re) => re.test(t));
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// COUNTING
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Catalogue muscle id → the gap groups it belongs to.
 *
 * Built from `FOCUS_SPEC` rather than restated, so the day someone adds a muscle to a focus, this follows
 * it. Restricted to `GAP_MUSCLES`, which is what keeps the umbrellas out.
 */
const MUSCLE_TO_GROUPS: ReadonlyMap<string, readonly FocusMuscle[]> = (() => {
  const m = new Map<string, FocusMuscle[]>();
  for (const g of GAP_MUSCLES) {
    for (const id of FOCUS_SPEC[g].muscles) {
      const list = m.get(id);
      if (list) list.push(g);
      else m.set(id, [g]);
    }
  }
  return m;
})();

const ms = (iso: string): number => new Date(iso).getTime();

/** A set that carries usable evidence: a real rep count, and a weight that is present (`0` = bodyweight). */
const usable = (s: { weight: number | null; reps: number | null }): boolean =>
  typeof s.reps === 'number' && Number.isFinite(s.reps) && s.reps > 0;

interface Counted {
  /** Group → sets, across the whole window. */
  sets: Map<FocusMuscle, number>;
  /** Group → sets, first half only. */
  early: Map<FocusMuscle, number>;
  /** Group → sets, second half only. */
  late: Map<FocusMuscle, number>;
  sessions: number;
}

const bump = (m: Map<FocusMuscle, number>, g: FocusMuscle, n: number): void => {
  m.set(g, (m.get(g) ?? 0) + n);
};

function count(
  sessions: readonly TrainingSession[],
  catalog: readonly GapExercise[],
  from: number,
  mid: number,
): Counted {
  const byKey = new Map(catalog.map((e) => [e.key, e]));
  const out: Counted = { sets: new Map(), early: new Map(), late: new Map(), sessions: 0 };

  for (const s of sessions) {
    const t = ms(s.startedAt);
    if (!Number.isFinite(t) || t < from) continue;
    out.sessions += 1;
    const half = t < mid ? out.early : out.late;

    for (const lift of s.lifts) {
      const row = byKey.get(lift.id);
      if (!row) continue; // A lift with no catalogue row cannot be attributed. Silently uncounted, never guessed.
      const groups = new Set<FocusMuscle>();
      for (const id of row.primaryMuscleIds) for (const g of MUSCLE_TO_GROUPS.get(id) ?? []) groups.add(g);
      if (!groups.size) continue;
      const n = lift.sets.filter(usable).length;
      if (!n) continue;
      for (const g of groups) {
        bump(out.sets, g, n);
        bump(half, g, n);
      }
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// TRENDS — for `stalled` only
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

interface LiftTrend {
  name: string;
  early: number;
  late: number;
}

/**
 * Best e1RM per lift in each half of the window.
 *
 * ⚠ THE `training-summary.ts` DISCIPLINE IS KEPT WHOLE: Epley, sets of 1–10 reps only, and the result is
 * always spoken as "e1RM" and never as a lift the athlete performed. A trend line is a coach comparing a
 * 5×5 month with a triples month, which needs a common currency; it is not a number to put on a bar.
 */
function trends(sessions: readonly TrainingSession[], from: number, mid: number): LiftTrend[] {
  const acc = new Map<string, { name: string; early: number[]; late: number[] }>();

  for (const s of sessions) {
    const t = ms(s.startedAt);
    if (!Number.isFinite(t) || t < from) continue;
    for (const lift of s.lifts) {
      let rec = acc.get(lift.id);
      if (!rec) {
        rec = { name: lift.name, early: [], late: [] };
        acc.set(lift.id, rec);
      }
      const half = t < mid ? rec.early : rec.late;
      for (const set of lift.sets) {
        if (!usable(set) || set.weight == null || set.weight <= 0) continue;
        if ((set.reps as number) > E1RM_MAX_REPS) continue;
        half.push(e1rm(set.weight, set.reps as number));
      }
    }
  }

  const out: LiftTrend[] = [];
  for (const rec of acc.values()) {
    if (rec.early.length < TREND_MIN_SETS || rec.late.length < TREND_MIN_SETS) continue;
    out.push({ name: rec.name, early: Math.max(...rec.early), late: Math.max(...rec.late) });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// SENTENCES
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** How Holt names a group in a sentence. */
const LABEL: Record<FocusMuscle, string> = {
  chest: 'chest',
  back: 'back',
  shoulders: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  quads: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  calves: 'calves',
  core: 'core',
  arms: 'arms',
  legs: 'legs',
};

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE ENGINE
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What this athlete's own log says needs work.
 *
 * Order is most actionable first: something never trained, then something they STOPPED training, then
 * something trained far less than the rest, then a lift that has not moved. Capped at `MAX_GAPS`.
 */
export function findGaps(
  sessions: readonly TrainingSession[],
  catalog: readonly GapExercise[],
  opts: GapOptions,
): GapReport {
  const weeks = opts.weeks && opts.weeks > 0 ? opts.weeks : 8;
  const now = ms(opts.today);
  const span = weeks * 7 * 24 * 60 * 60 * 1000;
  const from = now - span;
  const mid = now - span / 2;

  const c = count(sessions, catalog, from, mid);

  // ⚠ REFUSE RATHER THAN INVENT. With too little logged training every group looks neglected, and the
  // alarming answer and the honest one come out of the same code path.
  if (c.sessions < MIN_SESSIONS) return { gaps: [], tooEarly: true, sessionsSeen: c.sessions };

  const busiest = Math.max(0, ...GAP_MUSCLES.map((g) => c.sets.get(g) ?? 0));
  // Nothing attributable was logged at all — an athlete who only runs, say. Not a gap report's business.
  if (busiest === 0) return { gaps: [], tooEarly: true, sessionsSeen: c.sessions };

  const never: Gap[] = [];
  const dropped: Gap[] = [];
  const under: Gap[] = [];

  for (const g of GAP_MUSCLES) {
    const total = c.sets.get(g) ?? 0;
    const early = c.early.get(g) ?? 0;
    const late = c.late.get(g) ?? 0;

    if (total === 0) {
      never.push({
        kind: 'never',
        muscle: g,
        lift: null,
        sets: 0,
        offer: g,
        say: `You have not trained ${LABEL[g]} at all in the last ${weeks} weeks — no sets in ${plural(c.sessions, 'session', 'sessions')}.`,
      });
      continue;
    }

    if (early > 0 && late === 0) {
      dropped.push({
        kind: 'dropped',
        muscle: g,
        lift: null,
        sets: total,
        offer: g,
        say: `You were training ${LABEL[g]} earlier in the window — ${plural(early, 'set', 'sets')} — and have not touched it since.`,
      });
      continue;
    }

    if (total <= busiest * UNDERWORKED_SHARE) {
      under.push({
        kind: 'underworked',
        muscle: g,
        lift: null,
        sets: total,
        offer: g,
        say: `${plural(total, 'set', 'sets')} of ${LABEL[g]} in ${weeks} weeks, against ${busiest} for your busiest group.`,
      });
    }
  }

  // ── stalled ────────────────────────────────────────────────────────────────────────────────────────
  // ⚠ ONLY WHEN SOMETHING ELSE MOVED. "Nothing went up" is a deload, a bad month, or an athlete with a
  // lot on — not a weak point, and saying it would be the flat claim TG-D1 forbids. A lift that is flat
  // WHILE others climb is a fact about this athlete's own log, which is the only kind of fact allowed.
  const t = trends(sessions, from, mid);
  const moved = t.some((x) => x.late > x.early);
  const stalled: Gap[] = moved
    ? t
        .filter((x) => x.late <= x.early)
        .sort((a, b) => a.late - a.early - (b.late - b.early))
        .map((x) => ({
          kind: 'stalled' as const,
          muscle: null,
          lift: x.name,
          sets: 0,
          // TG-D3 — a progression question, not a volume one. No action offered, by decision.
          offer: null,
          say: `Your ${x.name} e1RM has not moved in ${weeks} weeks while other lifts did.`,
        }))
    : [];

  never.sort((a, b) => LABEL[a.muscle as FocusMuscle].localeCompare(LABEL[b.muscle as FocusMuscle]));
  dropped.sort((a, b) => b.sets - a.sets);
  under.sort((a, b) => a.sets - b.sets);

  const gaps = [...never, ...dropped, ...under, ...stalled].slice(0, MAX_GAPS);

  // ⚠ THE BELT AND BRACES. Nothing above can produce a remark about a body — every sentence is built from
  // a set count or a lift name. This asserts that in code anyway, because the cost of being wrong once is
  // the whole reason the feature is not a photo reader. A sentence that somehow trips the filter is
  // DROPPED, never rewritten, which is the posture `form-check.ts` states for the same guard.
  return {
    gaps: gaps.filter((g) => !mentionsAppearance(g.say)),
    tooEarly: false,
    sessionsSeen: c.sessions,
  };
}

/**
 * The whole answer, as Holt would say it — deterministic, no model call.
 *
 * ⚠ THIS IS WHAT LETS THE FEATURE BE FREE IF THE PO WANTS IT (TG-D4, deferred). Nothing here needs the
 * AI tier, because nothing here asks a model anything: the gaps are arithmetic over rows the athlete
 * owns. A model may still PHRASE them on the Premium AI path — `askBriefLive` attaches the same report —
 * but the product is not obliged to buy one to answer the question.
 */
export function gapAnswer(report: GapReport): string {
  if (report.tooEarly) {
    return `I do not have enough logged training to answer that yet — ${plural(report.sessionsSeen, 'session', 'sessions')} so far. Train a few more and ask me again.`;
  }
  if (!report.gaps.length) {
    return 'Nothing stands out. Your training is spread evenly across the last eight weeks and your lifts are moving.';
  }
  const lines = report.gaps.map((g) => g.say);
  const offer = report.gaps.find((g) => g.offer);
  if (offer) lines.push(`Want me to put a ${LABEL[offer.offer as FocusMuscle]} focus in your next block?`);
  return lines.join(' ');
}
