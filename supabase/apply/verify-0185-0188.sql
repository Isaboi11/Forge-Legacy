-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- VERIFY 0185 · 0186 · 0187 · 0188 — which of the four are actually applied?
--
-- Read-only. Nothing here writes. Paste the whole file, run it, send back the rows.
--
-- ══ WHY THIS EXISTS ══
--
-- PO: no push when a squad-mate starts a workout, and a squad-mate who IS training does not appear on
-- Live Now / Your Circle. `0188`'s own header documents both symptoms and says they are the shipped
-- defaults rather than defects — but `0188` also says "0185 and 0186 are still awaiting paste", which
-- means the tail of the ledger was queued and left. Nothing in the repo records what the DATABASE has.
--
-- ⚠ ONE QUERY, ON PURPOSE. The Supabase SQL editor shows only the LAST statement's output, so a
-- multi-statement verifier hides all but its final answer. `verify-0187.sql` learned that already; this
-- keeps the same shape — every answer arrives as a row of one result set.
--
-- ══ HOW TO READ IT ══
--
--   verdict = APPLIED      the schema carries it. Nothing to do.
--   verdict = NOT APPLIED  paste `supabase/apply/pending-<n>.sql`.
--   verdict = PARTIAL      some of it landed. Re-paste the bundle — every one is idempotent.
--
-- ⚠ "APPLIED" IS NOT "WORKING". A migration is done when the SQL is applied, the client that reads it
-- is deployed, AND somebody saw it happen in the app. 0153 was applied perfectly and did nothing
-- visible for eleven migrations because its reader was never shipped. The `note` column says which of
-- the four still needs a client.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

with probe as (
  select
    -- 0185 — `shared_workout_detail(uuid)` exists, and consents rather than trimming.
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'shared_workout_detail')                       as f_0185,

    -- 0186 — `rename_squad_post(uuid, text)` exists.
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'rename_squad_post')                           as f_0186,

    -- 0187 — the device identity, its index, exactly ONE registration signature, and the 4-hour hold.
    (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'push_tokens' and column_name = 'device_id') as c_0187,
    (select count(*) from pg_indexes
      where schemaname = 'public' and indexname = 'push_tokens_device_idx')                     as i_0187,
    -- ⚠ MUST BE 1. Two means the old 2-arg `push_register_token` is still callable beside the new
    --   one, which is the silent half of defect A — the drop did not take.
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'push_register_token')                         as s_0187,

    -- 0188 — the two squad gates and the profile audience, as COLUMN DEFAULTS (what new rows get)
    -- and as DATA (what existing rows have). Both halves matter: the defaults decide the future, the
    -- backfill decides whether Brady and Rachelle are covered today.
    (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'squads'
        and column_name = 'training_alerts' and column_default like '%true%')                   as d_alerts,
    (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'squad_members'
        and column_name = 'notify_start' and column_default like '%true%')                      as d_start,
    (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles'
        and column_name = 'visibility' and column_default like '%"training": "everyone"%')      as d_vis,
    (select count(*) from public.squads where training_alerts is distinct from true)            as squads_off,
    (select count(*) from public.squad_members where notify_start is distinct from true)        as members_off,
    (select count(*) from public.profiles
      where coalesce(visibility->>'training', '') <> 'everyone')                                as profiles_not_open
),

verdicts as (
  select 1 as ord, '0185  shared route consent' as migration,
         case when f_0185 > 0 then 'APPLIED' else 'NOT APPLIED' end as verdict,
         'fn shared_workout_detail: ' || f_0185 as detail,
         'needs the client deployed to be visible' as note
    from probe
  union all
  select 2, '0186  rename squad post',
         case when f_0186 > 0 then 'APPLIED' else 'NOT APPLIED' end,
         'fn rename_squad_post: ' || f_0186,
         'needs the client deployed to be visible'
    from probe
  union all
  select 3, '0187  one notification per start',
         case when c_0187 > 0 and i_0187 > 0 and s_0187 = 1 then 'APPLIED'
              when c_0187 > 0 or  i_0187 > 0 then 'PARTIAL'
              else 'NOT APPLIED' end,
         'device_id col: ' || c_0187 || ' · index: ' || i_0187 || ' · register signatures: ' || s_0187
           || case when s_0187 > 1 then '  <-- MUST BE 1' else '' end,
         'stops DOUBLE notifications; the client sends p_device_id only once deployed (null is safe)'
    from probe
  union all
  -- ⚠ THE ONE THAT ANSWERS THE PO'S QUESTION.
  select 4, '0188  testing defaults open',
         case when d_alerts > 0 and d_start > 0 and d_vis > 0
                   and squads_off = 0 and members_off = 0 and profiles_not_open = 0 then 'APPLIED'
              when d_alerts > 0 or d_start > 0 or d_vis > 0
                   or squads_off = 0 or members_off = 0 then 'PARTIAL'
              else 'NOT APPLIED' end,
         'defaults(alerts/start/vis): ' || d_alerts || '/' || d_start || '/' || d_vis
           || ' · still-off rows — squads: ' || squads_off
           || ', members: ' || members_off
           || ', profiles: ' || profiles_not_open,
         'THIS is the no-notification + not-on-Live-Now pair. Every still-off count must be 0.'
    from probe
),

-- Who the database currently thinks is training. If this is empty while somebody IS mid-workout, the
-- cause is NOT settings — their client never called `set_training_status(true)`, which no migration
-- can fix. 0188 says these two symptoms do not share one cause; this row is how you tell them apart.
training as (
  select 99 as ord, 'NOW  who the DB thinks is training' as migration,
         case when count(*) > 0 then 'SOMEBODY IS' else 'NOBODY IS' end as verdict,
         coalesce(string_agg(p.name || ' (' || to_char(now() - p.training_since, 'HH24:MI') || ' ago)', ', '
                             order by p.training_since desc), '—') as detail,
         'empty while someone is mid-workout = their app is not announcing, not a settings problem' as note
    from public.profiles p
   where p.training_since is not null
     and p.training_since > now() - interval '4 hours'
)

select migration, verdict, detail, note
  from (select * from verdicts union all select * from training) rows
 order by ord;
