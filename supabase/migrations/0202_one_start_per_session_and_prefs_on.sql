-- Forge Legacy — 0202: leaving a workout stops re-announcing it, and every notification starts ON
--
-- TWO ASKS, PO 2026-09-20:
--
--   1. *"If I leave the workout and go to the home screen or do anything that makes me need to resume
--      the workout, it notifies everyone again that I'm starting a workout. Just want the first initial
--      notification."*
--   2. *"Everyone's should be set to all notifications on as the default, so announcements and posts in
--      the squad should be sending a notification."*
--
--
-- ══════════════════════════════════════════════════════════════════════════════════════════════════
-- PART A · ONE START, ONE ANNOUNCEMENT — EVEN ACROSS A LEAVE
-- ══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ⚠ 0187 ALREADY FIXED THIS ONCE, AND ITS FIX IS STILL RIGHT. It is the LEAVE that walks around it.
--
-- 0187 made `training_since` write-once per session: a re-announcement inside the four-hour presence
-- ceiling KEEPS the original stamp, so the outbox key `(user_id, kind, event_at, subject)` collides and
-- `on conflict do nothing` absorbs the second push. That closed the case it was written for — the app
-- being killed mid-session and `workout.tsx` re-asserting presence on mount.
--
-- It cannot close this one, because leaving does not re-announce over a live stamp. It CLEARS it:
--
--     onLeave  →  leaveSession()  →  abandonWorkout()  →  setTrainingStatus(false)
--                                                      →  training_since = NULL
--
-- and that clear is deliberate, documented at `src/app/workout.tsx` (header back). "I have unfinished
-- work saved" and "I am training right now" are two different facts, and only the first should survive
-- walking away — otherwise anyone who opened the logger and backed out stays lit on Live Now for four
-- hours. That is not being undone here.
--
-- So on resume the column is null, 0187's hold has nothing to hold, `else now()` fires, and a brand-new
-- timestamp is a brand-new outbox key. The squad is told again. Every time. The unique index is not
-- failing — it is being handed a genuinely different event, exactly as 0187's own header describes.
--
-- ══ THE FIX: SEPARATE "I AM TRAINING" FROM "THE SQUAD HAS BEEN TOLD" ══
--
-- `training_since` is doing two jobs and they have now come apart:
--
--   · PRESENCE — am I on Live Now right this second? Must end when I walk away.
--   · IDENTITY — which session is this, for the purpose of the outbox key? Must NOT end when I walk
--     away, because it is the same session I am about to resume.
--
-- `profiles.training_announced_at` takes the second job. `training_since` keeps the first and every
-- reader of it — `training_now()`, `athlete_training_status()`, branch 9 and branch 15 of the union —
-- is untouched, still sees exactly what it saw, still applies the same four-hour ceiling.
--
-- A start now asks the ANNOUNCEMENT stamp, not the presence stamp, whether this is news:
--
--   · leave → resume, 20 min later   → announced_at held, training_since restored TO THE SAME VALUE.
--                                      The trigger fires (null → stamp is distinct), push_enqueue_for
--                                      re-scans, the outbox key is identical, `on conflict do nothing`
--                                      absorbs it. ONE notification. ✅
--   · app killed → reopened          → 0187's case, unchanged. ✅
--   · finish and save                → `p_done` clears BOTH, so the next workout is news again. ✅
--   · discard ("Not today")          → same: the session is over, both cleared. ✅
--   · abandoned, resumed 5h later    → past the ceiling, genuinely a new workout, announced. ✅
--
-- ⚠ AND THE RESTORED STAMP IS THE HONEST ONE. Coming back reads "47 min" because that is how long ago
-- they started — not "0 min", which is what a fresh `now()` has been claiming to the whole squad.
--
-- ══ ⚠ `p_done` DEFAULTS TO TRUE, WHICH IS TODAY'S BEHAVIOUR ══
--
-- The client is the only thing that knows the difference between "I finished" and "I stepped away", and
-- every build installed on the day this is pasted knows neither — `finishWorkout` and `abandonWorkout`
-- are the same call today. A default of TRUE means those builds behave EXACTLY as they do now: every
-- stop is a finish, every resume is news. A default of FALSE would make an old client hold the stamp
-- through a real finish and swallow the announcement for the athlete's NEXT workout — silence is the
-- worse failure, so the default is the loud one.
--
-- ⚠ AND THE TWO-ARGUMENT SIGNATURE IS DROPPED, NOT LEFT BESIDE THE THREE. This is 0187 §A's lesson on
-- `push_register_token`, one migration later: `create or replace` cannot change an argument list, so a
-- bare create leaves BOTH overloads callable with PostgREST resolving between them by whichever named
-- arguments a client happened to send. The new signature accepts every call the old one did.
--
-- ⚠ AND IT STAYS `SECURITY DEFINER`. That is 0190's whole subject: the body READS a hidden column, 0149
-- revoked `authenticated`'s SELECT on the presence columns, and as an invoker every call raised 42501
-- into a `catch {}` that was designed to swallow exactly this. The new column is hidden the same way
-- (§1), so the same reasoning applies to it, which is why it is not typed as invoker here.
--
--
-- ══════════════════════════════════════════════════════════════════════════════════════════════════
-- PART B · EVERY NOTIFICATION ON BY DEFAULT
-- ══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- A squad ANNOUNCEMENT has always had a sender. `squad_posts` holds every post type — checkin, recap,
-- pr, discussion, announcement — and branch 10 of the union (`squad_post`, 0122) fans one row out to
-- every member but the author. `push_pref_key` maps it to `squad_feed`, and `push_pref_default` has
-- answered FALSE for `squad_feed` since 0122.
--
-- So nothing was broken. The owner posted an announcement, the row was written, the branch produced an
-- event for every member, and `push_prefs_allows` discarded all of them against a default of off.
--
-- ⚠ THIS IS THE SECOND HALF OF 0189, AND THE SAME KIND OF DECISION. 0189 opened the TRAINING gates for
-- the testing phase and said in writing that it touched no other preference: *"`squad_feed`,
-- `squad_reactions`, `squad_goals`, `squad_activity` and `training_briefing` keep whatever each athlete
-- has. The ask was training alerts."* This is the ask it deferred.
--
-- ⚠⚠ AND IT IS THE SAME DELIBERATE, TEMPORARY OVERRIDE OF A LOCKED DEFAULT. `P-5 §3.1` — ambient
-- notifications are OFF — is still the right answer for a public launch, and the blurb on the Squad
-- Activity section still reads *"Off by default"* and will need rewriting before one. Restoring it is a
-- later migration that writes `false` back into these three arms plus the matching `def:` on the screen.
--
-- ⚠ ONE KEY IS DELIBERATELY LEFT OFF, and it is not an oversight: `training_briefing`.
--
--   It is the only notification in the app that nobody else causes — a daily 6am push the athlete
--   schedules for themselves. It is ALSO inert: `briefing_send` (0159) walks `briefing_schedule`, and a
--   row exists there only when someone has picked their days and their hour. Flipping the default would
--   send nothing to anybody, and 0159 carries a self-check that RAISES if this default is true, so a
--   re-paste of 0159 after this file would fail on a toggle that changed nothing. Off, and said out loud.
--
-- ⚠ AND `squad_goals` IS SET TRUE HERE WITHOUT THAT MEANING ANYTHING. Its arm is dead: `push_prefs_allows`
-- consults `push_pref_default` only for a kind `push_pref_key` maps there, and no union kind maps to
-- `squad_goals` — 0200 sends it directly from `squad_goal_record_close`, which reads the preference
-- itself and defaults it ON (Amendment 006 D1). The arm is set true so the function does not read as
-- contradicting the toggle beside it; `push.test.mjs` still pins the real default to 0200's sender.
--
-- ⚠ BOTH PREFERENCE FUNCTIONS ARE RESTATED WHOLE, FROM 0164'S BODY, and `push_pref_key` is restated
-- UNCHANGED. Patching one arm is not available — 0088, 0092 and 0106 each rebuilt a shared function from
-- a stale copy and silently reverted a shipped feature. `push.test.mjs` moves `SQL_PREFS` to this file
-- for the same reason: the newest definition is the one the parity test must read.
--
-- ⛔ AND THE COLLISION 0200 WARNED ABOUT IS STILL LIVE. `0195_coaching_notifications` and
-- `0196_trainer_messages` on `feat/forge-coach` ALSO restate `push_pref_key` and `push_pref_default`,
-- written and not applied. Whichever is pasted LAST wins, whole-body. If 0195/0196 are pasted after this
-- file, these defaults revert silently — re-paste §3 of this file afterwards, or fold these arms into
-- theirs before pasting them.
--
-- ⛔ NOTHING IS SENT RETROACTIVELY. `push_enqueue_for` files events newer than the recipient's
-- `push_baseline_at` and the triggers fired (or did not) when the post was written. An announcement made
-- before this is pasted stays unannounced on the device. It DOES appear in `/inbox` the moment this
-- lands — branch 10 is evaluated at read time and windowed at 14 days — with no new build and no push.
--
--
-- Idempotent. Every statement is guarded, a restatement, or a `where`-narrowed update that matches
-- nothing on a second run. Depends on 0022 (notif_prefs), 0086 (training_since), 0120 (push_outbox,
-- the preference functions), 0122 (the squad_post branch), 0149 (the column revoke), 0164 (the bodies
-- restated here), 0187 + 0190 (the function this replaces). RUN AFTER 0201.

begin;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1 · THE ANNOUNCEMENT STAMP — A NEW COLUMN, HIDDEN LIKE THE TWO BESIDE IT
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists training_announced_at timestamptz;

comment on column public.profiles.training_announced_at is
  'When this athlete''s CURRENT session was announced to their squads — the outbox event key for it (0202). NOT presence: training_since answers "on Live Now right now" and is cleared the moment they walk away from the logger, which is why it could not also carry this. Held across a leave/resume so the restored session reuses its original key and push_outbox''s unique index absorbs the second enqueue; cleared only by a finish or a discard (set_training_status(false, null, true)), or by ageing past the same 4-hour ceiling every reader of training_since applies. ⚠ NOT SELECTABLE by anon or authenticated, for 0149''s reason: profiles_read is `using (true)`, so a grant here would publish when every athlete last trained to anyone holding the anon key.';

-- ⚠ 0149 DOES NOT COVER A COLUMN THAT DID NOT EXIST WHEN IT RAN, AND ITS OWN VERIFY BLOCK SAYS SO:
-- *"ungranted_columns … counts columns a later migration added after this one ran. A non-zero number
-- here means reads of that column are failing; re-running this file grants it."* Re-running 0149 would
-- grant THIS column too, because it is not in that file's `v_hidden` array — quietly undoing the hiding
-- three lines above. So the derive-and-grant loop is re-run HERE with the array extended, which also
-- closes the gap for any other `profiles` column added since 0149.
--
-- Same shape as 0149 §1, deliberately: the grants are DERIVED from information_schema, never typed, so a
-- column this file does not know about cannot be left ungranted by a list somebody forgot to update.
do $$
declare
  c record;
  v_hidden text[] := array['training_since', 'training_label', 'training_announced_at'];
begin
  revoke select on public.profiles from anon, authenticated;
  for c in
    select column_name from information_schema.columns
     where table_schema = 'public' and table_name = 'profiles'
       and not (column_name = any (v_hidden))
     order by ordinal_position
  loop
    execute format('grant select (%I) on public.profiles to anon, authenticated', c.column_name);
  end loop;
end $$;


-- ══════════════════════════════════════════════════════════════════════════════
-- 2 · A SESSION KEEPS ITS ANNOUNCEMENT ACROSS A LEAVE
-- ══════════════════════════════════════════════════════════════════════════════

-- ⚠ THE TWO-ARGUMENT SIGNATURE GOES. See the header: two live overloads is the `push_register_token`
-- fault 0187 §A had to clean up, and PostgREST would pick between them by argument names.
drop function if exists public.set_training_status(boolean, text);

create or replace function public.set_training_status(
  p_active boolean,
  p_label  text default null,
  p_done   boolean default true
)
returns void
language plpgsql
security definer                      -- ⚠ 0190. The body reads hidden columns; as invoker every call is 42501.
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  update public.profiles
     set
       -- PRESENCE. Ends the instant they stop, exactly as before. On a start it takes whatever the
       -- announcement stamp resolves to below, so a resumed session is restored to the time it really
       -- began rather than reading "0 min" to the whole squad.
       training_since = case
         when not p_active then null
         when profiles.training_announced_at is not null
          and profiles.training_announced_at > now() - interval '4 hours'
           then profiles.training_announced_at
         else now()
       end,
       -- IDENTITY. This is the outbox event key, and it must survive walking away from the logger.
       --   start  → hold it if this session is still inside the presence ceiling, else stamp a new one
       --   finish → p_done true, cleared: the next workout is news again
       --   leave  → p_done false, held: resuming reuses the key and the second push is absorbed
       training_announced_at = case
         when p_active then
           case
             when profiles.training_announced_at is not null
              and profiles.training_announced_at > now() - interval '4 hours'
               then profiles.training_announced_at
             else now()
           end
         when p_done then null
         else profiles.training_announced_at
       end,
       -- The label always follows the current call: the stamp says when, the label says what (0187).
       training_label = case when p_active then nullif(btrim(coalesce(p_label, '')), '') else null end
   where id = auth.uid();
end;
$$;

-- ⚠ A NEW SIGNATURE CARRIES NONE OF THE OLD ONE'S GRANTS, so 0190's posture is restored explicitly
-- rather than assumed. BOTH `public` and `anon`: the ACL entry with an empty grantee is the PUBLIC one,
-- and revoking `anon` alone reports success and changes nothing.
revoke all on function public.set_training_status(boolean, text, boolean) from public;
revoke all on function public.set_training_status(boolean, text, boolean) from anon;
grant execute on function public.set_training_status(boolean, text, boolean) to authenticated;

comment on function public.set_training_status(boolean, text, boolean) is
  'Announce that the caller started, paused or ended a workout. Writes training_since / training_announced_at / training_label for auth.uid() only. p_done distinguishes a FINISH (true — clears the announcement, so the next session is news) from a LEAVE (false — presence ends, the announcement is held, and resuming reuses the same outbox key so the squad is told once). It defaults TRUE because every client predating 0202 makes the same call for both and silence is the worse failure. ⚠ SECURITY DEFINER AND IT MUST STAY THAT WAY (0190): the body reads training_announced_at, which 0202 §1 hides from authenticated exactly as 0149 hid training_since, so as an invoker every call would raise 42501 into a catch the client uses to keep presence from blocking a workout.';


-- ══════════════════════════════════════════════════════════════════════════════
-- 3 · EVERY PREFERENCE ON — BOTH FUNCTIONS RESTATED WHOLE, FROM 0164
-- ══════════════════════════════════════════════════════════════════════════════

-- ⚠ UNCHANGED FROM 0164, RESTATED SO THIS FILE IS THE NEWEST DEFINITION OF BOTH. Patching one function
-- and leaving the other behind is how `SQL_PREFS` in push.test.mjs ends up parsing two different files.
create or replace function public.push_pref_key(p_kind text)
returns text
language sql
immutable
as $$
  select case p_kind
    when 'join_request'         then 'squad_activity'
    when 'member_joined'        then 'squad_activity'
    when 'request_approved'     then 'squad_activity'
    when 'friend_request'       then 'friend_requests'
    when 'friend_accepted'      then 'friend_requests'
    -- 0164. `challenge_updates` is retired: it only ever governed this one kind, and its label
    -- promised standing changes that have never existed. Both halves of the invitation handshake
    -- ride the new key, exactly as friend_request/friend_accepted share `friend_requests`.
    when 'challenge_invite'     then 'challenge_invites'
    when 'challenge_joined'     then 'challenge_invites'
    when 'workout_invite'       then 'workout_tags'
    when 'workout_join_request' then 'workout_tags'
    when 'program_shared'       then 'program_shares'
    when 'squad_post'           then 'squad_feed'
    when 'squad_checkin'        then 'squad_feed'
    when 'squad_recap'          then 'squad_feed'
    when 'post_comment'         then 'post_comments'
    when 'post_reaction'        then 'squad_reactions'
    when 'squad_training_started'  then 'squad_training'
    when 'squad_training_finished' then 'squad_training'
    -- 0159. Its own key, and the first one whose event has no actor.
    when 'training_briefing'    then 'training_briefing'
    else null
  end;
$$;

-- ⚠ These MUST equal `NOTIF_DEFAULTS` in src/domain/settings/notifications.ts. A test parses this
-- function and asserts the two agree, because a default that differs between client and sender means the
-- screen shows one thing and the server does another, silently.
create or replace function public.push_pref_default(p_key text)
returns boolean
language sql
immutable
as $$
  select case p_key
    -- 0202. Join requests, approvals and new members — TRUE for the testing phase. P-5 §3.1's
    -- ambient-is-off default is the launch answer and is what this reverts to.
    when 'squad_activity'    then true
    when 'friend_requests'   then true
    when 'challenge_invites' then true
    when 'workout_tags'      then true
    when 'program_shares'    then true
    -- 0202. THE ASK. This is the key every squad POST rides, announcements included — `squad_post`,
    -- `squad_checkin` and `squad_recap` all map here. It has answered false since 0122, which is why an
    -- owner's announcement reached the inbox and never a device.
    when 'squad_feed'        then true
    -- 0202. Reactions and mentions (`post_reaction`, live since 0135).
    when 'squad_reactions'   then true
    -- 0202. TRUE, and it still governs nothing: no union kind maps here, so push_prefs_allows never
    -- consults this arm. 0200's `squad_goal_record_close` reads the preference itself and defaults it
    -- ON (Amendment 006 D1). Set true only so the function does not read as contradicting the toggle.
    when 'squad_goals'       then true
    when 'squad_invites'     then true
    when 'post_comments'     then true
    when 'squad_training'    then true
    -- 0159. FALSE, and deliberately NOT flipped by 0202 — see this file's header. It is the one
    -- notification nobody else triggers, it cannot fire until the athlete picks their days and hour in
    -- `briefing_schedule`, and 0159's own self-check raises if this arm reads true.
    when 'training_briefing' then false
    else false
  end;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- 4 · THE ATHLETES WHO ALREADY SAID NO
-- ══════════════════════════════════════════════════════════════════════════════
--
-- `push_prefs_allows` falls back to the default ONLY when nothing boolean is stored, so a null or
-- key-absent `notif_prefs` is already correct after §3 and is left alone — writing to it would create
-- rows that say what the default already says. This narrows to athletes who explicitly stored `false`,
-- which is the same shape 0189 §B used for `squad_training` and the same PO instruction: *"everyone's
-- should be set to all notifications on."*
--
-- ⚠ The `jsonb_typeof` guard is not decoration: `push_prefs_allows` uses the identical test (0120), and
-- casting a non-boolean value with `::boolean` here would raise on a single malformed row and take the
-- whole paste down.
--
-- ⚠ `||` MERGES, IT DOES NOT REPLACE. Any key an athlete has that is not named here survives, including
-- `training_briefing` — an athlete who scheduled a briefing and then turned it off stays off.

update public.profiles
   set notif_prefs = coalesce(notif_prefs, '{}'::jsonb) || jsonb_build_object('squad_feed', true)
 where jsonb_typeof(profiles.notif_prefs -> 'squad_feed') = 'boolean'
   and (profiles.notif_prefs ->> 'squad_feed')::boolean = false;

update public.profiles
   set notif_prefs = coalesce(notif_prefs, '{}'::jsonb) || jsonb_build_object('squad_reactions', true)
 where jsonb_typeof(profiles.notif_prefs -> 'squad_reactions') = 'boolean'
   and (profiles.notif_prefs ->> 'squad_reactions')::boolean = false;

update public.profiles
   set notif_prefs = coalesce(notif_prefs, '{}'::jsonb) || jsonb_build_object('squad_activity', true)
 where jsonb_typeof(profiles.notif_prefs -> 'squad_activity') = 'boolean'
   and (profiles.notif_prefs ->> 'squad_activity')::boolean = false;

update public.profiles
   set notif_prefs = coalesce(notif_prefs, '{}'::jsonb) || jsonb_build_object('squad_goals', true)
 where jsonb_typeof(profiles.notif_prefs -> 'squad_goals') = 'boolean'
   and (profiles.notif_prefs ->> 'squad_goals')::boolean = false;


-- ══════════════════════════════════════════════════════════════════════════════
-- 5 · SELF-CHECK — RAISES RATHER THAN REPORTING
-- ══════════════════════════════════════════════════════════════════════════════
--
-- ⚠ A `select` at the end of a paste is the check that goes unread: the SQL editor shows only the LAST
-- statement's result, which is how two security checks once ran unseen (0170/0171). These raise.

do $$
declare
  v_body text;
begin
  -- A · the three-argument function is the only one left, and it holds the announcement across a leave.
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'set_training_status' and p.pronargs = 2
  ) then
    raise exception '0202: the two-argument set_training_status is still callable beside the three';
  end if;

  select pg_get_functiondef(p.oid) into v_body
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'set_training_status' and p.pronargs = 3;

  if v_body is null then
    raise exception '0202: set_training_status(boolean, text, boolean) was not created';
  end if;
  if v_body !~ 'SECURITY DEFINER' then
    raise exception '0202: set_training_status must stay SECURITY DEFINER — 0190, and now a second hidden column';
  end if;
  if v_body !~ 'when p_done then null' then
    raise exception '0202: a finish no longer clears the announcement stamp';
  end if;
  if v_body !~ 'else profiles\.training_announced_at' then
    raise exception '0202: a leave no longer HOLDS the announcement stamp — the whole point of this file';
  end if;

  -- B · the column exists and is hidden from the roles profiles_read exposes to everyone.
  if has_column_privilege('authenticated', 'public.profiles', 'training_announced_at', 'select') then
    raise exception '0202: training_announced_at is selectable by authenticated — 0149''s leak, on a new column';
  end if;
  if has_column_privilege('anon', 'public.profiles', 'training_announced_at', 'select') then
    raise exception '0202: training_announced_at is selectable by anon';
  end if;

  -- C · and nothing ELSE on profiles was left ungranted by §1's revoke-and-regrant.
  if exists (
    select 1 from information_schema.columns col
     where col.table_schema = 'public' and col.table_name = 'profiles'
       and col.column_name not in ('training_since', 'training_label', 'training_announced_at')
       and not has_column_privilege('authenticated', 'public.profiles', col.column_name, 'select')
  ) then
    raise exception '0202: §1 left a profiles column ungranted — every read of it is now failing';
  end if;

  -- D · the preferences. `squad_feed` is the one the PO asked for by name.
  if not public.push_pref_default('squad_feed') then
    raise exception '0202: squad_feed is still off — squad posts and announcements still reach no device';
  end if;
  if not public.push_pref_default('squad_reactions') then
    raise exception '0202: squad_reactions is still off';
  end if;
  if not public.push_pref_default('squad_activity') then
    raise exception '0202: squad_activity is still off';
  end if;
  if public.push_pref_default('training_briefing') then
    raise exception '0202: training_briefing must stay OFF — it is inert, and 0159 self-checks on it';
  end if;

  -- E · and push_pref_key survived being restated beside it (0088/0092/0106's failure).
  if public.push_pref_key('squad_post') is distinct from 'squad_feed'
     or public.push_pref_key('squad_training_started') is distinct from 'squad_training'
     or public.push_pref_key('challenge_invite') is distinct from 'challenge_invites' then
    raise exception '0202: push_pref_key was rebuilt from a stale copy — it lost a key a later migration added';
  end if;

  raise notice '0202 applied. A resumed workout is announced once; squad posts and announcements now push.';
end $$;

commit;
