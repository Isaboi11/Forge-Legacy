import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProgramDraft } from '@/lib/program-draft-model';

/**
 * Device-local persistence for the Program Builder's in-progress draft (the RN analogue of the design's
 * `forge_program_draft_v1` localStorage draft). Autosaved on every mutation; cleared on Save or Cancel.
 * The *saved* program goes to the real `programs` table via `createProgram`; only this working copy is
 * device-local, so an interrupted build survives a reload.
 *
 * The draft type and every pure mutation helper live in `program-draft-model` — kept import-clean (types
 * only) so the clamps, resize rules and picker hand-off are unit-testable under `node --test`. They are
 * re-exported here so consumers have a single import site.
 */
export * from '@/lib/program-draft-model';

const KEY = 'forge_program_draft_v1';

export async function loadProgramDraft(): Promise<ProgramDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as ProgramDraft;
    return d && Array.isArray(d.days) ? d : null;
  } catch {
    return null;
  }
}

export async function saveProgramDraft(d: ProgramDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // best-effort autosave
  }
}

export async function clearProgramDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
