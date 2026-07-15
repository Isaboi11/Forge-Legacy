/**
 * Feed-origin config — the single place that decides which affordances the ONE shared
 * FeedPostCard shows, keyed off the post's origin (`source.kind`). This mirrors Post Detail's
 * `_cfg()` pattern: Community-only affordances (save, RSVP, program CTA, author presence, the
 * type label) are config branches on the shared card, NOT a forked Community card.
 *
 * Pure + dependency-free so it is behaviour-locked by feed-origin-config.test.mjs without a
 * renderer.
 */

export type FeedOrigin = 'friend' | 'squad' | 'community'

export interface FeedOriginConfig {
  /** Show the source/audience tag next to the timestamp (Friends: posts span circles). */
  audienceTag: boolean
  /** Show the small type label (Discussion / Coaching / Event …) in the author row. */
  showTypeLabel: boolean
  /** Show a save/bookmark control in the reaction row. */
  save: boolean
  /** Show the share control even when the post has no SH-1 share kind (inert placeholder). */
  shareAlways: boolean
  /** Event content shows an RSVP / Interested affordance. */
  eventRSVP: boolean
  /** Program content shows its save/get CTA + foot note. */
  programCTA: boolean
  /** Achievement author shows a live presence dot. */
  presenceOnAchievement: boolean
}

const CONFIG: Record<FeedOrigin, FeedOriginConfig> = {
  // Friends — personal circle. The card stays lean: audience tag, milestone content, and Share
  // only when the post is a genuine keepsake. No moderation/creator affordances.
  friend: {
    audienceTag: true,
    showTypeLabel: false,
    save: false,
    shareAlways: false,
    eventRSVP: false,
    programCTA: false,
    presenceOnAchievement: false,
  },
  // Squad — internal training feed. The Firewall is lifted here, but it stays training-only: no
  // save/RSVP/program (squads have no programs or public events). Posts are typed (Check-in / PR /
  // Challenge Update / …) so the type label shows. Share is limited to genuine keepsakes (a PR
  // carries an SH-1 kind); no blanket external share on a private squad's feed.
  squad: {
    audienceTag: false,
    showTypeLabel: true,
    save: false,
    shareAlways: false,
    eventRSVP: false,
    programCTA: false,
    presenceOnAchievement: false,
  },
  // Community — the richest surface: moderated + creator posts. Save, RSVP, program CTAs, author
  // presence, and the type label all light up here.
  community: {
    audienceTag: false,
    showTypeLabel: true,
    save: true,
    shareAlways: true,
    eventRSVP: true,
    programCTA: true,
    presenceOnAchievement: true,
  },
}

export function feedOriginConfig(origin: FeedOrigin): FeedOriginConfig {
  return CONFIG[origin]
}
