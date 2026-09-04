/**
 * Export My Data — the pure half (P-9 §4).
 *
 * ══ THIS IS A LOCKED SPEC BEING FINISHED, NOT A FEATURE BEING INVENTED ══
 *
 * `P-9-Account-Wireframe-Spec.md` §2 gives Account exactly two actions — **Export My Data** and Delete
 * Account — and only the second was ever built. The Terms carry the same debt: `settings/content.ts`
 * records that "export or delete" was amended down to "delete" because promising a control that does not
 * exist is worse in a legal document than anywhere else in the product, and it says in as many words that
 * *"if a data export is built, this sentence is where it gets its promise back."*
 *
 * ⚠ P-9 §4.2's copy says the export is EMAILED. It is not — see `P9-Amendment-001`. There is no email
 * pipeline and no way to deploy one from here (no Supabase CLI, no service key), and a share sheet hands
 * the athlete their file in two seconds rather than in an inbox later. §4.1 (no confirmation step) and
 * §4.3 (format and mechanism undefined) are honoured exactly as written.
 *
 * ══ WHY CSV, AND ONLY CSV ══
 *
 * One row per set — the shape every lifting tracker imports, and the shape a person can open. §4.3
 * leaves the format undefined, and the gap this closes is portability: an export only a programmer can
 * read is not really an export. A JSON archive would be the better *lossless* answer and is a named
 * follow-up, but P-9 §2 allows exactly one row, so one tap has to produce one file.
 */

/** One logged set, as it is stored. */
export interface ExportSet {
  setIndex: number;
  weight: number | null;
  weightUnit: string | null;
  reps: number | null;
  durationSec: number | null;
  distance: number | null;
  distanceUnit: string | null;
  notes: string | null;
}

export interface ExportExercise {
  name: string;
  position: number | null;
  sets: ExportSet[];
}

export interface ExportWorkout {
  id: string;
  name: string | null;
  activityType: string | null;
  startedAt: string;
  durationSec: number | null;
  distance: number | null;
  distanceUnit: string | null;
  notes: string | null;
  exercises: ExportExercise[];
}

/**
 * What the file does NOT contain — surfaced in the UI, not buried.
 *
 * An export that quietly omits things is worse than one that says what it left out: the athlete has no
 * way to tell the difference, and "I exported my data" is a claim they may go on to rely on.
 */
export const NOT_INCLUDED = [
  'Photos and videos — they are files, not rows.',
  'Other athletes’ squad, challenge and friend activity.',
];

/**
 * One CSV cell, escaped.
 *
 * ⚠ THE FAILURE THIS PREVENTS IS SILENT AND IT CORRUPTS THE WHOLE FILE. An exercise called
 * `Farmer's Walk, heavy` or a note containing a newline will, unescaped, shift every following column on
 * that row — and a spreadsheet opens it without complaining. RFC 4180: wrap in double quotes whenever the
 * value holds a comma, a quote, CR or LF, and double any quote inside.
 */
export function csvCell(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADERS = [
  'Date',
  'Workout',
  'Activity',
  'Exercise',
  'Set',
  'Weight',
  'Unit',
  'Reps',
  'Duration (s)',
  'Distance',
  'Distance unit',
  'Notes',
] as const;

/**
 * One row per SET — the shape every lifting tracker imports, and the reason this format exists at all.
 *
 * A workout with no exercises (a run, a walk) still earns one row, carrying its own distance and
 * duration. Dropping it would mean a runner's export was an empty file, which is the one outcome that
 * would make this feature worse than not having it.
 */
export function toCsv(workouts: ExportWorkout[]): string {
  const lines: string[] = [CSV_HEADERS.join(',')];
  for (const w of workouts) {
    const head = [w.startedAt, w.name ?? '', w.activityType ?? ''];
    if (w.exercises.length === 0) {
      lines.push(
        [...head, '', '', '', '', '', w.durationSec ?? '', w.distance ?? '', w.distanceUnit ?? '', w.notes ?? '']
          .map(csvCell)
          .join(','),
      );
      continue;
    }
    for (const ex of w.exercises) {
      /* An exercise carrying no sets is still evidence it was in the session — it was added and not
         worked. Recording it as a row with an empty set number keeps the session's shape honest. */
      const sets: (ExportSet | null)[] = ex.sets.length ? ex.sets : [null];
      for (const s of sets) {
        lines.push(
          [
            ...head,
            ex.name,
            s ? s.setIndex + 1 : '',
            s?.weight ?? '',
            s?.weightUnit ?? '',
            s?.reps ?? '',
            s?.durationSec ?? '',
            s?.distance ?? '',
            s?.distanceUnit ?? '',
            s?.notes ?? '',
          ]
            .map(csvCell)
            .join(','),
        );
      }
    }
  }
  /* A trailing newline: POSIX tools and several spreadsheet importers treat a file without one as
     truncated, and it costs a byte. */
  return `${lines.join('\r\n')}\r\n`;
}

/**
 * `forge-legacy-2026-09-04` — dated, so two exports never collide in a Files folder and the athlete can
 * tell which is which without opening either.
 */
export function exportBaseName(at: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `forge-legacy-${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}`;
}

/** Rows across every workout — what the toast reports, so the athlete knows the file is not empty. */
export function countSets(workouts: ExportWorkout[]): number {
  return workouts.reduce((n, w) => n + w.exercises.reduce((m, e) => m + e.sets.length, 0), 0);
}
