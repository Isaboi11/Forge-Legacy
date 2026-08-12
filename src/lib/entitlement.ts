/**
 * IS THIS ATHLETE ENTITLED TO A PAID FEATURE?
 *
 * ══ ⚠ THIS IS A SEAM, NOT AN IMPLEMENTATION ══
 *
 * **There is no paid tier in this app.** No entitlement column, no tier field, no billing, no check
 * anywhere in `src/` — verified. `P-8-Subscription-Architecture` is LOCKED but says so itself: *"No
 * canonical subscription-entitlement concept exists anywhere… this document does not lock anything
 * resembling `subscriptionStatus: FREE | PREMIUM`."* Account Settings currently reports every athlete as
 * free while testing.
 *
 * The paid tier is being built in a separate workstream. This file exists so the weekly review can be
 * written against the shape that work will produce, rather than the review either shipping ungated
 * (and having a paywall retro-fitted onto something people already have, which is the worst version of
 * this) or waiting on a project it does not otherwise depend on.
 *
 * ══ HOW TO REPLACE IT ══
 *
 * Change the body of `useEntitlement` to read whatever the subscription work lands — a column, an RPC,
 * a store receipt — and delete this comment. **Nothing else in the app should need to change.** If a
 * second file starts answering this question, they will disagree.
 *
 * ⚠ AND THE SERVER SIDE IS SEPARATE. This decides what the SCREEN renders. It is not a security
 * boundary and must never be the only thing between an athlete and paid data — the same rule
 * `admin-live.ts` states about `isAppAdmin()`: the gate belongs in Postgres, and the client merely
 * avoids drawing a door it knows is locked.
 */

/** The features that will eventually be gated. Named rather than boolean so the seam is greppable. */
export type PaidFeature = 'weekly_review';

export interface Entitlement {
  entitled: boolean;
  /** True while a real implementation is still deciding. Always false today. */
  loading: boolean;
}

/**
 * ⚠ RETURNS TRUE FOR EVERYONE, DELIBERATELY, UNTIL THE PAID TIER EXISTS.
 *
 * Returning `false` today would hide a finished feature behind a wall with nothing behind it — nobody
 * could buy their way past it, and the only observable effect would be that the review appears broken.
 * "Everyone is entitled" is the honest description of an app with no tiers.
 */
export function useEntitlement(_feature: PaidFeature): Entitlement {
  return { entitled: true, loading: false };
}
