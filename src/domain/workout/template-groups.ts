/**
 * How a saved workout's blocks are SAID on a read-only surface — pure, so it can be tested.
 *
 * A template has carried its supersets since 0106 and its coaching cues since the field existed. The
 * builder draws both, the logger performs both, and the template's own detail screen drew neither: a
 * session built around "A1 Press / A2 Row" read there as two loose lifts in a suggestive order
 * (library-11, QA 09-26).
 *
 * Its own file rather than a corner of `template-format`: `program/prescription` already imports that
 * module, and this needs `supersetLabels` from `prescription` — one file holding both would be a cycle.
 */

// Relative + extensioned: a VALUE import in a file `node --test` loads, where `@/` does not resolve.
import { supersetLabels } from '../program/prescription.ts';

interface GroupedRow {
  groupId?: string | null;
  groupKind?: string | null;
  groupName?: string | null;
  groupRounds?: number | null;
}

export interface GroupMark {
  /** Said once, above the FIRST member of a block: "Superset A · 2 exercises, alternated". */
  head: string | null;
  /** What this row is called inside a superset — "A1", "A2". The same letters the builder and the logger use. */
  tag: string | null;
}

/**
 * One mark per row, index-aligned with `items` (ONE section's rows — the builder letters per section, so
 * this does too).
 *
 * A block is a RUN OF NEIGHBOURS sharing a `groupId`, the same adjacency rule every other reader takes.
 * A "group" of one is not a block and gets no heading — that is what a row left behind by an old split
 * looks like, and announcing "Superset · 1 exercise" would be naming something that is not there.
 */
export function groupMarks(items: readonly GroupedRow[]): GroupMark[] {
  const tags = supersetLabels(items);
  const gidOf = (i: number): string | null => items[i]?.groupId?.trim() || null;

  return items.map((row, i) => {
    const gid = gidOf(i);
    if (!gid || gidOf(i - 1) === gid) return { head: null, tag: tags[i] };
    let end = i;
    while (gidOf(end + 1) === gid) end += 1;
    const count = end - i + 1;
    if (count < 2) return { head: null, tag: tags[i] };

    if (row.groupKind === 'superset') {
      const letter = (tags[i] ?? '').replace(/\d+$/, '');
      return { head: `Superset${letter ? ` ${letter}` : ''} · ${count} exercises, alternated`, tag: tags[i] };
    }
    const rounds = row.groupRounds ?? 0;
    const name = row.groupName?.trim() || 'Circuit';
    return { head: rounds > 1 ? `${name} · ${rounds} rounds` : `${name} · ${count} exercises`, tag: null };
  });
}
