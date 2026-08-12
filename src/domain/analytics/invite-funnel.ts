/**
 * The invite funnel — sent → accepted → installed → converted.
 *
 * ══ WHY THIS IS THE FIRST THING PHASE B MEASURES ══
 *
 * The entire year-one plan is **20 testers × 5 people each = 100 Founder seats**. Half this product only
 * functions with other people in it, so the invite surfaces already exist and already work — they are
 * simply **uncounted, unprompted and unrewarded**. This module fixes the first of those three.
 *
 * Without it there is no way to answer the only acquisition question that matters: *of the invitations
 * that go out, how many end in somebody paying?* Every other growth decision is a guess until that number
 * exists, and the funnel has to be collecting before the invites go out, not after.
 *
 * ══ FOUR STAGES, AND ONLY TWO CAN BE MEASURED TODAY ══
 *
 *   sent      ✅ now  — an invitation left this device
 *   accepted  ✅ now  — somebody already holding an account took it up
 *   installed  ⏳ Phase E — needs a code to survive the App Store round trip; the ledger is in `0145`
 *   converted  ⏳ Phase E — fires at the referee's FIRST SUCCESSFUL PAYMENT (MA3-D20), which needs billing
 *
 * ⚠ THE LAST TWO ARE DECLARED HERE ANYWAY, DELIBERATELY. A funnel whose vocabulary is invented twice is
 * a funnel whose two halves cannot be joined. `installed` and `converted` are unreferenced today and that
 * is expected — they are the contract Phase E fills in, not dead code to be tidied away.
 *
 * ══ ⚠ EVERY PROP KEY HERE IS ALREADY IN THE ALLOWLIST, ON PURPOSE ══
 *
 * `props-core.ts` is a privacy promise made true in code, and widening its allowlist to fit a new feature
 * is precisely the habit it exists to prevent. So this module says what it needs using keys that are
 * already there — `kind` for the surface, `method` for the transport, `first_time` for the join. Nothing
 * here can carry a squad name, a challenge name, a handle, or a code.
 *
 * Pure and dependency-free so `node --test` can load it. The emitting wrapper is in `src/lib/analytics`.
 */

/** The four funnel stages, as event names. Used as `track(INVITE_EVENTS.sent, …)`. */
export const INVITE_EVENTS = {
  sent: 'invite_sent',
  accepted: 'invite_accepted',
  /** ⏳ Phase E. First launch where an invite code survived the install. */
  installed: 'invite_installed',
  /** ⏳ Phase E. The referee's first successful payment (MA3-D20) — never signup, never install. */
  converted: 'invite_converted',
} as const;

export type InviteStage = keyof typeof INVITE_EVENTS;

/**
 * Which surface the invitation came from.
 *
 * MA3-D21 is why this is an enum rather than one undifferentiated "referral" event: the plan requires the
 * credit to ride on **squad and challenge invites**, not only a generic code, because the invite is the
 * moment an athlete is already reaching out. Proving or disproving that needs the surfaces separated.
 */
export type InviteChannel =
  | 'squad'
  | 'challenge'
  | 'program'
  | 'friend'
  /** A bare referral code, shared however the athlete liked. The control group for MA3-D21. */
  | 'code';

/** How it travelled. `link` is the only one that can cross to a device without the app. */
export type InviteMethod = 'link' | 'in_app' | 'push';

/** What one funnel event carries. Every key is already allowlisted in `props-core`. */
export interface InviteProps {
  kind: InviteChannel;
  method?: InviteMethod;
  /**
   * `accepted` only: whether this was the recipient's first squad/challenge of that kind. Distinguishes
   * genuine acquisition from an existing athlete joining one more thing — the two look identical in a
   * raw accept count and mean opposite things for growth.
   */
  first_time?: boolean;
  /** `sent` only: how many recipients one action produced. A squad blast is not five separate decisions. */
  count?: number;
}

/**
 * Build the `(kind, props)` pair for one funnel event.
 *
 * Separated from emitting so the shape is testable without a Supabase client or a React tree, and so a
 * call site cannot quietly invent a channel name that no query will ever match.
 */
export function inviteEvent(
  stage: InviteStage,
  props: InviteProps,
): { kind: string; props: Record<string, string | number | boolean> } {
  const out: Record<string, string | number | boolean> = { kind: props.kind };
  if (props.method) out.method = props.method;
  if (typeof props.first_time === 'boolean') out.first_time = props.first_time;
  // A zero-recipient send is not a send; it would flatten the "how many people does one invite reach"
  // average toward nothing and is almost certainly a bug at the call site rather than a real event.
  if (typeof props.count === 'number' && Number.isFinite(props.count) && props.count > 0) {
    out.count = Math.floor(props.count);
  }
  return { kind: INVITE_EVENTS[stage], props: out };
}
