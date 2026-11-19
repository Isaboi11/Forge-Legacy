/**
 * HOLT REWRITES THE PROGRAM (Holt Listens step 3 — PO D12, 2026-11-19: "this is AI, I shouldn't have to give every
 * example"). One general job for the model, for ANY change an athlete asks of a program they are running: given the
 * weeks still ahead, written compactly, and what they asked, return those weeks rewritten. The app's checker
 * (`engine/checker.ts`) decides what may reach the athlete — this module only asks and reads the answer.
 *
 * Pure. The wire half (schema, prompt, request, reading the answer) is `rewrite-wire.ts`, shared with `coach-rewrite`.
 */

import type { ProgramDay, ProgramStructure } from '@/data/programs-live';
import { plannedDays, trainingDays, type SessionMark } from '../program/progress-core.ts';
import { AUTHOR_CATALOGUE } from './author-catalogue.ts';
import { rewriteSystem, type ParsedRewrite } from './rewrite-wire.ts';
import { canEdit } from './edit-ops.ts';
import type { Rewrite } from './engine/checker.ts';

export {
  narrowRewriteRequest,
  REWRITE_LIMITS,
  REWRITE_OUTPUT_CAP,
  REWRITE_SCHEMA,
  rewriteFromModelText,
  rewriteUserTurn,
  type ParsedRewrite,
  type RewriteAthlete,
  type RewriteRequest,
  type WireRow,
} from './rewrite-wire.ts';

/** The rewriter's system prompt, catalogue included — the same text `coach-rewrite` sends. */
export const REWRITE_SYSTEM = rewriteSystem(AUTHOR_CATALOGUE);

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

/** A session's base name: "Pull [DELOAD]" is still Pull (live check 11-19 — the deload week was being skipped). */
const norm = (x: string) => x.toLowerCase().replace(/\[[^\]]*\]|\bdeload\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * What he wrote → the checker's `Rewrite`, week by week from `fromWeek`. A session written once by name is applied to
 * every remaining session of that name (a deload week's "Pull [DELOAD]" is still Pull). Unwritten = null (unchanged).
 *
 * ⚠ HIS PRESCRIPTION IS A CHANGE, APPLIED ON TOP OF THE PROGRESSION (live run 11-19: "beef it up", "switch to strength"
 * and "superset my accessories" came back as NO change, because every kept movement took the program's own sets and
 * reps). He writes a session as it should look in the first week he was shown; the difference from what that week had
 * (Δsets, Δreps) is carried onto every later week's own numbers, so the block's wave and deloads keep their shape and his
 * change lands everywhere. His superset letters are kept. New movements take what he wrote (a set lighter in a deload).
 */
export function expandRewrite(before: ProgramStructure, fromWeek: number, p: ParsedRewrite): Rewrite {
  const weeks: Rewrite['weeks'] = [];
  /** The first remaining week's version of each session (by base name) — the numbers he saw and wrote against. */
  const shown = new Map<string, Map<string, ProgramDay['main'][number]>>();
  /** Every sets×reps a movement has anywhere in the remaining block, per session — numbers he merely COPIED. */
  const anyWeek = new Map<string, Set<string>>();
  for (let w = fromWeek; w < Math.max(1, before.weeks); w += 1) {
    for (const d of trainingDays(plannedDays(before, w))) {
      const k = norm(d.name);
      if (!shown.has(k)) shown.set(k, new Map(d.main.filter((e) => e.catalogKey).map((e) => [e.catalogKey as string, e])));
      for (const e of d.main) if (e.catalogKey) (anyWeek.get(`${k}|${e.catalogKey}`) ?? anyWeek.set(`${k}|${e.catalogKey}`, new Set()).get(`${k}|${e.catalogKey}`)!).add(`${e.sets}x${e.reps}`);
    }
  }
  for (let w = fromWeek; w < Math.max(1, before.weeks); w += 1) {
    const sessions = trainingDays(plannedDays(before, w));
    const over = p.weeks.find((x) => x.week === w + 1);
    const days = sessions.map((d, i) => {
      const o = over?.days.find((x) => x.day === i + 1);
      if (o) return { name: o.name || d.name, rows: o.rows };
      const t = p.sessions.find((x) => norm(x.name) === norm(d.name));
      if (!t) return null;
      const kept = new Map(d.main.filter((e) => e.catalogKey).map((e) => [e.catalogKey as string, e]));
      const ref = shown.get(norm(d.name));
      const deload = /deload/i.test(d.name);
      return {
        name: d.name,
        rows: t.rows.map((r) => {
          const was = kept.get(r.key);
          if (was && was.kind !== 'cardio') {
            const seen = ref?.get(r.key) ?? was;
            /* Numbers the block already has for it somewhere = copied, not changed (whichever week he copied from). */
            const copied = anyWeek.get(`${norm(d.name)}|${r.key}`)?.has(`${r.sets}x${r.reps}`) ?? false;
            const dSets = !copied && r.sets != null && seen.sets != null ? r.sets - seen.sets : 0;
            const dReps = !copied && r.reps != null && seen.reps != null ? r.reps - seen.reps : 0;
            const sets = Math.max(1, (was.sets ?? r.sets ?? 3) + dSets);
            const reps = Math.max(1, (was.reps ?? r.reps ?? 10) + dReps);
            const top = was.repsMax != null ? Math.max(reps, was.repsMax + dReps) : r.repsTo && r.repsTo > reps && dReps === 0 ? r.repsTo : undefined;
            return { ...r, sets, reps, repsTo: top };
          }
          /* New in a deload week: a set lighter, so the week stays a deload. */
          return deload && r.sets && r.sets > 1 ? { ...r, sets: r.sets - 1 } : r;
        }),
      };
    });
    if (days.some((d) => d != null)) weeks.push({ week: w + 1, days });
  }
  return { weeks, rest: p.rest };
}
