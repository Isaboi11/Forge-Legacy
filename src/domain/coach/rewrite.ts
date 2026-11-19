/**
 * HOLT REWRITES THE PROGRAM (Holt Listens step 3 — PO D12, 2026-11-19: "this is AI, I shouldn't have to give every
 * example"). One general job for the model, for ANY change an athlete asks of a program they are running: given the
 * weeks still ahead, written compactly, and what they asked, return those weeks rewritten. The app's checker
 * (`engine/checker.ts`) decides what may reach the athlete — this module only asks and reads the answer.
 *
 * Pure: no imports beyond types and the generated catalogue (both inlined into a function's paste copy).
 */

import type { ProgramDay, ProgramStructure } from '@/data/programs-live';
import { plannedDays, trainingDays, type SessionMark } from '../program/progress-core.ts';
import { AUTHOR_CATALOGUE } from './author-catalogue.ts';
import { canEdit } from './edit-ops.ts';
import type { Rewrite, RewriteRow } from './engine/checker.ts';

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

export const REWRITE_SYSTEM = `You are Coach Holt, a strength and endurance coach in the Forge Legacy training app. The athlete is partway through a program and has asked you to change it. You are given the weeks still ahead, exactly as they stand, and what the athlete asked. Rewrite those weeks so the program does what they asked. The app checks everything you return before the athlete sees it.

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

${AUTHOR_CATALOGUE}`;

export interface RewriteAthlete {
  goal: string | null;
  level: string;
  equipment: readonly string[];
  limitations: readonly string[];
}

function rowText(e: ProgramDay['main'][number]): string {
  if (e.kind === 'cardio') {
    const how = e.targetMi != null ? `${e.targetMi}mi` : e.targetSec != null ? `${Math.round(e.targetSec / 60)}min` : '';
    return `cardio-${e.activity ?? 'run'} ${how}`.trim();
  }
  const reps = e.reps != null ? `${e.reps}${e.repsMax ? `-${e.repsMax}` : ''}` : '';
  return `${e.catalogKey ?? e.name} ${e.sets ?? 3}x${reps}`;
}

/** The weeks still ahead, one line per session — what the model rewrites. Trained sessions are shown and marked. */
export function programText(s: ProgramStructure, marks: readonly SessionMark[], fromWeek: number): string {
  const lines: string[] = [];
  for (let w = fromWeek; w < Math.max(1, s.weeks); w += 1) {
    lines.push(`Week ${w + 1}${w === s.weeks - 1 ? ' (final week)' : ''}:`);
    trainingDays(plannedDays(s, w)).forEach((d, i) => {
      const done = canEdit(marks, w, i) ? '' : ' [already trained — return it unchanged]';
      lines.push(`  ${i + 1}. ${d.name}${done}: ${d.main.map(rowText).join(' | ')}`);
    });
  }
  return lines.join('\n');
}

export function rewriteUserTurn(args: { said: readonly string[]; brief: string; athlete: RewriteAthlete; program: string; name: string }): string {
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

const pos = (n: unknown): number | undefined => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined);

const rowFrom = (r: Record<string, unknown>): RewriteRow => ({
  key: String(r.key),
  part: r.part === 'warmup' || r.part === 'cooldown' ? r.part : 'main',
  sets: pos(r.sets),
  reps: pos(r.reps),
  repsTo: pos(r.repsTo),
  seconds: pos(r.seconds),
  miles: pos(r.miles),
  group: typeof r.group === 'string' ? r.group : '',
});
const rowsFrom = (rows: unknown): RewriteRow[] =>
  (Array.isArray(rows) ? (rows as Record<string, unknown>[]) : []).filter((r) => typeof r.key === 'string' && r.key).map(rowFrom);

export interface ParsedRewrite {
  say: string;
  unmet: string[];
  /** A session written once, by name — applied to every remaining week. */
  sessions: { name: string; rows: RewriteRow[] }[];
  /** Only what differs by week. */
  weeks: { week: number; days: { day: number; name: string; rows: RewriteRow[] }[] }[];
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

/** A session's base name: "Pull [DELOAD]" is still Pull (live check 11-19 — the deload week was being skipped). */
const norm = (x: string) => x.toLowerCase().replace(/\[[^\]]*\]|\bdeload\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * What he wrote → the checker's `Rewrite`, week by week from `fromWeek`. A session written once by name is applied to
 * every remaining session of that name; a movement it keeps carries THAT week's sets and reps from the program (its
 * progression and deloads), a new one takes what he wrote. A per-week entry wins over the template. Unwritten = null
 * (unchanged).
 */
export function expandRewrite(before: ProgramStructure, fromWeek: number, p: ParsedRewrite): Rewrite {
  const weeks: Rewrite['weeks'] = [];
  for (let w = fromWeek; w < Math.max(1, before.weeks); w += 1) {
    const sessions = trainingDays(plannedDays(before, w));
    const over = p.weeks.find((x) => x.week === w + 1);
    const days = sessions.map((d, i) => {
      const o = over?.days.find((x) => x.day === i + 1);
      if (o) return { name: o.name || d.name, rows: o.rows };
      const t = p.sessions.find((x) => norm(x.name) === norm(d.name));
      if (!t) return null;
      const kept = new Map(d.main.filter((e) => e.catalogKey).map((e) => [e.catalogKey as string, e]));
      const deload = /deload/i.test(d.name);
      return {
        name: d.name,
        rows: t.rows.map((r) => {
          const was = kept.get(r.key);
          if (was && was.kind !== 'cardio') return { ...r, sets: was.sets ?? r.sets, reps: was.reps ?? r.reps, repsTo: was.repsMax ?? r.repsTo };
          /* New in a deload week: a set lighter, so the week stays a deload. */
          return deload && r.sets && r.sets > 1 ? { ...r, sets: r.sets - 1 } : r;
        }),
      };
    });
    if (days.some((d) => d != null)) weeks.push({ week: w + 1, days });
  }
  return { weeks, rest: p.rest };
}
