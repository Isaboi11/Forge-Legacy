/**
 * Where a notification goes when it is tapped.
 *
 * Extracted from `/inbox`'s own `open()` in the 0120 push pass, because a push and the inbox row it
 * mirrors must land in the same place. Two copies of this decision would drift the first time a
 * destination moved, and the drift would be invisible — the row would look right and the push would open
 * the wrong screen.
 *
 * One deliberate difference from the code this replaces: where an id is missing, the destination falls
 * back to `/inbox` instead of pushing a route with an empty segment. `/inbox` passed `n.squadId`, which is
 * `''` when the event has no squad, so a squad-less fallback used to navigate to `/squad/`. Nothing hit it
 * in practice — every kind that reaches the fallback has a squad — but a push carries less context than a
 * feed row, so the empty case is now answered rather than assumed away.
 */

export interface NotificationTarget {
  kind: string;
  squadId?: string | null;
  actorId?: string | null;
  challengeId?: string | null;
  inviteId?: string | null;
  shareId?: string | null;
  /** Set on `post_comment` and `post_reaction` (0135) — the post that was answered. */
  postId?: string | null;
  /** That post's audience, which is what decides WHICH feed holds it. See the arm below. */
  postAudience?: string | null;
}

/** Literal pathnames, so `typedRoutes` checks these against the real route tree. */
export type NotificationDestination =
  | { pathname: '/workout-invite'; params: { id: string } }
  | { pathname: '/program-share/[id]'; params: { id: string } }
  | { pathname: '/challenge/[id]'; params: { id: string } }
  | { pathname: '/squad-requests'; params: { id: string } }
  | { pathname: '/athlete/[id]'; params: { id: string } }
  | { pathname: '/workout-join'; params: { athlete: string } }
  | { pathname: '/squad/[id]'; params: { id: string } }
  | { pathname: '/squad-post/[id]'; params: { id: string } }
  | '/friends'
  | '/discover-squads'
  | '/inbox';

export function destinationFor(n: NotificationTarget): NotificationDestination {
  switch (n.kind) {
    /*
     * The only kinds whose destination is the thing itself: the invite, where accepting is one tap.
     *
     * A JOIN REQUEST lands on the SAME screen deliberately (0121), rather than getting a route of its
     * own. That screen already holds both parties, both statuses and the accept — it branches on
     * `kind` internally. A second route would have meant a new arm here, a new member on
     * `NotificationDestination`, and a new id field on `NotificationTarget` and in `push.tsx`'s
     * `targetFrom`, to reach a screen that would have been ninety per cent the same.
     */
    case 'workout_invite':
    case 'workout_join_request':
      return n.inviteId ? { pathname: '/workout-invite', params: { id: n.inviteId } } : '/inbox';
    // A shared program opens the program itself, where it can be read before it's taken.
    case 'program_shared':
      return n.shareId ? { pathname: '/program-share/[id]', params: { id: n.shareId } } : '/inbox';
    case 'challenge_invite':
      return n.challengeId ? { pathname: '/challenge/[id]', params: { id: n.challengeId } } : '/inbox';
    case 'join_request':
      return n.squadId ? { pathname: '/squad-requests', params: { id: n.squadId } } : '/inbox';
    // Friend requests are answered on the asker's profile — one place holds the whole relationship.
    case 'friend_request':
    case 'friend_accepted':
      return n.actorId ? { pathname: '/athlete/[id]', params: { id: n.actorId } } : '/inbox';
    case 'request_declined':
      return '/discover-squads';
    /*
     * Somebody answered your post (0135), so the destination is the post — not the squad it sits in.
     *
     * ⚠ THE AUDIENCE DECIDES, NOT `squadId`. A `BOTH` post carries a squad id AND appears in the
     * Friends feed, so branching on the id's presence would be right by accident for a SQUAD post and
     * wrong for a friend's. And a FRIENDS post has no detail screen at all — `post-detail` is still
     * deferred — so the honest destination is the feed that holds it, which is where its comments open.
     */
    case 'post_comment':
    case 'post_reaction':
      if (n.postAudience === 'FRIENDS') return '/friends';
      return n.postId ? { pathname: '/squad-post/[id]', params: { id: n.postId } } : '/inbox';
    /*
     * 0153. THE TWO TRAINING KINDS DO NOT SHARE A DESTINATION, even though they share a preference and
     * a sentence structure, because the only thing you can DO about each is different.
     *
     * A start is joinable and the window is minutes long, so it opens the ASK side of Train Together
     * (0121) — one tap from "they're training" to "can I come". Sending it to a profile instead would
     * be the same mistake the Home live card made before 0121: a button labelled View, on the one
     * notification in the app with a live action attached to it.
     *
     * A finish has nothing to join. It opens the athlete, which is where what they did is legible.
     *
     * ⚠ Neither falls through to the `default` arm below, and that matters: both carry a `squadId` (the
     * push needs it to name the squad in the body), so the catch-all would have quietly routed them to
     * a squad page — right-looking, and never what the athlete tapped for.
     */
    case 'squad_training_started':
      return n.actorId ? { pathname: '/workout-join', params: { athlete: n.actorId } } : '/inbox';
    case 'squad_training_finished':
      return n.actorId ? { pathname: '/athlete/[id]', params: { id: n.actorId } } : '/inbox';
    default:
      return n.squadId ? { pathname: '/squad/[id]', params: { id: n.squadId } } : '/inbox';
  }
}
