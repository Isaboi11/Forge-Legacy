import { assembleSignals, isMeaningfulRawSession, type RawRankInputs, type RawSession } from './signals.ts';
import { resolveRank, type RankSignals } from './rank.ts';
import { FAMILIES, FAMILY_PROMOTIONS, type AthleteType, type RankFamily } from './thresholds.ts';

/**
 * WHEN EACH RUNG WAS EARNED, AND WHAT IT TOOK — replayed, because it was never written down.
 *
 * PO, 2026-09-10, on the 28-rung Rank Journey: *"should each of those be clickable to see what we did to
 * accomplish them/earn them?"* — then *"Let's make them tapable."*
 *
 * ══ THERE IS NO RANK HISTORY TABLE, AND THIS DOES NOT NEED ONE ══
 *
 * `athlete_rank_state` holds the CURRENT rank and nothing else. But rank is not a stored fact — it is a
 * pure function of training history (`resolveRank(assembleSignals(raw))`), and the history IS stored,
 * dated. So "when did I reach Builder II" has an exact answer: run the engine as of each day, in order,
 * and note the first day it says so. The engine replayed is the engine that promoted you — not a
 * reconstruction of it — so the date and the numbers cannot disagree with the rule.
 *
 * ⚠ EVERY DAY, NOT EVERY WORKOUT DAY. The time gate (`journeyElapsedDays`) and the recent-engagement
 *   window both move with the calendar, so a promotion can land on a day nothing was logged — the day
 *   the last requirement standing was simply time. Stepping only through event days would date it to
 *   the next session instead.
 *
 * ⚠ RANK NEVER DECREASES (RSA §3.3), so the replay keeps a running maximum. A rung skipped in one jump
 *   (a family crossing that lands straight on sub-tier II) shares the day of the jump — it was earned
 *   then, and there is no truer date to give it.
 *
 * ⚠ PURE, RELATIVE `.ts` IMPORTS ONLY — reachable from `node --test`.
 */

/** A graduated program: when, and which PLAN (`source_definition_id ?? id:<row>` — see `distinctProgramCount`). */
export interface DatedGraduation {
  date: string;
  planKey: string;
}

/** A goal on a sealed chapter: it resolved the day its chapter sealed (RCM §6.6). */
export interface DatedGoal {
  date: string;
  primaryAchieved: boolean;
}

/** The engine's raw inputs with a DATE on every countable thing, so they can be cut at any day. */
export interface DatedRankInputs {
  athleteType: AthleteType;
  sessions: RawSession[];
  loadPRDates: string[];
  graduations: DatedGraduation[];
  sealedChapterDates: string[];
  resolvedGoals: DatedGoal[];
}

const DAY_MS = 86_400_000;
const day = (iso: string) => iso.slice(0, 10);

/**
 * The raw inputs exactly as they stood at the end of `dayISO`.
 *
 * At today this must produce what `buildRankSignals` always produced — `history.test.mjs` holds it to
 * that, so the replay's last step and the live rank are one computation, not two that happen to agree.
 */
export function rawAsOf(d: DatedRankInputs, dayISO: string): RawRankInputs {
  const cut = day(dayISO);
  const on = (iso: string) => day(iso) <= cut;
  const grads = d.graduations.filter((g) => on(g.date));
  const goals = d.resolvedGoals.filter((g) => on(g.date));
  return {
    athleteType: d.athleteType,
    today: cut,
    sessions: d.sessions.filter((s) => on(s.date)),
    loadPRDates: d.loadPRDates.filter(on),
    programGraduations: grads.length,
    distinctProgramGraduations: new Set(grads.map((g) => g.planKey)).size,
    sealedChapters: d.sealedChapterDates.filter(on).length,
    goalEvents: goals.length,
    primaryGoalsAchieved: goals.filter((g) => g.primaryAchieved).length,
  };
}

export const RUNGS_PER_FAMILY = 4;
export const RUNG_COUNT = FAMILIES.length * RUNGS_PER_FAMILY;

/** A rung's position among all 28 — family, then sub-tier I→IV. Foundation · I is 0. */
export const rungIndex = (family: RankFamily, level: number): number => FAMILIES.indexOf(family) * RUNGS_PER_FAMILY + (level - 1);

export interface RungEarned {
  /** The day the engine first placed the athlete on (or past) this rung. */
  date: string;
  /** Everything the engine read that day — the "what it took". */
  signals: RankSignals;
}

/**
 * Replay the engine day by day from the first dated event to `todayISO`; return each earned rung → the
 * day it was first reached and the signals of that day. Rungs never reached are absent.
 *
 * No history at all returns an empty map: the athlete stands on Foundation · I because everyone starts
 * there, not because of a day that can be named.
 */
export function replayRungs(d: DatedRankInputs, todayISO: string): Map<number, RungEarned> {
  const out = new Map<number, RungEarned>();
  const events = [
    ...d.sessions.map((s) => s.date),
    ...d.loadPRDates,
    ...d.graduations.map((g) => g.date),
    ...d.sealedChapterDates,
  ].map(day);
  if (!events.length) return out;

  const first = events.reduce((a, b) => (a < b ? a : b));
  const last = day(todayISO);
  // The time gates run from the first MEANINGFUL session, exactly as `journeyElapsedDays` does.
  const meaningful = d.sessions.filter(isMeaningfulRawSession).map((s) => day(s.date));
  const journeyStart = meaningful.length ? meaningful.reduce((a, b) => (a < b ? a : b)) : first;
  let best = -1;
  for (const today of candidateDays(events, first, last, journeyStart)) {
    const signals = assembleSignals(rawAsOf(d, today));
    const r = resolveRank(signals);
    const idx = rungIndex(r.family, r.subTier);
    if (idx > best) {
      for (let i = best + 1; i <= idx; i++) out.set(i, { date: today, signals });
      best = idx;
    }
  }
  return out;
}

/**
 * The only days on which the engine's answer CAN change — so the only days worth asking it.
 *
 * Running it on every calendar day was exact and far too slow (≈1.2 s for two years on a desktop, several
 * times that on a phone). But between these days every signal is constant, so skipping the rest loses
 * nothing:
 *   · a dated EVENT (session, PR, graduation, seal) changes a count;
 *   · a MONDAY moves the recent-engagement window, which is bucketed by week (`countRecentActiveWeeks`);
 *   · the day `journeyElapsedDays` first reaches a family's TIME GATE flips that one comparison.
 * `journeyElapsedDays` matters nowhere else, and the improvement summary reads only PR dates.
 * `history.test.mjs` asserts this set yields the same dates as the every-day walk.
 */
export function candidateDays(events: readonly string[], first: string, last: string, journeyStart: string = first): string[] {
  const days = new Set<string>();
  for (const e of events) if (e >= first && e <= last) days.add(e);
  const start = Date.parse(`${first}T00:00:00Z`);
  const end = Date.parse(`${last}T00:00:00Z`);
  // Mondays: step to the first one on/after `first`, then weekly.
  const offset = (8 - new Date(start).getUTCDay()) % 7;
  for (let t = start + offset * DAY_MS; t <= end; t += 7 * DAY_MS) days.add(new Date(t).toISOString().slice(0, 10));
  const journey = Date.parse(`${journeyStart}T00:00:00Z`);
  for (const gate of TIME_GATES) {
    const t = journey + gate * DAY_MS;
    if (t >= start && t <= end) days.add(new Date(t).toISOString().slice(0, 10));
  }
  days.add(first);
  days.add(last);
  return [...days].sort();
}

const TIME_GATES: readonly number[] = [...new Set(Object.values(FAMILY_PROMOTIONS).map((p) => p.timeGateDays))].filter((g) => g > 0);

/**
 * The session that tipped a rung: the last one logged on or before the day it was earned.
 *
 * Null when nothing was logged that day — the rung then fell to the calendar (a time gate, or a PR or
 * seal recorded that day), and naming an older session as "the one that did it" would be invented.
 */
export function clinchingSession<T extends RawSession>(sessions: readonly T[], earnedDate: string): T | null {
  const d = day(earnedDate);
  let pick: T | null = null;
  for (const s of sessions) {
    if (day(s.date) !== d) continue;
    if (!pick || s.date > pick.date) pick = s;
  }
  return pick;
}
