/**
 * WHAT THE MODEL SAID, NARROWED TO WHAT THE ENGINE ACCEPTS.
 *
 * ══ WHY THIS IS CODE AND NOT A SCHEMA ══
 *
 * `coach-interpret` used structured outputs until 2026-09-21. The nullable-union schema failed every call
 * at 23 unions; the optional-fields rewrite then came back HTTP 400 *"Schema is too complex"*, and the
 * first attempt sat through a 150-second idle timeout while the grammar compiled. So the model now answers
 * in plain JSON under a prompt contract, and **nothing it returns is trusted**: every field is checked
 * here against the same enums and ranges the schema used to enforce, and anything outside them is dropped
 * rather than repaired. A dropped field is asked again; a wrong field is a program built on a lie.
 *
 * ⚠ DEPENDENCY-FREE ON PURPOSE. The Edge Function imports this module and the dashboard paste copy
 * (`supabase/apply/deploy-coach-interpret.ts`) inlines it in place of the import line, exactly like
 * `medical-routing.ts`. An import here would break that copy.
 */

export const ROUTES = [
  'patch', 'answer', 'edit', 'import', 'pick', 'build', 'build_day', 'medical_stop', 'unclear', 'crisis', 'urgent', 'care',
] as const;
export type ModelRoute = (typeof ROUTES)[number];

export const GOALS = [
  'strength', 'muscle', 'weight_loss', 'conditioning', 'mobility', 'health',
  'run_5k', 'run_10k', 'run_half', 'run_marathon', 'triathlon',
] as const;
export const LIMITATIONS = [
  'shoulders', 'knees', 'lower_back', 'no_jumping', 'no_overhead', 'no_barbell', 'no_running',
] as const;
export const EXPERIENCE = ['beginner', 'intermediate', 'advanced'] as const;
export const ENVIRONMENTS = ['full_gym', 'home', 'bodyweight', 'outdoor'] as const;
export const FOCUS_MUSCLES = [
  'glutes', 'arms', 'biceps', 'triceps', 'shoulders', 'chest', 'back', 'legs', 'quads', 'hamstrings', 'calves', 'core',
] as const;
export const SESSION_MINUTES = [30, 45, 60, 75] as const;
export const DAY_KINDS = ['run', 'lift', 'rest', 'cardio'] as const;
export const EDIT_OPS = ['swap', 'sets', 'reps', 'distance', 'duration', 'rebuild'] as const;
export const EDIT_SCOPES = ['this_week', 'rest_of_block'] as const;

/**
 * "Change my program by typing" — what the athlete asked for, in their words. Resolved against the real
 * program on the device by `edit-intent.ts`; nothing here is a catalogue key or an index.
 */
export interface EditIntent {
  op: (typeof EDIT_OPS)[number];
  /** The movement as the athlete named it — "bench". */
  exercise?: string;
  /** The replacement as named — "dumbbell press". */
  to?: string;
  /** The day as named — "Monday", "leg day", "tomorrow", "Wednesday's session". */
  day?: string;
  sets?: number;
  reps?: number;
  miles?: number;
  minutes?: number;
  scope?: (typeof EDIT_SCOPES)[number];
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | undefined =>
  typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : undefined;
const num = (v: unknown, lo: number, hi: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined;
const int = (v: unknown, lo: number, hi: number): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : undefined;
const text = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t && t.length <= max ? t : undefined;
};

/**
 * The first JSON object in the model's text, or null.
 *
 * Tolerates the two ways a model breaks a "JSON only" instruction — a ```json fence, and a sentence before
 * or after the object — by taking the span from the first `{` to the last `}`. Anything that still does not
 * parse is null, and the caller routes it `unclear`.
 */
export function parseModelJson(raw: unknown): Obj | null {
  if (typeof raw !== 'string') return null;
  const unfenced = raw.replace(/```(?:json)?/gi, '');
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(unfenced.slice(start, end + 1));
    return isObj(v) ? v : null;
  } catch {
    return null;
  }
}

export const narrowRoute = (v: unknown): ModelRoute | null => oneOf(ROUTES, v) ?? null;

/** Holt's line, trimmed to the length the route allows. Anything that is not a string is no line at all. */
export function narrowSay(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

/**
 * The race date, computed HERE from a week count, or a stated date checked for sense.
 *
 * ⚠ The model is bad at calendar arithmetic and has no clock of its own — it wrote `P10W`, and dates two
 * years in the past. So it reports a week count and this does the sum. A stated date that is not a real
 * YYYY-MM-DD, or is already past, is dropped: Holt asks again rather than building toward a race that
 * happened last year.
 */
export function raceDateFrom(inWeeks: unknown, stated: unknown, todayISO: string): string | null {
  const base = new Date(`${todayISO}T00:00:00Z`);
  const weeks = num(inWeeks, 0, 104);
  if (weeks !== undefined) {
    return new Date(base.getTime() + Math.round(weeks) * 7 * 864e5).toISOString().slice(0, 10);
  }
  if (typeof stated === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(stated)) {
    const d = new Date(`${stated}T00:00:00Z`);
    if (!Number.isNaN(d.getTime()) && d.getTime() >= base.getTime()) return stated;
  }
  return null;
}

/**
 * The model's `patch`, as a `Partial<CoachConstraints>` the engine accepts — or `{}`.
 *
 * Every field is checked, never coerced into range: a `daysPerWeek` of 9 is dropped, not clamped to 7,
 * because a clamp is the code inventing an answer the athlete did not give.
 */
export function narrowPatch(p: unknown, todayISO: string): Obj {
  if (!isObj(p)) return {};
  const out: Obj = {};

  const goal = oneOf(GOALS, p.goal);
  if (goal) out.goal = goal;

  const days = int(p.daysPerWeek, 1, 7);
  if (days !== undefined) {
    out.daysPerWeek = days;
    // A 1- or 7-day week is the athlete's own call; the engine honours it only when told so (CA-D12).
    if (days < 2 || days > 6) out.athleteSetDays = true;
  }

  const minutes = num(p.sessionMinutes, 1, 600);
  if (minutes !== undefined) {
    out.sessionMinutes = SESSION_MINUTES.reduce((best, m) => (Math.abs(m - minutes) < Math.abs(best - minutes) ? m : best));
  }

  const env = oneOf(ENVIRONMENTS, p.environment);
  if (env) out.environment = env;

  const race = raceDateFrom(p.raceInWeeks, p.raceDate, todayISO);
  if (race) out.raceDate = race;

  const weeks = int(p.weeks, 1, 52);
  if (weeks !== undefined) out.weeks = weeks;

  const mi = num(p.currentWeeklyMi, 0, 150);
  if (mi !== undefined) out.currentWeeklyMi = mi;

  const focus = text(p.dayFocus, 60);
  if (focus) out.dayFocus = focus;

  if (Array.isArray(p.focusMuscles)) {
    const muscles = [...new Set(p.focusMuscles.map((m) => oneOf(FOCUS_MUSCLES, m)).filter((m) => m !== undefined))];
    if (muscles.length) out.focusMuscles = muscles;
  }

  if (Array.isArray(p.pinned)) {
    const pinned = p.pinned
      .filter(isObj)
      .map((x) => {
        const name = text(x.name, 60);
        if (!name) return null;
        const pin: Obj = { name };
        const day = int(x.day, 0, 6);
        const sets = int(x.sets, 1, 10);
        const reps = int(x.reps, 1, 50);
        if (day !== undefined) pin.day = day;
        if (sets !== undefined) pin.sets = sets;
        if (reps !== undefined) pin.reps = reps;
        return pin;
      })
      .filter((x) => x !== null)
      .slice(0, 12);
    if (pinned.length) out.pinned = pinned;
  }

  if (Array.isArray(p.days)) {
    const list = p.days
      .filter(isObj)
      .map((x) => {
        const kind = oneOf(DAY_KINDS, x.kind);
        if (!kind) return null;
        const d: Obj = { kind };
        const f = text(x.focus, 40);
        const runMi = num(x.runMi, 0, 30);
        const runMin = num(x.runMin, 0, 240);
        if (f) d.focus = f;
        if (runMi !== undefined) d.runMi = runMi;
        if (runMin !== undefined) d.runMin = Math.round(runMin);
        return d;
      })
      .filter((x) => x !== null)
      .slice(0, 7);
    // ⚠ ALL OR NOTHING. A week with one day dropped is a different week — Wednesday's lift would move to
    // Tuesday. If any entry failed, the week is not carried and Holt asks for it again.
    if (list.length && list.length === Math.min(7, p.days.length)) {
      out.days = list;
      out.daysAsGiven = p.daysAsGiven === true;
    }
  }

  if (Array.isArray(p.limitations)) {
    const kept = [...new Set(p.limitations.map((l) => oneOf(LIMITATIONS, l)).filter((l) => l !== undefined))];
    // `[]` is a real answer ("nothing bothers me"); a list whose every entry was junk is not the same answer.
    if (kept.length || p.limitations.length === 0) out.limitations = kept;
  }

  const lifting = oneOf(EXPERIENCE, p.experienceLifting);
  const running = oneOf(EXPERIENCE, p.experienceRunning);
  if (lifting || running) {
    out.experience = { ...(lifting ? { lifting } : {}), ...(running ? { running } : {}) };
  }

  return out;
}

/** The model's `edit`, or null when it is missing or its op is not one the device can perform. */
export function narrowEdit(e: unknown): EditIntent | null {
  if (!isObj(e)) return null;
  const op = oneOf(EDIT_OPS, e.op);
  if (!op) return null;
  const out: EditIntent = { op };
  const exercise = text(e.exercise, 60);
  const to = text(e.to, 60);
  const day = text(e.day, 60);
  const sets = int(e.sets, 1, 10);
  const reps = int(e.reps, 1, 60);
  const miles = num(e.miles, 0.1, 100);
  const minutes = int(e.minutes, 1, 600);
  const scope = oneOf(EDIT_SCOPES, e.scope);
  if (exercise) out.exercise = exercise;
  if (to) out.to = to;
  if (day) out.day = day;
  if (sets !== undefined) out.sets = sets;
  if (reps !== undefined) out.reps = reps;
  if (miles !== undefined) out.miles = miles;
  if (minutes !== undefined) out.minutes = minutes;
  if (scope) out.scope = scope;
  return out;
}

export interface HistoryTurn {
  role: 'athlete' | 'holt';
  text: string;
}

/** The last six turns, each a real role and a trimmed line — whatever the client sent. */
export function narrowHistory(v: unknown): HistoryTurn[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(isObj)
    .map((t) => {
      const role = t.role === 'athlete' || t.role === 'holt' ? t.role : null;
      const line = typeof t.text === 'string' ? t.text.trim().replace(/\s+/g, ' ').slice(0, 400) : '';
      return role && line ? { role, text: line } : null;
    })
    .filter((t): t is HistoryTurn => t !== null)
    .slice(-6);
}
