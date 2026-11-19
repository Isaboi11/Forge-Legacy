/**
 * THE REWRITER'S WIRE — everything `coach-rewrite` (the Edge Function) and the app share: the output schema, the
 * system prompt (around the catalogue), the request the app sends, the user turn the function builds, and the reading
 * of the model's JSON. ⚠ NO IMPORTS — the function's dashboard paste copy inlines this file whole
 * (`scripts/build-coach-rewrite-deploy.mjs`). The program-shaped half (`programText`, `expandRewrite`) is `rewrite.ts`.
 */

/** One row as the model writes it — the checker's `RewriteRow` (engine/checker.ts) without its note. */
export interface WireRow {
  key: string;
  part?: 'warmup' | 'main' | 'cooldown';
  sets?: number;
  reps?: number;
  repsTo?: number;
  seconds?: number;
  miles?: number;
  group?: string;
}

/** Room for a real rewrite: variation across weeks on a 5-day block ran past 9,000 (live run 11-19). */
export const REWRITE_OUTPUT_CAP = 16000;

const ROW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['key', 'part', 'sets', 'reps', 'repsTo', 'seconds', 'miles', 'group'],
  properties: {
    key: { type: 'string' },
    part: { type: 'string', enum: ['warmup', 'main', 'cooldown'] },
    sets: { type: 'integer' },
    reps: { type: 'integer' },
    repsTo: { type: 'integer' },
    seconds: { type: 'integer' },
    miles: { type: 'number' },
    group: { type: 'string' },
  },
} as const;

/**
 * Structured output: every field required (0 / '' = not used), so the API can enforce it.
 *
 * ⚠ COMPACT BY DESIGN (live run 11-19: writing every session of every week ran past 9,000 tokens on a 5-day block).
 * `sessions` = a session written ONCE by its name, applied to every remaining week (each kept movement keeps its own
 * week-to-week sets and reps); `weeks` = only what differs by week (every run's distance, a one-off). Anything not
 * written stays exactly as it is.
 */
export const REWRITE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['say', 'sessions', 'weeks', 'rest', 'unmet'],
  properties: {
    say: { type: 'string' },
    sessions: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['name', 'rows'], properties: { name: { type: 'string' }, rows: { type: 'array', items: ROW_SCHEMA } } },
    },
    weeks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['week', 'days'],
        properties: {
          week: { type: 'integer' },
          days: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['day', 'name', 'rows'],
              properties: { day: { type: 'integer' }, name: { type: 'string' }, rows: { type: 'array', items: ROW_SCHEMA } },
            },
          },
        },
      },
    },
    rest: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['week', 'day'], properties: { week: { type: 'integer' }, day: { type: 'integer' } } },
    },
    unmet: { type: 'array', items: { type: 'string' } },
  },
} as const;

/** The rewriter's system prompt around the exercise library (`AUTHOR_CATALOGUE`, passed in so this file has no imports). */
export const rewriteSystem = (catalogue: string): string => `You are Coach Holt, a strength and endurance coach in the Forge Legacy training app. The athlete is partway through a program and has asked you to change it. You are given the weeks still ahead, exactly as they stand, and what the athlete asked. Rewrite those weeks so the program does what they asked. The app checks everything you return before the athlete sees it.

# What you return — only what changes

- sessions: a session you change, written ONCE by its exact name as given ("Pull", "Upper"). The app applies it to that session in every remaining week from the next one on — a session already trained THIS week still comes round again next week, so it is yours to change too; and each movement you keep keeps its own week-to-week sets and reps — so write the whole session as it should look from now on, with sets and reps for anything new.
- weeks: only what differs week by week — every run's new distance or time (week, day number, name and rows), or a one-off change to one week. Days are numbered from 1 as given.
- Leave out every session you do not change; it stays exactly as it is. A started program never changes its number of sessions: to give the athlete more rest, put that session in "rest" (week and day number) instead.
- For each session you write: its rows. A lifting row is { key: an exact key from the exercise library below, part: warmup, main or cooldown, sets, reps, repsTo (the top of a rep range, else 0), seconds (a timed hold, else 0), miles 0, group }. A run is { key: "cardio-run", miles (or seconds for a timed run), sets 1 }. Another cardio bout is { key: "cardio-bike" (or cardio-row, cardio-walk, cardio-elliptical, cardio-stair), seconds }. Rows that share a group letter ("A", "B") are a superset, done back to back; otherwise group is "".
- say: 2 to 4 short plain sentences in Holt's voice, to the athlete, saying what you changed and why — name the sessions and the movements ("On Pull and Upper I added face pulls and reverse cable flyes…"). No markdown. Never claim it is done or saved: they confirm it on a card. Name movements the way a person says them ("cable face pulls", "an easy bike ride") — never a library key or code.
- unmet: anything they asked for that you could not do, in a few words each. Empty when everything landed.

# How you change it

- Change what they asked for, and what it takes to do it well. Keep everything else as it is: the same movements, order and prescription.
- Spread what they asked for sensibly across the week, on the sessions that already train that area ("more rear delts" → the back, pull, shoulder or upper sessions, at least twice a week — never a leg day; core can go anywhere). Swap out the least useful movements to make room rather than making sessions long.
- Use only movements their equipment allows (listed below). Never a movement from outside the library.
- Sets, reps and rest follow their goal and the program's existing pattern; carry the program's week-to-week progression and any deload week through.
- Never write a weight or a load of any kind. Weights come from the athlete's own logged lifts.
- On a run day, write only its runs ({ key: "cardio-run", miles or seconds }, in the order given); its warm-up, cool-down and notes stay as they are.
- Running: easing off is always fine. Never make a run more than about 10% longer than the same run in the plan, and leave the final week of a race plan as it is. Swap an easy run for "cardio-bike" when they want less impact.
- Nothing about pain, injury or a medical condition goes into the program. If they described an injury, change nothing and put "injury — see a doctor or physio" in unmet.

# Exercise library (key per movement, grouped by body part; first word is the equipment)

${catalogue}`;

export interface RewriteAthlete {
  goal: string | null;
  level: string;
  equipment: readonly string[];
  limitations: readonly string[];
}

export function rewriteUserTurn(args: RewriteRequest | { said: readonly string[]; brief: string; athlete: RewriteAthlete; program: string; name: string }): string {
  return [
    `Program: ${args.name}`,
    `Athlete: goal ${args.athlete.goal ?? 'not set'}; level ${args.athlete.level}; equipment ${args.athlete.equipment.join(', ') || 'none (bodyweight)'}; work around ${args.athlete.limitations.join(', ') || 'nothing'}.`,
    'What the athlete said:',
    ...args.said.map((l) => `- "${l}"`),
    args.brief ? `Your plan from the conversation: ${args.brief}` : '',
    '',
    'The weeks still ahead:',
    args.program,
  ]
    .filter((l) => l !== '')
    .join('\n');
}

/** What the app sends `coach-rewrite` — plain fields; the FUNCTION builds the user turn (`rewriteUserTurn`). */
export interface RewriteRequest {
  said: string[];
  brief: string;
  athlete: RewriteAthlete;
  /** `programText` of the weeks still ahead — the athlete's own program. */
  program: string;
  name: string;
}

export const REWRITE_LIMITS = { said: 6, line: 1500, brief: 800, program: 16000, name: 80, list: 40 } as const;

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');
const strs = (v: unknown, n: number, max: number): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(-n).map((x) => x.slice(0, max)) : [];

/** Anything off the wire → a bounded `RewriteRequest`. Empty `said` or `program` = a bad request. */
export function narrowRewriteRequest(raw: unknown): RewriteRequest {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const a = (o.athlete && typeof o.athlete === 'object' ? o.athlete : {}) as Record<string, unknown>;
  return {
    said: strs(o.said, REWRITE_LIMITS.said, REWRITE_LIMITS.line),
    brief: str(o.brief, REWRITE_LIMITS.brief),
    athlete: {
      goal: typeof a.goal === 'string' ? a.goal.slice(0, 40) : null,
      level: str(a.level, 20) || 'intermediate',
      equipment: strs(a.equipment, REWRITE_LIMITS.list, 40),
      limitations: strs(a.limitations, 10, 40),
    },
    program: str(o.program, REWRITE_LIMITS.program),
    name: str(o.name, REWRITE_LIMITS.name),
  };
}

const pos = (n: unknown): number | undefined => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined);

const rowFrom = (r: Record<string, unknown>): WireRow => ({
  key: String(r.key),
  part: r.part === 'warmup' || r.part === 'cooldown' ? r.part : 'main',
  sets: pos(r.sets),
  reps: pos(r.reps),
  repsTo: pos(r.repsTo),
  seconds: pos(r.seconds),
  miles: pos(r.miles),
  group: typeof r.group === 'string' ? r.group : '',
});
const rowsFrom = (rows: unknown): WireRow[] =>
  (Array.isArray(rows) ? (rows as Record<string, unknown>[]) : []).filter((r) => typeof r.key === 'string' && r.key).map(rowFrom);

export interface ParsedRewrite {
  say: string;
  unmet: string[];
  /** A session written once, by name — applied to every remaining week. */
  sessions: { name: string; rows: WireRow[] }[];
  /** Only what differs by week. */
  weeks: { week: number; days: { day: number; name: string; rows: WireRow[] }[] }[];
  rest: { week: number; day: number }[];
}

/** The model's JSON → what he changed. Null when unreadable. */
export function rewriteFromModelText(text: string): ParsedRewrite | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const o = raw as { say?: unknown; sessions?: unknown; weeks?: unknown; rest?: unknown; unmet?: unknown };
  if (!Array.isArray(o.sessions) && !Array.isArray(o.weeks)) return null;
  const sessions = (Array.isArray(o.sessions) ? (o.sessions as { name?: unknown; rows?: unknown }[]) : [])
    .filter((x) => typeof x.name === 'string' && x.name)
    .map((x) => ({ name: x.name as string, rows: rowsFrom(x.rows) }));
  const weeks = (Array.isArray(o.weeks) ? (o.weeks as { week?: unknown; days?: unknown }[]) : [])
    .filter((w) => typeof w.week === 'number' && Array.isArray(w.days))
    .map((w) => ({
      week: w.week as number,
      days: (w.days as { day?: unknown; name?: unknown; rows?: unknown }[])
        .filter((d) => typeof d.day === 'number')
        .map((d) => ({ day: d.day as number, name: typeof d.name === 'string' ? d.name : '', rows: rowsFrom(d.rows) })),
    }));
  const rest = Array.isArray(o.rest)
    ? (o.rest as { week?: unknown; day?: unknown }[]).filter((r) => typeof r.week === 'number' && typeof r.day === 'number').map((r) => ({ week: r.week as number, day: r.day as number }))
    : [];
  return {
    say: typeof o.say === 'string' ? o.say : '',
    unmet: Array.isArray(o.unmet) ? (o.unmet as unknown[]).filter((u): u is string => typeof u === 'string') : [],
    sessions,
    weeks,
    rest,
  };
}
