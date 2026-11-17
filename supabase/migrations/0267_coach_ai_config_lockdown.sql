-- 0267 — lock down the AI meter's config row (coach_ai_config)
--
-- Found by the AI audit 2026-11-16 (Docs/QA/AI-Audit-2026-11-16.md, P0-1), verified live the same day:
--   coach_ai_config is the ONLY public table with row-level security OFF, and Supabase's default grants
--   give anon + authenticated INSERT / UPDATE / DELETE / TRUNCATE on it. 0144 created it and enabled RLS
--   on coach_ai_period and coach_ai_spend only.
--
-- What one request with the public app key could do today:
--   · delete the row → coach_ai_spend_credits finds no config → every AI call answers 503 for every buyer;
--   · set metering_only = true or zero the weights → unlimited AI for every Premium AI account;
--   · rewrite the USD rates the /admin AI-cost page shows.
--
-- Why this breaks nothing:
--   every reader is SECURITY DEFINER and owned by postgres (admin_ai_usage, coach_ai_balance,
--   coach_ai_quote, coach_ai_record_usage, coach_ai_spend_credits). The table is owned by postgres and
--   does not FORCE row security, so those functions still read it. No client code reads the table
--   directly (grep of src/ and supabase/functions/ 2026-11-16: comments only). The PO's own SQL-editor
--   edits run as postgres and are unaffected.
--
-- No policy is added on purpose: with RLS on and no policy, anon/authenticated can neither read nor write.

alter table public.coach_ai_config enable row level security;

revoke all on table public.coach_ai_config from anon, authenticated;
