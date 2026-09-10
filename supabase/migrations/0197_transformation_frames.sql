-- Forge Legacy — 0197: a photograph is lined up ONCE
--
-- PO, 2026-09-08, on the Compare screen: *"It would be easier to adjust the photos like this somehow.
-- You see how I can see them lining up?"*
--
-- ══ WHAT WAS ACTUALLY WRONG ══
--
-- Two things, and the second is the one this migration exists for.
--
--   1. The tool was a modal (`AlignEditor`) — a Before/After segmented control and a zoom slider, taken
--      away from the comparison that was the whole reason to move anything. That half is client-side:
--      the drag now happens on the photograph, on the Compare screen. No SQL needed for it.
--
--   2. ⚠ **THE ALIGNMENT WAS NEVER STORED.** It lived in a `useState` on the Compare screen. The athlete
--      lined two photographs up, left the screen, and the work was gone — every visit, forever. There is
--      nowhere in this schema it could have been kept: `transformation_entries.photos` is a flat
--      poseKey → url map, and `meta` is a one-line context string.
--
-- ══ WHY A COLUMN AND NOT A TABLE ══
--
-- A framing has no life of its own. It is born with the photograph, dies with the entry, is read on every
-- path that reads the entry, and there are at most six per row. A table would add a join to every read of
-- the archive to store two floats and a scale. `frames` mirrors `photos` exactly — same key space, same
-- lifetime, same RLS, deleted by the same cascade.
--
--   {"ff": {"tx": -0.04, "ty": 0.11, "scale": 1.22}, ...}
--
-- `tx`/`ty` are FRACTIONS of the frame, not pixels, so the same value draws correctly in the Compare
-- slider, a side-by-side cell, the share card at 1080px and the squad post. That is the reason the client
-- has stored them that way since alignment existed; it just had nowhere to put them.
--
-- ══ ⚠ NULLABLE, NO DEFAULT, NO BACKFILL ══
--
-- Every existing row keeps `null`, which the client reads as `{}` — "this athlete has not lined anything
-- up", which is exactly true. A `not null default '{}'` would say the same thing in more words and touch
-- 100% of the rows to do it.
--
-- ══ ⚠ THE CLIENT SHIPS BEFORE THIS IS PASTED, AND SURVIVES IT ══
--
-- Migrations here are pasted by hand into the SQL editor, so there is a window between a publish and this
-- file being run. `data/transformation-live.ts` selects `frames` and, on PostgREST's 42703, downgrades the
-- selection for the rest of the session and carries on — because failing the whole query would render six
-- irreplaceable photographs as "no entries" over a cosmetic feature. Nothing here is required for the
-- archive to work; it is required for the alignment to be remembered.
--
-- RLS: none needed. `transformation_entries` is owner-scoped by 0044 and a policy covers the row, not the
-- column, so the existing own-row select/update policies already govern this.

alter table public.transformation_entries
  add column if not exists frames jsonb;

comment on column public.transformation_entries.frames is
  'Per-pose framing for the entry''s photos: poseKey -> {tx, ty, scale}, where tx/ty are fractions of the frame. Written by the Compare screen''s Adjust mode (0197). Null means nothing has been lined up.';
