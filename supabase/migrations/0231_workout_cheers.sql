-- 0231 — A WORD FROM THE SQUAD, DELIVERED BY HOLT DURING THE WORKOUT
--
-- PO 2026-09-28: *"when me or anyone in the squad gets a notification we can say something to them through
-- coach holt. I see they started, I click on the notification and type in 'let's go Jordan! Kill this
-- workout' and then coach holt lets them know during their workout."*
--
-- One row per message. The sender writes it from the screen the "started training" notification opens
-- (`/workout-join`); the athlete's workout screen polls for unseen rows and Holt's bubble shows them. The
-- athlete closing the bubble stamps `seen_at`.
--
-- ══ WHO MAY SEND ══ (all in the INSERT policy, so the client cannot talk its way past any of it)
--   · yourself, as `from_id` — never on someone else's behalf;
--   · to somebody else, who shares at least one squad with you right now;
--   · never across a block, in either direction (`is_blocked`, 0171);
--   · 1–140 characters after trimming;
--   · at most 5 to the same athlete in 10 minutes — a message is encouragement, not a chat channel.
--
-- ══ WHO MAY READ ══ sender and recipient only. ══ WHO MAY CHANGE ══ the recipient, and only `seen_at`
-- (column grant). Either side may delete. Account deletion cascades through `profiles`.
--
-- No push: the recipient is mid-workout with the app open, which is where Holt speaks. Additive,
-- idempotent, safe to run twice.

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
