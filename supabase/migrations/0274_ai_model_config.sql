-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- 0274 — Which model each AI function runs, read at runtime: coach_ai_model_config + coach_ai_model_pick().
--
-- AI Road to 10 Sprint 3b, PL-7 (Docs/AI-Road-To-10-Plan-v1.0.md §2 "Model ID + rates move into config (read at
-- runtime), so one change can canary one function" — P-G6). Contract: Docs/AI-Sprint-3b-Build-Notes.md §1.2.
--
-- ══ WHAT IT ADDS ══
--
--   coach_ai_model_config   one row per AI function (its deployed slug, e.g. 'coach-author', or 'coach-ask:summary'
--                           for coach-ask's chat summaries): `model`, `effort`, and an optional canary —
--                           `canary_model` (+ `canary_effort`) for `canary` = 'operators' (the app_admins) or a
--                           percentage of athletes ('10%'). RLS on, NO policy, NO grant to anon or authenticated: only
--                           the service role reads it, and only `postgres` (the SQL editor) writes it.
--   coach_ai_model_pick()   (p_fn, p_uid) → the model + effort this athlete gets from that function, and whether it is
--                           the canary. Zero rows when the function has no config row. SECURITY INVOKER, EXECUTE for
--                           service_role only. The functions call it with the service key (src/domain/ai/
--                           model-config.ts), keep the answer 60 s, and run their IN-CODE DEFAULT on zero rows, an
--                           error, a slow read (1.5 s) or a model / effort the code does not know.
--
-- ⚠ NO ROWS ARE SEEDED, ON PURPOSE. No row = the function runs the default written in its own code — exactly what
--   runs today. A seeded row would silently override a later change to that default. A switch is a separate,
--   PO-pasted file (supabase/apply/switch-models-*.sql): step 1 canary to operators, step 2 everyone, and a revert
--   that deletes the row (= back to the code's default).
--
-- ⚠ The CHECK lists are the models and efforts src/domain/ai/model-request.ts can send without a 400
--   (`KNOWN_MODELS`, `EFFORTS`) — not Haiku 4.5, retired in Sprint 3b wherever it was selectable; src/domain/ai/__tests__/model-request.test.mjs fails when the two lists disagree.
--   A model outside them cannot be written, so a typo can never reach a function (and the function would ignore it
--   anyway — `default_invalid`).
--
-- ⚠ Who is in a canary: 'operators' = a row in app_admins for p_uid (the table is_app_admin() reads). 'N%' = a
--   stable hash of the athlete and the function: the same athlete stays in (or out) on every call, and two functions
--   canaried at 10% do not pick the same 10%. No athlete id (p_uid null) is never in a canary.
--
-- ⚠ Applying this changes nothing an athlete sees: with no rows, every function keeps its own default. The
--   functions that read it must also be DEPLOYED (coach-ask, coach-interpret, coach-author, coach-kitchen,
--   meal-photo-read, recipe-photo-read, program-photo-read); a function deployed before this is applied reads an
--   error and runs its default — never a dead function.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. THE TABLE
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.coach_ai_model_config (
  fn            text primary key,
  model         text not null,
  effort        text,
  canary_model  text,
  canary_effort text,
  canary        text,
  note          text,
  updated_at    timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_model_config_fn_check') then
    alter table public.coach_ai_model_config
      add constraint coach_ai_model_config_fn_check check (fn ~ '^[a-z][a-z0-9-]{1,40}(:[a-z][a-z0-9-]{1,20})?$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_model_config_model_check') then
    alter table public.coach_ai_model_config
      add constraint coach_ai_model_config_model_check
      check (model in ('claude-sonnet-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5', 'claude-opus-5'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_model_config_effort_check') then
    alter table public.coach_ai_model_config
      add constraint coach_ai_model_config_effort_check
      check (effort is null or effort in ('low', 'medium', 'high', 'xhigh', 'max'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_model_config_canary_model_check') then
    alter table public.coach_ai_model_config
      add constraint coach_ai_model_config_canary_model_check
      check (canary_model is null or canary_model in ('claude-sonnet-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5', 'claude-opus-5'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_model_config_canary_effort_check') then
    alter table public.coach_ai_model_config
      add constraint coach_ai_model_config_canary_effort_check
      check (canary_effort is null or canary_effort in ('low', 'medium', 'high', 'xhigh', 'max'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_model_config_canary_check') then
    alter table public.coach_ai_model_config
      add constraint coach_ai_model_config_canary_check
      check (canary is null or canary = 'operators' or canary ~ '^([1-9]?[0-9]|100)%$');
  end if;
  -- A canary is both halves or neither: who gets it AND what they get.
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_model_config_canary_pair_check') then
    alter table public.coach_ai_model_config
      add constraint coach_ai_model_config_canary_pair_check
      check ((canary is null) = (canary_model is null) and (canary_effort is null or canary_model is not null));
  end if;
end $$;

alter table public.coach_ai_model_config enable row level security;

-- Supabase's default privileges grant every new table to anon and authenticated DIRECTLY. Close both; the service
-- role keeps SELECT (it bypasses RLS, and the functions read with it). No one but postgres writes.
revoke all on table public.coach_ai_model_config from public, anon, authenticated, service_role;
grant select on table public.coach_ai_model_config to service_role;


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. THE READ — coach_ai_model_pick(p_fn, p_uid)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.coach_ai_model_pick(p_fn text, p_uid uuid)
returns table (model text, effort text, canary boolean)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_row  public.coach_ai_model_config%rowtype;
  v_in   boolean := false;
  v_pct  integer;
begin
  select c.* into v_row from public.coach_ai_model_config c where c.fn = p_fn;
  if not found then
    return;  -- zero rows: the function runs its in-code default
  end if;

  if v_row.canary_model is not null and v_row.canary is not null and p_uid is not null then
    if v_row.canary = 'operators' then
      v_in := exists (select 1 from public.app_admins a where a.user_id = p_uid);
    else
      v_pct := rtrim(v_row.canary, '%')::integer;
      -- hashtext is int4 and can be negative; bring it into 0..99 without abs() (abs(min int) overflows).
      v_in := ((hashtext(p_uid::text || ':' || p_fn)::bigint % 100) + 100) % 100 < v_pct;
    end if;
  end if;

  return query
    select case when v_in then v_row.canary_model else v_row.model end,
           case when v_in then coalesce(v_row.canary_effort, v_row.effort) else v_row.effort end,
           v_in;
end;
$$;

-- Supabase grants EXECUTE on every new function to anon AND authenticated directly: close both, and PUBLIC.
revoke all on function public.coach_ai_model_pick(text, uuid) from public, anon, authenticated;
grant execute on function public.coach_ai_model_pick(text, uuid) to service_role;
