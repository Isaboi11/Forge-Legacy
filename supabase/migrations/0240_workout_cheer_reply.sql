-- 0240 — ANSWER A SQUAD-MATE'S MESSAGE WITH ONE TAP, AND THEY HEAR ABOUT IT
--
-- PO 2026-09-29: *"the message came through from someone in the squad during an active workout. Should we
-- be able to respond in some sort of way? Just acknowledging for the person to know that we got it?"* —
-- then: three choices, no custom text. "👊 Got it", "🔥 Let's go", "🙏 Thanks".
--
-- On a 0231 message the recipient taps one of three under Holt's bubble. That closes the message (it
-- stamps `seen_at`, as the X does) and writes `reply`; the sender gets a push: "Isaiah: 🔥 Let's go".
-- The X still closes it without replying.
--
-- ══ ONE REPLY, EVER ══ The recipient may set `reply` once. A second write keeps the first (a trigger, not a
-- policy: the column grant already limits WHO; this limits WHEN). `replied_at` is the server's clock,
-- never the client's. So one message can produce at most one push, however the client behaves.
--
-- ══ THE PUSH ══ Written to `push_outbox` directly — 0200's and 0159's shape — so the notification union
-- (`notification_events_for`) is NOT restated here and cannot be rolled back by this paste. It honours the
-- sender's `squad_reactions` preference ("Reactions & Mentions", default ON since 0202); an explicit false
-- is respected. Push only — no inbox row (that would mean restating the union). The same gates every
-- direct push uses: a push baseline older than the event, and a live device token.
--
-- Depends on 0231 (workout_cheers), 0120 (push_outbox, push_tokens, push_baseline_at). Additive,
-- idempotent, safe to run twice.

begin;

alter table public.workout_cheers add column if not exists reply text;
alter table public.workout_cheers add column if not exists replied_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'workout_cheers_reply_check') then
    alter table public.workout_cheers add constraint workout_cheers_reply_check
      check (reply is null or reply in ('got_it', 'lets_go', 'thanks'));
  end if;
end $$;

-- The recipient may now set the reply as well as `seen_at`. Nothing else.
revoke update on public.workout_cheers from authenticated;
grant update (seen_at, reply) on public.workout_cheers to authenticated;

-- One reply, ever, stamped by the server.
create or replace function public.workout_cheers_reply_once()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.reply is not null then
    new.reply := old.reply;
    new.replied_at := old.replied_at;
  elsif new.reply is not null then
    new.replied_at := now();
    new.seen_at := coalesce(new.seen_at, now());
  else
    new.replied_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists workout_cheers_reply_once on public.workout_cheers;
create trigger workout_cheers_reply_once
  before update on public.workout_cheers
  for each row execute function public.workout_cheers_reply_once();

-- The sender hears the answer.
create or replace function public.workout_cheers_reply_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name  text;
  v_reply text;
begin
  if old.reply is not null or new.reply is null then
    return new;
  end if;

  select coalesce(nullif(btrim(p.name), ''), 'Your squad-mate') into v_name
    from public.profiles p
   where p.id = new.to_id;

  v_reply := case new.reply
               when 'got_it'  then '👊 Got it'
               when 'lets_go' then '🔥 Let''s go'
               else '🙏 Thanks'
             end;

  insert into public.push_outbox (user_id, kind, event_at, actor_id, title, body, route)
  select new.from_id,
         'workout_cheer_reply',
         new.replied_at,
         new.to_id,
         coalesce(v_name, 'Your squad-mate'),
         v_reply || ' — to “' || left(btrim(new.body), 60) || '”',
         '/athlete/' || new.to_id::text
    from public.profiles pr
   where pr.id = new.from_id
     and pr.push_baseline_at is not null
     and pr.push_baseline_at < new.replied_at
     and exists (select 1 from public.push_tokens t where t.user_id = new.from_id and t.disabled_at is null)
     and case
           when jsonb_typeof(coalesce(pr.notif_prefs, '{}'::jsonb) -> 'squad_reactions') = 'boolean'
             then (pr.notif_prefs ->> 'squad_reactions')::boolean
           else true
         end
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.workout_cheers_reply_push() from public;

drop trigger if exists workout_cheers_reply_push on public.workout_cheers;
create trigger workout_cheers_reply_push
  after update of reply on public.workout_cheers
  for each row execute function public.workout_cheers_reply_push();

comment on column public.workout_cheers.reply is
  'The recipient''s one-tap answer (0240): got_it | lets_go | thanks. Set once; a later write keeps the first. Setting it pushes the sender (squad_reactions pref, default on).';

commit;
