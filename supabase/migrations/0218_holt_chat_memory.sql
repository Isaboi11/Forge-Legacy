-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- 0218 · HOLT REMEMBERS PAST CHATS — a short summary per conversation, and two new metered actions
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- PO, 2026-09-25: *"I thought we made it so he can remember old convos? How can we make it cost
-- efficient?"* → a 2–3 line summary is written when a chat ends, the last ten are kept, and Holt reads
-- them through a tool only when a question needs them. This AMENDS Coach-AI-Amendment-001 CA-D1 ("a job
-- never sees another job's words") — see `Docs/Amendments/Coach-AI-Amendment-002-Chat-Memory-And-Web.md`.
-- The cost stays flat for the life of the account: ten summaries, read on demand, never the transcript.
--
-- ══ THE RULES THE TABLE CARRIES ══
--
--   · VISIBLE AND DELETABLE BY THE ATHLETE (CA-D2's principle: a hidden memory is where a wrong fact
--     lives forever). Owner-only select / insert / delete; no update — a summary is a record of a chat,
--     not something to rewrite. Shown at `/holt-memory` under "Recent conversations".
--   · THE LAST TEN PER ATHLETE, trimmed by a trigger after each insert, so the read stays a few hundred
--     tokens whatever the account's age.
--   · 10–500 characters each.
--   · WRITTEN BY `coach-ask` (mode 'summarize') AS THE ATHLETE — their JWT, so RLS applies. The function
--     drops any sentence the medical guard catches before it is stored (no health or body facts).
--
-- ══ TWO NEW ACTIONS IN coach_ai_config.action_credits ══
--
--   · 'summary' = 0. Costs no credit, but still goes through `coach_ai_spend_credits`, which is what
--     refuses anyone without Premium AI (0203). Summarising is a Haiku call, ~$0.001 a chat.
--   · 'web' = 3. A message where the athlete asked Holt to search online for a recipe. Web search is
--     ~$0.01 a search plus the pages it reads (~$0.02–0.05 a message), so it is weighted like a photo
--     read (3), not a message (1).
--   An action absent from the map raises 22023 in `coach_ai_spend_credits`, so this MUST be applied
--   before the `coach-ask` redeploy that uses them — or summaries silently never save and web search
--   answers "meter unavailable".
--
-- Safe to run twice.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. The table ─────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.holt_chat_summaries (
  id          uuid         primary key default gen_random_uuid(),
  athlete_id  uuid         not null default auth.uid() references auth.users(id) on delete cascade,
  summary     varchar(500) not null,
  created_at  timestamptz  not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'holt_chat_summaries_len') then
    alter table public.holt_chat_summaries
      add constraint holt_chat_summaries_len check (char_length(btrim(summary)) >= 10);
  end if;
end $$;

create index if not exists holt_chat_summaries_athlete_idx on public.holt_chat_summaries (athlete_id, created_at desc);

comment on table public.holt_chat_summaries is
  'Coach Holt''s memory of past chats (0218, Coach-AI-Amendment-002): a 2–3 line summary per conversation, the last 10 per athlete. Visible and deletable at /holt-memory. Written by coach-ask as the athlete; medical sentences dropped before storage.';

alter table public.holt_chat_summaries enable row level security;

drop policy if exists holt_chat_summaries_owner_select on public.holt_chat_summaries;
drop policy if exists holt_chat_summaries_owner_insert on public.holt_chat_summaries;
drop policy if exists holt_chat_summaries_owner_delete on public.holt_chat_summaries;
create policy holt_chat_summaries_owner_select on public.holt_chat_summaries for select
  using (athlete_id = auth.uid());
create policy holt_chat_summaries_owner_insert on public.holt_chat_summaries for insert
  with check (athlete_id = auth.uid());
create policy holt_chat_summaries_owner_delete on public.holt_chat_summaries for delete
  using (athlete_id = auth.uid());

revoke all on public.holt_chat_summaries from anon;
revoke update on public.holt_chat_summaries from authenticated;
grant select, insert, delete on public.holt_chat_summaries to authenticated;

-- ── 2. Keep the last ten ─────────────────────────────────────────────────────────────────────────────

create or replace function public.holt_chat_summaries_keep_ten()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  delete from public.holt_chat_summaries s
   where s.athlete_id = new.athlete_id
     and s.id not in (
       select k.id from public.holt_chat_summaries k
        where k.athlete_id = new.athlete_id
        order by k.created_at desc, k.id desc
        limit 10
     );
  return null;
end;
$$;

drop trigger if exists holt_chat_summaries_keep_ten on public.holt_chat_summaries;
create trigger holt_chat_summaries_keep_ten
  after insert on public.holt_chat_summaries
  for each row execute function public.holt_chat_summaries_keep_ten();

-- ── 3. The two actions ───────────────────────────────────────────────────────────────────────────────
--
-- Same merge order as 0174: the new keys are on the LEFT, so a weight hand-tuned since can never be
-- overwritten, and a second run is a no-op.

alter table public.coach_ai_config
  alter column action_credits set default
    '{"message": 1, "program": 1, "day": 1, "photo_read": 3, "photo_import": 2, "form_check": 6, "summary": 0, "web": 3}'::jsonb;

update public.coach_ai_config
   set action_credits = jsonb_build_object('summary', 0, 'web', 3) || action_credits,
       updated_at = now()
 where not (action_credits ? 'summary' and action_credits ? 'web');

comment on column public.coach_ai_config.action_credits is
  'Per-action credit weights. message/program/day 1 · photo_import 2 · photo_read 3 · web 3 · form_check 6 · summary 0. '
  'An action absent from this map raises 22023 in coach_ai_spend_credits rather than costing zero.';

commit;
