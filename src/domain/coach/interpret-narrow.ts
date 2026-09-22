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
  'multi',
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
export const EDIT_OPS = [
  'swap', 'sets', 'reps', 'distance', 'duration', 'rebuild', 'move', 'skip', 'add', 'remove', 'volume',
] as const;
export const EDIT_SCOPES = ['this_week', 'rest_of_block'] as const;
/** What a `volume` edit may aim at: a focus muscle group, or the cardio. */
export const VOLUME_TARGETS = [...FOCUS_MUSCLES, 'cardio'] as const;
export const VOLUME_DIRECTIONS = ['more', 'less'] as const;

/**
 * "Change my program by typing" — what the athlete asked for, in their words. Resolved against the real
 * program on the device by `edit-intent.ts`; nothing here is a catalogue key or an index.
 */
export interface EditIntent {
  op: (typeof EDIT_OPS)[number];
  /**
   * The movement as the athlete named it — "bench". For `add`, the movement to ADD ("hammer curls"); for
   * `remove`, the one to take out; for `volume`, optionally the one row they mean.
   */
  exercise?: string;
  /**
   * `swap`: the replacement as named — "dumbbell press".
   * `move`: where the session goes — a day or session ("Friday", "Thursday", "Upper B"), or "first" / "last".
   */
  to?: string;
  /** The day as named — "Monday", "leg day", "tomorrow", "Wednesday's session". For `move`, the session that moves. */
  day?: string;
  /** `skip` only: a whole week, as said — "next week", "this week", "week 5". */
  week?: string;
  /** `volume` only: the muscle group (or the cardio) the athlete wants more or less of. */
  target?: (typeof VOLUME_TARGETS)[number];
  /** `volume` only. */
  direction?: (typeof VOLUME_DIRECTIONS)[number];
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

  // Exercises they do not want, as named — the app resolves the names to catalogue keys (≤5, ≤40 chars).
  if (Array.isArray(p.avoid)) {
    const avoid = [...new Set(p.avoid.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter((x) => x.length >= 2 && x.length <= 40))].slice(0, 5);
    if (avoid.length) out.avoid = avoid;
  }
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
  const week = text(e.week, 40);
  const target = oneOf(VOLUME_TARGETS, e.target);
  const direction = oneOf(VOLUME_DIRECTIONS, e.direction);
  if (exercise) out.exercise = exercise;
  if (to) out.to = to;
  if (day) out.day = day;
  if (sets !== undefined) out.sets = sets;
  if (reps !== undefined) out.reps = reps;
  if (miles !== undefined) out.miles = miles;
  if (minutes !== undefined) out.minutes = minutes;
  if (scope) out.scope = scope;
  if (week) out.week = week;
  if (target) out.target = target;
  if (direction) out.direction = direction;
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

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// WHAT HOLT REMEMBERS (CA-D2) — notes record what the athlete SAID, never an inference
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** A note, or a remember line, is one short sentence. */
export const NOTE_MAX_CHARS = 80;
/** CA-D2: the brief carries at most 20 notes. */
export const NOTES_MAX = 20;
/** At most two new facts from one message. */
export const REMEMBER_MAX = 2;

/**
 * ⚠ THE BODY IS NOT A NOTE. Health, injury, weight and eating facts are amber-tier data (CA-D2 rules,
 * Preflight Gates Part 2): they reach a model only on an explicit per-request ask, and a sentence carrying
 * one stops at the medical guard anyway. So a "remember" line that mentions any of it is dropped here in
 * code, whatever the prompt said — the prompt is a request, this is the boundary.
 */
const BODY_WORDS =
  /\b(pain\w*|hurt\w*|injur\w*|sore\w*|ache\w*|achy|surger\w*|pregnan\w*|diabet\w*|asthma\w*|medicat\w*|meds|doctor|physio\w*|therap\w*|heart|blood|weigh\w*|lbs?|kgs?|kilos?|pounds|body ?fat|bmi|calori\w*|diet\w*|eating|anorexi\w*|bulimi\w*|anxi\w*|depress\w*|adhd|condition\w*|diagnos\w*|tear|tore|torn|brokew*|fracturw*|acl|mcl|rotator|concussw*|herniw*|sciaticw*|migrainew*|cancer|chemow*|stroke|seizurew*|epilepw*|sprain\w*|strain\w*|arthriti\w*|tendon\w*|tendin\w*|knees?|shoulders?|hips?|wrists?|ankles?|elbows?|spine|spinal|disc|neck|period|menopaus\w*|steroid\w*|sarms?|testosterone)\b/i;

const oneLine = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.replace(/\s+/g, ' ').trim();
  return t || null;
};

/** Lowercased, punctuation-free — two notes that differ only in case or a full stop are one note. */
const noteKey = (s: string): string => s.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();

/**
 * The model's `remember`: at most two one-liners of what the athlete said about themselves.
 *
 * Strings only, whitespace collapsed, ≤80 characters (a longer line is DROPPED, not cut — a cut sentence
 * can say something the athlete did not), no body facts, deduped, capped. `known` (the notes the athlete
 * already has) filters out a fact Holt already holds, so a repeat is not offered twice.
 */
export function narrowRemember(v: unknown, known: readonly string[] = []): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set(known.map(noteKey));
  const out: string[] = [];
  for (const item of v) {
    const line = oneLine(item);
    if (!line || line.length > NOTE_MAX_CHARS || BODY_WORDS.test(line)) continue;
    const k = noteKey(line);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(line);
    if (out.length >= REMEMBER_MAX) break;
  }
  return out;
}

/**
 * The client's `notes` — the athlete's saved facts (visible and editable by them, CA-D2) — as lines for
 * the user turn. Strings only, one line each, cut to 80, deduped, at most 20.
 */
export function narrowNotes(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of v) {
    const line = oneLine(item)?.slice(0, NOTE_MAX_CHARS).trim();
    if (!line) continue;
    const k = noteKey(line);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(line);
    if (out.length >= NOTES_MAX) break;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE WHOLE REPLY — one route, or several things said in one message (CA-D11 without a tool loop)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** One thing the athlete asked for, narrowed. What a single-route reply carries, minus the meter tail. */
export type WireAction =
  | { route: 'patch'; patch: Obj; say: string | null }
  | { route: 'answer'; say: string }
  | { route: 'edit'; edit?: EditIntent }
  | { route: 'build' | 'build_day' | 'import' | 'pick' };

export type StopRoute = 'crisis' | 'urgent' | 'care' | 'medical_stop';

/** The reply body, before the meter tail — exactly what the Edge Function returns. */
export type NarrowedReply = (
  | WireAction
  | { route: 'multi'; actions: WireAction[] }
  | { route: 'unclear' }
  | { route: StopRoute }
) & { remember?: string[] };

/** Several things in one message, at most. A fourth is dropped — the athlete can say it again. */
export const MULTI_MAX = 3;

const DOORS = ['build', 'build_day', 'import', 'pick'] as const;
type Door = (typeof DOORS)[number];

/**
 * One action — a single route's fields, or one entry of `actions` — narrowed with the same rules a
 * single-route reply has always had: an answer needs a line; a patch with nothing usable in it is an
 * answer when there is a line and nothing when there is not; an edit with no usable object still routes
 * (the app opens the tap flow). Anything else is null.
 */
export function narrowAction(a: unknown, todayISO: string): WireAction | null {
  if (!isObj(a)) return null;
  const route = narrowRoute(a.route);
  if (route === 'answer') {
    const say = narrowSay(a.say, 700);
    return say ? { route: 'answer', say } : null;
  }
  if (route === 'patch') {
    const patch = narrowPatch(a.patch, todayISO);
    if (Object.keys(patch).length === 0) {
      const say = narrowSay(a.say, 700);
      return say ? { route: 'answer', say } : null;
    }
    return { route: 'patch', patch, say: narrowSay(a.say, 200) };
  }
  if (route === 'edit') {
    const edit = narrowEdit(a.edit);
    return edit ? { route: 'edit', edit } : { route: 'edit' };
  }
  if (route && (DOORS as readonly string[]).includes(route)) return { route: route as Door };
  return null;
}

const STOP_ORDER: readonly StopRoute[] = ['crisis', 'urgent', 'care', 'medical_stop'];

/**
 * The model's whole reply, narrowed to what the device may act on.
 *
 * `multi` is several actions in the order the athlete said them, at most three. Each is narrowed on its
 * own and a bad one is dropped; if only one survives the reply is that one, as a normal single route; if
 * none do, it is `unclear`. ⚠ A STOP INSIDE A MULTI WINS THE WHOLE REPLY — a model that files "my chest is
 * tight" as one of three actions has told us the message needs the stop, and the other two wait. (The code
 * guard on the raw text runs before this anyway; this is the model's own verdict, taken seriously.)
 *
 * `remember` rides on any route that is not a stop, per `narrowRemember`.
 */
export function narrowReply(parsed: Obj, todayISO: string, knownNotes: readonly string[] = []): NarrowedReply {
  const route = narrowRoute(parsed.route);
  if (route && (STOP_ORDER as readonly string[]).includes(route)) return { route: route as StopRoute };

  const remember = narrowRemember(parsed.remember, knownNotes);
  const withMemory = (r: NarrowedReply): NarrowedReply => (remember.length ? { ...r, remember } : r);

  if (route === 'multi') {
    const raw: unknown[] = Array.isArray(parsed.actions) ? parsed.actions : [];
    const stop = STOP_ORDER.find((s) => raw.some((a) => isObj(a) && a.route === s));
    if (stop) return { route: stop };
    const actions = raw
      .map((a) => narrowAction(a, todayISO))
      .filter((a): a is WireAction => a !== null)
      .slice(0, MULTI_MAX);
    if (actions.length === 0) return withMemory({ route: 'unclear' });
    if (actions.length === 1) return withMemory(actions[0]);
    return withMemory({ route: 'multi', actions });
  }

  if (!route || route === 'unclear') return withMemory({ route: 'unclear' });
  return withMemory(narrowAction(parsed, todayISO) ?? { route: 'unclear' });
}
