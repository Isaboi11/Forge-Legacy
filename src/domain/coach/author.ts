/**
 * HOLT WRITES IT — a typed or spoken ask is read whole by the model, and the model writes the session.
 *
 * `Docs/Amendments/Coach-AI-Amendment-003-Holt-Writes-What-You-Typed.md` (PO, 2026-09-30): *"I need the coach
 * holt to read and listen to everything I type and build a custom program to what I'm telling him. If I'm
 * typing it probably should just be read by ai then."*
 *
 * ══ WHAT CHANGED, AND WHAT DID NOT ══
 *
 * Until now the model filled a form and the rulebook built from it (CA-D11: every number on a card came from
 * the athlete or the engine). A form has a fixed number of boxes, and a sentence does not: "upper chest, two
 * triceps movements, the rest chest" had no box, so it was dropped and the PO got three flat presses. For a
 * TYPED ask the model now chooses the movements, the order, the sets and the reps.
 *
 * What did not change is that the model is not trusted:
 *
 *   · it may only name a movement from the catalogue the app shows (`author-catalogue.ts`), and a key that
 *     is not in it never reaches a card;
 *   · the device re-checks every movement against the athlete's kit, level and limitations with the same
 *     tables the rulebook uses (`author-validate.ts`), and what fails is dropped and SAID;
 *   · the schema has no field for a load — no weight, no percentage — so he cannot write one;
 *   · the medical guard runs in code on the athlete's words before any credit is spent;
 *   · a tapped build, a race, and any build the model cannot be reached for still come from the rulebook.
 *
 * Same shape as `kitchen-dishes.ts`: the model writes the thing, the app decides whether it stands.
 *
 * ⚠ NO IMPORTS. The Edge Function inlines this file into its dashboard paste copy.
 */

/** The meter's names for the two builds — the actions `coach-interpret` already charges (0203). */
export const AUTHOR_ACTION = { day: 'day', program: 'program' } as const;
/** One session is ~350 output tokens; a six-day week is ~1,800. */
export const AUTHOR_OUTPUT_CAP = { day: 1400, program: 4500 } as const;

const SAID_MESSAGES = 6;
const SAID_CHARS = 1200;
export const AUTHOR_MAX_DAYS = 7;
/** Warm-up, main work and cool-down together. */
export const AUTHOR_MAX_EXERCISES = 16;

/** `cardio-bike` and its siblings: the one kind of key that is not in the catalogue. */
export const AUTHOR_CARDIO_KEY = /^cardio-(run|walk|bike|row|elliptical|stair)$/;

export const AUTHOR_GOALS = ['strength', 'muscle', 'weight_loss', 'conditioning', 'mobility', 'health'] as const;
export const AUTHOR_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const AUTHOR_ROOMS = ['full_gym', 'home', 'bodyweight'] as const;

/** What the app sends. Every field is narrowed again by the function (`narrowAuthorRequest`). */
export interface AuthorRequest {
  kind: 'day' | 'program';
  /** Everything the athlete typed or said for THIS request, oldest first, in their own words. */
  said: string[];
  /** Minutes a session has. */
  minutes: number | null;
  /** `program` only: training days in the week, and how many weeks the app will repeat it for. */
  days: number | null;
  weeks: number | null;
  /** Null when nobody said — he reads it from their words rather than being handed a guess. */
  goal: (typeof AUTHOR_GOALS)[number] | null;
  level: (typeof AUTHOR_LEVELS)[number] | null;
  room: (typeof AUTHOR_ROOMS)[number] | null;
  /** The catalogue's equipment classes this athlete can use, worked out on the device from what they own. */
  canUse: string[];
  /**
   * The exact movements their kit allows, when that is the shorter list (a home gym, bodyweight). A class is
   * too coarse: a dip is "bodyweight" and still needs bars. Empty means "anything not in `cannot`".
   */
  only: string[];
  /** Movements inside their equipment classes that they still cannot do (a full gym with no sled or rope). */
  cannot: string[];
  /** Movements a banned section still allows — the rulebook's carve-outs (a glute bridge inside a hinge ban). */
  keep: string[];
  /**
   * The cardio bouts they can do, as `cardio-<activity>` keys. A treadmill or a bike is not a catalogue
   * movement in this app — it is a bout (`kind: 'cardio'`) — so it has its own short list.
   */
  cardio: string[];
  /** Movement patterns a stated limitation rules out — the rulebook's own list, so both agree. */
  offPatterns: string[];
  /** Exercises they said to leave out, by catalogue key. */
  avoid: string[];
  /** What they trained in the last few sessions, by catalogue key — so today is not the same again. */
  recent: string[];
  /** What Holt knows about them (CA-D2), one line each. */
  notes: string[];
  /**
   * Set when these are the LIFTING days of a race block (Coach-AI-Amendment-003 CW-D13). The running — its
   * mileage, long run, taper and race week — is the race rulebook's arithmetic and is already written; he
   * writes only the lifting that sits beside it.
   */
  beside: { race: string; runDays: number } | null;
}

const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const list = (v: unknown, max: number, chars: number): string[] =>
  [...new Set((Array.isArray(v) ? v : []).map((x) => clean(x, chars)).filter(Boolean))].slice(0, max);
const oneOf = <T extends string>(options: readonly T[], v: unknown): T | null =>
  typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : null;
const whole = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null;

function besideOf(v: unknown): AuthorRequest['beside'] {
  if (!v || typeof v !== 'object') return null;
  const b = v as Record<string, unknown>;
  const race = clean(b.race, 24);
  const runDays = whole(b.runDays, 1, 7);
  return race && runDays != null ? { race, runDays } : null;
}

export function narrowAuthorRequest(raw: unknown): AuthorRequest {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    kind: d.kind === 'program' ? 'program' : 'day',
    // The NEWEST messages are kept: what they said last is what they meant.
    said: (Array.isArray(d.said) ? d.said : []).map((x) => clean(x, SAID_CHARS)).filter(Boolean).slice(-SAID_MESSAGES),
    minutes: whole(d.minutes, 10, 180),
    days: whole(d.days, 1, AUTHOR_MAX_DAYS),
    weeks: whole(d.weeks, 1, 52),
    goal: oneOf(AUTHOR_GOALS, d.goal),
    level: oneOf(AUTHOR_LEVELS, d.level),
    room: oneOf(AUTHOR_ROOMS, d.room),
    canUse: list(d.canUse, 30, 40),
    only: list(d.only, 420, 80),
    cannot: list(d.cannot, 120, 80),
    keep: list(d.keep, 40, 80),
    cardio: list(d.cardio, 8, 24).filter((k) => AUTHOR_CARDIO_KEY.test(k)),
    offPatterns: list(d.offPatterns, 16, 40),
    avoid: list(d.avoid, 60, 80),
    recent: list(d.recent, 40, 80),
    notes: list(d.notes, 20, 80),
    beside: besideOf(d.beside),
  };
}

const GOAL_SAID: Record<(typeof AUTHOR_GOALS)[number], string> = {
  strength: 'get stronger',
  muscle: 'build muscle',
  weight_loss: 'lose weight',
  conditioning: 'get fitter',
  mobility: 'move better',
  health: 'general health',
};
const ROOM_SAID: Record<(typeof AUTHOR_ROOMS)[number], string> = {
  full_gym: 'a full commercial gym',
  home: 'their home gym',
  bodyweight: 'bodyweight only, no equipment',
};

/** How many movements a session of this length holds — the rulebook's own budget (`exerciseBudget`). */
export const movementsFor = (minutes: number | null): number =>
  minutes == null ? 6 : minutes <= 30 ? 4 : minutes <= 45 ? 5 : minutes <= 60 ? 6 : 8;

/** The final user turn. The system block stays byte-stable (cache); everything per-request goes here. */
export function authorUserTurn(r: AuthorRequest): string {
  const lines: string[] = [];
  lines.push(
    r.beside
      ? `Write ONLY the ${r.days ?? ''} LIFTING day${r.days === 1 ? '' : 's'} of a training week. The athlete is training for a ${r.beside.race} and runs ${r.beside.runDays} day${r.beside.runDays === 1 ? '' : 's'} a week on a running plan the app has already written. Do not write any running or cardio. The app repeats these lifting days for ${r.weeks ?? 'several'} weeks.`
      : r.kind === 'day'
      ? 'Write ONE training session.'
      : `Write ONE training week${r.days == null ? ', with as many training days as they asked for' : ` of ${r.days} training day${r.days === 1 ? '' : 's'} — unless their words name a different number of days, in which case their words win`}. The app repeats the week for ${r.weeks ?? 'several'} weeks.`,
  );
  lines.push('What the athlete said, in order:');
  for (const s of r.said) lines.push(`- "${s}"`);
  lines.push('');
  lines.push('What the app knows:');
  if (r.minutes != null) lines.push(`- Time per session: ${r.minutes} minutes — about ${movementsFor(r.minutes)} movements unless they said a number.`);
  lines.push(r.goal ? `- Goal: ${GOAL_SAID[r.goal]}.` : '- Goal: not given. Read it from their words; if they did not say, write for building muscle.');
  if (r.level) lines.push(`- Level: ${r.level}.${r.level === 'advanced' ? '' : ' Nothing marked ^.'}`);
  if (r.room) lines.push(`- Training at: ${ROOM_SAID[r.room]}.`);
  if (r.only.length) lines.push(`- Their kit allows ONLY these movements — nothing else in the library can be done where they train: ${r.only.join(' ')}.`);
  else if (r.canUse.length) lines.push(`- Equipment they can use — ONLY movements whose equipment is one of these: ${r.canUse.join(', ')}.`);
  if (r.cannot.length) lines.push(`- Not available where they train — never use: ${r.cannot.join(' ')}.`);
  if (r.offPatterns.length) {
    lines.push(
      `- Working around something — NO movement from these sections: ${r.offPatterns.join('; ')}.${r.keep.length ? ` The only exceptions allowed from them: ${r.keep.join(' ')}.` : ''}`,
    );
  }
  lines.push(r.cardio.length ? `- Cardio they can do: ${r.cardio.join(', ')}.` : '- Cardio they can do: none of the cardio- keys.');
  if (r.avoid.length) lines.push(`- Never use: ${r.avoid.join(', ')}.`);
  if (r.recent.length) lines.push(`- Trained in their last few sessions — prefer something else unless they asked for it by name: ${r.recent.join(', ')}.`);
  if (r.notes.length) lines.push(`- What you know about this athlete: ${r.notes.join('; ')}.`);
  return lines.join('\n');
}

/* ── the answer ────────────────────────────────────────────────────────────── */

export interface AuthoredExercise {
  /** A catalogue key, copied exactly. The device looks it up; an unknown one is dropped. */
  key: string;
  sets: number;
  /** 0 on a hold. */
  reps: number;
  /** The top of a rep range ("8 to 12" is reps 8, repsTo 12); 0 when it is one number. */
  repsTo: number;
  /** Seconds per set on a hold (`*` in the catalogue); 0 otherwise. */
  seconds: number;
  /** Adjacent movements sharing a letter are done back to back — a superset or a circuit. '' when on its own. */
  group: string;
  /** Where it sits in the session. Everything is `main` unless they asked for a warm-up or a cool-down. */
  part: 'warmup' | 'main' | 'cooldown';
  /** A short cue, or ''. */
  note: string;
}
export interface AuthoredDay {
  name: string;
  exercises: AuthoredExercise[];
}
/** What the model wrote. ⚠ Deliberately NO load field — no weight, no percentage. */
export interface AuthoredPlan {
  /** Holt's line: how this matches what they asked for. */
  say: string;
  title: string;
  days: AuthoredDay[];
  /** What they asked for that he could not do, a few words each. Said back, never hidden. */
  unmet: string[];
}

/** ⛔ No weight and no percentage, on purpose — `author.test.mjs` fails if one is ever added. */
export const AUTHOR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['say', 'title', 'days', 'unmet'],
  properties: {
    say: { type: 'string' },
    title: { type: 'string' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'exercises'],
        properties: {
          name: { type: 'string' },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['key', 'sets', 'reps', 'repsTo', 'seconds', 'group', 'part', 'note'],
              properties: {
                key: { type: 'string' },
                sets: { type: 'number' },
                reps: { type: 'number' },
                repsTo: { type: 'number' },
                seconds: { type: 'number' },
                group: { type: 'string' },
                part: { type: 'string', enum: ['warmup', 'main', 'cooldown'] },
                note: { type: 'string' },
              },
            },
          },
        },
      },
    },
    unmet: { type: 'array', items: { type: 'string' } },
  },
} as const;

const count = (v: unknown, hi: number): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= hi ? Math.round(v) : 0);

/**
 * The model's reply, as a plan of the right SHAPE — or null. ⚠ Shape only: whether each movement exists, and
 * whether this athlete may be handed it, is the device's call (`author-validate.ts`).
 */
export function sanitizeAuthored(raw: unknown, kind: 'day' | 'program'): AuthoredPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  const days: AuthoredDay[] = [];
  for (const day of Array.isArray(d.days) ? d.days : []) {
    if (!day || typeof day !== 'object') continue;
    const x = day as Record<string, unknown>;
    const exercises: AuthoredExercise[] = [];
    for (const e of Array.isArray(x.exercises) ? x.exercises : []) {
      if (!e || typeof e !== 'object') continue;
      const y = e as Record<string, unknown>;
      // The catalogue's `*` and `^` are marks, not part of a key; he is told not to copy them, and sometimes will.
      const key = clean(y.key, 80).toLowerCase().replace(/[*^]+$/, '');
      if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) continue;
      const group = clean(y.group, 4).toUpperCase();
      exercises.push({
        key,
        sets: count(y.sets, 10),
        reps: count(y.reps, 100),
        repsTo: count(y.repsTo, 100),
        seconds: count(y.seconds, 3600),
        group: /^[A-Z]$/.test(group) ? group : '',
        part: y.part === 'warmup' || y.part === 'cooldown' ? y.part : 'main',
        note: clean(y.note, 140),
      });
      if (exercises.length >= AUTHOR_MAX_EXERCISES) break;
    }
    if (exercises.length) days.push({ name: clean(x.name, 40), exercises });
    if (days.length >= (kind === 'day' ? 1 : AUTHOR_MAX_DAYS)) break;
  }
  if (!days.length) return null;
  // A sentence is kept whole or not at all: a line cut at 90 characters read as "…used hinge and machine work to".
  const unmet = (Array.isArray(d.unmet) ? d.unmet : []).map((u) => clean(u, 400)).filter((u) => u && u.length <= 220).slice(0, 3);
  return { say: clean(d.say, 320), title: clean(d.title, 48), days, unmet };
}

/**
 * Is every day a session? Live run 2026-09-30: once in 122 asks the model stopped after a single warm-up
 * movement. The function asks once more when that happens rather than handing the device a plan it will
 * refuse — the same floor `MIN_DAY_MOVEMENTS` holds on the device.
 */
export const authoredIsWhole = (plan: AuthoredPlan | null): plan is AuthoredPlan =>
  plan != null && plan.days.every((d) => d.exercises.filter((e) => e.part === 'main').length >= 3);

export function authoredFromModelText(text: string, kind: 'day' | 'program'): AuthoredPlan | null {
  try {
    return sanitizeAuthored(JSON.parse(text.trim()), kind);
  } catch {
    return null;
  }
}

/* ── the app's side of the wire ─────────────────────────────────────────────── */

export type AuthorResult =
  | { kind: 'ok'; plan: AuthoredPlan; remaining: number | null }
  | { kind: 'stop'; route: 'crisis' | 'urgent' | 'care' | 'medical' }
  /** He wrote nothing usable. The rulebook builds instead. */
  | { kind: 'none' }
  | { kind: 'out_of_credits' }
  | { kind: 'not_entitled' }
  | { kind: 'unavailable' }
  | { kind: 'offline' };

export function authorResultFrom(body: unknown, kind: 'day' | 'program'): AuthorResult {
  if (!body || typeof body !== 'object') return { kind: 'unavailable' };
  const d = body as { ok?: boolean; plan?: unknown; reason?: string; remaining?: number; allowance?: number; route?: string };
  if (d.ok) {
    // Narrowed again on this side: a stale or future function must not hand the chat junk.
    const plan = sanitizeAuthored(d.plan, kind);
    return plan ? { kind: 'ok', plan, remaining: typeof d.remaining === 'number' ? d.remaining : null } : { kind: 'none' };
  }
  switch (d.reason) {
    case 'stop':
      return { kind: 'stop', route: d.route === 'crisis' || d.route === 'urgent' || d.route === 'care' ? d.route : 'medical' };
    case 'none':
      return { kind: 'none' };
    case 'out_of_credits':
      return d.allowance ? { kind: 'out_of_credits' } : { kind: 'not_entitled' };
    default:
      return { kind: 'unavailable' };
  }
}

/**
 * What Holt says when he could not write it himself and the rulebook built it instead. The athlete is owed
 * the difference: a rulebook session follows the focus, not the sentence.
 */
export function authorFallbackLine(r: Exclude<AuthorResult, { kind: 'ok' } | { kind: 'stop' }>): string {
  switch (r.kind) {
    case 'out_of_credits':
      return "You're out of Premium AI credits this month, so I built this one from the rulebook. It follows the focus, not every word.";
    case 'not_entitled':
      return 'Reading every word is part of Premium AI, so I built this one from the rulebook.';
    case 'offline':
      return "I couldn't get a connection, so I built this one from the rulebook. It follows the focus, not every word.";
    default:
      return "I couldn't write that one out just now, so I built it from the rulebook. It follows the focus, not every word.";
  }
}
