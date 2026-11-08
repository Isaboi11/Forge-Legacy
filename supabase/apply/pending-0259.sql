-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0259: at launch, a NEW athlete's profile starts private-by-design again (P-6)
--
-- ⛔ RELEASE DAY ONLY — paste it when you press Release in App Store Connect (checklist §6), not before.
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: §1 is one `alter column … set default`, §2 only raises, §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- In September, 0189 made every profile public for testing — and changed the COLUMN DEFAULT, so every new
-- sign-up has started fully public since, including "Live Workout Detail" (their sets, mid-workout). At launch a
-- stranger's account must start on the designed defaults. Found by the launch QA, 11-08 (B1).
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  sets `profiles.visibility`'s column default back to the P-6 values in `src/domain/settings/visibility.ts`
-- §2  RAISES unless the default now reads exactly those nine values (live_session = private)
-- §3  reports the default as stored, and the profile count (unchanged — this file writes no row)
--
-- ⚠ NO EXISTING ACCOUNT CHANGES (PO 11-08: "Leave testers as they are"). There is no UPDATE in this file.
-- ⚠ Squad training alerts stay on for new sign-ups (PO 11-08) — nothing about notifications is touched.
--
-- ══ PREDICTED §3 ══
--   visibility_default = '{"chapter": "everyone", "history": "everyone", "timeline": "squads", …, "live_session": "private"}'::jsonb
--   profiles = today's count, unchanged (this file writes no row)
-- Nothing in the app needs deploying for this to work: the default only decides what a NEW row gets.
-- It is "working" when the first account created after release opens Settings → Profile Visibility and sees
-- Timeline = Squads, Photos = Friends, Live Workout Detail = Only me.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE DEFAULT (verbatim from supabase/migrations/0259_launch_visibility_defaults.sql)
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.profiles alter column visibility set default '{
  "chapter": "everyone",
  "history": "everyone",
  "timeline": "squads",
  "transformation": "friends",
  "photos": "friends",
  "accomplishments": "everyone",
  "stats": "squads",
  "training": "squads",
  "live_session": "private"
}'::jsonb;

comment on column public.profiles.visibility is
  'Per-section audience (P-6). Column default = the P-6 defaults in src/domain/settings/visibility.ts, restored at launch by 0259 after 0189''s testing posture. Existing rows were left as each athlete had them.';


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — THE ASSERTION
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_def text;
  v_json jsonb;
begin
  select column_default into v_def
    from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles' and column_name = 'visibility';
  if v_def is null then
    raise exception '0259 FAILED: profiles.visibility has no default';
  end if;
  execute 'select ' || v_def into v_json;
  if v_json is distinct from '{
    "chapter": "everyone", "history": "everyone", "timeline": "squads", "transformation": "friends",
    "photos": "friends", "accomplishments": "everyone", "stats": "squads", "training": "squads",
    "live_session": "private"
  }'::jsonb then
    raise exception '0259 FAILED: profiles.visibility default is %, not the P-6 defaults', v_json;
  end if;
  raise notice '0259: profiles.visibility default restored to P-6.';
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — THE REPORT (read-only, one row)
-- ═════════════════════════════════════════════════════════════════════════════

select
  (select column_default
     from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'visibility') as visibility_default,
  (select count(*) from public.profiles)                                                         as profiles;
