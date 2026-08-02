-- Forge Legacy — 0102: the stair climber and the elliptical get to be themselves
--
-- Conditioning grew from three activities to seven: Run · Walk · Ride · Row · Elliptical · Stair Climber
-- · Swim. Four of those already had a home — the `modality` enum has carried 'rowing' and 'swimming'
-- since 0001, so the database was ahead of the UI and needs nothing for them.
--
-- Two are genuinely new.
--
-- ══ WHY NOT JUST FILE THEM UNDER 'other' ══
--
-- 'other' already exists and would compile. It would also be the last honest thing about them. Activity
-- History, the rank engine's per-activity signals and every "how much of X have I done" question group
-- by this column, so two different machines sharing one bucket reports a month of stair work and a month
-- of elliptical work as one undifferentiated pile — and no later migration can separate them again,
-- because the information was never written down. An enum value is cheap; a lost distinction is not.
--
-- ══ WHY THIS IS SAFE ══
--
-- `ADD VALUE IF NOT EXISTS` is idempotent, and adding a value neither rewrites the table nor invalidates
-- an existing row: every workout already stored keeps exactly the type it had. Nothing reads these until
-- an athlete logs one.
--
-- ══ THE ONE POSTGRES RULE THAT MATTERS HERE ══
--
-- A new enum value cannot be USED in the same transaction that adds it. That is why this file adds the
-- values and stops — no backfill, no function that references them — and why the self-check below only
-- reads the catalog rather than casting a literal. Run it on its own; the app writes them afterwards.
--
-- Independent of 0100 and 0101. Idempotent. RUN AFTER 0001.

begin;

alter type modality add value if not exists 'stair_climber';
alter type modality add value if not exists 'elliptical';

commit;

-- ── SELF-CHECK ───────────────────────────────────────────────────────────────
--
-- Deliberately in its own statement, AFTER the commit: inside that transaction the new labels exist in
-- the catalog but cannot be cast to, so a check that tried `'stair_climber'::modality` would fail on a
-- migration that had in fact worked perfectly.
do $$
declare
  v_missing text;
begin
  select string_agg(w, ', ') into v_missing
    from unnest(array['running','walking','cycling','rowing','swimming','stair_climber','elliptical']) w
   where w not in (
     select e.enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'modality'
   );
  if v_missing is not null then
    raise exception 'modality is missing: %', v_missing;
  end if;
  raise notice 'modality OK — all seven conditioning types are storable.';
end $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFY
-- ══════════════════════════════════════════════════════════════════════════════
--
--   select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid
--    where t.typname = 'modality' order by e.enumsortorder;
--
-- Expect: strength, running, walking, cycling, swimming, rowing, mobility, other, stair_climber,
-- elliptical. Existing workouts are untouched — this only widens what a future one may be.
