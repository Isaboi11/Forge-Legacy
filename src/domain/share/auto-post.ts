/**
 * AUTO-POST — where a finished workout goes on its own, if anywhere.
 *
 * ══ WHY ══
 *
 * Two pieces of feedback that pull opposite ways (PO 2026-09-28): some athletes never found out a
 * session could be posted at all, and some want every session posted without being asked — while
 * others specifically do not. So auto-post is OFF until the athlete turns it on, it is taught once, in
 * context (after their first manual post, to the place they just posted), and it never becomes a step
 * of finishing a workout.
 *
 * ══ ONE SOURCE OF TRUTH ══
 *
 * The preference is one key, `autoPost`, in `profiles.app_prefs` — the JSONB blob every other
 * experience preference already lives in, so it needs no migration and follows the athlete between
 * devices. The completion screen's row, the first-post prompt and Profile Visibility all read and write
 * this one value through `AutoPostSheet`.
 *
 * ══ WHEN IT FIRES — ON THE WAY OUT, NOT ON ARRIVAL (PO 2026-09-30) ══
 *
 * *"It auto posted before I could attach the playlist and my comment."* It used to fire the moment the
 * completion screen opened, so the post was a snapshot of the session BEFORE the athlete had added
 * anything to it. It now fires when they leave that screen — the button says "Post and see your
 * Legacy" — and carries what they saved there: the note, the playlist, the name. Leaving any other way
 * still posts; closing the app posts on the next launch (`parsePendingAutoPost`).
 *
 * ══ ⚠ WHAT AN AUTO-POST NEVER CARRIES ══
 *
 *   · No words the athlete did not write. The caption is their own sealed note or nothing — never a
 *     generated sentence (`addSquadPost` puts no fallback body on a recap).
 *   · No photos. Nothing is attached at the moment it fires, and "what was added to the archive
 *     today" is not the same thing as "what I chose to post".
 *   · No map. D-RS-3 / Route-Sharing-Amendment-001 §4: the route is a per-post choice that "must not
 *     become a global 'always include' preference without a further amendment". Auto-post is exactly
 *     such a preference, so `shareRoute` is forced false.
 *
 * Pure — no React, no supabase, no runtime `@/` import (a runtime alias breaks `node --test`).
 */

import { shareState, shareTargets, squadList, type PriorShare, type ShareState, type ShareTarget } from './fanout.ts'

export interface AutoPostPref {
  /** Post finished workouts to the friends feed. */
  friends: boolean
  /** Squads to post finished workouts to. Pruned to current memberships before every use. */
  squadIds: string[]
  /**
   * The first-post prompt has had its answer — "Turn on auto-post" or "Not now". Either one ends it;
   * the prompt is a lesson, and a lesson repeated after every workout is a nag.
   */
  asked: boolean
}

export const AUTO_POST_DEFAULT: AutoPostPref = { friends: false, squadIds: [], asked: false }

/** On means "has somewhere to go". There is no separate enabled flag to disagree with the destinations. */
export function autoPostOn(p: AutoPostPref): boolean {
  return p.friends || p.squadIds.length > 0
}

/** Stored blob → a pref this code understands. Anything malformed falls back to OFF, never to on. */
export function sanitizeAutoPost(raw: unknown): AutoPostPref {
  if (!raw || typeof raw !== 'object') return { ...AUTO_POST_DEFAULT, squadIds: [] }
  const r = raw as Record<string, unknown>
  const ids = Array.isArray(r.squadIds) ? r.squadIds.filter((x): x is string => typeof x === 'string' && x.length > 0) : []
  return {
    friends: r.friends === true,
    squadIds: [...new Set(ids)].slice(0, 50),
    asked: r.asked === true,
  }
}

/**
 * Drop squads the athlete no longer belongs to. Left, removed, or the squad was deleted — all three
 * look the same from here, and all three mean "not a destination". An emptied pref IS off: nothing is
 * kept around to silently resume posting if they rejoin.
 */
export function pruneAutoPost(p: AutoPostPref, memberSquadIds: readonly string[]): AutoPostPref {
  const member = new Set(memberSquadIds)
  const squadIds = p.squadIds.filter((id) => member.has(id))
  return squadIds.length === p.squadIds.length ? p : { ...p, squadIds }
}

/**
 * The rows an auto-post becomes, given what this session already has.
 *
 * ⚠ THIS IS THE CLIENT HALF OF IDEMPOTENCY. A destination that already carries this workout — posted by
 * hand, or by an earlier auto-post that got halfway — is not posted to again. The database half is the
 * `squad_posts_auto_once` index (0229), which refuses a second auto row for the same workout+squad even
 * if two attempts race past this check.
 */
export function autoPostTargets(p: AutoPostPref, memberSquadIds: readonly string[], prior: readonly PriorShare[]): ShareTarget[] {
  const live = pruneAutoPost(p, memberSquadIds)
  const already = shareState(prior)
  const squads = live.squadIds.filter((id) => !already.squadIds.includes(id))
  return shareTargets(squads, live.friends && !already.friends)
}

/**
 * How long after a save an arrival on the completion screen still counts as "just finished".
 *
 * The screen is addressable by id without `review=1` (a reload, a stale tab), and opening it hours later
 * must not publish a session the athlete has already decided not to post.
 */
export const AUTO_POST_WINDOW_MS = 6 * 60 * 60 * 1000

export function withinAutoPostWindow(savedAtIso: string | null, now: number = Date.now()): boolean {
  if (!savedAtIso) return false
  const t = Date.parse(savedAtIso)
  if (Number.isNaN(t)) return false
  return now - t >= -5 * 60 * 1000 && now - t <= AUTO_POST_WINDOW_MS
}

/** The post's words: the note the athlete sealed on the completion screen, or nothing. */
export function autoPostCaption(reflection: string | null | undefined): string {
  return (reflection ?? '').trim()
}

/**
 * Whether leaving the completion screen will post this session — what the button's label is drawn from.
 *
 * ⚠ A SESSION ALREADY POSTED BY HAND STANDS AUTO-POST DOWN, entirely. The athlete chose where this one
 * goes; quietly adding the rest of their usual destinations on the way out would be posting behind a
 * button that says "See your Legacy".
 *
 * `memberSquadIds` is null until the squad list has loaded. The pref is trusted as-is until then — the
 * write path prunes it for real before anything is sent.
 */
export function autoPostStanding(
  p: AutoPostPref,
  memberSquadIds: readonly string[] | null,
  prior: readonly PriorShare[],
  eligible: boolean,
): boolean {
  if (!eligible || prior.length > 0) return false
  return autoPostOn(memberSquadIds ? pruneAutoPost(p, memberSquadIds) : p)
}

/** A session whose auto-post has not happened yet — kept on the device so closing the app cannot lose it. */
export interface PendingAutoPost {
  workoutId: string
  savedAt: string
}

/**
 * Read the stored marker back. Null for anything malformed, and null once the session is no longer
 * "just finished" — a marker found days later must not publish a workout out of nowhere.
 */
export function parsePendingAutoPost(raw: string | null, now: number = Date.now()): PendingAutoPost | null {
  if (!raw) return null
  try {
    const r = JSON.parse(raw) as Record<string, unknown> | null
    if (!r || typeof r.workoutId !== 'string' || !r.workoutId || typeof r.savedAt !== 'string') return null
    return withinAutoPostWindow(r.savedAt, now) ? { workoutId: r.workoutId, savedAt: r.savedAt } : null
  } catch {
    return null
  }
}

// ── Workout Complete's own Friends / Squads rows (PO 2026-10-02) ──

/** Where a session is about to be posted, as the completion screen's two rows hold it. */
export interface Destinations {
  friends: boolean
  squadIds: string[]
}

export const NO_DESTINATIONS: Destinations = { friends: false, squadIds: [] }

/** The device's memory of the last places a session was posted by hand. Malformed = none. */
export function parseDestinations(raw: string | null): Destinations | null {
  if (!raw) return null
  try {
    const r = JSON.parse(raw) as Record<string, unknown> | null
    if (!r || typeof r !== 'object') return null
    const ids = Array.isArray(r.squadIds) ? r.squadIds.filter((x): x is string => typeof x === 'string' && x.length > 0) : []
    return { friends: r.friends === true, squadIds: [...new Set(ids)].slice(0, 50) }
  } catch {
    return null
  }
}

/**
 * What the rows START as — nothing is posted until the athlete presses the button that says so.
 *
 *   · Not "just finished" (a session reopened from history, a stale tab): nothing. Posting from history is
 *     deliberate, every time.
 *   · Already posted somewhere: nothing. The rows show where it is; adding more is a fresh choice.
 *   · Auto-post on: its destinations — the screen shows, and lets them change, what leaving would post.
 *   · Otherwise: where they posted by hand last time, if this phone remembers. Squads they have since
 *     left are dropped, exactly as auto-post prunes.
 *
 * ⚠ ONLY THE AUDIENCE IS EVER REMEMBERED. The map (D-RS-3) and the food line are per-post ticks and
 * start off on every visit; nothing here may carry them.
 */
export function startingDestinations(a: {
  eligible: boolean
  prior: readonly PriorShare[]
  pref: AutoPostPref
  last: Destinations | null
  memberSquadIds: readonly string[]
}): Destinations {
  if (!a.eligible || a.prior.length > 0) return NO_DESTINATIONS
  const member = new Set(a.memberSquadIds)
  const live = pruneAutoPost(a.pref, a.memberSquadIds)
  if (autoPostOn(live)) return { friends: live.friends, squadIds: [...live.squadIds] }
  if (!a.last) return NO_DESTINATIONS
  return { friends: a.last.friends, squadIds: a.last.squadIds.filter((id) => member.has(id)) }
}

/**
 * The rows a press of the button becomes: the selection, minus squads they no longer belong to, minus
 * anywhere this session already is. Empty means the button only closes the screen.
 */
export function destinationTargets(sel: Destinations, memberSquadIds: readonly string[], prior: readonly PriorShare[]): ShareTarget[] {
  const member = new Set(memberSquadIds)
  const already = shareState(prior)
  const squads = sel.squadIds.filter((id) => member.has(id) && !already.squadIds.includes(id))
  return shareTargets(squads, sel.friends && !already.friends)
}

interface NamedSquad {
  id: string
  name: string
}

/**
 * The squad half of a destination in the fewest words: "My Squad" when you are in exactly one, the
 * squad's name when you picked one of several, "2 Squads" past that.
 */
function squadWords(ids: readonly string[], squads: readonly NamedSquad[], short: boolean): string {
  if (!ids.length) return ''
  if (squads.length <= 1) return 'My Squad'
  if (ids.length === 1) return short ? 'Squad' : (squads.find((s) => s.id === ids[0])?.name ?? 'Squad')
  return `${ids.length} Squads`
}

/** What the "Automatically post workouts" row says on its right: "Off", "Friends", "My Squad", "Friends + 2 Squads". */
export function autoPostLabel(p: AutoPostPref, squads: readonly NamedSquad[]): string {
  const live = pruneAutoPost(p, squads.map((s) => s.id))
  if (!autoPostOn(live)) return 'Off'
  const sq = squadWords(live.squadIds, squads, live.friends)
  if (live.friends && sq) return `Friends + ${sq}`
  return live.friends ? 'Friends' : sq
}

/** Whether the first-post lesson should appear: never answered, and not already on. */
export function shouldOfferAutoPost(p: AutoPostPref): boolean {
  return !p.asked && !autoPostOn(p)
}

/** The pref that "Turn on auto-post" writes — exactly the destination they just posted to. */
export function autoPostFromPost(friends: boolean, squadIds: readonly string[]): AutoPostPref {
  return { friends, squadIds: [...new Set(squadIds)], asked: true }
}

// ── The words. POST = inside Forge (Friends / Squads). SHARE = outside it (Messages, the OS sheet). ──

/**
 * The post sheet's button, before anything is sent: "Post to My Squad", "Post to Friends",
 * "Post to Friends + 2 Squads". Names the destination so nobody learns where it went by reading a feed.
 */
export function postVerb(squadIds: readonly string[], friends: boolean, squads: readonly NamedSquad[]): string {
  const sq = squadWords(squadIds, squads, false)
  if (friends && sq) return `Post to Friends + ${sq}`
  if (friends) return 'Post to Friends'
  if (sq) return `Post to ${sq}`
  return squads.length > 1 ? 'Select a Squad' : 'Choose where to post'
}

/** "Posted to The Real Cut" / "Posted to your friends and 2 squads" — once it has landed. */
export function postedLine(squadNames: readonly string[], friends: boolean): string {
  const list = squadList(squadNames)
  if (!list) return friends ? 'Posted to your friends' : 'Posted'
  return friends ? `Posted to your friends and ${list}` : `Posted to ${list}`
}

/**
 * Where a session already is, from its posts — or null when it is nowhere. `sharedLine` in POST words: a
 * squad since left still counts (its post is still there) and is named by number.
 */
export function postedFor(state: ShareState, squads: readonly NamedSquad[]): string | null {
  const names = squads.filter((s) => state.squadIds.includes(s.id)).map((s) => s.name)
  const unnamed = state.squadIds.length - names.length
  if (unnamed > 0) names.push(unnamed === 1 ? '1 other squad' : `${unnamed} other squads`)
  if (!state.friends && !names.length) return null
  return postedLine(names, state.friends)
}
