/**
 * One composer, two feeds — and the two feeds name some of the same things differently.
 *
 * `/squad-composer` writes for the Squad feed AND the Friends feed since the composer merge (the Friends
 * feed's own in-sheet composer was retired; see that screen's header for why a sheet could not host a
 * media picker). The audience decides which writer runs — `addSquadPost` for SQUAD,
 * `createFriendPost` for FRIENDS and BOTH, per `Social-Architecture-Amendment-002` §4.
 *
 * ⚠ THE TYPE IS TRANSLATED AT WRITE TIME, NOT TAUGHT TO THE READER. `shapeOf` in `friends-feed-live`
 * derives a card shape from `type` and the media; giving it a second vocabulary would mean two
 * descriptions of the same product, which is the drift this codebase keeps paying for. So the composer
 * writes the name the destination already understands.
 *
 * It lives here, in the domain, rather than in the screen, because getting it wrong is SILENT: a
 * comparison written as `transformation` to a friend renders as an ordinary gallery — a before/after
 * with no "before", which is exactly what `shapeOf`'s own header warns about — and nothing throws.
 */

import type { PostType } from '@/data/friends-feed-live';
import type { SquadPostType } from '@/data/squad-feed-live';

/**
 * Squad post type → the type the Friends feed already renders.
 *
 * · `transformation` → `progress`. The friends card is a before/after pair whose media carry `slot`;
 *   the squad card is a laid-out `progress-card` in `layout`. `shapeOf` returns `'progress'` for the
 *   type and never looks at `layout`, so writing `transformation` here loses the divider.
 * · `formcheck` → `discussion`. There is no form-check shape in the friends feed and none is needed —
 *   a discussion carrying a clip already resolves to the `video` shape.
 * · `announcement` is absent because it is never OFFERED to this audience: it is owner-only, RLS
 *   rejects it, and on a friends-only post there is no squad to announce to.
 */
export const FRIENDS_TYPE: Partial<Record<SquadPostType, PostType>> = {
  discussion: 'discussion',
  recap: 'recap',
  pr: 'pr',
  transformation: 'progress',
  formcheck: 'discussion',
};

/** What a squad type becomes on the friends side. Falls back to a plain discussion, never to nothing. */
export function friendsTypeFor(type: SquadPostType): PostType {
  return FRIENDS_TYPE[type] ?? 'discussion';
}

/** Whether this type may be offered at all for a given audience. */
export function offeredToFriends(type: SquadPostType): boolean {
  return type in FRIENDS_TYPE;
}
