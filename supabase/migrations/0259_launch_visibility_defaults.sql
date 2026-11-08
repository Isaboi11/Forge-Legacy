-- Forge Legacy — 0259: at launch, a NEW athlete's profile starts on the P-6 defaults again (PO 11-08)
--
-- ⛔ RELEASE DAY ONLY. Paste this when the App Store release is pressed (checklist §6), not before: until then
--    every new account is a tester, and the testing posture is what the PO asked for.
--
-- `0189_testing_defaults_open` did two things for the testing phase (PO: *"have everyone be public for right
-- now until they say otherwise"*): it set every EXISTING profile's sections to `everyone`, and it changed the
-- `profiles.visibility` COLUMN DEFAULT to all-public, so every NEW sign-up started fully public too — including
-- `live_session`, the set-by-set view of a workout in progress, which 0181 made private by default because
-- CC-D2 / WSR-D6 forbid those numbers on any surface the athlete did not choose. No launch document listed the
-- revert; the launch QA of 11-08 found it (B1).
--
-- ══ WHAT THIS CHANGES — ONE THING ══
--
-- The COLUMN DEFAULT goes back to the locked P-6 answers, exactly the values in
-- `src/domain/settings/visibility.ts` (`VISIBILITY_SECTIONS[].def`). New sign-ups get them; nobody else is touched.
--
-- ══ WHAT IT DELIBERATELY DOES NOT CHANGE (PO 11-08) ══
--
--   · EXISTING accounts keep whatever they have — *"Leave testers as they are"*. No UPDATE here. Each athlete can
--     change their own in Settings → Profile Visibility.
--   · Squad training alerts stay ON for new sign-ups — *"On for new sign-ups"*. 0189's notification half and
--     0202's ambient-squad defaults are left exactly as they are.
--
-- Every insert into `profiles` names only (id, name, first_name, handle, initials) — `handle_new_user` (0001)
-- and `ensure_my_profile` / the backfill (0199) — so the column default IS what a new athlete gets. Verified
-- against those three bodies, not assumed. Nothing after 0189 alters this default (grep `alter column
-- visibility`: 0189 only).

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
