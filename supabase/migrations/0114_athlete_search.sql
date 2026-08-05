-- Forge Legacy — 0114: athlete search returns a LIST, by name or handle
--
-- THIS RESTORES A LOCKED SPEC RATHER THAN OVERTURNING ONE.
--
-- `Identity-Amendment-001-Username.md` §4 has specified name+handle search since it was locked: §4.1
-- says a query matches Display Name AND Username simultaneously and that a leading `@` forces
-- handle-only mode, §4.2 gives the ranking, §4.3 the row format, §4.4 the empty state, §4.5 the
-- no-results copy word for word. SOC-D15 was written later, read "returns a LIST" as the definition of
-- a discovery surface, and narrowed it to one exact handle — which is what 0073 shipped.
--
-- Two LOCKED documents disagreed. `Social-Architecture-Amendment-003-Athlete-Search.md` settles it in
-- Identity's favour and restates precisely what SOC-D15 still bars, which is everything the system
-- populates on its own: Suggested Friends, People You May Know, mutual-friend recommendations, any
-- ranking by engagement or popularity, and any result for a query the athlete did not type.
--
-- `find_athlete_by_handle` (0073) IS NOT REPLACED. It is the QR-code and profile-link path SOC-D15
-- explicitly sanctions, and other callers use it.
--
-- ⚠ READ THIS BEFORE TRUSTING `discoverable`. `0001_spine.sql:165` is
--   create policy profiles_read on profiles for select using (true)
-- so any client holding the anon key can already page the entire profile table through PostgREST. Every
-- guard below is ADVISORY UX, not enforcement, and the toggle is a promise this database does not keep.
-- Making it real means narrowing `profiles_read`, which is its own ruling — the feed and notification
-- functions that join `profiles` are all `security definer` and would be unaffected, but the blast
-- radius needs checking first. Until then the setting must be worded as "hide me from name search",
-- never as "no one can find me".

-- ── The toggle Identity §7.1 has always specified and nothing ever implemented ────────────────────
-- A real column, not a key inside `app_prefs`: the search function has to filter on it in SQL. And not
-- a key inside `profiles.visibility` either — that is a per-SECTION audience map (chapter · history ·
-- timeline · transformation · photos · accomplishments · stats · training) with no notion of
-- findability, and P-6 §75 assigns discoverability to Identity rather than to P-6's own controls.
alter table public.profiles add column if not exists discoverable boolean not null default true;

comment on column public.profiles.discoverable is
  'Identity-Amendment-001 §7.1 "Let non-squad athletes find me in search". Default true. Governs NAME search only (SOC-A3-D4) — an exact handle still resolves, because a handle is something you were given. ADVISORY: profiles_read is `using (true)`, so this is not enforced at the row level.';

-- Only the LEADING-prefix branch can use these. The mid-name word-prefix branch seq-scans, which is
-- fine at this scale and capped at 25 rows; past tens of thousands of athletes it wants pg_trgm + GIN,
-- which is an extension decision and is deliberately not taken here.
create index if not exists profiles_name_prefix on public.profiles (lower(name) text_pattern_ops);
create index if not exists profiles_handle_prefix on public.profiles (lower(handle::text) text_pattern_ops);

create or replace function public.find_athletes(p_query text, p_limit int default 20)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_raw    text := btrim(coalesce(p_query, ''));
  v_handle boolean := left(v_raw, 1) = '@';   -- Identity §4.1: @ forces handle-only mode
  q        text := lower(regexp_replace(v_raw, '^@+', ''));
  esc      text;
  v_cap    int := least(greatest(coalesce(p_limit, 20), 1), 25);
begin
  -- Identity §4.4: nothing is returned before a query. Not an empty list as a formality — the empty
  -- query is the one input that would otherwise mean "everyone".
  if v_uid is null or char_length(q) < 2 then
    return '[]'::jsonb;
  end if;

  -- ══ THE LINE THAT STOPS THE WHOLE USER BASE BEING ENUMERATED ══
  -- Unescaped, a query of '%' matches every athlete alive and this function becomes the directory the
  -- product does not have. Escaped, '%' matches a literal percent sign and returns nothing.
  esc := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_');

  return coalesce((
    select jsonb_agg(r.obj order by r.tier, lower(r.name), r.id)
      from (
        select p.id,
               p.name,
               -- Identity §4.2's ranking, with one deliberate deviation recorded in SOC-A3-D2: an
               -- EXACT HANDLE outranks a squad-mate. Typing somebody's whole handle is the most
               -- intentional act SOC-D15 recognises, and burying it under a roster would defeat it.
               case
                 when lower(p.handle::text) = q then 0
                 when exists (
                   select 1 from public.squad_members a
                     join public.squad_members b on b.squad_id = a.squad_id
                    where a.user_id = v_uid and b.user_id = p.id
                 ) then 1
                 when lower(p.name) = q then 2
                 when lower(p.handle::text) like esc || '%' escape '\' then 3
                 else 4
               end as tier,
               jsonb_build_object(
                 'id',           p.id,
                 'name',         p.name,
                 'handle',       p.handle,
                 'avatar_url',   p.avatar_url,
                 'athlete_type', p.athlete_type,
                 'rank_family',  p.rank_family,
                 'rank_level',   p.rank_level,
                 -- Identity §4.3's tertiary line. ONE squad name, not a list — this is a label on a
                 -- row, not a read of anybody's graph.
                 'shared_squad', (
                   select s.name from public.squads s
                     join public.squad_members a on a.squad_id = s.id and a.user_id = v_uid
                     join public.squad_members b on b.squad_id = s.id and b.user_id = p.id
                    order by s.name limit 1
                 ),
                 'state', public.friendship_with(p.id)
               ) as obj
          from public.profiles p
         where p.id <> v_uid                            -- you are not a search result
           and (
             lower(p.handle::text) like esc || '%' escape '\'
             -- NAME matches on a WORD prefix, never a free substring. "ada" finds "Ada Lovelace" and
             -- "Grace Ada Hopper" and does not find "Amanda". A free substring is an enumeration tool
             -- wearing a search box: '%a%' would return almost everyone.
             or (not v_handle and (
                  lower(p.name) like esc || '%' escape '\'
               or lower(p.name) like '% ' || esc || '%' escape '\'
             ))
           )
           -- SOC-A3-D3/D4: the toggle hides you from NAME search. An exact handle still resolves, and
           -- squad-mates always see each other — you are already in a room together.
           and (
             p.discoverable
             or lower(p.handle::text) = q
             or exists (
               select 1 from public.squad_members a
                 join public.squad_members b on b.squad_id = a.squad_id
                where a.user_id = v_uid and b.user_id = p.id
             )
           )
         limit v_cap
      ) r
  ), '[]'::jsonb);
end;
$$;
