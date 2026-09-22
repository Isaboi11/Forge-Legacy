/**
 * WHAT HOLT REMEMBERS — the notes store (Coach-AI-Amendment-001 CA-D2, migration 0204).
 *
 * CA-D2: *"Holt remembers facts, not conversations."* Up to twenty one-line notes, each something the
 * athlete SAID ("Hates lunges", "Runs Tue/Thu, long run Sunday"), sent with every `ask` question so he
 * does not feel like he forgets you. The athlete sees, edits and deletes them at `/holt-memory`.
 *
 * ══ WHY THE STORE TAKES ITS CLIENT AS AN ARGUMENT ══
 *
 * `@/lib/supabase` cannot load under `node --test`, and the rules this file carries (dedupe, the cap,
 * failing soft before 0204 is applied) are exactly the ones worth testing. So `holtNotesStore(client,
 * userId)` is built here against a minimal structural client, `data/holt-notes-live.ts` hands it the real
 * one, and the tests hand it a fake.
 *
 * ══ THE RULES ══
 *
 *   · ONE LINE, 2–80 characters, whitespace collapsed. Longer is REJECTED, never truncated — cutting a
 *     note changes what the athlete said, and a note is only worth keeping because it is what they said.
 *   · DUPLICATES are dropped case-insensitively, against what is stored and within the batch.
 *   · THE CAP IS 20. `addNotes` inserts what fits and returns the rest as skipped (reason `cap`), so the
 *     caller can propose a replacement (CA-D2) instead of silently losing a fact. The database enforces
 *     the same cap by trigger; a race that trips it lands here as `cap` too.
 *   · READS FAIL SOFT to `[]` — including before 0204 is applied (PGRST205 / 42P01), which is quiet on
 *     purpose: an unapplied migration is the expected state for a while, not an error to show anyone.
 *
 * ⚠ NOTES RECORD WHAT THE ATHLETE SAID, NEVER WHAT THE MODEL INFERRED. This store cannot tell the
 *   difference. Whatever proposes notes must.
 */

/** CA-D2: at most this many notes per athlete. Mirrors the 0204 trigger. */
export const HOLT_NOTES_MAX = 20;
/** One line. Mirrors `varchar(80)` in 0204. */
export const HOLT_NOTE_CHARS = 80;
/** Mirrors the `holt_notes_text_len` check in 0204. */
export const HOLT_NOTE_MIN = 2;

export interface HoltNote {
  id: string;
  text: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Where it came from ('ask', 'build-program', …). Shown to the athlete; never sent to the model. */
  source: string | null;
}

export type SkipReason = 'duplicate' | 'cap' | 'invalid' | 'unavailable' | 'failed';

export interface AddNotesResult {
  added: HoltNote[];
  skipped: { text: string; reason: SkipReason }[];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Pure rules
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The note as stored — whitespace collapsed and trimmed — or null when it is not a valid one-liner. */
export function cleanNoteText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.replace(/\s+/g, ' ').trim();
  if (t.length < HOLT_NOTE_MIN || t.length > HOLT_NOTE_CHARS) return null;
  return t;
}

const keyOf = (t: string) => t.toLowerCase();

/**
 * Which of `texts` to insert given what is already stored, and why the rest are not. Order is kept, so
 * when the cap bites it is the LATER notes that wait for a replacement.
 */
export function planAdd(
  existing: readonly string[],
  texts: readonly unknown[],
  max: number = HOLT_NOTES_MAX,
): { insert: string[]; skipped: { text: string; reason: SkipReason }[] } {
  const seen = new Set(existing.map((t) => keyOf(t.replace(/\s+/g, ' ').trim())));
  let room = Math.max(0, max - existing.length);
  const insert: string[] = [];
  const skipped: { text: string; reason: SkipReason }[] = [];
  for (const raw of texts) {
    const text = cleanNoteText(raw);
    if (!text) {
      skipped.push({ text: typeof raw === 'string' ? raw : String(raw), reason: 'invalid' });
      continue;
    }
    if (seen.has(keyOf(text))) {
      skipped.push({ text, reason: 'duplicate' });
      continue;
    }
    if (room <= 0) {
      skipped.push({ text, reason: 'cap' });
      continue;
    }
    seen.add(keyOf(text));
    insert.push(text);
    room -= 1;
  }
  return { insert, skipped };
}

/** PostgREST / Postgres codes for "the table is not there yet" — 0204 not applied. */
const MISSING = new Set(['PGRST205', '42P01']);

type DbError = { code?: string | null; message?: string | null } | null;

export const isMissingTable = (e: DbError): boolean => !!e && MISSING.has(String(e.code ?? ''));
export const isCapError = (e: DbError): boolean => !!e && /holt_notes_cap/.test(String(e.message ?? ''));

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The store
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** A PostgREST query in the shape this store uses: chainable, and awaitable to `{ data, error }`. */
export interface NotesQuery extends PromiseLike<{ data: unknown; error: DbError }> {
  select(columns: string): NotesQuery;
  eq(column: string, value: string): NotesQuery;
  order(column: string, options: { ascending: boolean }): NotesQuery;
}

export interface NotesClient {
  from(table: 'holt_notes'): {
    select(columns: string): NotesQuery;
    insert(rows: { text: string; source: string | null }[]): NotesQuery;
    update(values: { text: string }): NotesQuery;
    delete(): NotesQuery;
  };
}

const COLUMNS = 'id, text, created_at, source';

type Row = { id: string; text: string; created_at: string; source: string | null };

const toNote = (r: Row): HoltNote => ({ id: r.id, text: r.text, createdAt: r.created_at, source: r.source ?? null });

const rowsOf = (data: unknown): HoltNote[] =>
  Array.isArray(data)
    ? (data as Row[]).filter((r) => r && typeof r.id === 'string' && typeof r.text === 'string').map(toNote)
    : [];

export interface HoltNotesStore {
  fetchNotes(): Promise<HoltNote[]>;
  addNotes(texts: readonly string[], source?: string | null): Promise<AddNotesResult>;
  updateNote(id: string, text: string): Promise<boolean>;
  deleteNote(id: string): Promise<boolean>;
}

/**
 * The notes store over `client`. `userId` resolves the signed-in athlete; reads filter on it explicitly
 * rather than leaning on RLS alone (the `lift-history-live` rule). Nothing here throws.
 */
export function holtNotesStore(client: NotesClient, userId: () => Promise<string | null>): HoltNotesStore {
  const table = () => client.from('holt_notes');

  async function fetchNotes(): Promise<HoltNote[]> {
    try {
      const uid = await userId();
      if (!uid) return [];
      const { data, error } = await table().select(COLUMNS).eq('athlete_id', uid).order('created_at', { ascending: true });
      if (error) return [];
      return rowsOf(data);
    } catch {
      return [];
    }
  }

  async function addNotes(texts: readonly string[], source: string | null = null): Promise<AddNotesResult> {
    const all = (reason: SkipReason, list: readonly string[]) => list.map((text) => ({ text, reason }));
    try {
      const uid = await userId();
      if (!uid) return { added: [], skipped: all('unavailable', texts) };

      const { data, error } = await table().select(COLUMNS).eq('athlete_id', uid).order('created_at', { ascending: true });
      if (error) return { added: [], skipped: all(isMissingTable(error) ? 'unavailable' : 'failed', texts) };

      const plan = planAdd(
        rowsOf(data).map((n) => n.text),
        texts,
      );
      if (plan.insert.length === 0) return { added: [], skipped: plan.skipped };

      const cleanSource = typeof source === 'string' && source.trim() ? source.trim().slice(0, 40) : null;
      const res = await table()
        .insert(plan.insert.map((text) => ({ text, source: cleanSource })))
        .select(COLUMNS);
      if (res.error) {
        const reason: SkipReason = isCapError(res.error) ? 'cap' : isMissingTable(res.error) ? 'unavailable' : 'failed';
        return { added: [], skipped: [...plan.skipped, ...all(reason, plan.insert)] };
      }
      return { added: rowsOf(res.data), skipped: plan.skipped };
    } catch {
      return { added: [], skipped: all('failed', texts) };
    }
  }

  async function updateNote(id: string, text: string): Promise<boolean> {
    const clean = cleanNoteText(text);
    if (!clean || !id) return false;
    try {
      const { error } = await table().update({ text: clean }).eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  async function deleteNote(id: string): Promise<boolean> {
    if (!id) return false;
    try {
      const { error } = await table().delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  return { fetchNotes, addNotes, updateNote, deleteNote };
}
