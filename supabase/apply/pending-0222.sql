-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- PASTE BUNDLE · 0222 · Holt's Kitchen — 'kitchen' credits + kitchen_suggestions
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- Paste the WHOLE file into the Supabase SQL editor and run it once. Safe to run twice (every statement is
-- guarded: `if not exists`, `drop policy if exists`, the new jsonb key merged on the LEFT).
--
-- ⚠ ORDER: apply THIS before deploying the `coach-kitchen` Edge Function. Without the 'kitchen' key,
--   `coach_ai_spend_credits` raises 22023 and every "What can I make?" answers "the kitchen's not working".
--
-- §1  adds 'kitchen' = 2 to coach_ai_config.action_credits; creates `kitchen_suggestions` (owner-only RLS).
-- §2  asserts both landed, and RAISES if not.
-- §3  reports what landed. Read-only.
--
-- ⚠ PREDICTED §3 (before the new app is published): kitchen_weight 2 · rls true · policies 3 ·
--   kitchen_suggestions rows 0 (no published client writes it yet; a non-zero count means something else is).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

-- ═══ §1 — THE STATEMENTS (verbatim from supabase/migrations/0222_holt_kitchen.sql) ═══

begin;

alter table public.coach_ai_config
  alter column action_credits set default
    '{"message": 1, "program": 1, "day": 1, "photo_read": 3, "photo_import": 2, "form_check": 6, "summary": 0, "web": 3, "recipe_photo": 3, "kitchen": 2}'::jsonb;

update public.coach_ai_config
   set action_credits = jsonb_build_object('kitchen', 2) || action_credits,
       updated_at = now()
 where not (action_credits ? 'kitchen');

comment on column public.coach_ai_config.action_credits is
  'Per-action credit weights. message/program/day 1 · photo_import 2 · kitchen 2 · photo_read 3 · web 3 · recipe_photo 3 · form_check 6 · summary 0. '
  'An action absent from this map raises 22023 in coach_ai_spend_credits rather than costing zero.';

create table if not exists public.kitchen_suggestions (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  cuisine     text check (cuisine is null or char_length(cuisine) <= 30),
  method      text check (method is null or char_length(method) <= 20),
  created_at  timestamptz not null default now()
);

create index if not exists kitchen_suggestions_recent_idx
  on public.kitchen_suggestions (athlete_id, created_at desc);

alter table public.kitchen_suggestions enable row level security;

drop policy if exists "kitchen_suggestions_own_select" on public.kitchen_suggestions;
create policy "kitchen_suggestions_own_select" on public.kitchen_suggestions
  for select to authenticated using (athlete_id = auth.uid());

drop policy if exists "kitchen_suggestions_own_insert" on public.kitchen_suggestions;
create policy "kitchen_suggestions_own_insert" on public.kitchen_suggestions
  for insert to authenticated with check (athlete_id = auth.uid());

drop policy if exists "kitchen_suggestions_own_delete" on public.kitchen_suggestions;
create policy "kitchen_suggestions_own_delete" on public.kitchen_suggestions
  for delete to authenticated using (athlete_id = auth.uid());

grant select, insert, delete on public.kitchen_suggestions to authenticated;

commit;

-- ═══ §2 — ASSERT IT LANDED ═══

do $$
begin
  if not exists (select 1 from public.coach_ai_config where (action_credits ->> 'kitchen')::int = 2) then
    raise exception '0222: coach_ai_config.action_credits has no kitchen = 2';
  end if;
  if not exists (select 1 from pg_class where relname = 'kitchen_suggestions' and relrowsecurity) then
    raise exception '0222: kitchen_suggestions missing or RLS off';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'kitchen_suggestions'
        and policyname in ('kitchen_suggestions_own_select','kitchen_suggestions_own_insert','kitchen_suggestions_own_delete')) <> 3 then
    raise exception '0222: kitchen_suggestions policies incomplete';
  end if;
end $$;

-- ═══ §3 — REPORT (read-only) ═══

select
  (select (action_credits ->> 'kitchen')::int from public.coach_ai_config limit 1)                       as kitchen_weight,
  (select relrowsecurity from pg_class where relname = 'kitchen_suggestions')                           as rls,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'kitchen_suggestions')  as policies,
  (select count(*) from public.kitchen_suggestions)                                                     as kitchen_suggestions_rows;
