-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- VERIFY — 0182: one result set, because the SQL editor shows only the last one
--
-- pending-0182.sql ends in THREE selects, so the editor displays the row counts and swallows the
-- other two. This returns all of it as a single table. Read-only; safe to run any number of times.
--
-- ⚠ EXPECTED, every row: verdict = 'OK'. Anything else is the finding.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

with expected_fns(name) as (
  values ('is_trainer'), ('trainer_guard'), ('trainer_client_guard'),
         ('trainer_invite_client'), ('athlete_respond_to_coach'),
         ('athlete_revoke_coach'), ('trainer_end_client'), ('trainer_withdraw_invite')
),
fns as (
  select e.name,
         p.oid is not null            as present,
         coalesce(p.prosecdef, false) as definer
  from expected_fns e
  left join pg_proc p
         on p.proname = e.name
        and p.pronamespace = 'public'::regnamespace
),
pol as (
  select c.relname as tbl,
         c.relrowsecurity as rls,
         (select count(*) from pg_policies pp
           where pp.schemaname = 'public' and pp.tablename = c.relname) as total,
         (select count(*) from pg_policies pp
           where pp.schemaname = 'public' and pp.tablename = c.relname and pp.cmd <> 'SELECT') as writes
  from pg_class c
  where c.relnamespace = 'public'::regnamespace
    and c.relname in ('trainers', 'trainer_clients')
)
select 'function' as kind,
       f.name     as thing,
       case when f.present and f.definer then 'OK'
            when not f.present          then 'MISSING'
            else                             'NOT SECURITY DEFINER' end as verdict
from fns f

union all
select 'rls', p.tbl,
       case when p.rls then 'OK' else 'RLS IS OFF' end
from pol p

union all
-- The seat register must stay unenumerable: zero policies, exactly as app_admins in 0129.
select 'policies', 'trainers (expect 0)',
       case when p.total = 0 then 'OK' else 'HAS ' || p.total || ' POLICIES' end
from pol p where p.tbl = 'trainers'

union all
-- Consent may be READ by either party and written by nobody.
select 'policies', 'trainer_clients (expect 1 select, 0 write)',
       case when p.total = 1 and p.writes = 0 then 'OK'
            else p.total || ' policies, ' || p.writes || ' of them writes' end
from pol p where p.tbl = 'trainer_clients'

union all
select 'index', i.relname,
       case when i.oid is not null then 'OK' else 'MISSING' end
from (values ('trainer_clients_one_active_coach'), ('trainer_clients_one_live_pair')) v(n)
left join pg_class i on i.relname = v.n and i.relnamespace = 'public'::regnamespace

union all
select 'constraint', 'trainer_clients_not_self',
       case when exists (select 1 from pg_constraint where conname = 'trainer_clients_not_self')
            then 'OK' else 'MISSING' end

union all
select 'rows', 'trainers / trainer_clients (expect 0 / 0)',
       case when (select count(*) from public.trainers) = 0
             and (select count(*) from public.trainer_clients) = 0
            then 'OK'
            else (select count(*) from public.trainers) || ' / '
                 || (select count(*) from public.trainer_clients) end

order by 1, 2;
