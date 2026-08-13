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

/**
 * ⚠ TWO SLOTS, NOT ONE — and this is a defect fix, not a nicety.
 *
 * There was a single global key. The moment the Program Builder gained a second mode (authoring a week
 * template, 0157), opening one would hydrate over the other: an athlete twelve days into building a
 * 12-week program taps "Build a Week", and their program draft is silently overwritten by an empty week.
 * No error, no confirmation, no undo — the autosave fires on the first mutation.
 *
 * Keying by kind removes the failure mode entirely rather than papering it with a "you have an unsaved
 * draft" prompt, which would still have made the athlete choose between two things they both wanted.
 */
export type DraftKind = 'program' | 'week';

const KEY_FOR: Record<DraftKind, string> = {
  program: 'forge_program_draft_v1',
  week: 'forge_week_draft_v1',
};

export async function loadProgramDraft(kind: DraftKind = 'program'): Promise<ProgramDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_FOR[kind]);
    if (!raw) return null;
    const d = JSON.parse(raw) as ProgramDraft;
    return d && Array.isArray(d.days) ? d : null;
  } catch {
    return null;
  }
}

export async function saveProgramDraft(d: ProgramDraft, kind: DraftKind = 'program'): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_FOR[kind], JSON.stringify(d));
  } catch {
    // best-effort autosave
  }
}

export async function clearProgramDraft(kind: DraftKind = 'program'): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_FOR[kind]);
  } catch {
    // best-effort
  }
}
