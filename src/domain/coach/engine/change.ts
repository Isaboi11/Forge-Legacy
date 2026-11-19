/**
 * ANY CHANGE TO THE PROGRAM THEY RUN (Holt Listens step 3 — PO D12 2026-11-19: "AI rewrites, the app checks").
 *
 * Holt's chat calls `propose_program_change { brief }`. Here: the running program and its marks are read, the weeks
 * still ahead are handed to the rewriter (`rewrite.ts`, through `port.build.rewrite`), what comes back goes through the
 * checker (`checker.ts`), and the athlete sees Holt's words, then the FACTS of the change — written by the app from the
 * actual before/after, never from his prose (live run 11-19: his words sometimes named a movement the rows did not
 * have) — and "Do it" / "Leave it". Applying writes the structure and the rest marks; Undo puts back both.
 *
 * Pure: relative imports only, `import type` from `@/…`.
 */

import type { ProgramDay, ProgramStructure } from '@/data/programs-live';
import { plannedDays, trainingDays, type SessionMark } from '../../program/progress-core.ts';
import { droppedLine } from '../author-validate.ts';
import type { EquipmentGate } from '../candidates.ts';
import { isRoom } from '../chat-core.ts';
import type { Environment, Experience, Limitation } from '../constraints.ts';
import { editableSessions } from '../edit-chat.ts';
import { markHoltChange } from '../holt-marks.ts';
import { expandRewrite, programText, rewriteFromModelText } from '../rewrite.ts';
import { checkRewrite } from './checker.ts';
import { activeOrNull } from './guards.ts';
import type { EnginePort, EngineRefs, EngineSink } from './types.ts';

export interface ChangeHooks {
  canDo: EquipmentGate;
}

const andList = (xs: readonly string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const base = (name: string) => name.replace(/\s*\[[^\]]*\]\s*/g, '').trim();
const runMiles = (days: readonly ProgramDay[]) =>
  Math.round(days.reduce((t, d) => t + d.main.reduce((u, e) => u + (e.kind === 'cardio' && e.activity === 'run' ? e.targetMi ?? 0 : 0), 0), 0) * 10) / 10;
const label = (e: ProgramDay['main'][number]) => (e.kind === 'cardio' ? (e.activity === 'bike' ? 'easy bike ride' : e.name) : e.name);

/**
 * The facts of the change, from the structures themselves — one line per session (by its base name, the first week it
 * changes in), the running per week, the rest days. Never from Holt's prose.
 */
export function changeFacts(before: ProgramStructure, after: ProgramStructure, fromWeek: number, rest: { weekIndex: number; dayIndex: number }[]): string[] {
  const out: string[] = [];
  const weeks = Math.max(1, before.weeks);
  const keyOf = (e: ProgramDay['main'][number]) => e.catalogKey ?? `${e.activity}`;
  const seen = new Set<string>();
  let runLine: string | null = null;
  for (let w = fromWeek; w < weeks; w += 1) {
    const b = trainingDays(plannedDays(before, w));
    const a = trainingDays(plannedDays(after, w));
    a.forEach((d, i) => {
      const name = base(d.name);
      if (seen.has(name)) return;
      const was = b[i]?.main ?? [];
      const added = d.main.filter((e) => !was.some((x) => keyOf(x) === keyOf(e)));
      const gone = was.filter((x) => !d.main.some((e) => keyOf(e) === keyOf(x)));
      /* Live run 11-19: "beef it up" / "switch to strength" / "superset my accessories" change NUMBERS and PAIRS, not
         movements — they are facts too. */
      const dose = (e: ProgramDay['main'][number]) => (e.kind === 'cardio' ? '' : `${e.sets ?? '?'}×${e.reps ?? '?'}${e.repsMax ? `–${e.repsMax}` : ''}`);
      const redosed = d.main
        .map((e) => ({ e, x: was.find((y) => keyOf(y) === keyOf(e)) }))
        .filter(({ e, x }) => x && x.kind !== 'cardio' && dose(x) !== dose(e))
        .map(({ e, x }) => `${e.name} ${dose(x!)} → ${dose(e)}`);
      const paired = d.main.filter((e) => e.groupId && !was.find((y) => keyOf(y) === keyOf(e))?.groupId).map(label);
      if (!added.length && !gone.length && !redosed.length && !paired.length) return;
      seen.add(name);
      const what = [
        added.length ? `adds ${andList(added.map(label))}` : '',
        gone.length ? `drops ${andList(gone.map(label))}` : '',
        redosed.length ? `${redosed.slice(0, 3).join(', ')}${redosed.length > 3 ? ` and ${redosed.length - 3} more` : ''}` : '',
        paired.length ? `supersets ${andList(paired)}` : '',
      ]
        .filter(Boolean)
        .join('; ');
      out.push(`- **${name}** — ${what}${w > fromWeek ? ` (from week ${w + 1})` : ''}`);
    });
    const mb = runMiles(b);
    const ma = runMiles(a);
    if (!runLine && mb !== ma) runLine = `- **Running** — week ${w + 1}: ${mb} → ${ma} miles`;
  }
  if (runLine) out.push(runLine);
  if (rest.length) {
    const perWeek = new Set(rest.map((r) => r.weekIndex)).size;
    const n = Math.round(rest.length / Math.max(1, perWeek));
    out.push(`- **Rest** — ${n === 1 ? 'one session' : `${n} sessions`} a week becomes a rest day (weeks ${rest[0].weekIndex + 1}–${rest[rest.length - 1].weekIndex + 1})`);
  }
  return out;
}

/** A race plan: its final week holds a run of half-marathon length or more (the race). */
const isRacePlan = (s: ProgramStructure) =>
  trainingDays(plannedDays(s, Math.max(1, s.weeks) - 1)).some((d) => d.main.some((e) => e.activity === 'run' && (e.targetMi ?? 0) >= 13));

export async function proposeChange(refs: EngineRefs, port: EnginePort, sink: EngineSink, hooks: ChangeHooks, brief: string, said: string): Promise<void> {
  sink.busy('thinking');
  const active = await activeOrNull(port);
  if (!active) {
    sink.busy(null);
    return void sink.say({ kind: 'holt', text: "You're not running a program right now — tell me what you want and I'll build you one." });
  }
  const marks = await port.programs.sessions(active.id).catch(() => [] as SessionMark[]);
  const first = editableSessions(active.structure, marks, 1)[0];
  if (!first) {
    sink.busy(null);
    return void sink.say({ kind: 'holt', text: "You've trained every session in that block — there's nothing left in it to change. Want a new one?" });
  }
  const c = refs.constraints;
  const environment: Environment = (isRoom(refs.room) ? refs.room : c.environment) ?? 'full_gym';
  const experience: Experience = c.experience?.lifting ?? 'intermediate';
  const owned = c.ownedEquipment ?? [];
  const limitations: readonly Limitation[] = c.limitations ?? [];
  const words = [...refs.typed.filter((t) => t !== said), said].filter(Boolean);
  const req = {
    said: words,
    brief,
    athlete: { goal: c.goal ?? refs.profileGoal ?? null, level: experience, equipment: environment === 'home' ? owned : [environment.replace('_', ' ')], limitations },
    program: programText(active.structure, marks, first.at.weekIndex),
    name: active.name,
  };
  sink.busy('building');
  const r = await port.build.rewrite({ ...req, athlete: { ...req.athlete, equipment: [...req.athlete.equipment], limitations: [...req.athlete.limitations] } });
  sink.busy(null);
  if (r.kind !== 'ok') {
    return void sink.say({ kind: 'holt', text: "I couldn't rework it just now. Your program is unchanged — ask me again in a moment." });
  }
  const parsed = rewriteFromModelText(r.text);
  if (!parsed) return void sink.say({ kind: 'holt', text: "That rework didn't come out right, so I've left your program as it is. Ask me again?" });
  /* Nothing written at all: he says what he couldn't do (or that it would change nothing) — no card. */
  if (!parsed.sessions.length && !parsed.weeks.length && !parsed.rest.length) {
    return void sink.say({
      kind: 'holt',
      text: parsed.unmet.length ? `I couldn't make that change: ${andList(parsed.unmet)}.` : parsed.say || "That would leave your program exactly as it is — tell me a bit more about what you'd like different?",
    });
  }
  const checked = checkRewrite(active.structure, marks, expandRewrite(active.structure, first.at.weekIndex, parsed), {
    athlete: { experience, environment, ownedEquipment: owned, limitations },
    catalog: port.catalog,
    canDo: hooks.canDo,
    race: isRacePlan(active.structure),
  });
  if (!checked.ok) {
    return void sink.say({ kind: 'holt', text: `${parsed.say ? `${parsed.say} ` : ''}But I can't put that in: ${checked.reason}` });
  }
  const facts = changeFacts(active.structure, checked.structure, first.at.weekIndex, checked.rest);
  /* "No change" is decided on the structure itself, never on whether the summary found words for it. */
  const same = !checked.rest.length && Array.from({ length: Math.max(1, active.structure.weeks) }, (_, w) => w).every(
    (w) => JSON.stringify(plannedDays(checked.structure, w)) === JSON.stringify(plannedDays(active.structure, w)),
  );
  if (same || !facts.length) {
    return void sink.say({ kind: 'holt', text: parsed.unmet.length ? `I couldn't make that change: ${andList(parsed.unmet)}.` : "That would leave your program exactly as it is — tell me a bit more about what you'd like different?" });
  }
  refs.pendingRewrite = { programId: active.id, before: active.structure, after: checked.structure, rest: checked.rest, what: brief };
  const notes = [droppedLine(checked.dropped), ...checked.said, parsed.unmet.length ? `Couldn't do: ${andList(parsed.unmet)}.` : null].filter((x): x is string => !!x);
  sink.say(
    ...(parsed.say ? [{ kind: 'holt' as const, text: parsed.say }] : []),
    { kind: 'holt', text: [`In ${active.name}:`, ...facts, ...notes].join('\n') },
    {
      kind: 'chips',
      chips: [
        { label: 'Do it', patch: {}, typedEdit: 'apply' as const },
        { label: 'Leave it', patch: {}, typedEdit: 'cancel' as const },
      ],
    },
  );
}

/** "Do it" on a rewrite: the structure (stamped "Updated by Holt"), then the rest marks. True when it saved. */
export async function applyRewrite(refs: EngineRefs, port: EnginePort, sink: EngineSink): Promise<boolean> {
  const pr = refs.pendingRewrite;
  if (!pr) return false;
  const stamp = port.now();
  const undoId = stamp.getTime();
  sink.busy('thinking');
  try {
    const saved = markHoltChange(pr.before, pr.after, { id: String(undoId), at: stamp.toISOString(), what: pr.what, asked: refs.typed[refs.typed.length - 1] ?? null });
    await port.programs.update(pr.programId, saved);
    for (const r of pr.rest) await port.programs.skip(pr.programId, r.weekIndex, r.dayIndex);
    refs.lastEdit = { programId: pr.programId, before: pr.before, rested: pr.rest, id: undoId };
    refs.pendingRewrite = null;
    sink.say(
      { kind: 'holt', text: "It's in. Your next session has it." },
      {
        kind: 'chips',
        chips: [
          { label: 'Undo', patch: {}, typedEdit: 'undo' as const, undoOf: undoId },
          { label: 'Show me the program', patch: {}, goTo: `/program/${pr.programId}` },
        ],
      },
    );
    return true;
  } catch (e) {
    sink.say({ kind: 'error', text: 'That did not save.', sub: e instanceof Error ? e.message : String(e), action: 'Your program is unchanged. Try again in a moment.' });
    return true;
  } finally {
    sink.busy(null);
  }
}
