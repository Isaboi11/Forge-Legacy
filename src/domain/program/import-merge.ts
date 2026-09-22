/**
 * SEVERAL PHOTOS, ONE PROGRAM — how the Upload Pictures screen joins what each photo read.
 *
 * PO mockup, 2026-09-21: three photos — Push Day, Pull Day, Leg Day — become one program. Each photo is
 * transcribed and parsed ON ITS OWN (`parseProgramTable`, unchanged), because each transcript carries its
 * own header row and two headers pasted into one table would be read as a data row. This joins the
 * already-parsed results; it never reads text.
 *
 * ══ THE RULE ══
 *
 *   · Weeks are matched by their number. A photo with no Week column parses as week 1, so three day
 *     photos land in the same week — which is what three day photos mean.
 *   · Within a week, days keep PHOTO ORDER, then their order inside the photo. The screen numbers the
 *     thumbnails for exactly this reason: the order you see is the order the days run.
 *   · Letters are reassigned A, B, C… across the joined week, because each photo lettered its own days
 *     from A and two Day A's in one week is not a program.
 *
 * Pure, and imports nothing at runtime — `node --test` reaches it.
 */
import type { ParsedDay, ParsedWeek } from './import-parse.ts';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function mergeParsedWeeks(parts: readonly (readonly ParsedWeek[])[]): ParsedWeek[] {
  const byIndex = new Map<number, ParsedDay[]>();
  for (const weeks of parts) {
    for (const w of weeks) {
      const days = byIndex.get(w.index) ?? [];
      days.push(...w.days);
      byIndex.set(w.index, days);
    }
  }
  return [...byIndex.keys()]
    .sort((a, b) => a - b)
    .map((index) => ({
      index,
      days: (byIndex.get(index) ?? []).map((d, i) => ({ ...d, letter: LETTERS[i] ?? String(i + 1) })),
    }));
}
