-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- 0222 · HOLT'S KITCHEN — the 'kitchen' metered action (2 credits) and his 30-day dish memory
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- `Docs/Holt-Kitchen-Scope-v1.0.md` (LOCKED 2026-09-24) · PO 2026-09-25: "Holt invents dishes from your
-- ingredients" — yes. The new `coach-kitchen` Edge Function writes three dishes from what the athlete has; the
-- app computes every number from its own catalogue (NUT-D4).
--
-- ══ 1. ONE NEW ACTION IN coach_ai_config.action_credits ══
--
--   · 'kitchen' = 2. Structured output of three whole dishes (~1,000–2,000 output tokens, Kitchen Scope §6
--     "≈ 1–2¢ per ask"): above a message (1), below a vision read (3).
--   · It goes through `coach_ai_spend_credits`, which is what refuses anyone without Premium AI (0203).
--   An action absent from the map raises 22023 in `coach_ai_spend_credits`, so this MUST be applied before
--   `coach-kitchen` is deployed — or every ask answers "the kitchen's not working".
--   Same merge order as 0174/0218/0220: the new key on the LEFT, so a hand-tuned weight is never overwritten.
--
-- ══ 2. kitchen_suggestions — Kitchen Scope §2 "kitchen memory" ══
--
--   Every dish shown is remembered per athlete (name, cuisine, method) and the last 30 days are sent back as
--   "already suggested, do not repeat". Owner-only, like every nutrition table (P6-A2-D1); cascades on account
--   deletion. Nothing about the athlete's body or intake is stored — only dish names.
--
-- Safe to run twice.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

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
