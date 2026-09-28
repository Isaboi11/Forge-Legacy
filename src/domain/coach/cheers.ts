/**
 * A WORD FROM THE SQUAD — what Holt says when a squad-mate sends the athlete a message mid-workout (0231).
 *
 * PO 2026-09-28: *"I see they started, I click on the notification and type in 'let's go Jordan! Kill
 * this workout' and then coach holt lets them know during their workout."*
 *
 * ⚠ HOLT CARRIES IT, HE DOES NOT REWRITE IT. The squad-mate's words go through verbatim (trimmed and
 * length-capped) inside quotes, with their name in front. Paraphrasing a friend's message is the coach
 * speaking for somebody, and an AI "improving" it is worse.
 *
 * Pure and node-testable: no React, no supabase, no runtime `@/` imports.
 */

export const CHEER_MAX = 140

export interface Cheer {
  id: string
  body: string
  createdAt: string
  fromId: string
  /** First name only — this is a coach's aside, not a byline. */
  fromName: string
}

/** Trim, collapse runs of whitespace (a pasted paragraph is one line here), cap. Empty → null. */
export function cleanCheer(raw: string | null | undefined): string | null {
  const s = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!s) return null
  return s.length > CHEER_MAX ? s.slice(0, CHEER_MAX).trimEnd() : s
}

/** Holt's line: `Isaiah says: "Let's go Jordan! Kill this workout"`. */
export function cheerLine(c: Pick<Cheer, 'fromName' | 'body'>): string | null {
  const body = cleanCheer(c.body)
  if (!body) return null
  const name = c.fromName.trim() || 'A squad-mate'
  return `${name} says: “${body}”`
}

/**
 * Which message Holt shows now: the OLDEST one the athlete has not closed, so a burst from three
 * squad-mates is read in the order it was sent rather than the newest one burying the first.
 */
export function nextCheer(unseen: readonly Cheer[], closed: ReadonlySet<string>): Cheer | null {
  return unseen.find((c) => !closed.has(c.id) && cleanCheer(c.body)) ?? null
}
