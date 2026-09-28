/**
 * An imported workout, as the athlete sees it in their history (Build 10 · `Docs/Apple-Health-Build-Plan.md`
 * §10 step 5). Pure.
 *
 *   `importedFrom`       null for a workout Forge recorded; otherwise the name shown after "Imported from"
 *   `importedFromLine`   "Imported from Garmin Connect" — Activity Detail's informational line
 *   `removeImportCopy`   the "Remove from Forge" confirmation, the same words on Detail and History
 *
 * ⚠ ONLY AN IMPORT CAN BE REMOVED. A Forge-recorded workout is a permanent Legacy record and has no remove
 * action anywhere; `importedFrom` returning null is what keeps the button off it, and 0236's
 * `remove_external_workouts` refuses `source = 'forge'` rows on the server as well.
 */

/** Shown when an import carries no label (a pre-label row, or a source Health would not name). */
export const FALLBACK_SOURCE = 'Apple Health';

/**
 * `workouts.source` + `workouts.source_label` → the name to show, or null when Forge recorded it. A missing
 * source is Forge's (the column defaults to 'forge', and a client reading before 0234 gets nothing back).
 */
export function importedFrom(source: string | null | undefined, sourceLabel: string | null | undefined): string | null {
  const s = (source ?? '').trim();
  if (!s || s === 'forge') return null;
  return (sourceLabel ?? '').trim() || FALLBACK_SOURCE;
}

export function importedFromLine(from: string): string {
  return `Imported from ${from}`;
}

export interface RemoveImportCopy {
  headline: string;
  body: string;
  confirm: string;
}

/**
 * What removing does, said before it happens. It leaves Forge's history and totals, it stays in Apple Health,
 * and it will not come back on the next sync — the ledger's 'deleted' row is what makes that last part true.
 */
export function removeImportCopy(title: string, from: string): RemoveImportCopy {
  const name = title.trim() || 'This workout';
  return {
    headline: 'Remove from Forge?',
    body: `“${name}” (from ${from}) comes out of your history and stops counting toward your chapter, rank and goals. It stays in Apple Health, and Forge won’t import it again.`,
    confirm: 'Remove from Forge',
  };
}
