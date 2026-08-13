import { useEffect, useState } from 'react'

import { playlistArtEndpoint, readPlaylistArt, type PlaylistArt } from '@/domain/workout/playlist-art'
import type { WorkoutPlaylistLink } from '@/domain/workout/playlist'

/**
 * Cover art for an attached playlist — the network half. Pure logic, refusals and tests live in
 * `domain/workout/playlist-art.ts`; this is the request, the cache and the hook.
 *
 * ⚠ EVERY FAILURE IS SILENT AND EVERY FAILURE IS FINAL. Offline, rate-limited, CORS-blocked on the web
 * preview, a private playlist, a 404, a reshaped response — all of them resolve to `null`, the bronze
 * glyph renders, and nothing is retried. The art is decoration on a link that already works; a feed
 * that keeps hammering an endpoint on every scroll to redraw a 52px square would be spending an
 * athlete's battery on a thumbnail.
 *
 * `null` is therefore CACHED as an answer, not as an absence. That is the difference between "we asked
 * and there is nothing" and "we have not asked" — and without it a feed with ten Apple Music links
 * would re-ask ten times per render.
 */

/** Resolved answers, `null` included. Module-level so a feed scroll re-uses what it already knows. */
const CACHE = new Map<string, PlaylistArt | null>()
/** Requests in flight, so the same playlist on three posts makes one call rather than three. */
const PENDING = new Map<string, Promise<PlaylistArt | null>>()

/**
 * How long to wait before giving up.
 *
 * Short on purpose. Nothing on screen is waiting for this — the row is already drawn with its glyph —
 * so a request that has not answered in four seconds has failed as far as the athlete is concerned,
 * and holding the socket open only keeps the radio awake.
 */
const TIMEOUT_MS = 4000

/** Bounded so a long session's feed cannot grow this without limit. Oldest answer out first. */
const CACHE_MAX = 200

function remember(key: string, value: PlaylistArt | null): PlaylistArt | null {
  if (CACHE.size >= CACHE_MAX) {
    const oldest = CACHE.keys().next().value
    if (oldest !== undefined) CACHE.delete(oldest)
  }
  CACHE.set(key, value)
  return value
}

export async function fetchPlaylistArt(link: WorkoutPlaylistLink): Promise<PlaylistArt | null> {
  const endpoint = playlistArtEndpoint(link)
  // Not a Spotify link, or nothing to ask about. Cached by URL so it is answered once and never again.
  if (!endpoint) return remember(link.url, null)

  const cached = CACHE.get(link.url)
  if (cached !== undefined) return cached

  const inFlight = PENDING.get(link.url)
  if (inFlight) return inFlight

  const request = (async () => {
    /*
     * `AbortController` rather than a racing timer: a `Promise.race` leaves the request running and the
     * connection open, which is the thing the timeout exists to avoid.
     */
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(endpoint, { signal: controller.signal, headers: { Accept: 'application/json' } })
      if (!res.ok) return remember(link.url, null)
      return remember(link.url, readPlaylistArt(await res.json()))
    } catch {
      return remember(link.url, null)
    } finally {
      clearTimeout(timer)
      PENDING.delete(link.url)
    }
  })()

  PENDING.set(link.url, request)
  return request
}

/**
 * The art for one link, or null while it is unknown and forever after if it cannot be had.
 *
 * The state is seeded from the cache in the initialiser rather than synced in an effect: a second post
 * carrying the same playlist renders with its art on the FIRST frame, and there is no setState in an
 * effect body for the react-compiler lint to reject.
 */
export function usePlaylistArt(link: WorkoutPlaylistLink | null | undefined): PlaylistArt | null {
  const url = link?.url ?? null
  const [art, setArt] = useState<PlaylistArt | null>(() => (url ? CACHE.get(url) ?? null : null))

  useEffect(() => {
    if (!link || !url) return
    if (CACHE.has(url)) return // already answered — including with `null`
    let alive = true
    void fetchPlaylistArt(link).then((a) => {
      if (alive && a) setArt(a)
    })
    return () => {
      alive = false
    }
  }, [link, url])

  // ⚠ Read the cache during render as well as the state: a row that mounted after another row already
  // resolved the same playlist has nothing in its own state and everything in the cache.
  return art ?? (url ? CACHE.get(url) ?? null : null)
}
