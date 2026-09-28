import type { ParsedWeek } from '@/domain/program/import-parse';

/**
 * ONE READ, HANDED TO THE IMPORT SCREEN — a picture pasted into Holt's chat (PO 2026-09-27: *"paste a picture at
 * any time and tell him to add it as a program, template, recipe"*).
 *
 * The chat reads the photo (`readProgramPhoto` → `parseProgramTable`) so a failure is said in the conversation,
 * then leaves the parsed weeks here and opens `/program-import?read=1` (with `for=template` for a workout). The
 * screen takes it once on mount and opens straight on its preview — the same check-then-Create every import
 * goes through, including the "replace what you're building?" question. Same shape as `recipe-draft-stash`.
 * Taking clears it, so a second visit is an ordinary one.
 */
export interface ImportRead {
  weeks: ParsedWeek[];
  skipped: string[];
}

let stashed: ImportRead | null = null;

export function stashImportRead(read: ImportRead): void {
  stashed = read;
}

export function takeImportRead(): ImportRead | null {
  const r = stashed;
  stashed = null;
  return r;
}
