-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- 0276 · ONE ASK = ONE CREDIT, FROM HOLT'S CHAT: a typed build that Holt's chat (coach-ask) opened is written by
--        coach-author at no extra credit — as one coach-interpret opened always has been.
--        AI Road to 10, Sprint 4a — CH-3 (lane A). Contract: Docs/AI-Sprint-4a-Build-Notes.md §1.4.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHY ══
--
-- PO 2026-11-18: coach-interpret is retired from the new app — everything typed goes to Holt's chat (coach-ask), and a
-- build request comes back as a `propose_program` / `propose_day` action. The device's builder then writes the program
-- through coach-author, exactly as before. 0272's waiver (`typed_build`) lets that write ride ONLY on a paid
-- coach-INTERPRET turn, so without this file a build typed into the new app would cost two credits (the chat turn + the
-- write) where the same build on an old phone costs one.
--
-- ══ WHAT THIS DOES ══
--
--   1. coach_ai_reservation.opened_build boolean not null default false — this reservation's turn forwarded a build.
--   2. coach_ai_mark_build(p_reservation uuid) → boolean — sets it. ⛔ SERVICE ROLE ONLY: revoked from public, anon AND
--      authenticated (Supabase grants new functions to anon + authenticated directly), granted to service_role.
--      SECURITY INVOKER: the service role's own UPDATE grant is what writes. It marks only a coach-ask reservation that
--      is settled, kept (not refunded) and paid (credits > 0). coach-ask calls it after the settle and before its
--      `done` line, only when the turn forwarded propose_program / propose_day. An athlete cannot call it, so a chat
--      can never be made into a free build by the athlete.
--   3. coach_ai_reserve — ONE clause, spliced into the LIVE source (never retyped): the paid turn a `typed_build` may
--      ride on is coach-interpret's (as today) OR coach-ask's when `opened_build`. Plus its one comment line. Everything
--      else — the 30-minute window, the newest-turn lock, "not ridden on yet", the soft floor, the meter — is untouched.
--      The splice runs only on the exact source read on 2026-11-18 (md5 fe40ac392de7992efd0919eae8ca13ff, = 0272's);
--      any drift RAISES instead of guessing. Already spliced → skipped (safe to run twice).
--
-- ══ ⚠ SAFE FOR EVERY DEPLOYED FUNCTION AND EVERY INSTALLED PHONE ══
--
--   · coach_ai_reserve keeps its signature, return columns, reasons, SECURITY DEFINER, search_path and grants (create or
--     replace keeps the ACL). A coach-interpret turn rides exactly as before (old phones).
--   · A chat that opened nothing never makes a later build free: only a marked reservation rides, and only the deployed
--     4a coach-ask marks one. Until that coach-ask is deployed, no row is ever marked and nothing behaves differently.
--   · coach-ask before this file is pasted: its mark call fails quietly (no such RPC) — the build pays its own credit,
--     as today. No client reads the new column.
--
-- ══ UNDO ══
--   Re-run 0272's coach_ai_reserve from supabase/apply/pending-0272.sql §1 ONLY IF nothing after 0272 changed it (check
--   md5 first), then: drop function if exists public.coach_ai_mark_build(uuid);
--   alter table public.coach_ai_reservation drop column if exists opened_build;
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

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
