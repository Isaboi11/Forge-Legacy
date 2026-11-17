-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0267: lock down the AI meter's config row (coach_ai_config)  ⛔ SECURITY, apply first
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: enabling RLS and revoking are both idempotent, and §3 is read-only.
-- The editor shows only the LAST result — that is §3.
--
-- Independent of the other pending bundles (0262, 0266): it touches none of their objects.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- AI audit 2026-11-16 (Docs/QA/AI-Audit-2026-11-16.md, P0-1), verified live the same day:
-- coach_ai_config — the one row that sets every AI credit weight, the 150-credit allowance and
-- metering_only — is the ONLY public table with row-level security OFF, and anon + authenticated hold
-- INSERT / UPDATE / DELETE / TRUNCATE on it. Anyone holding the public app key could:
--   · delete the row → every AI call answers 503 for every buyer;
--   · set metering_only = true or zero the weights → unlimited AI on every Premium AI account;
--   · rewrite the USD rates the /admin AI-cost page shows.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  turns RLS on for coach_ai_config and revokes every privilege from anon and authenticated.
--     No policy is added: nobody but the owner (postgres) can read or write the table directly.
-- §2  RAISES if RLS is still off or anon/authenticated still hold any privilege on the table.
-- §3  one row: RLS state, what anon/authenticated still hold (should be nothing), and the live config
--     values, so you can see the meter's settings came through untouched.
--
-- ⚠ Nothing in the app reads this table directly. Every reader is a SECURITY DEFINER function owned by
--   postgres (coach_ai_spend_credits, coach_ai_quote, coach_ai_balance, coach_ai_record_usage,
--   admin_ai_usage), and the table does not FORCE row security, so they keep working. AI keeps working.
-- ⚠ After applying: open Holt chat on a Premium AI account and send one message (1 credit) to see
--   the meter still answers. That is the "someone saw it work" step.
--
-- ══ PREDICTED §3 (2026-11-16) ══
--   rls_on = true · anon_privileges = (none) · authenticated_privileges = (none) · config_rows = 1 ·
--   credits_per_period = 150 · metering_only = false · meal_photo_credits = 1
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0267_coach_ai_config_lockdown.sql)
-- ───────────────────────────────────────────────────────────────────────────────────────────────

alter table public.coach_ai_config enable row level security;

revoke all on table public.coach_ai_config from anon, authenticated;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — THE ASSERTION (raises if §1 did not land)
-- ───────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_rls boolean;
  v_left text;
begin
  select c.relrowsecurity into v_rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'coach_ai_config';

  if v_rls is distinct from true then
    raise exception '0267: row-level security is still OFF on public.coach_ai_config';
  end if;

  select string_agg(grantee || ':' || privilege_type, ', ' order by grantee, privilege_type) into v_left
    from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'coach_ai_config'
     and grantee in ('anon', 'authenticated');

  if v_left is not null then
    raise exception '0267: anon/authenticated still hold privileges on coach_ai_config: %', v_left;
  end if;
end $$;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — THE REPORT (read-only)
-- ───────────────────────────────────────────────────────────────────────────────────────────────

select
  (select c.relrowsecurity
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'coach_ai_config')                         as rls_on,
  coalesce((select string_agg(privilege_type, ', ' order by privilege_type)
              from information_schema.role_table_grants
             where table_schema = 'public' and table_name = 'coach_ai_config'
               and grantee = 'anon'), '(none)')                                          as anon_privileges,
  coalesce((select string_agg(privilege_type, ', ' order by privilege_type)
              from information_schema.role_table_grants
             where table_schema = 'public' and table_name = 'coach_ai_config'
               and grantee = 'authenticated'), '(none)')                                 as authenticated_privileges,
  (select count(*) from public.coach_ai_config)                                          as config_rows,
  (select credits_per_period from public.coach_ai_config where id)                       as credits_per_period,
  (select metering_only from public.coach_ai_config where id)                            as metering_only,
  (select action_credits ->> 'meal_photo' from public.coach_ai_config where id)          as meal_photo_credits;
