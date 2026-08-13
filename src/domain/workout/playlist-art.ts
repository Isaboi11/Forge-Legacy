/**
 * Playlist cover art — the pure half. The endpoint to ask, and how to read the answer.
 *
 * ══ WHY THIS IS SUDDENLY ALLOWED ══
 *
 * `Workout-Playlist-Amendment-001` §2/§7 ruled out "cover art, or any playlist metadata" on the stated
 * grounds that "**no metadata fetch exists**" and that getting one would mean "OAuth, API integration,
 * or SDK embedding". That reasoning was right about OAuth and wrong about the premise: Spotify publishes
 * an **oEmbed** endpoint that takes a public playlist URL and returns a title and a thumbnail with **no
 * authentication, no registered application, no token and no SDK**. Amendment 002 records the ruling.
 *
 * ⚠ SPOTIFY ONLY, AND THAT IS NOT AN OVERSIGHT. Apple Music has no unauthenticated equivalent — the
 * catalog API requires a signed developer token, and `itunes.apple.com/lookup` does not serve user or
 * curated playlists (`pl.…`) at all. An Apple link therefore keeps the bronze glyph, which is the honest
 * rendering of "nothing here knows what that looks like" rather than a slot advertising an absence.
 *
 * ⚠ NOTHING HERE MAY BECOME LOAD-BEARING. The art is decoration on a link the athlete pasted; the link
 * works whether or not this ever answers. Every failure — offline, rate-limited, CORS-blocked on the web
 * preview, a private playlist, a reshaped response — resolves to `null` and the glyph, never to an error
 * the athlete has to read.
 */

import type { WorkoutPlaylistLink } from './playlist.ts'

export interface PlaylistArt {
  /** Absolute https image URL. Never a relative path and never a data URI. */
  imageUrl: string
  /** The playlist's real name, when the provider gave one. Used only as a FALLBACK — see `artLabel`. */
  title: string | null
}

/**
 * Where to ask, or null for a link nothing can answer for.
 *
 * The URL is passed through `encodeURIComponent` rather than concatenated: a playlist link routinely
 * carries `?si=…` tracking parameters, and an unescaped `&` would truncate the query the endpoint sees.
 */
export function playlistArtEndpoint(link: Pick<WorkoutPlaylistLink, 'service' | 'url'>): string | null {
  if (link.service !== 'SPOTIFY') return null
  const url = link.url.trim()
  if (!url) return null
  return `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
}

/**
 * Read an oEmbed response into art, or null.
 *
 * ⚠ THIS IS UNTRUSTED THIRD-PARTY JSON and it is treated as such. Every field is checked for type and
 * shape rather than cast: a `thumbnail_url` that is a number, a missing key, a `javascript:` scheme or
 * a plain-http image would all otherwise flow straight into an `<Image src>`. The scheme check is the
 * one that matters — it is the only thing standing between a third-party string and a URL loader.
 */
export function readPlaylistArt(payload: unknown): PlaylistArt | null {
  if (!payload || typeof payload !== 'object') return null
  const o = payload as Record<string, unknown>

  const raw = typeof o.thumbnail_url === 'string' ? o.thumbnail_url.trim() : ''
  // https only. Not http, and emphatically not any other scheme.
  if (!/^https:\/\/[^\s]+$/i.test(raw)) return null

  const title = typeof o.title === 'string' ? o.title.trim() : ''
  return { imageUrl: raw, title: title || null }
}

/**
 * What the row says the playlist is called.
 *
 * ⚠ THE ATHLETE'S OWN NAME ALWAYS WINS. Somebody who typed "Leg Day Bangers" must keep reading "Leg Day
 * Bangers" — a provider title arriving later and replacing it would be the app overwriting a person's
 * words with a stranger's. The fetched title only fills the gap where there was no name at all, in place
 * of the generic "Spotify Playlist" stand-in.
 */
export function artLabel(link: WorkoutPlaylistLink, art: PlaylistArt | null, fallback: string): string {
  const own = link.displayName?.trim()
  if (own) return own
  return art?.title?.trim() || fallback
}
