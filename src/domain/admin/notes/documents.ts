/**
 * The Documents page's note, built from the real library: how much is filed and what changed last.
 * Facts only — the design's sample ("Your Q3 receipts are in") names files that may not exist.
 *
 * Pure and dependency-free so `node --test` runs it directly.
 */

export interface DocumentsNoteInput {
  total: number;
  links: number;
  /** A preformatted size ("412 MB"), so this file needs no formatting helpers. */
  sizeLabel: string;
  /** The most recently changed document. `daysAgo` is whole calendar days (0 = today). */
  latest: { title: string; daysAgo: number } | null;
}

const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`;

export function documentsNote(i: DocumentsNoteInput | null): string | null {
  if (!i) return null;
  if (i.total === 0) return 'Nothing filed yet. Upload the business’s paperwork, or add links to things kept elsewhere.';

  const files = i.total - i.links;
  const what =
    i.links === 0
      ? n(files, 'file', 'files')
      : files === 0
        ? n(i.links, 'link', 'links')
        : `${n(files, 'file', 'files')} and ${n(i.links, 'link', 'links')}`;
  const first = files > 0 ? `${what} on file, ${i.sizeLabel} in all.` : `${what} on file.`;
  if (!i.latest) return first;
  const d = i.latest.daysAgo;
  const when = d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
  return `${first} Last change: “${i.latest.title}”, ${when}.`;
}
