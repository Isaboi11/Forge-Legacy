-- Forge Legacy — 0151: "training today" counts people who TRAINED, on Discover and Preview too
--
-- ⚠ WAS 0150, RENUMBERED. Two concurrent sessions both took 0150 on 2026-08-12 — the other being
--   `0150_restore_evaluate_honors_grant.sql`, which was applied first. Numbering is this project's whole
--   dependency graph and there is no history table to arbitrate, so the unapplied one moves. Recorded
--   because a renumbered migration that says nothing about why is the next reader's confusion.
--
-- ══ THE DEFECT, AND IT IS 0108's DEFECT AGAIN ══
--
-- `0108_squad_trained_today.sql` opens with this:
--
--     The Squads hub card reads, in the largest type on it:  "1 / 4  trained today"
--     and the number counts rows in `squad_checkins` — a posted VIDEO check-in from the last 24 hours.
--     A squadmate who trained, logged every set, and finished the session moves it by nothing at all.
--     Reported the way defects like this always surface: "someone in the squad worked out and it didn't
--     update on the squad card."
--
-- It fixed that with `squad_trained_since()` — a workout **or** a check-in — and the Squads hub and Squad
-- Detail adopted it (`squad-live.ts:150`, `:248`).
--
-- **`discover_squads()` and `squad_preview()` never did.** Both still carry the pre-0108 expression,
-- `count(distinct c.user_id) from squad_checkins … 24 hours`, so a public squad where twelve of twenty
-- members trained and logged every set today reads **0 training today** — on the two screens a stranger
-- uses to decide whether a squad is alive, which is the one place that number has to be right.
--
-- Found by the 2026-08-12 launch audit. It is the fifth instance of the pattern that audit names as the
-- root cause of most of its findings: a correct fix landed at one call site while its siblings were
-- missed — and here the migration that made the fix wrote down the reasoning that would have found them.
--
-- ══ WHAT CHANGES ══
--
-- Both functions now call `squad_trained_since()` rather than re-implementing a count next to it. That is
-- the point: a second expression for "did this squad train" is a second thing to disagree with the first,
-- which is exactly how these two drifted from the hub in the first place.
--
-- ⚠ AND THE WINDOW CHANGES WITH IT. The inline expressions used `now() - interval '24 hours'`; the hub
--   passes `localMidnight()` from the client (`squad-live.ts:150`). Those are different questions — "in
--   the last day" versus "today" — and the label says *today*. A rolling 24 hours means a session logged
--   at 11pm yesterday still counts at 10pm today, which is not what "trained today" claims.
--
--   These two functions take no client clock, so they use the squad's own day boundary in UTC. It is the
--   honest reading available server-side and it matches the label; the hub stays more precise because it
--   can be. Recorded rather than smoothed over, because a reader comparing Discover to the hub may see
--   them differ by one around a midnight, and that is the reason.
--
-- Idempotent. Depends on 0053 (discover_squads), 0055 (squad_preview), 0108 (squad_trained_since).
-- RUN ANY TIME.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · discover_squads() — the browse shelf
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_src text;
  v_new text;
begin
  select pg_get_functiondef(p.oid) into v_src
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'discover_squads';

  if v_src is null then
    raise exception '0151: discover_squads() not found — apply 0053 first';
  end if;

  /*
   * ⚠ REWRITTEN FROM THE LIVE BODY, NOT FROM A COPY OF 0053.
   *
   * This project has three recorded ways a function rebuild goes wrong, and the worst is splicing an
   * older body forward: 0134 rebuilt `shared_workout_detail` from 0117 and silently dropped the
   * `duration_sec` key 0127 had added, regressing the timed-set fix. `discover_squads` has been touched
   * by 0053 and may have been touched since. So the body is read from the CATALOGUE and only the one
   * expression is replaced — anything else that has landed in it since travels along untouched.
   */
  v_new := replace(
    v_src,
    '(select count(distinct c.user_id)::int
       from public.squad_checkins c
      where c.squad_id = s.id and c.created_at >= now() - interval ''24 hours'')',
    'public.squad_trained_since(s.id, date_trunc(''day'', now()))'
  );

  if v_new = v_src then
    raise exception '0151: the pre-0108 check-in expression was not found in discover_squads() — it may already be fixed, or its body has changed. Inspect it by hand rather than guessing: select pg_get_functiondef(''public.discover_squads''::regproc);';
  end if;

  execute v_new;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · squad_preview() — the stranger's first look at one squad
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_src text;
  v_new text;
begin
  select pg_get_functiondef(p.oid) into v_src
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'squad_preview';

  if v_src is null then
    raise exception '0151: squad_preview() not found — apply 0055 first';
  end if;

  v_new := replace(
    v_src,
    'select count(distinct c.user_id)::int into v_today
    from public.squad_checkins c
   where c.squad_id = p_squad and c.created_at >= now() - interval ''24 hours'';',
    'v_today := public.squad_trained_since(p_squad, date_trunc(''day'', now()));'
  );

  if v_new = v_src then
    raise exception '0151: the pre-0108 check-in expression was not found in squad_preview() — it may already be fixed, or its body has changed. Inspect it by hand: select pg_get_functiondef(''public.squad_preview''::regproc);';
  end if;

  execute v_new;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify — returns ROWS. Both must read true.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Asserts the FIX is present and the DEFECT is gone. Checking only for the first would pass on a body
-- that calls the helper and still carries the old count beside it.

select
  (pg_get_functiondef('public.discover_squads'::regproc) like '%squad_trained_since%'
   and pg_get_functiondef('public.discover_squads'::regproc) not like '%interval ''24 hours''%')
                                                                       as discover_fixed_expect_true,
  (pg_get_functiondef('public.squad_preview'::regproc) like '%squad_trained_since%'
   and pg_get_functiondef('public.squad_preview'::regproc) not like '%interval ''24 hours''%')
                                                                       as preview_fixed_expect_true;
