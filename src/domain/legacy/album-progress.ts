/**
 * album-progress — a chapter's progress photos, shown in that chapter's album.
 *
 * PO 2026-09-30: *"the photos from my first chapter didn't save."* They had saved. Chapter I held five
 * progress photos and no album photos, and the album only read `chapter_photos` — so a chapter with a
 * full set of progress shots had no album at all. `Photos-Architecture-Amendment-002` makes the album
 * show both.
 *
 * ⚠ NOTHING IS COPIED. A progress photo is stored once, on its `transformation_entries` row, and the
 * album is a second VIEW of it. Copying would have put the same photograph in two places that could
 * then disagree — deleted from the gallery and still hanging in the album — and would have counted it
 * twice against the photo allowance.
 *
 * ⚠ READ-ONLY HERE. Editing and deleting a progress set stay in the Transformation gallery, which is
 * the only place that knows how to do either safely.
 *
 * Pure, and free of anything that imports React Native, so it runs under `node --test`.
 */

import { captureDateIso } from './capture-date.ts';

/** The shape the album draws. Mirrors `ChapterPhoto` in `photos-live`, stated structurally. */
export interface AlbumItem {
  id: string;
  url: string;
  takenOn: string;
  pose: string | null;
  caption: string | null;
  isVideo: boolean;
  isStarred: boolean;
  role: string | null;
  exercise: string | null;
  event: string | null;
  /** Where the photo is stored. `progress` items belong to the Transformation gallery. */
  source: 'album' | 'progress';
}

export interface ProgressEntry {
  id: string;
  chapterId: string | null;
  label: string;
  caption: string | null;
  photos: Partial<Record<string, string>>;
  videoUrl: string | null;
  createdAt: string;
}

export interface PoseLabel {
  key: string;
  label: string;
}

export interface PrRow {
  exercise: string;
  loadValue: number | null;
  achievedOn: string;
}

export interface ChapterWindow {
  startDate: string;
  /** `end_date`, else the day it was sealed. Null while the chapter is still open. */
  endDate: string | null;
  sealed: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The day a progress set belongs to: the capture date it carries, else the LOCAL day the row was written.
 *
 * Local, because `created_at` is an instant and the athlete thinks in days — a set saved at 9pm in Utah
 * is tonight's, not tomorrow's, which is what slicing the UTC string would say.
 */
export function progressDay(entry: { label: string; createdAt: string }): string {
  const iso = captureDateIso(entry.label);
  if (iso) return iso;
  const d = new Date(entry.createdAt);
  if (Number.isNaN(d.getTime())) return entry.createdAt.slice(0, 10);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** How many things one entry puts in an album — its filled poses, plus its clip. */
export function progressItemCount(entry: ProgressEntry, poses: readonly PoseLabel[]): number {
  return poses.filter((p) => !!entry.photos[p.key]).length + (entry.videoUrl ? 1 : 0);
}

/** The photo that stands for an entry: the first filled pose in the authored order. */
export function progressCover(entry: ProgressEntry, poses: readonly PoseLabel[]): string | null {
  for (const p of poses) {
    const url = entry.photos[p.key];
    if (url) return url;
  }
  return null;
}

/**
 * "PR · Barbell Back Squat 405" — the same words `chapter_album()` writes (0090), so a day reads the
 * same whether its photo came from the album or from a progress set.
 */
export function prEventLabel(exercise: string, load: number): string {
  const name = exercise
    .replace(/-/g, ' ')
    .toLowerCase()
    .replace(/(^|[^a-z0-9])([a-z])/g, (_m, lead: string, ch: string) => lead + ch.toUpperCase());
  return `PR · ${name} ${String(Math.round(load * 100) / 100)}`;
}

/** What the record says happened on `day`: a chapter boundary first, then the day's heaviest PR. */
export function eventForDay(day: string, chapter: ChapterWindow, prs: readonly PrRow[]): string | null {
  if (day === chapter.startDate) return 'Chapter opened';
  if (chapter.sealed && chapter.endDate && day === chapter.endDate) return 'Chapter sealed';
  let best: PrRow | null = null;
  for (const pr of prs) {
    if (pr.achievedOn !== day || pr.loadValue == null) continue;
    if (!best || pr.loadValue > (best.loadValue ?? 0)) best = pr;
  }
  return best && best.loadValue != null ? prEventLabel(best.exercise, best.loadValue) : null;
}

/** The chapter's headline lift — its heaviest load PR inside the window, latest first on a tie. */
export function headlinePr(prs: readonly PrRow[], chapter: ChapterWindow, today: string): PrRow | null {
  const end = chapter.endDate ?? today;
  let best: PrRow | null = null;
  for (const pr of prs) {
    if (pr.loadValue == null || pr.achievedOn < chapter.startDate || pr.achievedOn > end) continue;
    if (
      !best ||
      pr.loadValue > (best.loadValue ?? 0) ||
      (pr.loadValue === best.loadValue && pr.achievedOn > best.achievedOn)
    ) {
      best = pr;
    }
  }
  return best;
}

/** Whole weeks a chapter spans, never less than one — the rule `photo_albums()` uses (0085). */
export function chapterWeeks(startDate: string, endDate: string | null, today: string): number {
  const utc = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const days = (utc(endDate ?? today) - utc(startDate)) / 86400000;
  return Number.isFinite(days) ? Math.max(1, Math.ceil(days / 7)) : 1;
}

/**
 * One chapter's progress sets as album items, newest day first.
 *
 * `serverEvents` is what the album's own photos already say about each day. A day that has one takes it
 * as-is — including "nothing happened" — so the two sources can never disagree about the same day. Only
 * a day with no album photo is worked out here.
 */
export function progressItems(
  entries: readonly ProgressEntry[],
  chapterId: string,
  poses: readonly PoseLabel[],
  chapter: ChapterWindow,
  prs: readonly PrRow[],
  serverEvents: ReadonlyMap<string, string | null>,
): AlbumItem[] {
  const out: AlbumItem[] = [];
  for (const e of entries) {
    if (e.chapterId !== chapterId) continue;
    const day = progressDay(e);
    const event = serverEvents.has(day) ? (serverEvents.get(day) ?? null) : eventForDay(day, chapter, prs);
    const base = { takenOn: day, caption: e.caption, isStarred: false, role: null, exercise: null, event, source: 'progress' as const };
    for (const p of poses) {
      const url = e.photos[p.key];
      if (url) out.push({ ...base, id: `progress:${e.id}:${p.key}`, url, pose: p.label, isVideo: false });
    }
    if (e.videoUrl) out.push({ ...base, id: `progress:${e.id}:video`, url: e.videoUrl, pose: 'Posing clip', isVideo: true });
  }
  return out;
}

/**
 * Album photos and progress photos as one list, newest day first.
 *
 * Stable, and the album's own photos are listed first — so on a day that has both, the day's cover is
 * still the photo the athlete put in the album, and everything keeps the order it arrived in.
 */
export function mergeAlbum<T extends { takenOn: string }>(album: readonly T[], progress: readonly T[]): T[] {
  return [...album, ...progress].sort((a, b) => (a.takenOn < b.takenOn ? 1 : a.takenOn > b.takenOn ? -1 : 0));
}
