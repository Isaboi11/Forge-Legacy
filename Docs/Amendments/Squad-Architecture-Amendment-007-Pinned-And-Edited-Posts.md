# Squad Architecture — Amendment 007: Pinned and Edited Posts

**Status:** Accepted — PO, 2026-09-28
**Amends:** `Social-System-Architecture-v1.0.md` SOC-D10 (reverse-chronological feed) *for squads*; SOC-D7 (posts are permanent, archivable, deletable) — adds *editable by the author*.
**Implements:** migration `0230_squad_post_pin_edit.sql` · `src/data/squad-feed-live.ts` (pin/edit calls) · `src/app/squad/[id].tsx` (pinned section) · `src/app/squad-post/[id].tsx` (menu) · `src/app/workout-write.tsx` (edit a posted workout)

## Why

PO, 2026-09-28, during Squatober: *"we need to be able to pin posts to the top of the squad so that they don't get buried, and need to be able to edit posts just in general."* A day's workout posted the night before (Amendment 005) sinks under the morning's check-ins and recaps before most of the squad has taken it. A typo in a posted percentage could only be fixed by deleting the post, which also deleted its comments.

## Decisions

**SQ-A7-D1 — The squad's owner pins.** Pinning is moderation, and moderation in a squad is the owner's (they can already delete any post, 0041). Members cannot pin. The same shape as communities, CF-D4 (`pinnedToCommunityAt`, moderators only).

**SQ-A7-D2 — At most three pinned posts per squad**, drawn above the feed, most recently pinned first, each labeled "Pinned", and not repeated further down. Three is a limit on noise: a squad where everything is pinned has no feed. The database enforces it.

**SQ-A7-D3 — Below the pinned posts, the feed is still reverse-chronological** (SOC-D10 stands for everything that is not pinned). Unpinning puts a post back where its date puts it.

**SQ-A7-D4 — The author edits their own post, and only their own.** 0186's rule: a squad owner may take a post down but never put words in somebody else's mouth. An edit changes the words, and on a posted workout the workout. It never changes the post's type, audience, squad, media, linked workout, or pin. There is still no UPDATE policy on `squad_posts`; `edit_squad_post` is the only way in.

**SQ-A7-D5 — An edited post says so** ("· Edited" beside its time on the post). Members should know when something they already read has changed.

**SQ-A7-D6 — Editing a posted workout never reaches a copy already taken.** SQ-A5-D1.1 stands: the member's Home slot holds its own snapshot (0192). The editor says so.

**SQ-A7-D7 — A posted workout is edited as words, in the box it was written in**, and only when those words read back to the *identical* workout (`roundTrips`, tested on every Squatober card). A workout posted from a saved template may hold something the words cannot express. Such a post is not reopened as words (its caption can still be edited), so opening and saving it can never quietly change it.

**SQ-A7-D8 — A discussion or announcement cannot be edited down to nothing.** An empty note is a delete, and delete has its own door, with its own confirmation.
