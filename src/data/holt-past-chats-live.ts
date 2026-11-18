/**
 * Past chats — the store (Sprint 4b §1.5, migration 0279).
 *
 * ⛔ STUB committed by the integrator so lane A compiles alone — lane B replaces the bodies (and adds the rest of
 * the module), never these signatures.
 */

/** One stored line, flattened for Export My Data (§1.7). */
export interface ExportChat {
  chatId: string;
  title: string;
  startedAt: string;
  who: 'athlete' | 'holt' | 'note';
  text: string;
}

export async function fetchExportChats(): Promise<ExportChat[]> {
  return [];
}

export async function deleteAllPastChats(): Promise<boolean> {
  return false;
}
