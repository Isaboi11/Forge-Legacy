-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0231: a word from the squad, delivered by Holt during the workout
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded or a drop-then-create of a policy; §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- Adds `workout_cheers`: a squad-mate taps the "started training" notification, types a line, and Holt
-- shows it on the athlete's workout screen. Only squad-mates, never across a block, 1-140 chars, at most
-- 5 per recipient per 10 minutes. Sender + recipient read; recipient may only set `seen_at`.
--
-- ⚠ THE APP WORKS WITHOUT THIS — until it is pasted, the message box says it can't send yet and the
-- workout screen's poll quietly finds nothing. Applying it is what turns the feature on.
--
-- §1  the table, indexes, RLS policies and grants (verbatim from 0231_workout_cheers.sql)
-- §2  asserts the table, RLS and all four policies exist, and RAISES if not
-- §3  reports the policies and how many messages exist (read-only)
--
-- PREDICTED §3: four policies (select, insert, update, delete) and messages = 0 until the client is
-- deployed and somebody sends one.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE TABLE
-- ═════════════════════════════════════════════════════════════════════════════

create table if not exists public.workout_cheers (
  id         uuid primary key default gen_random_uuid(),
  from_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_id      uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 140),
  created_at timestamptz not null default now(),
  seen_at    timestamptz,
  constraint workout_cheers_not_self check (from_id <> to_id)
);

-- The recipient's poll: "my unseen messages, newest first".
create index if not exists workout_cheers_unseen_idx
  on public.workout_cheers (to_id, created_at desc)
  where seen_at is null;

-- The rate limit's lookup.
create index if not exists workout_cheers_sender_idx
  on public.workout_cheers (from_id, to_id, created_at desc);

alter table public.workout_cheers enable row level security;

drop policy if exists workout_cheers_select on public.workout_cheers;
create policy workout_cheers_select on public.workout_cheers for select
  using (from_id = auth.uid() or to_id = auth.uid());

drop policy if exists workout_cheers_insert on public.workout_cheers;
create policy workout_cheers_insert on public.workout_cheers for insert
  with check (
    from_id = auth.uid()
    and to_id <> auth.uid()
    and exists (
      select 1
        from public.squad_members me
        join public.squad_members them on them.squad_id = me.squad_id
       where me.user_id = auth.uid()
         and them.user_id = workout_cheers.to_id
    )
    and not public.is_blocked(auth.uid(), workout_cheers.to_id)
    and (
      select count(*)
        from public.workout_cheers c
       where c.from_id = auth.uid()
         and c.to_id = workout_cheers.to_id
         and c.created_at > now() - interval '10 minutes'
    ) < 5
  );

drop policy if exists workout_cheers_update on public.workout_cheers;
create policy workout_cheers_update on public.workout_cheers for update
  using (to_id = auth.uid())
  with check (to_id = auth.uid());

drop policy if exists workout_cheers_delete on public.workout_cheers;
create policy workout_cheers_delete on public.workout_cheers for delete
  using (from_id = auth.uid() or to_id = auth.uid());

-- The recipient may mark a message seen and change nothing else about it.
revoke update on public.workout_cheers from authenticated;
grant select, insert, delete on public.workout_cheers to authenticated;
grant update (seen_at) on public.workout_cheers to authenticated;

comment on table public.workout_cheers is
  'A squad-mate''s message to an athlete who is training, delivered by Coach Holt on the workout screen (0231). Sender = auth.uid(), shares a squad, not blocked, 1-140 chars, max 5 per recipient per 10 min. Recipient may only set seen_at.';


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare n int;
begin
  if to_regclass('public.workout_cheers') is null then
    raise exception '0231: workout_cheers is missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.workout_cheers'::regclass) then
    raise exception '0231: RLS is not enabled on workout_cheers';
  end if;
  select count(*) into n from pg_policies where schemaname = 'public' and tablename = 'workout_cheers';
  if n <> 4 then
    raise exception '0231: expected 4 policies on workout_cheers, found %', n;
  end if;
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — REPORT (read-only)
-- ═════════════════════════════════════════════════════════════════════════════

select policyname, cmd,
       (select count(*) from public.workout_cheers) as messages
  from pg_policies
 where schemaname = 'public' and tablename = 'workout_cheers'
 order by cmd;
