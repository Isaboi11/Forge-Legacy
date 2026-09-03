-- Forge Legacy — 0188: the testing posture — squad training alerts on, every profile public
--
-- PO: *"set everyone's notifications on for all of the squad working out, and then have everyone be
-- public for right now until they say otherwise. It's all testing so that should be the norm up front,
-- and then they can change it later."*
--
-- ⚠⚠ THIS IS A DELIBERATE, TEMPORARY OVERRIDE OF LOCKED PRODUCT DEFAULTS. ⚠⚠
--
-- It is not a correction. `P-5 §3.1` (ambient notifications are off), `P-6` (the audience ladder's
-- per-section defaults) and 0181's opt-in for `live_session` are all still the right answers for a
-- public launch, and the CODE still carries them — `src/domain/settings/notifications.ts` and
-- `src/domain/settings/visibility.ts` are untouched by this migration on purpose, so the shipping
-- defaults survive in the one place a future reader will look for them.
--
-- What this changes is the DATA and the COLUMN DEFAULTS, which is the layer that actually decides what
-- a tester sees. Reverting is a second migration that writes the code's values back; nothing here is
-- destructive beyond the settings each athlete may re-choose at any time from Settings.
--
-- ══ WHY IT WAS ASKED FOR ══
--
-- A squad-mate trained and the PO was told nothing and could not see her on the Live Now / Training Now
-- surface. Neither symptom is a defect — BOTH are the shipped defaults doing exactly what they say:
--
--   THE PUSH / INBOX ROW (branch 15 of `notification_events_for`, 0153) has THREE gates, and two of
--   them are OFF for every row that existed before somebody went looking for them:
--     · `squads.training_alerts`      — the LEADER's switch, per squad.  DEFAULT FALSE.
--     · `squad_members.notify_start`  — the RECIPIENT's, per squad.      DEFAULT FALSE.
--     · `vis_clears(visibility->>'training', 'squad')` — the ACTOR's own audience. Default 'squads',
--        which DOES clear for a squad-mate, so this gate was most likely already open.
--   (`notif_prefs.squad_training` is a fourth, global switch. It already defaults TRUE in both
--   `push_pref_default()` and the client, so it is only a blocker where an athlete explicitly said no.)
--
--   THE TRAINING NOW TAB (`training_now()`, 0086) shares only the LAST of those three. It needs a fresh
--   `profiles.training_since` and the actor's `training` audience to clear. It does NOT consult
--   `training_alerts` or `notify_start` at all.
--
-- ⚠ SO THE TWO SYMPTOMS DO NOT HAVE ONE CAUSE, and this migration cannot fix both. It opens every gate
-- that is a SETTING. If an athlete is still absent from Training Now after this is applied, the
-- remaining explanation is that her client never called `set_training_status(true)` — she is not
-- announcing, and no amount of opening gates makes an unannounced session visible. §4 is the read-only
-- diagnostic that tells those two apart, and it is the reason §4 exists.
--
-- ══ WHAT THIS DOES NOT DO ══
--
-- ⛔ IT SENDS NOTHING RETROACTIVELY. The push for a start is enqueued by `push_training_started`, an
-- `after update of training_since` trigger that fired (or did not) at the moment the session began.
-- Opening these gates now does not re-fire it, and this migration deliberately does not forge one.
-- The INBOX row is different — branch 15 is evaluated at READ time, so a session that began inside the
-- last four hours DOES appear in `/inbox` as soon as this lands, with no new build and no new push.
--
-- ⛔ IT TOUCHES NO OTHER NOTIFICATION PREFERENCE. `squad_feed`, `squad_reactions`, `squad_goals`,
-- `squad_activity` and `training_briefing` keep whatever each athlete has. The ask was training alerts.
--
-- ══ SAFETY ══
--
-- ⚠ The `visibility` backfill CANNOT fan out a push. `push_training_started` and
-- `push_training_finished` are both `update of <column>` triggers with `when` clauses (0153) — a write
-- to `visibility` does not match either. The only trigger on `squads` is `before insert` (0040). There
-- is no trigger on `squad_members`. Checked against the 0153/0040 definitions, and §2 re-asserts it
-- against `pg_trigger` at apply time rather than trusting this comment.
--
-- Idempotent — every statement is a guarded default or a `where`-narrowed update that matches nothing on
-- a second run. Depends on 0022 (visibility, notif_prefs), 0086 (training_since), 0153 (training_alerts,
-- notify_start, notify_finish). RUN AFTER 0187. ⚠ 0185 and 0186 are still awaiting paste and are
-- independent of this one — this does not replace them.


-- ══════════════════════════════════════════════════════════════════════════════
-- A · THE SQUAD'S TWO GATES — ON NOW, AND ON FOR EVERY SQUAD AND MEMBER TO COME
-- ══════════════════════════════════════════════════════════════════════════════

-- The leader's switch. New squads announce by default for the duration of testing.
alter table public.squads alter column training_alerts set default true;

update public.squads
   set training_alerts = true
 where training_alerts is distinct from true;

-- The member's own, per squad. Both halves — a start and a finish — because the PO asked for "all of
-- the squad working out", which is the whole session and not just its first minute.
alter table public.squad_members alter column notify_start  set default true;
alter table public.squad_members alter column notify_finish set default true;

update public.squad_members
   set notify_start = true
 where notify_start is distinct from true;

update public.squad_members
   set notify_finish = true
 where notify_finish is distinct from true;

comment on column public.squads.training_alerts is
  'Whether this squad announces its members starting and finishing sessions (0153). The leader''s switch, and the outer gate: a member''s own notify_start/notify_finish do nothing while this is false. ⚠ DEFAULT FLIPPED TO TRUE BY 0188 FOR THE TESTING PHASE — 0153''s default was false so that no squad predating it became noisy without its leader saying so. Restore the false default before a public launch.';


-- ══════════════════════════════════════════════════════════════════════════════
-- B · THE GLOBAL TRAINING-ALERT PREFERENCE, FOR ANYONE WHO TURNED IT OFF
-- ══════════════════════════════════════════════════════════════════════════════
--
-- `squad_training` already defaults TRUE in `push_pref_default()` and in the client, so a null or
-- key-absent `notif_prefs` is ALREADY correct and is left alone — writing to it would only create rows
-- that say what the default already says. This narrows to the athletes who explicitly stored `false`.
--
-- ⚠ The `jsonb_typeof` guard is not decoration: `push_prefs_allows` uses the identical test (0120), and
-- casting a non-boolean value with `::boolean` here would raise on a single malformed row and take the
-- whole paste down.

update public.profiles
   set notif_prefs = coalesce(notif_prefs, '{}'::jsonb) || jsonb_build_object('squad_training', true)
 where jsonb_typeof(profiles.notif_prefs -> 'squad_training') = 'boolean'
   and (profiles.notif_prefs ->> 'squad_training')::boolean = false;


-- ══════════════════════════════════════════════════════════════════════════════
-- C · EVERY PROFILE PUBLIC — ALL NINE SECTIONS, EXISTING AND FUTURE
-- ══════════════════════════════════════════════════════════════════════════════
--
-- The nine keys are `VISIBILITY_SECTIONS` in `src/domain/settings/visibility.ts`, verbatim. A key this
-- file does not name would keep its old audience silently, so the list is written out rather than
-- derived — and `sanitizeVisibility()` on the client drops anything it does not recognise, so an extra
-- key here would be inert rather than harmful.
--
-- ⚠ `live_session` IS INCLUDED, AND IT IS THE ONE WORTH A SECOND LOOK. The other eight are profile
-- sections. This one publishes the PLAN AND THE LOG of a session while it is happening — sets, reps and
-- weights — and 0181 made it `private` by default precisely because CC-D2 / WSR-D6 forbid those numbers
-- on a surface the athlete did not choose. The PO asked for public, knowing this is testing; it is named
-- here so that turning it back off is a one-line change somebody can find.
--
-- ⚠ `||` MERGES, IT DOES NOT REPLACE. Any key an athlete has that is not in this list survives.

update public.profiles
   set visibility = coalesce(visibility, '{}'::jsonb) || jsonb_build_object(
         'chapter',         'everyone',
         'history',         'everyone',
         'timeline',        'everyone',
         'transformation',  'everyone',
         'photos',          'everyone',
         'accomplishments', 'everyone',
         'stats',           'everyone',
         'training',        'everyone',
         'live_session',    'everyone'
       )
 where coalesce(visibility, '{}'::jsonb) || jsonb_build_object(
         'chapter',         'everyone',
         'history',         'everyone',
         'timeline',        'everyone',
         'transformation',  'everyone',
         'photos',          'everyone',
         'accomplishments', 'everyone',
         'stats',           'everyone',
         'training',        'everyone',
         'live_session',    'everyone'
       ) is distinct from visibility;

-- New signups. `handle_new_user()` (0001) inserts `(id, name, first_name, handle, initials)` and never
-- names `visibility`, so the column default is what a new athlete gets — verified against that function
-- rather than assumed, because an explicit `null` in the insert list would defeat this entirely.
alter table public.profiles alter column visibility set default '{
  "chapter": "everyone",
  "history": "everyone",
  "timeline": "everyone",
  "transformation": "everyone",
  "photos": "everyone",
  "accomplishments": "everyone",
  "stats": "everyone",
  "training": "everyone",
  "live_session": "everyone"
}'::jsonb;

comment on column public.profiles.visibility is
  'Per-section profile audience (see src/domain/settings/visibility.ts). ⚠ 0188 SET EVERY SECTION TO "everyone" AND GAVE THE COLUMN AN ALL-PUBLIC DEFAULT FOR THE TESTING PHASE. The code still carries the shipping defaults (training=squads, live_session=private, photos/transformation=friends) and they are the ones to restore before a public launch. null no longer occurs on a new row.';
