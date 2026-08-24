-- Forge Legacy — clear the two-account roundtrip's stranded competitions.
--
-- Generated 2026-08-24 by `supabase/seed/qa-residue.mjs`. Read-only elsewhere; this is the one write.
--
-- ══ WHY THE APP COULD NOT DO THIS ITSELF ══
--
-- `challenges` has select / insert / update policies (0059) and NO DELETE POLICY. An athlete's own
-- session therefore issues a delete that matches zero rows and RESOLVES WITHOUT AN ERROR — it reports
-- success and removes nothing. A SQUAD competition still vanishes, because it cascades when its squad is
-- deleted; a FRIENDS competition has no squad to cascade from, so it survives in both athletes' history.
-- All six below are FRIENDS competitions, which is exactly that asymmetry.
--
-- `cancel_challenge` is not an alternative: it refuses any terminal state (CS-D14 — a closed season's
-- standings are immutable), and all six are COMPLETED.
--
-- ⚠ NAMED IDS ONLY. `February Volume` — the reviewer's seeded competition, which Apple is meant to see —
-- and every real competition are untouched. Do not broaden this to a name pattern or a date range.
--
-- Safe to re-run: a second run deletes nothing.

begin;
  delete from public.challenge_results      where challenge_id in (
    'c1cbdab0-910a-4728-9906-54c466b96870',
    '30c89f0f-7151-408f-8378-504bbafd205b',
    '9e8de2a4-30be-4203-a4cd-8d3b73c76da4',
    'dc6a842e-0d6f-4268-af4f-1192bcfd2b23',
    '0a762d5c-dd91-414a-90f3-17419c17efcd',
    'e3b9c6bd-cca5-4d05-bb52-0ff979b132f8'
  );
  delete from public.challenge_participants where challenge_id in (
    'c1cbdab0-910a-4728-9906-54c466b96870',
    '30c89f0f-7151-408f-8378-504bbafd205b',
    '9e8de2a4-30be-4203-a4cd-8d3b73c76da4',
    'dc6a842e-0d6f-4268-af4f-1192bcfd2b23',
    '0a762d5c-dd91-414a-90f3-17419c17efcd',
    'e3b9c6bd-cca5-4d05-bb52-0ff979b132f8'
  );
  delete from public.challenges             where id in (
    'c1cbdab0-910a-4728-9906-54c466b96870',
    '30c89f0f-7151-408f-8378-504bbafd205b',
    '9e8de2a4-30be-4203-a4cd-8d3b73c76da4',
    'dc6a842e-0d6f-4268-af4f-1192bcfd2b23',
    '0a762d5c-dd91-414a-90f3-17419c17efcd',
    'e3b9c6bd-cca5-4d05-bb52-0ff979b132f8'
  );
commit;
