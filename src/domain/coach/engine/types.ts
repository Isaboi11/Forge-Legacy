/**
 * HOLT'S CONVERSATION ENGINE — the contract (Holt Listens step 2, HL-10, slice S0).
 *
 * ══ WHY ══
 *
 * Every decision about what Holt says or does lived inside `CoachChatSheet.tsx` (≈6,900 lines of React), so none of it
 * could run without a phone — and a tester's "change my whole program" conversation could only be found broken by a
 * tester. The engine is that decision code, moved out slice by slice, so a simulated athlete can run a whole
 * conversation in `node --test` against the REAL logic (plan HL-12), and so there can be two lanes:
 *
 *   · `ai`  — Premium AI. Holt just talks; the rulebook is a silent tool; the only buttons are Apply/Undo cards and
 *             replies he writes himself (PO D10, 2026-11-18).
 *   · `tap` — free users, and a turn where the AI is down: today's chip flows, unchanged.
 *
 * ══ THE SHAPE ══
 *
 * A turn is async and talks as it goes — `busy` flips mid-turn and replies stream — so the engine is not
 * `state → say[]`. Each moved function takes the PORT (every read, write, model call and gate — faked in tests) and
 * the SINK (what the screen draws — recorded in tests). Its own state lives in {@link EngineRefs}: the screen keeps
 * one instance for the life of the sheet, exactly as the `useRef`s it replaces did.
 *
 * ⚠ RULES THAT KEEP IT TESTABLE: relative `.ts` imports only, and `import type` (never a value) from `@/…`. The
 * catalogue is injected (`port.catalog`) — `exercise-picker/data.ts` imports JSON that `node --test` cannot load.
 * Randomness is `port.choose` and time is `port.now`/`port.wait`, so a replay is byte-for-byte repeatable.
 */

import type { SavedProgram, ProgramStructure } from '@/data/programs-live';
import type { SessionMark } from '../../program/progress-core.ts';
import type { CatalogExercise } from '../candidates.ts';
import type { Turn } from '../chat-core.ts';
import type { Chooser } from '../rulebook/voice.ts';

/** Which conversation the athlete is in. Not `ChatMode` — that already means program / day / pick. */
export type Lane = 'ai' | 'tap';

/** What the screen shows while Holt works (the sheet's `busy`). */
export type Busy = 'thinking' | 'building' | 'reading';

/** The running program's reads and writes (programs-live). Every call may throw; callers bound and degrade. */
export interface ProgramPort {
  active(): Promise<SavedProgram | null>;
  sessions(programId: string): Promise<SessionMark[]>;
  mine(): Promise<SavedProgram[]>;
  update(programId: string, structure: ProgramStructure): Promise<void>;
  skip(programId: string, weekIndex: number, dayIndex: number): Promise<void>;
  unskip(programId: string, weekIndex: number, dayIndex: number): Promise<{ ok: boolean; removed: boolean; reason?: string }>;
}

/** Everything outside the engine. Grows one slice at a time — only what moved code actually calls. */
export interface EnginePort {
  programs: ProgramPort;
  /** The visible catalogue (`PICKER_DB` on the phone; built from the source JSON in tests). */
  catalog: readonly CatalogExercise[];
  /** Holt's line picker's dice. Seeded in tests. */
  choose: Chooser;
  now(): Date;
  /** Resolves after `ms` — the bound on a slow read. A test port can resolve it at once or never. */
  wait(ms: number): Promise<void>;
}

/** What the engine hands the screen. */
export interface EngineSink {
  say(...turns: Turn[]): void;
  busy(state: Busy | null): void;
}

/**
 * The engine's own memory for one sheet — what were `useRef`s in the component. Mutable on purpose: the moved
 * handlers read and write them across awaits exactly as the refs were, so no behaviour moves with the code.
 * Grows one slice at a time.
 */
export interface EngineRefs {
  /** Asked once per request whether to replace the running program (`guardActiveProgram`). */
  askedAboutReplacing: boolean;
  /** Their own words for the request in flight (Coach-AI-Amendment-003). Empty = a tapped build. */
  typed: string[];
}

export const freshRefs = (): EngineRefs => ({ askedAboutReplacing: false, typed: [] });
