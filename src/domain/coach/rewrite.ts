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

export const REWRITE_OUTPUT_CAP = 9000;

/** Structured output: every field required (0 / '' = not used), so the API can enforce it. */
export const REWRITE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['say', 'weeks', 'rest', 'unmet'],
  properties: {
    say: { type: 'string' },
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
              required: ['name', 'rows'],
              properties: {
                name: { type: 'string' },
                rows: {
                  type: 'array',
                  items: {
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
                  },
                },
              },
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

# What you return

- Every week you were given, in order, each with exactly the same number of sessions in the same order. A started program never changes its number of sessions. To give the athlete more rest, put that session in "rest" (week and day number, both counted from 1 as given) and still return it.
- For each session: its name and its rows. A lifting row is { key: an exact key from the exercise library below, part: warmup, main or cooldown, sets, reps, repsTo (the top of a rep range, else 0), seconds (a timed hold, else 0), miles 0, group }. A run is { key: "cardio-run", miles (or seconds for a timed run), sets 1 }. Another cardio bout is { key: "cardio-bike" (or cardio-row, cardio-walk, cardio-elliptical, cardio-stair), seconds }. Rows that share a group letter ("A", "B") are a superset, done back to back; otherwise group is "".
- say: 2 to 4 short plain sentences in Holt's voice, to the athlete, saying what you changed and why — name the sessions and the movements ("On Pull and Upper I added face pulls and reverse cable flyes…"). No markdown. Never claim it is done or saved: they confirm it on a card.
- unmet: anything they asked for that you could not do, in a few words each. Empty when everything landed.

# How you change it

- Change what they asked for, and what it takes to do it well. Keep everything else as it is: the same movements, order and prescription.
- Spread what they asked for sensibly across the week ("more rear delts" → on the sessions that train back or shoulders, at least twice a week). Swap out the least useful movements to make room rather than making sessions long.
- Use only movements their equipment allows (listed below). Never a movement from outside the library.
- Sets, reps and rest follow their goal and the program's existing pattern; carry the program's week-to-week progression and any deload week through.
- Never write a weight or a load of any kind. Weights come from the athlete's own logged lifts.
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

/** The model's JSON → a `Rewrite` (0 / '' = not used), plus his words and what he couldn't do. Null when unusable. */
export function rewriteFromModelText(text: string): { rewrite: Rewrite; say: string; unmet: string[] } | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const o = raw as { say?: unknown; weeks?: unknown; rest?: unknown; unmet?: unknown };
  if (!Array.isArray(o.weeks)) return null;
  const weeks: Rewrite['weeks'] = [];
  for (const w of o.weeks as { week?: unknown; days?: unknown }[]) {
    if (typeof w.week !== 'number' || !Array.isArray(w.days)) continue;
    weeks.push({
      week: w.week,
      days: (w.days as { name?: unknown; rows?: unknown }[]).map((d) => ({
        name: typeof d.name === 'string' ? d.name : '',
        rows: (Array.isArray(d.rows) ? (d.rows as Record<string, unknown>[]) : [])
          .filter((r) => typeof r.key === 'string' && r.key)
          .map(
            (r): RewriteRow => ({
              key: String(r.key),
              part: r.part === 'warmup' || r.part === 'cooldown' ? r.part : 'main',
              sets: pos(r.sets),
              reps: pos(r.reps),
              repsTo: pos(r.repsTo),
              seconds: pos(r.seconds),
              miles: pos(r.miles),
              group: typeof r.group === 'string' ? r.group : '',
            }),
          ),
      })),
    });
  }
  const rest = Array.isArray(o.rest)
    ? (o.rest as { week?: unknown; day?: unknown }[]).filter((r) => typeof r.week === 'number' && typeof r.day === 'number').map((r) => ({ week: r.week as number, day: r.day as number }))
    : [];
  return {
    rewrite: { weeks, rest },
    say: typeof o.say === 'string' ? o.say : '',
    unmet: Array.isArray(o.unmet) ? (o.unmet as unknown[]).filter((u): u is string => typeof u === 'string') : [],
  };
}
