/**
 * Where a squad goal stands — live, met or closed — and what the owner's next goal starts from.
 *
 * `Squad-Architecture-Amendment-006` (LOCKED 2026-09-10). PO: *"A goal in the squad Moch 1 ended without
 * anyone knowing … it still looks like it's going right now."* The card derived one boolean, `goalEnded`,
 * and drew a live bar with a small bronze line under it. A goal met early never changed state at all.
 *
 * ══ THE SERVER'S ANSWER WINS WHEN THERE IS ONE ══
 *
 * 0200 stores the close (`squads.goal_closed_at` + `goal_outcome`). Before 0200 is applied — or in the
 * ≤15 minutes between a deadline and the job reaching it — the state is derived from the clock and the
 * total, which is what the server will decide anyway. Once the server has closed a goal its outcome is
 * final: a workout backdated into a closed window does not reopen it on one phone and not another.
 *
 * ⚠ PURE, RELATIVE `.ts` IMPORTS ONLY — reachable from `node --test`. The clock is always passed in: the
 * strict react-compiler rules forbid `Date.now()` during render, and a test needs a fixed "now".
 */

export type GoalPhase = 'live' | 'met' | 'closed';
export type GoalOutcome = 'met' | 'closed';

export interface GoalStateInput {
  target: number | null;
  progress: number;
  /** ISO deadline, or null for "runs until met" (pre-0103 goals, and any set without an end). */
  endsAt: string | null;
  /** 0200's close. Null while live, and always null before 0200 is applied. */
  closedAt: string | null;
  outcome: GoalOutcome | null;
  now: Date;
}

export interface GoalState {
  phase: GoalPhase;
  /** Live with a deadline: whole days remaining, never below 1 ("Final day"). Null otherwise. */
  daysLeft: number | null;
  /** When it closed, when the server has said so. */
  closedAt: string | null;
  /**
   * Met only, and only when both the close and the deadline are known: calendar days between them.
   * 0 = on the final day. Null = unknown, which the card simply does not mention.
   */
  daysEarly: number | null;
}

const DAY = 86_400_000;

/** Midnight of the LOCAL calendar day an instant falls on. */
function localDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Calendar days from `a` to `b` in local time — DST-safe, because both ends are local midnights. */
export function calendarDaysBetween(a: Date, b: Date): number {
  return Math.round((localDay(b) - localDay(a)) / DAY);
}

export function goalState(i: GoalStateInput): GoalState {
  if (i.closedAt && i.outcome) {
    const daysEarly = i.outcome === 'met' && i.endsAt ? Math.max(0, calendarDaysBetween(new Date(i.closedAt), new Date(i.endsAt))) : null;
    return { phase: i.outcome, daysLeft: null, closedAt: i.closedAt, daysEarly };
  }

  // Met is met whenever it happens — SQ-D3.5, "when the target is reached, the Goal closes".
  if (i.target != null && i.target > 0 && i.progress >= i.target) {
    return { phase: 'met', daysLeft: null, closedAt: null, daysEarly: null };
  }

  if (i.endsAt) {
    const ends = new Date(i.endsAt).getTime();
    if (i.now.getTime() >= ends) return { phase: 'closed', daysLeft: null, closedAt: null, daysEarly: null };
    return { phase: 'live', daysLeft: Math.max(1, Math.ceil((ends - i.now.getTime()) / DAY)), closedAt: null, daysEarly: null };
  }

  return { phase: 'live', daysLeft: null, closedAt: null, daysEarly: null };
}

/** "8 days early" · "a day early" · "on the final day" — or null when there is nothing honest to say. */
export function earlyLabel(daysEarly: number | null): string | null {
  if (daysEarly == null) return null;
  if (daysEarly === 0) return 'on the final day';
  if (daysEarly === 1) return 'a day early';
  return `${daysEarly} days early`;
}

// ── past goals ─────────────────────────────────────────────────────────────────

/**
 * The two histories, one list (Amendment 006 §7). 0200's log is authoritative for anything it holds; a
 * completion it does not hold is a goal met before 0200 existed, and still belongs in the record. Keyed on
 * `startedAt`, which is how both tables identify one goal instance.
 *
 * ⚠ COMPARED AS INSTANTS. The two lists arrive by different routes — an RPC's jsonb and a PostgREST select
 * — and one timestamp can be spelled two ways.
 */
export function mergePastGoals<T extends { startedAt: string; completedAt: string }>(closures: T[], completions: T[], currentStartedAt: string | null): T[] {
  const t = (iso: string | null) => (iso ? new Date(iso).getTime() : NaN);
  const current = t(currentStartedAt);
  const seen = new Set(closures.map((c) => t(c.startedAt)));
  return [...closures, ...completions.filter((c) => !seen.has(t(c.startedAt)))]
    // The goal on screen is not a PAST goal, even once it has closed — it is the card above the list.
    .filter((g) => t(g.startedAt) !== current)
    .sort((a, b) => t(b.completedAt) - t(a.completedAt));
}

// ── the owner's next goal ──────────────────────────────────────────────────────

/**
 * How the goal editor was opened (Amendment 006 §6).
 *
 *   edit  — the pencil on a LIVE goal: everything as it stands. Extending a deadline happens here (D2).
 *   new   — Set the next goal / Set a new goal: a blank goal starting today.
 *   again — Try again: the same goal, the same length, starting today.
 *   raise — Raise the bar: the same metric and length, a higher target, starting today.
 */
export type GoalEditMode = 'edit' | 'new' | 'again' | 'raise';

/** The `?editGoal=` param. `1` is what Squad Goal Detail has always sent for an edit. */
export function parseGoalEditMode(v: string | undefined | null): GoalEditMode | null {
  if (v === '1' || v === 'edit') return 'edit';
  if (v === 'new' || v === 'again' || v === 'raise') return v;
  return null;
}

export interface GoalDraftSource<K extends string = string> {
  goal: string | null;
  goalTarget: number | null;
  goalMetricKind: K;
  goalMetricKey: string | null;
  goalStartedAt: string | null;
  goalEndsAt: string | null;
}

export interface GoalDraft<K extends string = string> {
  title: string;
  target: string;
  metricKind: K;
  metricKey: string | null;
  /** Local `YYYY-MM-DD`. */
  start: string;
  /** Local `YYYY-MM-DD`, or '' for no deadline. */
  end: string;
}

/**
 * A LOCAL `YYYY-MM-DD` for an instant.
 *
 * ⚠ NOT `iso.slice(0, 10)`, which is what the editor used to do. Starts are stored at LOCAL midnight, so
 * east of Greenwich the UTC date is the day before: a goal starting Sep 1 in Sydney is
 * `2026-08-31T14:00:00Z`, and slicing it reopened the editor on the 31st.
 */
export function localYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** The goal's length in calendar days, start to deadline. Null without both ends. */
export function goalLengthDays(startedAt: string | null, endsAt: string | null): number | null {
  if (!startedAt || !endsAt) return null;
  const n = calendarDaysBetween(new Date(startedAt), new Date(endsAt));
  return n > 0 ? n : null;
}

/**
 * The next target when the squad met this one — about a fifth higher, on a round number.
 *
 * A suggestion in an editable field, never a rule. Round because "Reach 612 workouts" reads like a
 * computer's idea of a goal, and a squad sets 600.
 */
export function raisedTarget(target: number): number {
  const raw = Math.ceil(target * 1.2);
  const step = raw >= 500 ? 50 : raw >= 100 ? 10 : raw >= 20 ? 5 : 1;
  return Math.max(target + 1, Math.ceil(raw / step) * step);
}

/** What the editor opens holding, per mode. `today` is passed in for the same reason `now` is above. */
export function goalDraft<K extends string>(mode: GoalEditMode, g: GoalDraftSource<K>, today: Date, blankKind: K): GoalDraft<K> {
  const start = localYmd(today);
  const length = goalLengthDays(g.goalStartedAt, g.goalEndsAt);
  const end = length != null ? localYmd(addDays(today, length)) : '';

  switch (mode) {
    case 'edit':
      return {
        title: g.goal ?? '',
        target: g.goalTarget != null ? String(g.goalTarget) : '',
        metricKind: g.goalMetricKind,
        metricKey: g.goalMetricKey,
        start: g.goalStartedAt ? localYmd(new Date(g.goalStartedAt)) : start,
        end: g.goalEndsAt ? localYmd(new Date(g.goalEndsAt)) : '',
      };
    case 'again':
      return {
        title: g.goal ?? '',
        target: g.goalTarget != null ? String(g.goalTarget) : '',
        metricKind: g.goalMetricKind,
        metricKey: g.goalMetricKey,
        start,
        end,
      };
    case 'raise':
      // The title usually names the old number ("500 workouts in September"), so it starts blank and the
      // card falls back to "Reach 600 workouts" until the owner writes a new one.
      return {
        title: '',
        target: g.goalTarget != null ? String(raisedTarget(g.goalTarget)) : '',
        metricKind: g.goalMetricKind,
        metricKey: g.goalMetricKey,
        start,
        end,
      };
    case 'new':
      return { title: '', target: '', metricKind: blankKind, metricKey: null, start, end: '' };
  }
}
