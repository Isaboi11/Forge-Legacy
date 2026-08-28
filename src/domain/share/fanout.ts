/**
 * WHO THIS POST GOES TO — the one place that turns "these squads, and maybe friends too" into rows.
 *
 * ══ WHY THIS IS A MODULE AND NOT THREE `for` LOOPS ══
 *
 * PO: *"If I click squads then I can only pick one. I want to be able to easily select 1/3, 2/3, or 3/3
 * of those."* Three surfaces asked "which squad?" and accepted exactly one answer — the session sheet
 * (`ShareSessionSheet`), the ceremony sheet (`compositions/ShareSheet`) and Share Transformation
 * (`share-config`). Fanning out is a RULE, not a loop, because of the constraint below; written three
 * times it would be got wrong in at least one of them.
 *
 * ══ ⚠ `BOTH` CARRIES EXACTLY ONE SQUAD — THE CONSTRAINT SAYS SO ══
 *
 * 0074 states the audience/squad relationship as an EQUIVALENCE:
 *
 *   check ((audience = 'FRIENDS') = (squad_id is null))
 *
 * so a `BOTH` row must name a squad, and it can only name one. The naive fan-out — one `BOTH` row per
 * selected squad — inserts legally and is still wrong: `friends_feed` selects every row whose audience is
 * `FRIENDS` or `BOTH`, so three squads would put the SAME workout in every friend's feed three times.
 *
 * The shape that is right in both feeds is therefore asymmetric: **one `BOTH` row carrying the first
 * squad, then a plain `SQUAD` row for each of the rest**. `squad_feed` filters on `squad_id` alone and
 * doesn't care about the audience column, so every chosen squad sees it exactly once; the friends feed
 * sees the single `BOTH` row exactly once. No row is duplicated and no squad is skipped.
 *
 * Pure — no React, no supabase, no `@/` alias (a runtime alias import breaks `node --test`).
 */

export type ShareAudience = 'FRIENDS' | 'SQUAD' | 'BOTH'

/** One row to insert. `squadId` is null only for a friends-only post. */
export interface ShareTarget {
  audience: ShareAudience
  squadId: string | null
}

/**
 * The rows a share becomes.
 *
 * Order matters to the caller: the `BOTH` row is first, so a partial failure loses the tail rather than
 * the friends copy, and the toast can name the squads in the order they were picked. Duplicate ids are
 * collapsed — selecting a squad twice must not post to it twice.
 */
export function shareTargets(squadIds: readonly string[], includeFriends: boolean): ShareTarget[] {
  const squads = [...new Set(squadIds.filter(Boolean))]

  if (!squads.length) return includeFriends ? [{ audience: 'FRIENDS', squadId: null }] : []

  if (!includeFriends) return squads.map((id) => ({ audience: 'SQUAD' as const, squadId: id }))

  const [first, ...rest] = squads
  return [
    { audience: 'BOTH', squadId: first },
    ...rest.map((id) => ({ audience: 'SQUAD' as const, squadId: id })),
  ]
}

/** "Alpha", "Alpha and Bravo", "Alpha, Bravo and Charlie", then "4 squads" — a list stops being readable. */
export function squadList(names: readonly string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length > 3) return `${names.length} squads`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * What the toast says once it has landed. It names WHERE it went, because "Shared" on a screen that just
 * posted to two of your three squads leaves the third an open question.
 */
export function shareSummary(squadNames: readonly string[], includeFriends: boolean): string {
  const list = squadList(squadNames)
  if (!list) return includeFriends ? 'Shared with your friends' : 'Shared'
  return includeFriends ? `Shared with your friends and ${list}` : `Shared to ${list}`
}

/** The button's own promise, before anything is posted. Counts rather than names — a button is narrow. */
export function shareVerb(squadCount: number, includeFriends: boolean): string {
  const squads = squadCount === 1 ? '1 Squad' : `${squadCount} Squads`
  if (!squadCount) return includeFriends ? 'Share with Friends' : 'Select a Squad'
  if (!includeFriends) return squadCount === 1 ? 'Share to Squad' : `Share to ${squads}`
  return `Share with Friends and ${squads}`
}

/**
 * ══ WHAT HAS ALREADY BEEN SHARED ══
 *
 * PO (2026-08-27): *"I clicked share to squad and friends after my workout from the share card and it's
 * still not showing me that I shared it in any way. I just need something that says that I actually
 * shared it or else people will double post."*
 *
 * The record already exists — every share is a `squad_posts` row carrying `author_id` + `workout_id`
 * (`fetchWorkoutShares`). These two functions turn those rows into what a screen can say and what a
 * tile can refuse. Pure, so `share-state.test.mjs` can hold the rules without a database.
 */
export interface PriorShare {
  audience: ShareAudience
  squadId: string | null
}

export interface ShareState {
  /** A FRIENDS or BOTH post exists — the friends feed already carries this session. */
  friends: boolean
  /** Squads that already carry a post of this session. */
  squadIds: string[]
}

export function shareState(prior: readonly PriorShare[]): ShareState {
  const squadIds = [...new Set(prior.map((p) => p.squadId).filter((id): id is string => !!id))]
  return { friends: prior.some((p) => p.audience !== 'SQUAD'), squadIds }
}

/**
 * "Shared to Da Bois" / "Shared with your friends and Da Bois" — or null when nothing has been. A squad
 * that has since been left still counts (its post is still there); it is named by number.
 */
export function sharedLine(state: ShareState, squads: readonly { id: string; name: string }[]): string | null {
  const names = squads.filter((s) => state.squadIds.includes(s.id)).map((s) => s.name)
  const unnamed = state.squadIds.length - names.length
  if (unnamed > 0) names.push(unnamed === 1 ? '1 other squad' : `${unnamed} other squads`)
  if (!state.friends && !names.length) return null
  return shareSummary(names, state.friends)
}
