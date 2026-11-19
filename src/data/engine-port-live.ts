/**
 * The engine's port on the phone (Holt Listens HL-10): today's real reads and writes, behind the interface the
 * engine calls. Tests use `domain/coach/engine/testing.ts`'s `fakePort` instead — same engine, different world.
 *
 * Grows one slice at a time: only what moved code calls is here.
 */

import { authorLive } from '@/data/coach-author-live';
import { consumeHoltAllowance } from '@/data/entitlement-live';
import { fetchLearnedPreferences } from '@/data/learned-preference-live';
import {
  fetchActiveProgram,
  fetchMyPrograms,
  fetchProgramSessions,
  skipProgramSession,
  unskipProgramSession,
  updateProgram,
} from '@/data/programs-live';
import { fetchRecentWork } from '@/data/recent-work-live';
import type { EnginePort } from '@/domain/coach/engine/types';
import { PICKER_DB } from '@/domain/exercise-picker/data';
import { getProgramDefinitions } from '@/domain/training/programs';
import { rememberExperience } from '@/lib/coach-memory';
import { saveProgramDraft, setDraftTold } from '@/lib/program-draft';
import { saveWorkoutDraft } from '@/lib/workout-builder-draft';

export function livePort(): EnginePort {
  return {
    programs: {
      active: () => fetchActiveProgram(),
      sessions: (id) => fetchProgramSessions(id),
      mine: () => fetchMyPrograms(),
      update: (id, structure) => updateProgram(id, structure),
      skip: (id, w, d) => skipProgramSession(id, w, d),
      unskip: (id, w, d) => unskipProgramSession(id, w, d),
    },
    build: {
      learned: () => fetchLearnedPreferences(),
      recent: () => fetchRecentWork(),
      author: (req, signal) => authorLive(req, signal),
      definitions: () => getProgramDefinitions(),
      spend: (kind) => consumeHoltAllowance(kind),
    },
    drafts: {
      saveWorkout: (d) => saveWorkoutDraft(d),
      saveProgram: (d) => saveProgramDraft(d),
      setTold: (name) => setDraftTold(name),
    },
    memory: {
      rememberExperience: (e) => rememberExperience(e),
    },
    catalog: PICKER_DB,
    choose: (n) => Math.floor(Math.random() * n),
    now: () => new Date(),
    wait: (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  };
}
