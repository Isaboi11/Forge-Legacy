/**
 * The engine's test doubles (Holt Listens HL-10, S0): a fake port backed by an in-memory store, a recording sink, and a
 * seeded line picker. The simulated-athlete harness (HL-12) runs whole conversations on these.
 *
 * Pure: relative imports only.
 */

import type { ProgramStructure, SavedProgram } from '@/data/programs-live';
import type { SessionMark } from '../../program/progress-core.ts';
import type { CatalogExercise } from '../candidates.ts';
import type { Turn } from '../chat-core.ts';
import type { Chooser } from '../rulebook/voice.ts';
import type { Busy, EnginePort, EngineSink } from './types.ts';
import { learnPreferences } from '../learned-preference.ts';
import { NO_RECENT_WORK } from '../recent-work.ts';

/** mulberry32 — small, fast, and the same sequence for the same seed on every machine. */
export function seededChooser(seed: number): Chooser {
  let a = seed >>> 0;
  return (n: number) => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return Math.floor(r * n);
  };
}

/** Every write the engine made, in order — the harness checks the RESULT, not the words. */
export type FakeWrite =
  | { kind: 'update'; programId: string; structure: ProgramStructure }
  | { kind: 'skip'; programId: string; weekIndex: number; dayIndex: number }
  | { kind: 'unskip'; programId: string; weekIndex: number; dayIndex: number }
  | { kind: 'spend'; what: 'program' | 'day' }
  | { kind: 'draft'; what: 'workout' | 'program'; draft: unknown }
  | { kind: 'told'; name: string | null }
  | { kind: 'remember'; what: 'experience'; value: unknown };

export interface FakeWorld {
  /** The running program, or none. `update` writes land here, so a later read sees them. */
  active: SavedProgram | null;
  marks: SessionMark[];
  mine: SavedProgram[];
  writes: FakeWrite[];
  /** Make the next `active()` read throw (a dropped connection) or never answer (a hang). */
  failNext?: 'throw' | 'hang';
  /**
   * What Holt's writer (`coach-author`) answers, in order — a test scripts the model. Empty = `{ kind: 'none' }`
   * ("he wrote nothing usable"), so the rulebook builds, exactly as on a phone that cannot reach him.
   */
  authorReplies: unknown[];
  /** Every request the writer was sent — the harness checks what Holt was TOLD, not only what came back. */
  authorAsks: unknown[];
  /** The free allowance's answer to a spend. Default: allowed. */
  spendReply: { allowed: boolean; used: number; allowance: number } | null;
}

export interface FakePortOptions {
  active?: SavedProgram | null;
  marks?: SessionMark[];
  mine?: SavedProgram[];
  catalog?: readonly CatalogExercise[];
  seed?: number;
  now?: Date;
  /** The built-in shelf (the phone reads JSON the test runner cannot import; tests pass what they need). */
  definitions?: readonly unknown[];
}

export function fakePort(opts: FakePortOptions = {}): { port: EnginePort; world: FakeWorld } {
  const world: FakeWorld = {
    active: opts.active ?? null,
    marks: [...(opts.marks ?? [])],
    mine: [...(opts.mine ?? (opts.active ? [opts.active] : []))],
    writes: [],
    authorReplies: [],
    authorAsks: [],
    spendReply: { allowed: true, used: 1, allowance: 99 },
  };
  const now = opts.now ?? new Date('2026-11-18T18:00:00Z');
  const port: EnginePort = {
    programs: {
      async active() {
        const fail = world.failNext;
        world.failNext = undefined;
        if (fail === 'throw') throw new Error('offline');
        if (fail === 'hang') return new Promise<SavedProgram | null>(() => undefined);
        return world.active;
      },
      async sessions(programId) {
        return world.active?.id === programId ? [...world.marks] : [];
      },
      async mine() {
        return [...world.mine];
      },
      async update(programId, structure) {
        world.writes.push({ kind: 'update', programId, structure });
        if (world.active?.id === programId) world.active = { ...world.active, structure };
      },
      async skip(programId, weekIndex, dayIndex) {
        world.writes.push({ kind: 'skip', programId, weekIndex, dayIndex });
        world.marks.push({ weekIndex, dayIndex, state: 'skipped', workoutId: null });
      },
      async unskip(programId, weekIndex, dayIndex) {
        world.writes.push({ kind: 'unskip', programId, weekIndex, dayIndex });
        const before = world.marks.length;
        world.marks = world.marks.filter((m) => !(m.weekIndex === weekIndex && m.dayIndex === dayIndex && m.state === 'skipped'));
        return { ok: true, removed: world.marks.length < before };
      },
    },
    build: {
      learned: async () => learnPreferences([]),
      recent: async () => NO_RECENT_WORK,
      author: async (req) => {
        world.authorAsks.push(req);
        return (world.authorReplies.shift() ?? { kind: 'none' }) as Awaited<ReturnType<EnginePort['build']['author']>>;
      },
      definitions: () => (opts.definitions ?? []) as ReturnType<EnginePort['build']['definitions']>,
      spend: async (what) => {
        world.writes.push({ kind: 'spend', what });
        return world.spendReply;
      },
    },
    drafts: {
      saveWorkout: async (draft) => void world.writes.push({ kind: 'draft', what: 'workout', draft }),
      saveProgram: async (draft) => void world.writes.push({ kind: 'draft', what: 'program', draft }),
      setTold: async (name) => void world.writes.push({ kind: 'told', name }),
    },
    memory: {
      rememberExperience: async (value) => void world.writes.push({ kind: 'remember', what: 'experience', value }),
    },
    catalog: opts.catalog ?? [],
    choose: seededChooser(opts.seed ?? 1),
    now: () => now,
    /* A bound fires on the next macrotask: every fake read (microtasks) wins it, and a `hang` read loses it at once,
       as a slow phone would after 4 s. Never `Promise.resolve()` — that ties with a read and the bound can win. */
    wait: () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
  };
  return { port, world };
}

/** Records what the engine showed, in order. `holt()` = Holt's lines; `chips()` = the last chip labels. */
export function recordingSink(): EngineSink & {
  turns: Turn[];
  busyLog: (Busy | null)[];
  holt(): string[];
  lastChips(): string[];
} {
  const turns: Turn[] = [];
  const busyLog: (Busy | null)[] = [];
  return {
    turns,
    busyLog,
    say: (...t: Turn[]) => void turns.push(...t),
    busy: (b) => void busyLog.push(b),
    holt: () => turns.filter((t): t is Extract<Turn, { kind: 'holt' }> => t.kind === 'holt').map((t) => t.text),
    lastChips: () => {
      const c = [...turns].reverse().find((t): t is Extract<Turn, { kind: 'chips' }> => t.kind === 'chips');
      return c ? c.chips.map((x) => x.label) : [];
    },
  };
}
