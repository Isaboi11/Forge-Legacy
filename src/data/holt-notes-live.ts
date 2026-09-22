import { supabase } from '@/lib/supabase';
import { holtNotesStore, type NotesClient } from '@/domain/coach/holt-notes';

export type { AddNotesResult, HoltNote, SkipReason } from '@/domain/coach/holt-notes';
export { HOLT_NOTES_MAX, HOLT_NOTE_CHARS, HOLT_NOTE_MIN, cleanNoteText } from '@/domain/coach/holt-notes';

/**
 * WHAT HOLT REMEMBERS — the live notes (Coach-AI-Amendment-001 CA-D2, migration 0204).
 *
 * The rules — one line, no duplicates, twenty at most, fail soft before the migration is applied — live
 * in `domain/coach/holt-notes.ts`, where `node --test` can reach them. This file only hands that store
 * the real client and the signed-in athlete.
 *
 *   fetchNotes()               → HoltNote[], oldest first. [] on any failure (and quietly before 0204).
 *   addNotes(texts, source?)   → { added, skipped } — skipped carries `duplicate` / `cap` / `invalid` /
 *                                `unavailable` / `failed`. A `cap` skip is the caller's cue to propose
 *                                which note to replace (CA-D2), never to drop the fact silently.
 *   updateNote(id, text)       → boolean
 *   deleteNote(id)             → boolean
 *
 * ⚠ A NOTE IS WHAT THE ATHLETE SAID, NEVER WHAT THE MODEL INFERRED. Nothing below can check that.
 */
const store = holtNotesStore(supabase as unknown as NotesClient, async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
});

export const fetchNotes = store.fetchNotes;
export const addNotes = store.addNotes;
export const updateNote = store.updateNote;
export const deleteNote = store.deleteNote;
