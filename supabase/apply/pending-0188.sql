-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0188: the testing posture — squad training alerts on, every profile public
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every write is a guarded default or a `where`-narrowed update that matches
-- nothing on a second run, §2 only raises, and §3 is read-only.
--
-- ⚠ 0185 AND 0186 ARE STILL AWAITING PASTE and are unrelated to this one. This does not replace them,
-- and this file does not depend on them. 0187 is applied and verified (2026-09-01).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- PO: *"set everyone's notifications on for all of the squad working out, and then have everyone be
-- public for right now until they say otherwise. It's all testing so that should be the norm up front."*
--
-- A squad-mate (Rachelle) trained, and the PO was neither notified nor shown her on the Training Now
-- surface. NEITHER SYMPTOM IS A DEFECT. Both are the shipped defaults doing what they say — and they
-- are two DIFFERENT defaults, which is why one fix does not cover both:
--
--   THE NOTIFICATION (branch 15 of `notification_events_for`, 0153) has three gates, two of them
--   default-OFF on every row that predates somebody going looking for them:
--     · `squads.training_alerts`     — the squad LEADER's switch.     DEFAULT FALSE  ← almost certainly this
--     · `squad_members.notify_start` — the RECIPIENT's, per squad.    DEFAULT FALSE  ← and this
--     · the ACTOR's `visibility.training` — default 'squads', which already clears for a squad-mate.
--
--   THE TRAINING NOW TAB (`training_now()`, 0086) does NOT read either of those two. It needs only a
--   fresh `profiles.training_since` and the actor's `training` audience to clear.
--
-- ⚠ SO IF RACHELLE IS STILL ABSENT FROM TRAINING NOW AFTER THIS LANDS, the gates were never her
-- problem — her client never called `set_training_status(true)`, and she is not announcing at all.
-- §3 answers exactly that, by name, and it is the reason §3 is longer than a tidy report.
--
-- ⚠ AND THE GATES ARE NOT A CERTAIN DIAGNOSIS, WHICH IS WHY §3 EXISTS RATHER THAN A VICTORY LAP.
-- `verify-0187` found the PO being told about Brady Plante's session FIVE TIMES on 2026-09-01, so at
-- least one squad already had `training_alerts` and `notify_start` on for them — the gates cannot have
-- been shut everywhere. For Rachelle specifically that leaves three live possibilities, and this
-- migration only closes the first:
--   1. she is in a squad whose leader never switched alerts on   → FIXED HERE
--   2. she is not announcing (client never called set_training_status) → §3 row 20 says so outright
--   3. she shares no squad and is not an accepted friend         → §3 row 23 says so outright
-- Read rows 20 and 23 before concluding this migration was the answer.
--
-- ⚠⚠ THIS IS A TEMPORARY OVERRIDE OF LOCKED PRODUCT DEFAULTS, NOT A CORRECTION. P-5 §3.1, P-6 and
-- 0181's `live_session` opt-in remain the right answers for a public launch, and the CLIENT CODE STILL
-- CARRIES THEM — `src/domain/settings/visibility.ts` and `notifications.ts` are deliberately untouched,
-- so the shipping defaults survive where a future reader will look. Reverting is a second migration.
--
-- ⚠ `live_session` IS SET PUBLIC TOO. That key publishes the sets, reps and weights of a session WHILE
-- IT IS HAPPENING; 0181 made it private-by-default because CC-D2 / WSR-D6 forbid those numbers on a
-- surface the athlete did not choose. Included because the PO asked for public across the board for
-- testing, and named here so it is findable when that ends.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  eleven statements, carried VERBATIM from `supabase/migrations/0188_testing_defaults_open.sql`
--     (11 of 11 present — checked by parsing both files and diffing the statements, not by eye)
-- §2  raises if any default, any backfill or the trigger-safety precondition did not take
-- §3  ONE query reporting what landed AND why Rachelle was invisible. Read-only.
--
-- ⚠ §3 IS A SINGLE STATEMENT ON PURPOSE. The Supabase SQL editor shows only the LAST statement's
-- output, so a three-statement report loses two thirds of itself (verify-0187 was rewritten for this).
--
-- ══ SAFETY ══
--
-- ⛔ THIS SENDS NOTHING. Push for a start is enqueued by `push_training_started`, an
-- `after update of training_since` trigger with a `when` clause (0153). Writing `visibility`,
-- `notif_prefs`, `training_alerts` or `notify_start` matches none of it. The only trigger on `squads`
-- is `before insert` (0040); `squad_members` has none. §2 re-asserts the trigger's shape against
-- `pg_trigger` rather than trusting this paragraph.
--
-- ⛔ AND NOTHING ARRIVES RETROACTIVELY. A push that was never enqueued is not created by opening a gate
-- afterwards. The INBOX row is the exception and needs no help: branch 15 is evaluated at READ time, so
-- a session begun inside the last four hours appears in `/inbox` the moment this lands.
--
-- ══ PREDICTED §3 OUTPUT — read the real output against this ══
--
--   Row 1  '0188 applied?' → YES. If it says NO, §2 would already have raised; a NO here means a
--          statement was edited out of the paste.
--   Rows 2–5  every squad, every membership and every profile at the open setting, holdouts = 0.
--   Row 10+  THE LIVE ROSTER. Expect 0 rows if nobody is mid-session — that is not a failure.
--   Row 20+  RACHELLE, by name. THE ROW THAT MATTERS:
--            · `training_since` populated and inside 4h → she IS announcing; the gates were the whole
--              problem and she is visible from now on.
--            · `training_since` null, or older than 4h  → SHE IS NOT ANNOUNCING. This migration cannot
--              make her visible and the next move is her CLIENT, not the database.
--   Row 30+  whether any `squad_training_started` outbox row was ever filed for her.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE STATEMENTS  (verbatim from the migration of record)
-- ═════════════════════════════════════════════════════════════════════════════

-- ── A · the squad's two gates ────────────────────────────────────────────────

alter table public.squads alter column training_alerts set default true;

update public.squads
   set training_alerts = true
 where training_alerts is distinct from true;

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

-- ── B · the global training-alert preference, for anyone who turned it off ───

update public.profiles
   set notif_prefs = coalesce(notif_prefs, '{}'::jsonb) || jsonb_build_object('squad_training', true)
 where jsonb_typeof(profiles.notif_prefs -> 'squad_training') = 'boolean'
   and (profiles.notif_prefs ->> 'squad_training')::boolean = false;

-- ── C · every profile public, existing and future ────────────────────────────

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


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT IT ACTUALLY LANDED
-- ═════════════════════════════════════════════════════════════════════════════
--
-- A migration that returns a tidy green while having done nothing is what this section exists to catch.

do $$
declare
  v_n bigint;
  v_d text;
begin
  -- ── the three column defaults ──
  select column_default into v_d from information_schema.columns
   where table_schema = 'public' and table_name = 'squads' and column_name = 'training_alerts';
  if v_d is distinct from 'true' then
    raise exception '0188: squads.training_alerts default is % — expected true', coalesce(v_d, '<null>');
  end if;

  select column_default into v_d from information_schema.columns
   where table_schema = 'public' and table_name = 'squad_members' and column_name = 'notify_start';
  if v_d is distinct from 'true' then
    raise exception '0188: squad_members.notify_start default is % — expected true', coalesce(v_d, '<null>');
  end if;

  select column_default into v_d from information_schema.columns
   where table_schema = 'public' and table_name = 'squad_members' and column_name = 'notify_finish';
  if v_d is distinct from 'true' then
    raise exception '0188: squad_members.notify_finish default is % — expected true', coalesce(v_d, '<null>');
  end if;

  select column_default into v_d from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles' and column_name = 'visibility';
  if v_d is null or v_d not like '%live_session%' or v_d not like '%everyone%' then
    raise exception '0188: profiles.visibility has no all-public default — got %', coalesce(v_d, '<null>');
  end if;

  -- ── the backfills, counted rather than assumed ──
  select count(*) into v_n from public.squads where training_alerts is distinct from true;
  if v_n > 0 then raise exception '0188: % squads still have training_alerts off', v_n; end if;

  select count(*) into v_n from public.squad_members
   where notify_start is distinct from true or notify_finish is distinct from true;
  if v_n > 0 then raise exception '0188: % squad memberships are still silent', v_n; end if;

  select count(*) into v_n from public.profiles
   where coalesce(visibility ->> 'training', '') <> 'everyone'
      or coalesce(visibility ->> 'live_session', '') <> 'everyone';
  if v_n > 0 then raise exception '0188: % profiles are not fully public', v_n; end if;

  select count(*) into v_n from public.profiles
   where jsonb_typeof(profiles.notif_prefs -> 'squad_training') = 'boolean'
     and (profiles.notif_prefs ->> 'squad_training')::boolean = false;
  if v_n > 0 then raise exception '0188: % athletes still have squad_training push off', v_n; end if;

  -- ── the safety precondition, re-checked rather than trusted ──
  --
  -- The whole "this backfill cannot fan out a push" argument rests on `push_training_started` being
  -- narrowed to `update of training_since`. If some later migration ever widened it to a bare
  -- `after update on profiles`, the §1 visibility backfill would have walked every athlete's squads.
  -- Asserted AFTER the fact because the answer is the same either way and a green here is the proof.
  if not exists (
    select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
     where c.relname = 'profiles' and t.tgname = 'push_training_started' and not t.tgisinternal
  ) then
    raise exception '0188: the push_training_started trigger is missing — 0153 was reverted';
  end if;

  if not exists (
    select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
     where c.relname = 'profiles' and t.tgname = 'push_training_started'
       and pg_get_triggerdef(t.oid) like '%UPDATE OF training_since%'
  ) then
    raise exception '0188: push_training_started is no longer column-narrowed — a visibility write can now fan out';
  end if;
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — THE REPORT, AND WHY RACHELLE WAS INVISIBLE  (read-only, one statement)
-- ═════════════════════════════════════════════════════════════════════════════

with shape as (
  select
    (select column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'squads' and column_name = 'training_alerts')  as sq_def,
    (select column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'squad_members' and column_name = 'notify_start') as sm_def,
    (select column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'visibility')     as pr_def
),
-- The candidate. Name OR handle, because a tester's display name and handle need not agree.
rach as (
  select p.id, p.name, p.handle, p.training_since, p.training_label, p.visibility
    from public.profiles p
   where p.name ilike '%rachelle%' or p.handle ilike '%rachelle%'
)

select 1 as ord, '0188 applied?' as question,
       case when s.sq_def = 'true' and s.sm_def = 'true' and s.pr_def like '%live_session%'
            then 'YES — all three column defaults are open, and §2 did not raise'
            else 'NO — squads=' || coalesce(s.sq_def, '<null>') ||
                 ' members=' || coalesce(s.sm_def, '<null>') ||
                 ' visibility default ' || case when s.pr_def is null then 'MISSING' else 'present' end
       end as answer
  from shape s

union all
select 2, 'squads announcing training',
       count(*) filter (where training_alerts) || ' of ' || count(*) ||
       ' — holdouts ' || count(*) filter (where training_alerts is distinct from true)
  from public.squads

union all
select 3, 'memberships wanting starts',
       count(*) filter (where notify_start) || ' of ' || count(*) ||
       ' — and finishes ' || count(*) filter (where notify_finish)
  from public.squad_members

union all
select 4, 'profiles public (training)',
       count(*) filter (where visibility ->> 'training' = 'everyone') || ' of ' || count(*) ||
       ' — live_session ' || count(*) filter (where visibility ->> 'live_session' = 'everyone')
  from public.profiles

union all
select 5, 'push pref squad_training off',
       count(*) || ' athletes (must be 0)'
  from public.profiles
 where jsonb_typeof(notif_prefs -> 'squad_training') = 'boolean'
   and (notif_prefs ->> 'squad_training')::boolean = false

-- ── THE LIVE ROSTER. Zero rows means nobody is mid-session; that is an answer, not a failure. ──
union all
select 10, 'TRAINING NOW · ' || coalesce(p.name, p.handle),
       'started ' || round(extract(epoch from (now() - p.training_since)) / 60) || ' min ago' ||
       coalesce(' · ' || p.training_label, ' · unnamed session')
  from public.profiles p
 where p.training_since is not null
   and p.training_since > now() - interval '4 hours'

-- ── RACHELLE. The row that decides where to look next. ──
union all
select 20, 'RACHELLE · ' || coalesce(r.name, r.handle) || ' · announcing?',
       case
         when r.training_since is null
           then '⛔ NO — training_since is NULL. Her client never called set_training_status(true), or ' ||
                'the session was finished/abandoned. THE GATES WERE NOT THE PROBLEM: fix the client.'
         when r.training_since <= now() - interval '4 hours'
           then '⛔ STALE — last announced ' ||
                round(extract(epoch from (now() - r.training_since)) / 3600, 1) ||
                ' h ago, past the 4h presence ceiling every reader applies. Invisible by design.'
         else '✅ YES — announcing, ' || round(extract(epoch from (now() - r.training_since)) / 60) ||
              ' min in. She is visible on Training Now from now on.'
       end
  from rach r

union all
select 21, 'RACHELLE · her training audience',
       coalesce(r.visibility ->> 'training', '<unset → code default squads>') ||
       ' · live_session ' || coalesce(r.visibility ->> 'live_session', '<unset → private>')
  from rach r

union all
select 22, 'RACHELLE · squads she is in',
       coalesce((
         select string_agg(s.name || ' (' || (select count(*) from public.squad_members m2 where m2.squad_id = s.id) || ' members)', ', ')
           from public.squad_members m
           join public.squads s on s.id = m.squad_id
          where m.user_id = r.id
       ), '⛔ NONE — she shares no squad with anyone, so branch 15 can never fire for her. ' ||
          'A FRIEND-ONLY connection shows on Training Now but is NOT notified: branch 15 is squad-scoped.')
  from rach r

-- ⚠ THE ROW THAT NEEDS NO GATE AT ALL. `training_now()` reaches squad-mates and ACCEPTED friends only.
-- If the PO's own name is not in this list, they were never going to see her however open the settings
-- are — the missing thing is a squad membership or an accepted friend request, not a preference.
union all
select 23, 'RACHELLE · who can now see her training',
       coalesce((
         select string_agg(distinct coalesce(p2.name, p2.handle), ', ')
           from public.profiles p2
          where p2.id <> r.id
            and (
              exists (
                select 1 from public.squad_members a
                  join public.squad_members b on b.squad_id = a.squad_id
                 where a.user_id = r.id and b.user_id = p2.id
              )
              or exists (
                select 1 from public.friendships f
                 where f.status = 'ACCEPTED'
                   and ((f.low_id = r.id and f.high_id = p2.id)
                     or (f.low_id = p2.id and f.high_id = r.id))
              )
            )
       ), '⛔ NOBODY — no shared squad and no accepted friend. Training Now is empty for everyone ' ||
          'regardless of privacy, and no setting in this migration changes that.')
  from rach r

-- ── Was a notification ever actually filed for her? ──
union all
select 30, 'RACHELLE · notifications filed (7d)',
       coalesce((
         select count(*)::text || ' squad_training_started outbox rows, most recent ' ||
                coalesce(max(o.created_at)::text, 'never')
           from public.push_outbox o
          where o.actor_id = r.id
            and o.kind = 'squad_training_started'
            and o.created_at > now() - interval '7 days'
       ), '0')
  from rach r

union all
select 31, 'candidates matching "rachelle"',
       case when count(*) = 0
            then '⛔ NONE — no profile name or handle matches. Rows 20–30 are empty for that reason, ' ||
                 'not because she is fine. Send her handle and this can be re-run against it.'
            else count(*) || ' — ' || string_agg(coalesce(name, handle), ', ')
       end
  from rach

order by ord, question;
