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

import type { ProgramDay, SavedProgram, ProgramStructure } from '@/data/programs-live';
import type { SessionMark } from '../../program/progress-core.ts';
import type { CatalogExercise } from '../candidates.ts';
import type { EditChangeId } from '../edit-chat.ts';
import type { EditIntent, EditIntentResolution } from '../edit-intent.ts';
import type { AskShown } from '../listens.ts';
import type { ChatMode, ChatState, Room, Turn } from '../chat-core.ts';
import type { Goal } from '../constraints.ts';
import type { AuthorRequest, AuthorResult } from '../author.ts';
import type { LearnedPreferences } from '../learned-preference.ts';
import type { RecentWork } from '../recent-work.ts';
import type { Refundable } from '../../ai/ai-call.ts';
import type { ProgramDefinition } from '../../training/schema.ts';
import type { NoAiConsent } from '@/lib/consent';
import type { ProgramDraft } from '@/lib/program-draft-model';
import type { WorkoutDraft } from '@/lib/workout-builder-draft';
import type { RememberedExperience } from '@/lib/coach-memory';
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
  /** What a build reads and spends (S4b). */
  build: {
    learned(): Promise<LearnedPreferences>;
    recent(): Promise<RecentWork>;
    /** Holt writes it (`coach-author`). */
    author(req: AuthorRequest, signal?: AbortSignal): Promise<Refundable<AuthorResult> | NoAiConsent>;
    /** The built-in shelf. */
    definitions(): readonly ProgramDefinition[];
    /** `consume_holt_allowance` — the only spend of the free allowance; null = unreadable. */
    spend(kind: 'program' | 'day'): Promise<{ allowed: boolean; used: number; allowance: number } | null>;
  };
  /** The Builder drafts a build hands over to (device storage). */
  drafts: {
    saveWorkout(d: WorkoutDraft): Promise<void>;
    saveProgram(d: ProgramDraft): Promise<void>;
    setTold(name: string | null): Promise<void>;
  };
  /** Holt's device memory of the athlete. */
  memory: {
    rememberExperience(e: RememberedExperience): Promise<void>;
  };
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

  /* ── the build in flight (S4) ── the sheet keeps React copies for its save effect; every write goes through its
     setters, which update both, so the engine always reads the newest value (never a stale closure). */
  mode: ChatMode | null;
  constraints: ChatState;
  built: Built | null;
  /** Where they train, remembered (lib/coach-memory) — answered from memory when it would be asked. */
  room: Room | null;
  /** The room on this request came from memory, so Holt says he assumed it. */
  roomAssumed: boolean;
  /** What onboarding recorded as their goal — a stand-in, never passed to the model as their answer. */
  profileGoal: Goal | null;
  /** The goal on this request is that stand-in. */
  goalGuessed: boolean;
  /** Holt's notes on them (CA-D2), as last read — a build sends them. */
  heardNotes: string[];

  /* ── changing a program already running (S2, `engine/edit.ts`) ── */
  /**
   * The tapped edit in progress, loaded fresh each time the flow starts. Deliberately not persisted: an edit against
   * a stale structure is how you edit the wrong day, so old chips simply do nothing.
   */
  edit: EditState | null;
  /** The typed plan waiting for "Do it". Holds a function, so never persisted. */
  pendingEdit: { programId: string; before: ProgramStructure; plan: Extract<EditIntentResolution, { ok: true }>['plan'] } | null;
  /**
   * The last change Holt made, so "Undo" can put it back (Coach-Holt-Everywhere rule 2). One level: the
   * structure as it was before, or the sessions a skip marked. Cleared the moment it is used.
   */
  lastEdit: (({ programId: string; before: ProgramStructure } | { programId: string; skipped: SessionMark[] }) & { id: number }) | null;
  /** The question the typed flow is waiting on. */
  pendingEditAsk: { intent: EditIntent; ask: string } | null;
  /** The last question the typed-edit flow put to them (HL-1c) — never the same one twice in a row. */
  lastEditAsk: AskShown | null;
  /** The athlete's own words that started this change — shown as "You asked" on the updated workout. */
  editAsked: string | null;
}

/** The tapped edit flow's place: which session, what about it, which row, what value. */
export interface EditState {
  program: SavedProgram;
  marks: SessionMark[];
  at?: { weekIndex: number; dayIndex: number };
  day?: ProgramDay;
  change?: EditChangeId;
  rowIndex?: number;
  value?: { sets?: number; targetMi?: number; targetSec?: number; replacementKey?: string; replacementName?: string };
}

/**
 * What Holt just built — the object, not a label for it.
 *
 * A week and a block come out of `assemble()` as the same shape and are two different things to save,
 * so the distinction is made once, where the engine's own `structure.weeks` can be read, rather than
 * re-derived at each button.
 */
export type Built =
  | { kind: 'program'; structure: ProgramStructure }
  | { kind: 'week'; structure: ProgramStructure }
  | { kind: 'day'; day: ProgramDay };

export const freshRefs = (): EngineRefs => ({
  askedAboutReplacing: false,
  typed: [],
  mode: null,
  constraints: {},
  built: null,
  room: null,
  roomAssumed: false,
  profileGoal: null,
  goalGuessed: false,
  heardNotes: [],
  edit: null,
  pendingEdit: null,
  lastEdit: null,
  pendingEditAsk: null,
  lastEditAsk: null,
  editAsked: null,
});
