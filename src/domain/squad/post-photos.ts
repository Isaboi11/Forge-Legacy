/**
 * ══ A POST CAN CARRY UP TO TWELVE PHOTOS (PO 2026-09-28) ══
 *
 * *"When posting anything in the squad I should be able to post multiple pictures. Up to 12. … the same
 * format as when we are going to post the transformation photos, so a grid like Facebook where you click
 * into it or a swipe like Instagram."*
 *
 * The author picks how the set is shown — the same choice Progress Photo Post offers (Grid / Hero):
 *
 *   - **grid** — Facebook's collage. Up to five tiles in the band; the fifth says "+N" when there are more.
 *     A tap opens the full-screen viewer at that photo, and every photo swipes from there.
 *   - **swipe** — Instagram's carousel, in place in the feed, with an "i / n" counter.
 *
 * ⚠ THE CHOICE RIDES ON THE FIRST MEDIA ITEM (`display`), not in `layout`. `layout` is read by every
 * installed build as a transformation / progress / workout card; an unknown shape there is a card that
 * older phones would try to draw. An extra key on a media item is ignored by them — they keep swiping,
 * which is the behaviour every multi-photo post already had. So a post with no `display` is `swipe`.
 *
 * One video OR up to twelve photos — never both. A clip in a collage is a thumbnail nobody can play.
 */

export const MAX_POST_PHOTOS = 12;

export type PhotoDisplay = 'grid' | 'swipe';

export interface PostPhoto {
  url: string;
  kind: 'image' | 'video';
  display?: PhotoDisplay;
}

/** How a post's media is drawn. Only a set of two or more photos has a choice; anything written before
 *  the choice existed swipes, as it always did. */
export function displayOf(media: readonly PostPhoto[]): PhotoDisplay {
  if (media.length < 2 || media.some((m) => m.kind === 'video')) return 'swipe';
  return media[0]?.display === 'grid' ? 'grid' : 'swipe';
}

/** The media a post is written with: the choice stamped on the first item, and only when it means something. */
export function withDisplay<T extends PostPhoto>(media: readonly T[], display: PhotoDisplay): T[] {
  const out = media.map((m) => {
    const { display: _drop, ...rest } = m;
    return rest as T;
  });
  if (out.length > 1 && out.every((m) => m.kind === 'image')) out[0] = { ...out[0], display };
  return out;
}

/**
 * What a pick adds to what is already attached. A video is only ever the whole post: it is kept when it
 * is the ONLY thing picked onto an empty post, and dropped (with `droppedVideo`) anywhere else. Photos
 * fill up to the cap, in the order picked.
 */
export function addPicked<T extends { kind: 'image' | 'video' }>(
  existing: readonly { kind: 'image' | 'video' }[],
  picked: readonly T[],
): { keep: T[]; droppedVideo: boolean; overCap: boolean } {
  if (existing.some((m) => m.kind === 'video')) return { keep: [], droppedVideo: picked.some((m) => m.kind === 'video'), overCap: false };
  if (existing.length === 0 && picked.length === 1 && picked[0].kind === 'video') return { keep: [picked[0]], droppedVideo: false, overCap: false };
  const photos = picked.filter((m) => m.kind === 'image');
  const room = Math.max(0, MAX_POST_PHOTOS - existing.length);
  return { keep: photos.slice(0, room), droppedVideo: photos.length < picked.length, overCap: photos.length > room };
}

/**
 * The Facebook collage: rows of media indices, and how many photos the last tile hides.
 *
 *   1 → [0]            2 → [0 1]            3 → [0] / [1 2]
 *   4 → [0 1] / [2 3]  5+ → [0 1] / [2 3 4], "+N" on tile 4
 */
export function gridRows(count: number): { rows: number[][]; more: number } {
  if (count <= 0) return { rows: [], more: 0 };
  if (count === 1) return { rows: [[0]], more: 0 };
  if (count === 2) return { rows: [[0, 1]], more: 0 };
  if (count === 3) return { rows: [[0], [1, 2]], more: 0 };
  if (count === 4) return { rows: [[0, 1], [2, 3]], more: 0 };
  return { rows: [[0, 1], [2, 3, 4]], more: count - 5 };
}
