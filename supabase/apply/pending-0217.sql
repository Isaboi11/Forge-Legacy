-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0217: set_training_status tells the app whether the squad was just notified
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: drop-if-exists + create, restated grants, a self-check that raises.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- PO, 2026-09-25: when you start a workout and the app notifies your squad, Coach Holt says so —
-- "Your squad just got a notification that you started Upper A. Let's get after it." Only when the
-- squad was actually notified. The function that starts a workout now answers that question.
--
-- ⚠ NOTHING ABOUT WHO GETS NOTIFIED CHANGES. The update to `profiles` is 0202's, verbatim; this only
--   adds a return value. Resume/leave still announce once (0202).
--
-- ⚠ SAFE IN EITHER ORDER WITH THE APP. Builds already installed ignore the return value. A new build
--   against a database without this simply never shows Holt's line.
--
-- ⚠ RUN AFTER 0202 (applied 2026-09-22).
--
-- ══ §1 is the migration below, verbatim. §2 is its self-check (raises). §3 is the read-only row. ══
--
-- ══ WHAT THE LAST RESULT SHOULD SAY (prediction) ══
--
--   returns_expect_jsonb = jsonb · definer_expect_true = true · overloads_expect_1 = 1 ·
--   authed_can_call_expect_true = true · anon_can_call_expect_false = false
--
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- Forge Legacy — 0217: set_training_status tells the caller whether the squad was just notified
--
-- THE ASK, PO 2026-09-25: when an athlete starts a workout and the app notifies their squad, Coach Holt
-- says so, in words that make it OBVIOUS what happened — *"Your squad just got a notification that you
-- started Upper A. Let's get after it."* And ONLY when the squad was actually notified.
--
-- The client cannot know that on its own. Whether a start is an announcement is decided here, by three
-- facts the client cannot see:
--
--   · IS IT NEWS? 0187 + 0202 made a start write-once per session: a resume, a re-assert on mount, or a
--     leave → resume inside the four-hour ceiling KEEPS `training_announced_at`, so the outbox key
--     collides and the squad is not told twice. Only a call that stamps a NEW `training_announced_at`
--     is a new announcement. `training_announced_at` is hidden from `authenticated` (0202 §1).
--   · MAY THEY BE ANNOUNCED? The actor's own `visibility.training` must clear `'squad'` — branch 15 of
--     the union (0153/0164) applies exactly `vis_clears(coalesce(visibility->>'training','squads'),
--     'squad')`, and a private athlete is never announced.
--   · IS ANYONE LISTENING? The same join `push_tg_training_started` (0153) walks: a squad the athlete is
--     in with `squads.training_alerts`, and a squad-mate (not the athlete) with `notify_start`.
--
-- So the function now RETURNS `{announced, squads, teammates}`:
--
--   · `announced`  true ONLY when all three hold — a fresh stamp, a visibility that clears 'squad', and
--                  at least one eligible squad-mate. Everything else is false.
--   · `squads`     how many distinct squads carried it (Holt says "your squads" when > 1).
--   · `teammates`  how many distinct squad-mates it was filed for.
--
-- ⚠ WHAT "NOTIFIED" MEANS, SO HOLT'S LINE IS TRUE. `announced` means the start is a new event in every
--   eligible teammate's notification feed (branch 15 is read-time: it is in their /inbox now) and the
--   trigger has handed each of them to `push_enqueue_for`. Whether it then reaches a LOCK SCREEN depends
--   on the recipient's `notif_prefs.squad_training` and whether their device registered a token — facts
--   about somebody else that this function must not read back to the caller. "Your squad just got a
--   notification" is true in the inbox sense for every one of them; the line never promises a buzz.
--
-- ⚠ THE RETURN TYPE CHANGES (void → jsonb), WHICH `create or replace` CANNOT DO (42P13). So the
--   three-argument function is DROPPED and CREATED, which also drops its grants — 0202's revoke/grant
--   posture is restated below, verbatim. The body is 0202's, copied, with only the additions marked
--   `0217`. Nothing about WHAT is written to `profiles` changes: the three `case` arms are 0202's.
--
-- ⚠ CLIENT COMPATIBILITY, BOTH DIRECTIONS:
--   · Every build installed today calls this and ignores the result — a jsonb it never reads is safe.
--   · A new client against a database without 0217 gets `null` back from a void function, and Holt says
--     nothing. The line cannot appear before the server can vouch for it.
--
-- ⚠ STILL SECURITY DEFINER (0190/0202): the body reads `training_announced_at` and `visibility`
--   alongside hidden presence columns; as an invoker every call raises 42501 into the client's catch.
--
-- ⚠ STILL ONE OVERLOAD. The two-argument form 0202 dropped is dropped again (a no-op when absent), so a
--   re-paste of an older migration cannot leave two live signatures for PostgREST to choose between.
--
-- Idempotent: drop-if-exists + create, restated grants, and a self-check that raises. Depends on 0069
-- (vis_clears), 0153 (training_alerts / notify_start), 0202 (training_announced_at, the body). RUN AFTER
-- 0202 — which is applied (2026-09-22).

begin;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1 · THE SAME FUNCTION, NOW ANSWERING "WAS MY SQUAD TOLD?"
-- ══════════════════════════════════════════════════════════════════════════════

drop function if exists public.set_training_status(boolean, text);
-- 0217. The return type changes, and 42P13 forbids `create or replace` from doing that.
drop function if exists public.set_training_status(boolean, text, boolean);

create function public.set_training_status(
  p_active boolean,
  p_label  text default null,
  p_done   boolean default true
)
returns jsonb
language plpgsql
security definer                      -- ⚠ 0190. The body reads hidden columns; as invoker every call is 42501.
set search_path = public, pg_temp
as $$
declare
  -- 0217. The announcement stamp as it stood BEFORE this call — the only honest source of "is this news".
  v_prev_announced timestamptz;
  v_visibility     jsonb;
  v_fresh          boolean;
  v_squads         integer := 0;
  v_teammates      integer := 0;
begin
  if auth.uid() is null then
    return null;
  end if;

  -- 0217. Read (and lock) the row first, so the answer describes exactly the update below.
  select profiles.training_announced_at, profiles.visibility
    into v_prev_announced, v_visibility
    from public.profiles
   where profiles.id = auth.uid()
   for update;

  if not found then
    return null;
  end if;

  -- 0217. The complement of the hold arm below: a start with no live stamp inside the ceiling writes
  -- `now()`, which is a new outbox key — a new announcement. Anything else is a resume or a stop.
  v_fresh := p_active
    and (v_prev_announced is null or v_prev_announced <= now() - interval '4 hours');

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

  -- 0217. WHO WAS TOLD. The same gates as branch 15 of the union and `push_tg_training_started`:
  -- the actor's visibility clears 'squad'; the squad has training_alerts; the mate asked for starts.
  if v_fresh
     and public.vis_clears(coalesce(v_visibility ->> 'training', 'squads'), 'squad') then
    select count(distinct s.id), count(distinct m.user_id)
      into v_squads, v_teammates
      from public.squad_members mine
      join public.squads s on s.id = mine.squad_id and s.training_alerts
      join public.squad_members m on m.squad_id = mine.squad_id and m.user_id <> auth.uid()
     where mine.user_id = auth.uid()
       and m.notify_start;
  end if;

  return jsonb_build_object(
    'announced', v_fresh and v_teammates > 0,
    'squads',    v_squads,
    'teammates', v_teammates
  );
end;
$$;

-- ⚠ A NEW SIGNATURE CARRIES NONE OF THE OLD ONE'S GRANTS, so 0190's posture is restored explicitly
-- rather than assumed. BOTH `public` and `anon`: the ACL entry with an empty grantee is the PUBLIC one,
-- and revoking `anon` alone reports success and changes nothing.
revoke all on function public.set_training_status(boolean, text, boolean) from public;
revoke all on function public.set_training_status(boolean, text, boolean) from anon;
grant execute on function public.set_training_status(boolean, text, boolean) to authenticated;

comment on function public.set_training_status(boolean, text, boolean) is
  'Announce that the caller started, paused or ended a workout. Writes training_since / training_announced_at / training_label for auth.uid() only. p_done distinguishes a FINISH (true — clears the announcement, so the next session is news) from a LEAVE (false — presence ends, the announcement is held, and resuming reuses the same outbox key so the squad is told once). It defaults TRUE because every client predating 0202 makes the same call for both and silence is the worse failure. RETURNS (0217) {announced, squads, teammates}: announced is true ONLY when this call stamped a NEW announcement, the caller''s visibility.training clears ''squad'', and at least one squad-mate in a training_alerts squad has notify_start — the facts Coach Holt needs to say "your squad just got a notification". Null when there is no caller. ⚠ SECURITY DEFINER AND IT MUST STAY THAT WAY (0190): the body reads training_announced_at, which 0202 §1 hides from authenticated exactly as 0149 hid training_since, so as an invoker every call would raise 42501 into a catch the client uses to keep presence from blocking a workout.';


-- ══════════════════════════════════════════════════════════════════════════════
-- 2 · SELF-CHECK — RAISES RATHER THAN REPORTING, AND NEVER CALLS THE FUNCTION
-- ══════════════════════════════════════════════════════════════════════════════
--
-- ⚠ VERIFIED BY SOURCE. The SQL editor runs as `postgres`, where auth.uid() is null — a call would only
-- ever exercise the early return and prove nothing.

do $$
declare
  v_body text;
  v_ret  text;
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'set_training_status' and p.pronargs <> 3
  ) then
    raise exception '0217: an overload of set_training_status other than the three-argument one exists';
  end if;

  select pg_get_functiondef(p.oid), pg_get_function_result(p.oid) into v_body, v_ret
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'set_training_status' and p.pronargs = 3;

  if v_body is null then
    raise exception '0217: set_training_status(boolean, text, boolean) was not created';
  end if;
  if v_ret <> 'jsonb' then
    raise exception '0217: set_training_status returns %, not jsonb', v_ret;
  end if;
  if v_body !~ 'SECURITY DEFINER' then
    raise exception '0217: set_training_status must stay SECURITY DEFINER — 0190';
  end if;
  -- 0202's three behaviours, carried over.
  if v_body !~ 'when p_done then null' then
    raise exception '0217: a finish no longer clears the announcement stamp (0202)';
  end if;
  if v_body !~ 'else profiles\.training_announced_at' then
    raise exception '0217: a leave no longer HOLDS the announcement stamp (0202)';
  end if;
  -- 0217's gates.
  if v_body !~ 'vis_clears' or v_body !~ 'training_alerts' or v_body !~ 'notify_start' then
    raise exception '0217: the announcement answer is missing one of its three gates';
  end if;

  if not has_function_privilege('authenticated', 'public.set_training_status(boolean, text, boolean)', 'execute') then
    raise exception '0217: authenticated lost EXECUTE — presence would stop for every athlete';
  end if;
  if has_function_privilege('anon', 'public.set_training_status(boolean, text, boolean)', 'execute') then
    raise exception '0217: anon can execute set_training_status';
  end if;

  raise notice '0217 applied. set_training_status now reports whether the squad was notified.';
end $$;

commit;



-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- §3 READ-ONLY — what the paste changed. One row, every answer (the editor shows only the last result).
-- The self-check above RAISES on anything wrong, so reaching this output already means it held.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

select
  (select pg_get_function_result(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_training_status' and p.pronargs = 3)   as returns_expect_jsonb,
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_training_status' and p.pronargs = 3)   as definer_expect_true,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_training_status')                      as overloads_expect_1,
  has_function_privilege('authenticated', 'public.set_training_status(boolean, text, boolean)', 'execute')
                                                                                            as authed_can_call_expect_true,
  has_function_privilege('anon', 'public.set_training_status(boolean, text, boolean)', 'execute')
                                                                                            as anon_can_call_expect_false;
