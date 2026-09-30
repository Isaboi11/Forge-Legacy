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

/** A message I sent, as the sender sees it afterwards. */
export interface SentCheer {
  id: string
  body: string
  createdAt: string
  /** Stamped when the recipient closes Holt's bubble or answers it — NOT when it is drawn. */
  seenAt: string | null
  /** The one-tap answer's own words ("🔥 Let’s go"), already looked up. Null until they answer. */
  replyLabel: string | null
}

/**
 * What the sender is told about a message they sent (PO 2026-09-30: *"don't know if he got it. There
 * was no feedback after I sent the message."*).
 *
 * ⚠ THREE STATES, AND THE FIRST ONE CLAIMS ONLY WHAT IS TRUE. A row in the table means it was SENT —
 * not that the recipient has looked at their phone. "Seen" is only said once they closed it or answered.
 * `first` is null when the recipient's name never loaded.
 */
export function sentCheerStatus(c: Pick<SentCheer, 'seenAt' | 'replyLabel'>, first: string | null): { text: string; done: boolean } {
  const who = first?.trim() || null
  if (c.replyLabel) return { text: who ? `${who} replied ${c.replyLabel}` : `They replied ${c.replyLabel}`, done: true }
  if (c.seenAt) return { text: who ? `${who} saw it` : 'They saw it', done: true }
  return { text: `Sent · Coach Holt will tell ${who ?? 'them'} during the workout`, done: false }
}
