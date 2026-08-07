/**
 * Accomplishments (L-12/13/14) — the pure model behind the athlete-authored milestone CRUD.
 *
 * The deliberate opposite of Honors: freeform, no taxonomy, no numeric validation. Ported from
 * `forge-accomplishments.js`, with the one rule the design enforces made explicit and testable — the
 * "Featured on Profile" flag is capped at THREE (the design's "Show among your top 3 · N/3").
 *
 * Kept free of data-layer/JSON imports so it runs under `node --test`.
 */

export interface Accomplishment {
  id: string;
  name: string;
  /** YYYY-MM-DD, or null when the athlete didn't date it. */
  date: string | null;
  /** Chapter id, or null for an account-level milestone ("before Forge Legacy"). */
  chapterId: string | null;
  featured: boolean;
  note: string | null;
  /**
   * The photo or video attached to it (migration 0118), or null.
   *
   * ONE URL AND A KIND, not a `photoUrl` beside a `videoUrl`. Two fields meaning "the media on this
   * row" forces every reader to decide which wins, and the first one that decides wrong renders a
   * photo over a video. The database makes the invalid pair unrepresentable (`media_url` and
   * `media_kind` are both-or-neither), so a consumer can branch on `mediaKind` and trust the URL.
   *
   * This replaced `photoUrl`, which 0023 created for the `.dc`'s file-drop slot and nothing ever wrote.
   */
  mediaUrl: string | null;
  mediaKind: 'image' | 'video' | null;
  createdAt: string;
}

export const NAME_MAX = 60;
export const NOTE_MAX = 150;
export const FEATURED_MAX = 3;

/** Most-recent first, by createdAt — the design's stable order. */
export function sortAccomplishments(list: readonly Accomplishment[]): Accomplishment[] {
  return [...list].sort((a, b) => (b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0));
}

/** The featured set for the profile — starred, most-recent first, never more than the cap. */
export function featuredAccomplishments(list: readonly Accomplishment[]): Accomplishment[] {
  return sortAccomplishments(list.filter((a) => a.featured)).slice(0, FEATURED_MAX);
}

export const featuredCount = (list: readonly Accomplishment[]): number => list.filter((a) => a.featured).length;

/**
 * Whether toggling `id` to featured is allowed. Turning OFF is always allowed; turning ON only when the
 * cap isn't already reached (an already-featured item obviously still counts as allowed). This is what
 * makes "top 3" a real limit rather than decorative copy.
 */
export function canToggleFeatured(list: readonly Accomplishment[], id: string, next: boolean): boolean {
  if (!next) return true;
  const target = list.find((a) => a.id === id);
  if (target?.featured) return true; // already on — no-op, allowed
  return featuredCount(list) < FEATURED_MAX;
}

export interface AccomplishmentForm {
  name: string;
  date: string | null;
  chapterId: string | null;
  note: string | null;
}

/** A form is submittable once it has a non-empty, in-range name — nothing else is required. */
export function validateForm(form: { name: string; note?: string | null }): { ok: boolean; reason?: string } {
  const name = form.name.trim();
  if (!name) return { ok: false, reason: 'Give it a name.' };
  if (name.length > NAME_MAX) return { ok: false, reason: `Keep the name under ${NAME_MAX} characters.` };
  if ((form.note ?? '').length > NOTE_MAX) return { ok: false, reason: `Keep the note under ${NOTE_MAX} characters.` };
  return { ok: true };
}

/** "Jun 14, 2026" — or '' when undated. Parsed as a plain calendar date, never shifted by a timezone. */
export function formatAccDate(date: string | null): string {
  if (!date) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mon = months[Number(m[2]) - 1];
  return mon ? `${mon} ${Number(m[3])}, ${m[1]}` : '';
}

/** The row's sub-line: date · chapter, omitting whichever half is missing rather than showing a stray dot. */
export function accSubline(a: Accomplishment, chapterLabel: (id: string) => string | null): string {
  const parts: string[] = [];
  const d = formatAccDate(a.date);
  if (d) parts.push(d);
  const ch = a.chapterId ? chapterLabel(a.chapterId) : null;
  if (ch) parts.push(ch);
  return parts.join(' · ');
}
