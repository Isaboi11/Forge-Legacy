# Workout Playlist Amendment 001

## Amendment to Active-Workout-Flow-Spec-W9-W16, W-17, W-19, WSR-001

**Status:** LOCKED
**Date:** June 2026
**Authority:** Active-Workout-Flow-Spec-W9-W16 (LOCKED), Workout-Summary-Spec-W17 v1.2 (LOCKED), Activity-Detail-Wireframe-Spec-W19 v1.3 (LOCKED), WSR-001 v1.0.1 (LOCKED)
**Merged into base docs:** Yes — see Change Log entries in each affected document
**Implemented:** Yes — 2026-08-03, migration `0105` + `src/domain/workout/playlist.ts`. All four §2
in-scope surfaces are live (W-9 §8.5 attach · W-17 §8A attach/edit/remove · W-19 §9A read-only · squad
recap chip). The one §2 item deliberately NOT built is the playlist on the flattened, externally-rendered
share-card image — `WorkoutShare`/`ShareContent` has no implementation to extend, and §5/§7 already record
that surface as non-interactive by platform constraint.

---

## 1. Decision

Athletes may optionally attach **one Spotify or Apple Music playlist link** to a workout session. The link is a reference only — Forge Legacy does not play, sync, embed, or otherwise integrate with either service. The product stores a link and a service tag, displays it wherever the session is displayed, and opens it in the athlete's installed app (or browser fallback) on tap.

This is a small, optional, additive feature. It does not require a new architecture layer — it attaches to the existing `WorkoutSession` record the same way a workout-level note does, and it rides the existing W-17 → W-19 → WSR-001 propagation pipeline that notes and partner tags already use.

## 2. Scope

**In scope (V1):**
- Attaching a playlist link (Spotify or Apple Music) to a workout, via the same "⋯ Options" menu used for workout-level notes (Active-Workout-Flow-Spec-W9-W16 §8.2)
- Editing or removing the link on W-17 (post-workout reflection window)
- Displaying the attached playlist on W-19 Activity Detail
- Displaying the attached playlist on workout shares/posts (WSR-001 `WorkoutShare` — external share cards, in-app share preview, and squad check-in cards)
- Tapping the playlist anywhere it is interactive opens the respective app via its standard share/deep-link URL scheme, falling back to a browser if the app is not installed

**Explicitly out of scope (V1):**
- Playback controls of any kind (play/pause/skip) inside Forge Legacy
- OAuth, API integration, or SDK embedding with Spotify or Apple Music
- Verifying that the pasted link is a valid, accessible, or public playlist
- Showing track lists, cover art, or any playlist metadata beyond a display name the athlete may optionally type
- Syncing or updating the playlist contents — the link is a static reference captured at attach time

## 3. Data Model

A single new value object, attached to the session record and snapshotted into shares:

```
WorkoutPlaylistLink {
  service:      'SPOTIFY' | 'APPLE_MUSIC'
  url:          string            // the pasted share link
  displayName:  string | null     // optional, athlete-typed label (e.g. "Leg Day Bangers")
}
```

- Stored as `WorkoutSession.playlistLink: WorkoutPlaylistLink | null`
- At most one playlist link per session. Attaching a new link replaces the previous one (no list, no history of past links per session).
- `service` is auto-detected from the URL domain (`open.spotify.com` → SPOTIFY, `music.apple.com` → APPLE_MUSIC). If the domain doesn't match either, the field is rejected with an inline message — no silent guess.

## 4. Attach / Edit Behavior

**Attach point:** "⋯ Options" menu during the active workout (Active-Workout-Flow-Spec-W9-W16 §8.2), alongside the existing workout-level note entry. This lets the athlete queue music for the session they're about to train, mirroring real behavior (open Spotify, pick a playlist, paste the link) without Forge Legacy mediating playback.

**Edit point:** W-17 Workout Summary, in the same reflection tier as Session Notes and Partner Tagging. The athlete who didn't attach a playlist during the workout can still add one after; the athlete who did can edit the display name or remove it.

**Why not earlier (e.g. W-1 / pre-workout):** Pre-workout attachment would add a step to workout *initiation*, which Forge Legacy keeps as low-friction as possible (W-1 → "Start Workout" is one tap). The Options menu and W-17 are both already-established "extra, optional" surfaces — adding playlist there costs nothing in flow disruption.

**Why one link, not a list:** A workout is one session; the playlist is "what I trained to." Supporting multiple links per session would imply a queue or ordering, which would create an expectation of in-app playback sequencing that V1 explicitly does not provide.

## 5. Display Behavior

Everywhere the playlist link is shown, it renders as a small chip:

```
🎵 [displayName or "Spotify Playlist" / "Apple Music Playlist"]      Open ›
```

- If `displayName` is null, the chip falls back to a generic label naming the service ("Spotify Playlist" / "Apple Music Playlist") — never the raw URL.
- Tapping the chip on any **interactive surface** (W-17, W-19, the in-app Share Configuration preview, squad check-in cards) opens the link: the OS resolves the Spotify/Apple Music URL to the installed app if present, or the browser otherwise. Forge Legacy does nothing app-specific here — this is the same mechanism as tapping any external link on the platform.
- On **flattened, non-interactive surfaces** (the rendered share-card image handed to the native OS share sheet), the chip is rendered as static art for context — it is not tappable, because the artifact is a PNG, not a UI. This is a platform constraint, not a design choice, and is documented in WSR-001 §7.1.

## 6. Affected Documents and Merge Summary

| Document | Change |
|---|---|
| `Active-Workout-Flow-Spec-W9-W16.md` | New §8.5 "Workout Playlist Link" — attach via "⋯ Options"; §3 menu description updated |
| `Workout-Summary-Spec-W17.md` | New §8A "Playlist Specification" — edit/attach/remove on W-17; Tier 5 hierarchy note updated; wireframe, tap targets, validation checklist updated |
| `Activity-Detail-Wireframe-Spec-W19.md` | New §9A "Playlist" — read-only display, tap opens app; §4.2 section order, decisions record (W19-D18), validation checklist, change log updated |
| `WSR-001-Workout-Share-Result-Architecture.md` | `ShareContent.playlistLink` added; §2.1 content table, §5.2 content mapping, §6.3 squad card rules (new WSR-D6 exception alongside duration), new decision WSR-D17, validation checklist, downstream impact table, change log updated |

## 7. Non-Behaviors

| Non-Behavior | Reason |
|---|---|
| In-app playback, scrubbing, or queueing | V1 is a reference link only — no SDK/API integration of any kind |
| Validating the link resolves to a real playlist | Forge Legacy does not call out to Spotify or Apple Music APIs; the link is trusted as entered |
| Showing track lists, cover art, or duration | No metadata fetch exists; only the athlete-typed display name is stored |
| Multiple playlists per session | One link per session — replacing, not appending |
| Tappable playlist chip on the externally-rendered share image | Static images cannot be interactive; this is a platform constraint documented in WSR-001 §7.1 |
| Playlist link on `AthleteShareSettings` as a profile-level default | The link is session-specific, attached fresh per workout, not a standing preference |

---

*Forge Legacy — Workout Playlist Amendment 001*
*June 2026*
