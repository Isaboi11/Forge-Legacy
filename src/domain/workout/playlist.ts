/**
 * The optional playlist link on a session — Workout-Playlist-Amendment-001 (LOCKED).
 *
 * "Athletes may optionally attach one Spotify or Apple Music playlist link to a workout session. The link
 * is a reference only — Forge Legacy does not play, sync, embed, or otherwise integrate with either
 * service. The product stores a link and a service tag, displays it wherever the session is displayed, and
 * opens it in the athlete's installed app (or browser fallback) on tap." (§1)
 *
 * Everything in this file is pure, because the one rule that matters here — WHICH URLS ARE ACCEPTED — is
 * the same rule three surfaces and one CHECK constraint have to agree on, and a rule that lives in a
 * screen is a rule that gets re-typed slightly differently in the next screen.
 *
 * ⚠ THE HOST RULE EXISTS TWICE. The other copy is `workouts_playlist_pair` in migration 0105, and the two
 * must change together. Both are covered by the same golden vectors, duplicated verbatim into
 * `__tests__/playlist.test.mjs` — so they can only drift through a deliberate edit to both.
 */

export type PlaylistService = 'SPOTIFY' | 'APPLE_MUSIC';

/** §3. At most one of these per session; attaching a new one REPLACES the previous (no list, no history). */
export interface WorkoutPlaylistLink {
  service: PlaylistService;
  url: string;
  /** Optional athlete-typed label. Null is normal — most links will never be named. */
  displayName: string | null;
}

/**
 * The two hosts, and only these two.
 *
 * §3 names them explicitly, and they are what the share affordances actually emit: Spotify's "Copy link to
 * playlist" produces `https://open.spotify.com/playlist/…`, Apple Music's Share → Copy Link produces
 * `https://music.apple.com/<region>/playlist/…`.
 *
 * Spotify's desktop "Copy Spotify URI" (`spotify:playlist:…`) is deliberately NOT accepted. It is a real
 * thing a real person could paste, and rejecting it with a message that names what to paste instead is
 * honest; silently accepting a scheme the OS may not resolve, and rendering a chip that does nothing when
 * tapped, is not.
 */
const SERVICE_BY_HOST: Readonly<Record<string, PlaylistService>> = {
  'open.spotify.com': 'SPOTIFY',
  'music.apple.com': 'APPLE_MUSIC',
};

/** §5: the fallback label names the SERVICE. It is never the raw URL. */
export const SERVICE_LABEL: Readonly<Record<PlaylistService, string>> = {
  SPOTIFY: 'Spotify Playlist',
  APPLE_MUSIC: 'Apple Music Playlist',
};

/** What the athlete types into the name field. Long enough for "Leg Day Bangers", short enough to render. */
export const PLAYLIST_NAME_MAX = 60;

/**
 * A pasted URL is untrusted text, and a share link with tracking params is already ~90 characters. This is
 * a sanity ceiling, not a spec number — it stops a megabyte of pasted nonsense reaching the database.
 */
const URL_MAX = 2048;

/**
 * The authority component of an `https://` URL, lowercased — or null if this isn't one.
 *
 * ══ WHY THIS PARSES BY HAND INSTEAD OF USING `new URL()` ══
 *
 * Two reasons, and the second is the one that decided it. First, `URL` in Hermes is a partial polyfill
 * whose host-parsing has historically not matched the WHATWG spec, so the answer could differ between the
 * Node test run and the phone. Second, this function has a SQL twin (0105) that is a POSIX regex, and the
 * only way two implementations of a security-relevant rule stay identical is if both are simple enough to
 * read side by side. A hand-rolled authority match is; a delegation to whatever `URL` does this month
 * isn't.
 *
 * Returns the authority VERBATIM (minus case) — userinfo, port and all — so the caller compares against
 * the allow-list and anything unusual simply fails to match. That is the whole trick:
 *   · 'https://open.spotify.com.evil.com/x' → 'open.spotify.com.evil.com' → no match
 *   · 'https://open.spotify.com@evil.com/x' → 'open.spotify.com@evil.com' → no match
 *   · 'https://open.spotify.com:443/x'      → 'open.spotify.com:443'      → no match
 * The last one is a URL nobody's share sheet emits, and 0105 rejects it too — agreeing with the database
 * matters more than accepting an exotic paste.
 */
export function linkAuthority(raw: string): string | null {
  const m = /^https:\/\/([^/?#]*)/.exec(raw.trim());
  if (!m) return null;
  return m[1].toLowerCase();
}

/**
 * Which service this URL belongs to, or null.
 *
 * §3: "If the domain doesn't match either, the field is rejected with an inline message — no silent
 * guess." Null here IS that rejection; no caller may default it.
 */
export function detectService(raw: string): PlaylistService | null {
  const authority = linkAuthority(raw);
  if (!authority) return null;
  return SERVICE_BY_HOST[authority] ?? null;
}

export type PlaylistParse =
  | { ok: true; link: WorkoutPlaylistLink }
  | { ok: false; message: string };

/**
 * Validate a pasted link into the value object, or explain the refusal in a sentence the athlete can act
 * on. The message is the inline error §3 requires, so it names what IS accepted rather than what wasn't.
 */
export function parsePlaylistLink(rawUrl: string, rawName?: string | null): PlaylistParse {
  const url = (rawUrl ?? '').trim();
  if (!url) return { ok: false, message: 'Paste a link to your playlist.' };
  if (url.length > URL_MAX) return { ok: false, message: 'That link is too long to be a playlist link.' };

  const service = detectService(url);
  if (!service) {
    // The http case is worth its own sentence: the link IS theirs, and "isn't a playlist link" would read
    // as though they'd copied the wrong thing when all they need is the s.
    const authority = /^http:\/\/([^/?#]*)/.exec(url)?.[1]?.toLowerCase();
    if (authority && SERVICE_BY_HOST[authority]) {
      return { ok: false, message: 'Use the https:// version of that link.' };
    }
    return { ok: false, message: 'That needs to be a Spotify or Apple Music playlist link.' };
  }

  // An empty name is no name — never an empty string, which would render as a nameless chip rather than
  // falling back to the service label (§5).
  const name = (rawName ?? '').trim().slice(0, PLAYLIST_NAME_MAX);
  return { ok: true, link: { service, url, displayName: name || null } };
}

/**
 * What the chip says. §5: "If displayName is null, the chip falls back to a generic label naming the
 * service — never the raw URL."
 *
 * That last clause is the reason this function exists rather than each screen writing `link.displayName ??
 * link.url`. A URL in a chip is unreadable, it leaks the tracking params of whoever shared it, and on a
 * squad card it would be the only place in the product that renders somebody's raw link as body text.
 */
export function playlistLabel(link: WorkoutPlaylistLink): string {
  return link.displayName?.trim() || SERVICE_LABEL[link.service];
}

/**
 * Rebuild the link from three loose nullable columns (or from a stored snapshot), or null.
 *
 * Every read path has the same three-nullable-columns shape and the same question — "is there actually a
 * link here?" — and getting it wrong in one place means a chip that renders with no URL behind it. The
 * service is re-checked against the allow-list rather than cast, so a row that predates the 0105
 * constraint, or one hand-edited in the SQL editor, reads as "no playlist" instead of rendering a chip the
 * app would refuse to open.
 */
export function playlistFromRow(row: {
  playlist_url?: string | null;
  playlist_service?: string | null;
  playlist_name?: string | null;
} | null | undefined): WorkoutPlaylistLink | null {
  const url = row?.playlist_url?.trim();
  const service = row?.playlist_service;
  if (!url || !service) return null;
  if (service !== 'SPOTIFY' && service !== 'APPLE_MUSIC') return null;
  // The host must still agree with the tag. Same reasoning as 0105: this value becomes a tap target.
  if (detectService(url) !== service) return null;
  return { service, url, displayName: row?.playlist_name?.trim() || null };
}

/** The three columns to write for a link, or the three nulls that REMOVE one. Removal clears all three —
 *  0105's `workouts_playlist_name_needs_link` rejects a leftover name, deliberately. */
export function playlistToRow(link: WorkoutPlaylistLink | null): {
  playlist_url: string | null;
  playlist_service: string | null;
  playlist_name: string | null;
} {
  return link
    ? { playlist_url: link.url, playlist_service: link.service, playlist_name: link.displayName }
    : { playlist_url: null, playlist_service: null, playlist_name: null };
}
