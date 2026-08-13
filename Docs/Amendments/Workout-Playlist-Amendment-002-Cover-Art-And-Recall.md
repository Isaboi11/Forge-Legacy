# Forge Legacy — Workout Playlist Amendment 002
## Cover Art, and What "Detect What Was Playing" Can Actually Be
### August 2026

**Status:** LOCKED

**Type:** Narrowing Amendment (permits cover art, which Amendment 001 forbade on a premise that turned out to be false) + Ruling (records that on-device playback detection is not reachable, and what shipped instead)

**Authority:** Product Owner decision, 2026-08-13: *"For the Spotify art, let's build that and put it in. And if we could do auto detect that would be great."*

**Amends:** `Workout-Playlist-Amendment-001.md` §2 (Explicitly out of scope) and §7 (Non-Behaviors) — the cover-art clauses only.

**Supersedes:** nothing. Amendment 001's core decision — *the link is a reference, Forge plays nothing* — is unchanged and restated below.

---

## Purpose

Amendment 001 ruled out cover art, and gave its reason twice:

> Showing track lists, cover art, or any playlist metadata beyond a display name the athlete may
> optionally type

> | Showing track lists, cover art, or duration | **No metadata fetch exists**; only the athlete-typed
> display name is stored |

The reason was that getting art would mean "OAuth, API integration, or SDK embedding". **That was right
about OAuth and wrong about the premise.** Spotify publishes an **oEmbed** endpoint that takes a public
playlist URL and returns a title and a thumbnail with **no authentication, no registered application, no
token, no SDK and no user consent flow**. The thing Amendment 001 was protecting against does not have
to be paid to get the thing it gave up.

This amendment permits the art, and — because the PO asked for detection in the same breath — records
what detection is and is not, so the question does not have to be re-investigated later.

---

## Section 1 — The decisions

### PL-A2-D1 — Cover art is permitted, by unauthenticated oEmbed only

**Locked.** Forge Legacy may fetch and display a playlist's cover image and its provider title, via a
public, unauthenticated oEmbed request.

**Still forbidden, and the boundary is the authentication, not the artwork:** OAuth, a registered
application, a client secret, a stored token, an SDK, playback control, or any call that requires the
athlete to connect an account. If a future capability needs any of those, it needs its own ruling.

### PL-A2-D2 — The art is decoration, never load-bearing

**Locked.** The link works whether or not the art ever arrives.

- Every failure — offline, rate-limited, CORS-blocked on the web preview, a private playlist, a 404, a
  reshaped response — resolves to **the bronze music glyph**, which is the row's ground state and not a
  spinner. No empty square, no shimmer, no retry, and no error the athlete has to read.
- A `null` answer is **cached as an answer.** The app asks once per playlist and never again in that
  session; a feed does not re-ask on every scroll to redraw a 52px square.
- The request carries a short timeout and is aborted on it, so a hanging socket cannot hold the radio
  awake for a thumbnail.

### PL-A2-D3 — Spotify only; Apple Music keeps the glyph

**Locked.** Apple Music has **no unauthenticated equivalent**: the catalog API requires a signed
developer token, and `itunes.apple.com/lookup` does not serve user or curated playlists (`pl.…`) at all.

An Apple link therefore renders the glyph permanently. This is absent-not-invented, the same rule the
rest of the product follows — it is not a gap to be filled in later without a decision, because filling
it means a developer token, which PL-A2-D1 forbids.

### PL-A2-D4 — The athlete's own name always wins

**Locked.** Where an athlete typed a display name, that name is what renders — forever, and including
after the provider title arrives.

The fetched title fills **only** the gap where there was no typed name, in place of the generic
"Spotify Playlist" stand-in. The failure this prevents is specific and would have shipped without the
rule: the art resolves asynchronously, so the naive version replaces the label the moment it lands, and
somebody who typed "Leg Day Bangers" watches the app overwrite their words with a stranger's.

### PL-A2-D5 — Track counts remain out of scope

**Locked.** The oEmbed response carries a title and a thumbnail and **no track count**. Getting one
means the catalog API, which means OAuth. Amendment 001's clause stands unamended: the meta line names
the service, which is what is known.

### PL-A2-D6 — ⚠ On-device detection of what was playing is NOT REACHABLE, and is not a backlog item

**Locked as a finding**, so it is not re-investigated every time the idea comes up.

| Platform | What exists | Why it does not answer |
|---|---|---|
| iOS | `MPNowPlayingInfoCenter` | Reports **your own** app's playback. Forge plays no audio. |
| iOS | `MPMusicPlayerController` | Apple Music only, entitlement-gated, and blind to Spotify. |
| Android | `MediaSessionManager` | Requires the **notification-listener** permission and a native module. |
| Web | — | Nothing. The preview surface the PO reviews on has no access of any kind. |

None of these is exposed by Expo, all of the viable ones need a config plugin plus native code, and the
Android path asks for a permission whose usual purpose is reading every notification on the device —
which is a privacy posture this product should not adopt to fill in a music tag.

**The one real path is Spotify's `recently-played` endpoint**, which would genuinely work: ask what the
athlete played during the workout's window and offer those playlists. It is **full OAuth** — registered
application, redirect URI, token storage, refresh cycle — so it is barred by PL-A2-D1 and by Amendment
001 §2, and it is a project rather than a feature. **Recorded as an open item (§3), not built.**

### PL-A2-D7 — What shipped instead: the app remembers

**Locked.** The attach sheet offers **the playlists this athlete has attached before**, most recent
first, each with its cover art, and choosing one attaches it immediately with no confirm step.

Almost everybody trains to the same handful of playlists, so after the first attach this removes nearly
all of the friction detection was meant to remove — and **it can never be wrong about what somebody was
listening to, because it only ever repeats what they told it before.** A detection that guesses wrong
puts a false fact on a permanent record; a memory cannot.

Deduped **by URL, not by name** — the same playlist attached twice under two typed names is one
playlist; two different playlists an athlete happened to call "Legs" are two. That is the identity rule
`savePlaylist` and migration 0105's constraint already use.

**Smart Omission:** a first-ever attach has no history, so the section is absent rather than empty.

---

## Section 2 — What is unchanged

Amendment 001's core decision stands in full. Forge Legacy still **does not play, sync, embed, queue or
scrub**; still **does not verify** that a pasted link resolves to a real or public playlist; still
stores **one link per session**, replacing rather than appending; and still opens the link by handing
the URL to the operating system so the installed app can claim it.

Nothing in this amendment introduces an account connection, a partner brand colour, or a dependency
whose failure can cost an athlete a session, a note or a saved workout.

---

## Section 3 — Open items

1. **Spotify OAuth + `recently-played`** — the only real route to detection (PL-A2-D6). Needs its own
   ruling: a registered Spotify application, a redirect URI, secret handling, token storage and refresh,
   a privacy position on reading listening history, and a decision about what happens for Apple Music
   athletes, who would have none of it.
2. **Apple Music artwork** — reachable only with a signed developer token, and therefore barred by
   PL-A2-D1 as written. Revisit only alongside item 1.
3. **`PlaylistChip`** (Activity Detail, the logger) still renders the plain glyph and the generic
   service label. The art and the title-fallback are wired into the feed row and the attach sheet only.
   Extending them is small and deliberate, not an oversight.
4. **The mid-workout "⋯ Options" attach** does not yet pass the recent list, so it shows the paste field
   alone. One prop; left for the session that owns that screen.

---

*Forge Legacy — Workout Playlist Amendment 002*
*August 2026*
