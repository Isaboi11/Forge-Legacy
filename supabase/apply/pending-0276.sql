-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0276: a build Holt's chat opened is ONE credit (AI Road to 10 Sprint 4a, CH-3 — lane A)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: the column is `if not exists`, the mark function is create-or-replace, and the coach_ai_reserve
-- splice skips itself once done; §2 asserts, §3 is read-only. The editor shows only the LAST result — that is §3.
--
-- Apply order for Sprint 4a: 0276 → 0277 (lane B's, if it exists). 0276 depends on 0272 (coach_ai_reserve's waiver).
-- Paste it BEFORE deploying the 4a coach-ask (that coach-ask works without it — its build mark just fails quietly and
-- the build pays its own credit — but with it, the first typed build on the new app is already one credit).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- The new app sends every typed line to Holt's chat (coach-ask); a build comes back as a `propose_program` /
-- `propose_day` card and the device's builder writes it through coach-author. 0272 lets that write ride on a paid
-- coach-INTERPRET turn only (`typed_build`). This lets it also ride on a paid coach-ASK turn that OPENED A BUILD.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  · coach_ai_reservation.opened_build (boolean, not null, default false).
--     · coach_ai_mark_build(uuid) → boolean — SERVICE ROLE ONLY (revoked from public, anon, authenticated), security
--       invoker; marks a settled, kept, paid coach-ask reservation. coach-ask calls it after its settle.
--     · coach_ai_reserve — ONE clause + its comment line, spliced into the LIVE source by replace(), never retyped,
--       and only if the live source is the one read on 2026-11-18 (md5 fe40ac392de7992efd0919eae8ca13ff); the result's
--       md5 is checked (b25d0243e98cefa56e27f04f5e27b981) before it is executed. Drift RAISES; nothing changes.
-- §2  asserts the column, the function, its grants (anon/authenticated NO, service_role YES, invoker), the splice, the
--     reserve's definer + grant, and that the rest of the waiver (window, lock, photo_tidy, floor) is still there.
-- §3  one row.
--
-- ⚠ OLD PHONES ARE UNAFFECTED: their coach-interpret → coach-author path rides exactly as before. Nothing reads the new
--   column but coach_ai_reserve. Until the 4a coach-ask is deployed, no reservation is ever marked.
--
-- ══ PREDICTED §3 (2026-11-18) ══
--   reserve_md5 = b25d0243e98cefa56e27f04f5e27b981 · rides_on_marked_chat = true · reserve_definer = true ·
--   app_can_reserve = true · anon_can_mark = false · authenticated_can_mark = false · service_role_can_mark = true ·
--   marked_reservations = 0 · typed_build_rides = 0 (11-18; it counts old phones' interpret → author rides, so any
--   number ≥ 0 is right at paste time — it is not touched here).
--   marked_reservations is 0 because the coach-ask that marks is committed, not deployed: a non-zero count right after
--   the paste means something else is writing the column.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0276_typed_build_rides_on_holts_chat.sql)
-- ───────────────────────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. The mark ────────────────────────────────────────────────────────────────────────────────────
alter table public.coach_ai_reservation add column if not exists opened_build boolean not null default false;

comment on column public.coach_ai_reservation.opened_build is
  'True when this coach-ask turn forwarded a build (propose_program / propose_day) — set by coach-ask with the service role (coach_ai_mark_build, 0276). coach_ai_reserve lets the build''s coach-author write ride on it (typed_build).';

-- ── 2. Who may set it: the service role, nobody else ──────────────────────────────────────────────
create or replace function public.coach_ai_mark_build(p_reservation uuid)
returns boolean
language sql
security invoker
set search_path = public, pg_temp
as $$
  with marked as (
    update public.coach_ai_reservation r
       set opened_build = true
     where r.id = p_reservation
       and r.fn = 'coach-ask'
       and r.credits > 0
       and r.settled_at is not null
       and not r.refunded
    returning r.id
  )
  select exists (select 1 from marked);
$$;

comment on function public.coach_ai_mark_build(uuid) is
  '0276: coach-ask (service role only) marks its own paid, kept reservation as having opened a build, so the build''s coach-author write rides on it (coach_ai_reserve typed_build). Never callable by an athlete.';

revoke execute on function public.coach_ai_mark_build(uuid) from public, anon, authenticated;
grant execute on function public.coach_ai_mark_build(uuid) to service_role;

-- ── 3. coach_ai_reserve: the one clause, spliced into the LIVE source ─────────────────────────────
do $mig0276$
declare
  v_src   text := pg_get_functiondef('public.coach_ai_reserve(text,text)'::regprocedure);
  v_old   text := $o$       and (   (v_waiver = 'typed_build' and r.fn = 'coach-interpret')$o$;
  v_new   text := $n$       and (   (v_waiver = 'typed_build' and (r.fn = 'coach-interpret' or (r.fn = 'coach-ask' and r.opened_build)))$n$;
  v_cold  text := $c$  --     · coach-author's write after the paid coach-interpret turn that opened it (a typed build is ONE credit);$c$;
  v_cnew  text := $d$  --     · coach-author's write after the paid coach-interpret turn — or (0276) the paid coach-ask turn marked opened_build — that opened it (a typed build is ONE credit);$d$;
  v_out   text;
begin
  if position(v_new in v_src) > 0 then
    raise notice '0276: coach_ai_reserve already rides on a marked coach-ask turn — left as it is';
    return;
  end if;
  if md5(v_src) <> 'fe40ac392de7992efd0919eae8ca13ff' then
    raise exception '0276: coach_ai_reserve is not the source read on 2026-11-18 (md5 %) — re-read it and re-splice; nothing changed', md5(v_src);
  end if;
  if (length(v_src) - length(replace(v_src, v_old, ''))) / length(v_old) <> 1
     or (length(v_src) - length(replace(v_src, v_cold, ''))) / length(v_cold) <> 1 then
    raise exception '0276: the clause or its comment is not in coach_ai_reserve exactly once — nothing changed';
  end if;
  v_out := replace(replace(v_src, v_old, v_new), v_cold, v_cnew);
  if md5(v_out) <> 'b25d0243e98cefa56e27f04f5e27b981' then
    raise exception '0276: the spliced coach_ai_reserve is not the one predicted (md5 %) — nothing changed', md5(v_out);
  end if;
  execute v_out;
end;
$mig0276$;

commit;

-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ───────────────────────────────────────────────────────────────────────────────────────────────

do $chk0276$
declare
  v_src text := pg_get_functiondef('public.coach_ai_reserve(text,text)'::regprocedure);
begin
  if not exists (
    select 1 from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = 'coach_ai_reservation' and c.column_name = 'opened_build'
       and c.data_type = 'boolean' and c.is_nullable = 'NO'
  ) then
    raise exception '0276 §2: coach_ai_reservation.opened_build is missing (or nullable)';
  end if;
  if to_regprocedure('public.coach_ai_mark_build(uuid)') is null then
    raise exception '0276 §2: coach_ai_mark_build(uuid) is missing';
  end if;
  if has_function_privilege('anon', 'public.coach_ai_mark_build(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.coach_ai_mark_build(uuid)', 'execute') then
    raise exception '0276 §2: coach_ai_mark_build is callable from the app (anon or authenticated) — it must be service role only';
  end if;
  if not has_function_privilege('service_role', 'public.coach_ai_mark_build(uuid)', 'execute') then
    raise exception '0276 §2: the service role cannot call coach_ai_mark_build — coach-ask could never mark a build';
  end if;
  if (select p.prosecdef from pg_proc p where p.oid = 'public.coach_ai_mark_build(uuid)'::regprocedure) then
    raise exception '0276 §2: coach_ai_mark_build must be SECURITY INVOKER';
  end if;
  if position($n$(r.fn = 'coach-interpret' or (r.fn = 'coach-ask' and r.opened_build))$n$ in v_src) = 0 then
    raise exception '0276 §2: coach_ai_reserve does not let a typed build ride on a marked coach-ask turn';
  end if;
  if md5(v_src) <> 'b25d0243e98cefa56e27f04f5e27b981' then
    raise exception '0276 §2: coach_ai_reserve is not the spliced source predicted (md5 %)', md5(v_src);
  end if;
  if not (select p.prosecdef from pg_proc p where p.oid = 'public.coach_ai_reserve(text,text)'::regprocedure) then
    raise exception '0276 §2: coach_ai_reserve lost SECURITY DEFINER';
  end if;
  if not has_function_privilege('authenticated', 'public.coach_ai_reserve(text,text)', 'execute') then
    raise exception '0276 §2: the app can no longer call coach_ai_reserve';
  end if;
  -- The rest of the waiver, untouched (0272): the window, the newest-turn lock, the tidy waiver, the floor.
  if position($w$r.reserved_at > now() - interval '30 minutes'$w$ in v_src) = 0
     or position('for update' in v_src) = 0
     or position($w$(v_waiver = 'photo_tidy' and r.fn in ('workout-card-read', 'program-photo-read') and r.action = 'photo_import')$w$ in v_src) = 0
     or position('floor_actions' in v_src) = 0 then
    raise exception '0276 §2: something else in coach_ai_reserve changed';
  end if;
  raise notice '0276 OK: a build Holt''s chat opened rides on that turn; only the service role can mark one.';
end;
$chk0276$;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — THE REPORT (read-only). One row. Compare it with PREDICTED §3 in the header.
-- ───────────────────────────────────────────────────────────────────────────────────────────────

select
  md5(pg_get_functiondef('public.coach_ai_reserve(text,text)'::regprocedure))                                         as reserve_md5,
  position($n$(r.fn = 'coach-ask' and r.opened_build)$n$ in pg_get_functiondef('public.coach_ai_reserve(text,text)'::regprocedure)) > 0
                                                                                                                       as rides_on_marked_chat,
  (select p.prosecdef from pg_proc p where p.oid = 'public.coach_ai_reserve(text,text)'::regprocedure)                as reserve_definer,
  has_function_privilege('authenticated', 'public.coach_ai_reserve(text,text)', 'execute')                            as app_can_reserve,
  has_function_privilege('anon', 'public.coach_ai_mark_build(uuid)', 'execute')                                       as anon_can_mark,
  has_function_privilege('authenticated', 'public.coach_ai_mark_build(uuid)', 'execute')                              as authenticated_can_mark,
  has_function_privilege('service_role', 'public.coach_ai_mark_build(uuid)', 'execute')                               as service_role_can_mark,
  (select count(*) from public.coach_ai_reservation r where r.opened_build)                                           as marked_reservations,
  (select count(*) from public.coach_ai_reservation r where r.waiver = 'typed_build')                                 as typed_build_rides;
