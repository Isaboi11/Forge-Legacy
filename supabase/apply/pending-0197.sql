-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
--   0197 — TRANSFORMATION FRAMES (the alignment is kept)
--
--   PASTE THIS WHOLE FILE INTO THE SUPABASE SQL EDITOR AND RUN IT ONCE.
--   It is idempotent: running it twice is safe and changes nothing the second time.
--
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- PO, 2026-09-08: *"It would be easier to adjust the photos like this somehow. You see how I can see
-- them lining up?"*
--
-- Lining two progress photographs up is now a mode on the Compare screen — drag the photograph you want
-- to move, pinch to size it, watching the seam of the slider. That half needs no SQL.
--
-- ⚠ **This column is the other half: the alignment was never stored.** It lived in a `useState` on the
-- Compare screen, so the athlete did the work, walked away, and did it again next time — every time,
-- forever. One jsonb column keyed by pose, mirroring `photos`, and a photograph is lined up ONCE:
-- every comparison it appears in, plus the share card and the squad post, inherit the framing.
--
--   {"ff": {"tx": -0.04, "ty": 0.11, "scale": 1.22}, "rs": {...}}
--
-- `tx`/`ty` are FRACTIONS of the frame, so the same numbers draw correctly at any size — the Compare
-- slider, a side-by-side cell, the 1080px export.
--
-- ══ ⚠ WHAT THIS DELIBERATELY DOES NOT DO ══
--
--   * **No RLS change.** `transformation_entries` is owner-scoped by 0044 and a policy governs the ROW,
--     not the column, so the existing own-row select/update policies already cover this. Adding one
--     would be noise at best.
--
--   * **No `not null`, no default, no backfill.** Existing rows keep `null`, which the client reads as
--     `{}` — "nothing has been lined up", which is exactly true of every row today. A default would
--     touch 100% of the table to say the same thing.
--
--   * **No table.** A framing is born with the photograph, dies with the entry, is read on every path
--     that reads the entry, and there are at most six per row. A join per archive read to store two
--     floats is the wrong trade.
--
-- ══ ⚠ ORDER OF OPERATIONS — THIS IS SAFE IN BOTH DIRECTIONS ══
--
-- The client selects `frames` and, on PostgREST's 42703 (undefined column), permanently downgrades its
-- selection for that session and carries on. So a publish that lands before this paste shows the archive
-- correctly and simply does not remember alignments; this paste starts remembering them with no further
-- deploy. It is still worth running promptly — an athlete who lines six poses up in that window loses
-- exactly that work.
--
-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE COLUMN
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.transformation_entries
  add column if not exists frames jsonb;

comment on column public.transformation_entries.frames is
  'Per-pose framing for the entry''s photos: poseKey -> {tx, ty, scale}, where tx/ty are fractions of the frame. Written by the Compare screen''s Adjust mode (0197). Null means nothing has been lined up.';


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — VERIFY. Raises if anything above did not take.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare missing text := '';
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'transformation_entries' and column_name = 'frames'
  ) then missing := missing || ' transformation_entries.frames'; end if;

  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'transformation_entries'
       and column_name = 'frames' and data_type <> 'jsonb'
  ) then missing := missing || ' frames/WRONG-TYPE-SHOULD-BE-JSONB'; end if;

  -- ⚠ The archive's own protection. 0044's owner-scoped policies are what keep one athlete's progress
  -- photographs private; a column added under a table whose RLS was switched off would inherit nothing.
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'transformation_entries' and c.relrowsecurity
  ) then missing := missing || ' transformation_entries/RLS-IS-OFF'; end if;

  if missing <> '' then
    raise exception '0197 DID NOT FULLY APPLY. Missing or wrong:%', missing;
  end if;

  raise notice '0197 OK — frames is present, jsonb, and the table still has RLS on.';
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — WHAT IS NOW THERE. Read-only.
-- ═════════════════════════════════════════════════════════════════════════════

select
  (select count(*) from public.transformation_entries)                                   as entries_total,
  (select count(*) from public.transformation_entries where frames is not null)          as entries_with_frames,
  (select exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'transformation_entries'
                     and column_name = 'frames'))                                        as column_present,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'transformation_entries')                as policies_on_table;
