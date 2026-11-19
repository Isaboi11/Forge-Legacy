/**
 * The executors behind Holt's training action cards — the rules, with every database and device call handed in.
 * AI Road to 10 Sprint 4a §1.2 — lane C. `src/data/holt-actions-live.ts` wires the real calls; the tests
 * (`__tests__/holt-action-exec.test.mjs`) wire fakes.
 *
 * ══ TWO RULES EVERY EXECUTOR KEEPS ══
 *
 *   1. **A failed apply leaves nothing behind.** Each one checks everything first, then makes ONE write (or reads
 *      back its one write and puts it right). If the world moved since the card was drawn — the workout closed, the
 *      session was trained, the row changed — it answers `gone` and writes nothing.
 *   2. **Undo undoes only its own write** (holtai-08). It checks that what is there now is exactly what it wrote; if
 *      anything has changed since, it leaves it and answers false.
 *
 * Every executor takes the card's `plan` (what the APP resolved and showed), never the model's words.
 *
 * ⚠ `@/` IS TYPE-ONLY HERE; runtime imports are relative with the extension.
 */
import type { ApplyResult, HoltActionExecutor, UndoToken } from './holt-actions';
import type { ProgramStructure } from '@/data/programs-live';
import type { ActiveSession, SessionExercise } from '@/domain/workout/types';
import type { CatalogExercise } from './candidates';
import type { SessionMark } from '../program/progress-core.ts';
import type { Targets } from '../nutrition/day.ts';
import type { AddNotesResult } from './holt-notes.ts';
import { swapExercise as swapProgramExercise } from './edit-ops.ts';
import { markHoltChange } from './holt-marks.ts';
import { plannedDays, trainingDays } from '../program/progress-core.ts';
import { perSideFor } from '../workout/per-side-core.ts';
import { DOOR_ROUTES } from './holt-action-cards.ts';

/* ── what the executors are handed ────────────────────────────────────────────────────────────────────────── */

/** One `nutrition_targets` row, exactly as stored (0205 + 0209's `weight_lb`). */
export interface TargetRow {
  effectiveFrom: string;
  method: 'manual' | 'recommended';
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  weightLb: number | null;
}

export interface ExecDeps {
  now(): Date;
  /* the open workout (the logger's autosave) */
  loadSession(): Promise<ActiveSession | null>;
  persistSession(s: ActiveSession): Promise<void>;
  clearSession(): Promise<void>;
  hasLoggedWork(s: ActiveSession | null): boolean;
  /* the logger's launch context */
  writeLaunch(ctx: Record<string, unknown>): Promise<void>;
  readLaunch(): Promise<Record<string, unknown> | null>;
  clearLaunch(): Promise<void>;
  /* programs */
  fetchProgram(id: string): Promise<{ id: string; structure: ProgramStructure } | null>;
  fetchMarks(id: string): Promise<SessionMark[]>;
  updateProgram(id: string, structure: ProgramStructure): Promise<void>;
  catalogByKey(key: string): CatalogExercise | null;
  /* what start_workout opens */
  fetchTemplate(id: string): Promise<{ id: string; name: string; exercises: unknown[] } | null>;
  fetchPlanned(): Promise<{ name: string; exercises: unknown[]; brief: unknown } | null>;
  /* targets */
  /** Every row up to and including `day`, oldest first. Throws when it cannot read. */
  readTargetRows(day: string): Promise<TargetRow[]>;
  /** Writes the targets the way the Targets screen does (`saveTargets`). Throws on failure. */
  saveTargets(t: Targets, weightLb: number | null): Promise<void>;
  /** Puts one row back exactly as it was (upsert on athlete + day). Throws on failure. */
  restoreTargetRow(row: TargetRow): Promise<void>;
  /* notes */
  addNotes(texts: string[], source: string): Promise<AddNotesResult>;
  deleteNote(id: string): Promise<boolean>;
  /** Sprint 4b §1.4 (append): Holt's memory switch (`getRemembers`). Off → nothing is kept, even after a Confirm. Absent = on. */
  remembers?: () => Promise<boolean>;
  /* a door to a nutrition screen asks for the Nutrition consent first */
  consentForRoute(path: string): Promise<boolean>;
}

/** Network-shaped failures read as offline; anything else is a plain failure. */
export function failureOf(e: unknown): 'offline' | 'failed' {
  const m = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
  return /network|fetch|offline|timed? ?out|connection/i.test(m) ? 'offline' : 'failed';
}

/** Equal as JSON values, whatever order the keys come back in (jsonb sorts them). */
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') {
    return a === b || (a === undefined && b === null) || (a === null && b === undefined);
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    return a.length === bb.length && a.every((x, i) => sameJson(x, bb[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)].filter((k) => ao[k] !== undefined || bo[k] !== undefined));
  for (const k of keys) if (!sameJson(ao[k], bo[k])) return false;
  return true;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const fail = (reason: Extract<ApplyResult, { ok: false }>['reason']): ApplyResult => ({ ok: false, reason });

/* ── swap today's exercise ────────────────────────────────────────────────────────────────────────────────── */

/**
 * The logger's own swap, for an exercise with nothing logged (the card refuses one with sets done): the movement
 * changes, the set shape stays, the per-side label is worked out again from the new name, the swap is recorded
 * as a substitution (EX-002 §10.2 — the first one wins), and the athlete's note about the old lift goes with it.
 * Mirrors `swapExercise` in `src/app/workout.tsx`, the same-kind branch.
 */
export function swapOpenExercise(ex: SessionExercise, next: { key: string; name: string }): SessionExercise {
  const per = perSideFor(next.name);
  return {
    ...ex,
    catalogKey: next.key,
    name: next.name,
    per: per ?? undefined,
    prescribedName: ex.prescribedName ?? ex.name,
    prescribedCatalogKey: ex.prescribedName ? ex.prescribedCatalogKey : (ex.catalogKey ?? null),
    note: null,
    sets: ex.sets.map((st) => ({ ...st, weight: null, actualReps: null, done: false })),
  };
}

const anyDone = (ex: SessionExercise | undefined) => !!ex?.sets?.some((s) => s.done) || ex?.boutOpen === true;

export function swapExecutor(deps: ExecDeps): HoltActionExecutor {
  return {
    async apply(plan) {
      const at = num(plan.at);
      const toKey = text(plan.toKey);
      const toName = text(plan.toName);
      if (at == null || !toKey || !toName) return fail('failed');

      if (plan.source === 'open') {
        const s = await deps.loadSession();
        const was = s?.exercises?.[at];
        /* Still the same workout, the same exercise in that place, and still nothing logged on it. */
        if (!s || !was || s.startedAt !== plan.startedAt || was.name !== plan.fromName || anyDone(was)) return fail('gone');
        const next: ActiveSession = { ...s, exercises: s.exercises.map((e, i) => (i === at ? swapOpenExercise(e, { key: toKey, name: toName }) : e)) };
        await deps.persistSession(next);
        /* The autosave never throws; read it back to know the write landed. */
        const back = await deps.loadSession();
        if (back?.exercises?.[at]?.catalogKey !== toKey) return fail('failed');
        return {
          ok: true,
          said: `Swapped to ${toName} in ${s.workoutName}.`,
          undo: { action: 'swap_exercise_today', source: 'open', startedAt: s.startedAt, at, before: was, toKey },
        };
      }

      const programId = text(plan.programId);
      const w = num(plan.weekIndex);
      const d = num(plan.dayIndex);
      if (!programId || w == null || d == null) return fail('failed');
      let program: { id: string; structure: ProgramStructure } | null;
      let marks: SessionMark[];
      try {
        [program, marks] = await Promise.all([deps.fetchProgram(programId), deps.fetchMarks(programId)]);
      } catch (e) {
        return fail(failureOf(e));
      }
      if (!program) return fail('gone');
      const row = trainingDays(plannedDays(program.structure, w))[d]?.main?.[at];
      const replacement = deps.catalogByKey(toKey);
      if (!row || (row.catalogKey ?? null) !== (plan.fromKey ?? null) || !replacement) return fail('gone');
      /* `this_week` reaches only this one session: a program runs in order, so (week, day) is one session. */
      const res = swapProgramExercise(program.structure, marks, { weekIndex: w, dayIndex: d, exerciseIndex: at }, replacement, 'this_week');
      if (!res.ok) return fail('gone');
      const stamp = deps.now();
      const saved = markHoltChange(program.structure, res.structure, {
        id: String(stamp.getTime()),
        at: stamp.toISOString(),
        what: `${text(plan.fromName)} → ${toName}, for this session only`,
        asked: null,
      });
      try {
        await deps.updateProgram(programId, saved);
      } catch (e) {
        return fail(failureOf(e));
      }
      return {
        ok: true,
        said: `Swapped to ${toName} for your next session. The rest of the program is as it was.`,
        undo: { action: 'swap_exercise_today', source: 'program', programId, before: program.structure, after: saved },
      };
    },

    async undo(token: UndoToken) {
      if (token.source === 'open') {
        const s = await deps.loadSession();
        const at = num(token.at);
        const now = at == null ? undefined : s?.exercises?.[at];
        /* Only the swap it made, only while nothing has been logged on it since. */
        if (!s || !now || at == null || s.startedAt !== token.startedAt || now.catalogKey !== token.toKey || anyDone(now)) return false;
        await deps.persistSession({ ...s, exercises: s.exercises.map((e, i) => (i === at ? (token.before as SessionExercise) : e)) });
        const back = await deps.loadSession();
        return back?.exercises?.[at]?.name === (token.before as SessionExercise).name;
      }
      const programId = text(token.programId);
      try {
        const program = programId ? await deps.fetchProgram(programId) : null;
        if (!program || !sameJson(program.structure, token.after)) return false;
        await deps.updateProgram(programId, token.before as ProgramStructure);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/* ── start a workout ──────────────────────────────────────────────────────────────────────────────────────── */

export function startExecutor(deps: ExecDeps): HoltActionExecutor {
  return {
    async apply(plan) {
      let launch: Record<string, unknown>;
      const name = text(plan.name);
      try {
        if (plan.kind === 'program') {
          const programId = text(plan.programId);
          if (!programId) return fail('failed');
          /* The next session travels as the id alone, exactly as the program's Train button writes it — the logger
             resolves the slot at open time. A session picked out of order carries its slot (0119). */
          launch = plan.next === true ? { programId } : { programId, programWeek: num(plan.weekIndex), programDay: num(plan.dayIndex) };
        } else if (plan.kind === 'template') {
          const t = await deps.fetchTemplate(text(plan.templateId));
          if (!t) return fail('gone');
          launch = { templateId: t.id, workoutName: t.name, templateFallback: t.exercises };
        } else if (plan.kind === 'planned') {
          const p = await deps.fetchPlanned();
          if (!p || p.name !== name) return fail('gone');
          launch = { exercises: p.exercises, workoutName: p.name, brief: p.brief };
        } else return fail('failed');
      } catch (e) {
        return fail(failureOf(e));
      }
      const at = deps.now().toISOString();
      await deps.writeLaunch(launch);
      /* The launch store never throws; read it back to know it landed. */
      if (!sameJson(await deps.readLaunch(), launch)) return fail('failed');
      return { ok: true, said: `Opening ${name || 'your workout'}.`, go: '/workout', undo: { action: 'start_workout', at, launch } };
    },

    /**
     * Discards it — but only if nothing is logged yet. Before the logger opened it, that is the launch itself; after,
     * the workout it started (a later `startedAt` than the tap — an older workout resumed through the prompt is not
     * ours and is never touched).
     */
    async undo(token: UndoToken) {
      if (sameJson(await deps.readLaunch(), token.launch)) {
        await deps.clearLaunch();
        return true;
      }
      const s = await deps.loadSession();
      if (!s || Date.parse(s.startedAt) < Date.parse(text(token.at))) return true;
      if (deps.hasLoggedWork(s)) return false;
      await deps.clearSession();
      return true;
    },
  };
}

/* ── set targets ──────────────────────────────────────────────────────────────────────────────────────────── */

const sameNumbers = (r: TargetRow | undefined, t: Targets) =>
  !!r && Math.round(r.kcal) === Math.round(t.kcal) && Math.round(r.protein) === Math.round(t.protein) && Math.round(r.carb) === Math.round(t.carb) && Math.round(r.fat) === Math.round(t.fat);

export function targetsExecutor(deps: ExecDeps): HoltActionExecutor {
  return {
    async apply(plan) {
      const t: Targets = { kcal: num(plan.kcal) ?? NaN, protein: num(plan.protein) ?? NaN, carb: num(plan.carb) ?? NaN, fat: num(plan.fat) ?? NaN };
      const day = text(plan.today);
      if (!day || ![t.kcal, t.protein, t.carb, t.fat].every((n) => Number.isFinite(n) && n >= 0)) return fail('failed');
      let rows: TargetRow[];
      try {
        rows = await deps.readTargetRows(day);
      } catch (e) {
        return fail(failureOf(e));
      }
      const todayRow = rows.find((r) => r.effectiveFrom === day) ?? null;
      const earlier = [...rows].reverse().find((r) => r.effectiveFrom < day) ?? null;
      try {
        await deps.saveTargets(t, num(plan.weightLb));
      } catch (e) {
        return fail(failureOf(e));
      }
      const undo: UndoToken = { action: 'set_targets', day, wrote: t, todayRow, earlier };
      return {
        ok: true,
        said: `Your targets are ${Math.round(t.kcal).toLocaleString('en-US')} a day from today.`,
        undo,
        /* `nutrition_targets` has no delete policy (0205/0206): a first-ever target cannot be taken back here. */
        ...(todayRow || earlier ? {} : { noUndo: 'This is your first target, so there is nothing to go back to. Change it any time on Targets.' }),
      };
    },

    /**
     * Puts the previous targets back. Today's row as it was, exactly, when there was one; otherwise the earlier
     * target's numbers are written for today (the table has no delete policy), so what is in force is exactly what
     * was in force before. Only while today's row is still what this write made.
     */
    async undo(token: UndoToken) {
      const day = text(token.day);
      try {
        const rows = await deps.readTargetRows(day);
        if (!sameNumbers(rows.find((r) => r.effectiveFrom === day), token.wrote as Targets)) return false;
        const prior = (token.todayRow as TargetRow | null) ?? (token.earlier ? { ...(token.earlier as TargetRow), effectiveFrom: day } : null);
        if (!prior) return false;
        await deps.restoreTargetRow(prior);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/* ── remember a note ──────────────────────────────────────────────────────────────────────────────────────── */

export function noteExecutor(deps: ExecDeps): HoltActionExecutor {
  return {
    async apply(plan) {
      const note = text(plan.text);
      if (!note) return fail('failed');
      /* Sprint 4b §1.4: switched off since the card was drawn — kept nothing ("That changed since I looked"). */
      if (deps.remembers && !(await deps.remembers().catch(() => true))) return fail('gone');
      const res = await deps.addNotes([note], 'ask');
      const added = res.added[0];
      if (added) return { ok: true, said: "I'll remember that.", undo: { action: 'remember_note', id: added.id } };
      const why = res.skipped[0]?.reason;
      if (why === 'duplicate') return { ok: true, said: 'I already had that one.', noUndo: 'Nothing new was saved.', undo: { action: 'remember_note', id: null } };
      if (why === 'cap') return fail('not_allowed');
      return fail('failed');
    },
    async undo(token: UndoToken) {
      const id = text(token.id);
      return id ? deps.deleteNote(id) : true;
    },
  };
}

/* ── open a screen ────────────────────────────────────────────────────────────────────────────────────────── */

const ROUTES = new Set<string>(Object.values(DOOR_ROUTES));

export function doorExecutor(deps: ExecDeps): HoltActionExecutor {
  return {
    async apply(plan) {
      const go = text(plan.go);
      if (!ROUTES.has(go)) return fail('failed');
      /* A nutrition screen asks for the Nutrition consent first, as the tab does (MHMDA). */
      if (!(await deps.consentForRoute(go))) return fail('not_allowed');
      return { ok: true, said: '', go, noUndo: '', undo: { action: 'open_door' } };
    },
    async undo() {
      return true;
    },
  };
}
