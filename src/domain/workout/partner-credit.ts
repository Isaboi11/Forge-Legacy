/**
 * WHO GETS NAMED ON THIS WORKOUT — and why the credit was only ever half-written.
 *
 * ══ THE ASYMMETRY THIS EXISTS TO FIX ══
 *
 * 0092's model is right: no shared session object, just an invite and two ordinary workouts that each
 * name the other person in `workouts.partners`. But a name only ever reached ONE of those two workouts,
 * because every path that wrote one ran on the RECEIVING device:
 *
 *   · accept an invite            → the guest's launch context carries `partnerId`      ✓ guest only
 *   · accept a join request       → the host tags the asker, in the logger or the inbox ✓ host only
 *   · invite from a LIVE session  → the host tags whoever they asked                    ✓ host only
 *   · send an invite from `/train-invite`, then train  → NOTHING. ✗
 *
 * That last row is the ordinary case — you ask a friend to train and then go and train. The sender was
 * not in a session when they asked, so there was no session to tag, and by the time they started one the
 * invite was forgotten. Reported from the field exactly that way: one athlete's history said "with
 * Selene" and Selene's said nothing, for the same hour in the same gym.
 *
 * ══ WHY THE ACCEPTED INVITE IS THE SOURCE OF TRUTH ══
 *
 * It is the one record BOTH devices can read (`workout_invites_select` is `from_id = auth.uid() or
 * to_id = auth.uid()`), and it is the only thing either of them agreed to. Deriving the credit from it
 * at session time makes both sides run the same rule and arrive at the same answer, without either
 * device writing to the other's workout row — which RLS forbids anyway, and rightly.
 *
 * ⚠ AN ACCEPTED INVITE IS NEVER CONSUMED. Nothing deletes or closes the row once it is answered, so
 * without a window every workout either athlete logged from then on would name the other forever. The
 * window below is what keeps "we trained together" from becoming "we are permanently linked".
 *
 * Pure and node-testable: no React, no RN, no storage, no `@` imports.
 */

/**
 * How far back an accepted invite may reach to claim a session.
 *
 * Twelve hours, because the ask and the session are routinely hours apart and on the same day — "train
 * at six?" answered over breakfast is the normal shape of this, not the exception. Wide enough to cover
 * a morning ask and an evening session; short enough that yesterday's session cannot claim today's.
 */
export const PARTNER_CREDIT_WINDOW_MS = 12 * 60 * 60 * 1000;

/** The other athlete on an invite that was accepted — whichever end of it you are. */
export interface AcceptedTraining {
  athleteId: string;
  athleteName: string;
  /** ISO, from `workout_invites.accepted_at`. */
  acceptedAt: string;
}

/** How many people one workout may name — the cap the tagger has always enforced. */
export const MAX_PARTNERS = 3;

/**
 * The credits that belong to a session, given when it started.
 *
 * `fromMs` is the earliest accept that may claim this session and `toMs` the latest. Callers ask two
 * different questions with the same function:
 *
 *   · AT SESSION START — `[now − window, now]`. Everything already agreed, applied before the athlete
 *     logs a single set, so the "Trained with" chip is on screen while they train and can be removed.
 *   · AT FINISH — `[startedAt − window, now]`. Catches the accept that landed WHILE they were training,
 *     which the start-time pass could not have seen, and re-derives the whole set for a session that was
 *     resumed rather than started here.
 */
export function creditsInWindow(
  accepted: readonly AcceptedTraining[],
  window: { fromMs: number; toMs: number },
): AcceptedTraining[] {
  return accepted.filter((c) => {
    const at = Date.parse(c.acceptedAt);
    return Number.isFinite(at) && at >= window.fromMs && at <= window.toMs;
  });
}

/**
 * Add automatic credits to the tags already on a session, honouring the cap and — crucially — anyone the
 * athlete took OFF.
 *
 * ⚠ `declined` IS WHAT MAKES THE SECOND PASS SAFE. Finish re-derives credits from the same invites the
 * start-time pass used, so without a record of removals, un-tagging someone mid-session would silently
 * put them back on the way out — the app recording a thing the athlete explicitly said no to. Removing a
 * tag is the only way into that list, and re-adding one is the only way out.
 *
 * Order is preserved: existing tags first, in the order they were added, then new credits in the order
 * they were accepted. The cap truncates the tail, so a partner the athlete chose by hand is never
 * displaced by one the app inferred.
 */
export function mergePartnerCredits(
  current: readonly string[],
  credits: readonly AcceptedTraining[],
  declined: readonly string[] = [],
  cap: number = MAX_PARTNERS,
): string[] {
  const out = [...current];
  const seen = new Set(current);
  const refused = new Set(declined);
  for (const c of credits) {
    if (out.length >= cap) break;
    if (seen.has(c.athleteId) || refused.has(c.athleteId)) continue;
    seen.add(c.athleteId);
    out.push(c.athleteId);
  }
  return out.slice(0, cap);
}

/**
 * Tag ids → the names that actually get written to `workouts.partners`.
 *
 * ══ WHY THE ROSTER IS NOT THE ONLY SOURCE ══
 *
 * The save path resolved names solely through `training_partners()`, and an id that roster did not
 * answer for was silently dropped — no error, no tag, a workout that simply forgot who was there. That
 * RPC returns `[]` on ANY failure by design (a dead read must not break the tagger), so one dropped
 * request at Finish cost the credit outright. It also legitimately omits someone you trained with and
 * have since stopped sharing a squad with.
 *
 * The accepted invite carries the name, so it fills both gaps. Roster first — it is the live name — and
 * the invite as the fallback that cannot go missing.
 *
 * Ids with no name from either source are dropped rather than guessed at: `partners` is a list of names
 * shown to the athlete, and "Athlete" in their own history is worse than one fewer chip.
 */
export function resolvePartnerNames(
  ids: readonly string[],
  roster: readonly { id: string; name: string }[],
  credits: readonly AcceptedTraining[],
): string[] {
  const byId = new Map<string, string>();
  for (const c of credits) if (c.athleteName.trim()) byId.set(c.athleteId, c.athleteName.trim());
  for (const p of roster) if (p.name.trim()) byId.set(p.id, p.name.trim());
  return ids.map((id) => byId.get(id)).filter((n): n is string => Boolean(n));
}
