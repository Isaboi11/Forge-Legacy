/**
 * The engine's port on the phone (Holt Listens HL-10, S0): today's real reads and writes, behind the interface the
 * engine calls. Tests use `domain/coach/engine/testing.ts`'s `fakePort` instead — same engine, different world.
 *
 * Grows one slice at a time: only what moved code calls is here.
 */

import {
  fetchActiveProgram,
  fetchMyPrograms,
  fetchProgramSessions,
  skipProgramSession,
  unskipProgramSession,
  updateProgram,
} from '@/data/programs-live';
import type { EnginePort } from '@/domain/coach/engine/types';
import { PICKER_DB } from '@/domain/exercise-picker/data';

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
    catalog: PICKER_DB,
    choose: (n) => Math.floor(Math.random() * n),
    now: () => new Date(),
    wait: (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  };
}
