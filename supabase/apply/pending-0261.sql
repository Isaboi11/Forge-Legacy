-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0261: nobody can LIST another athlete's photo files (launch QA B10 / UX-007)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: §1 is drop-if-exists + create, §2 only raises, §3 is read-only.
-- If §2 raises, NOTHING is kept — the editor runs the file as one transaction.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- Anyone with the app's public key (no account) could list every file in `transformation-media`
-- (progress photos), `chapter-photos` (album) and `squad-media` (post photos, check-in video), then open
-- each by its public URL. Found by the 11-09 UX sweep (B10). The app is now public, so this is live.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  makes each bucket's SELECT policy owner-only (`to authenticated … owner = auth.uid()`)
-- §2  RAISES unless: the three policies carry the owner check · the three buckets are still PUBLIC
--     (if one weren't, this would hide other athletes' photos) · a no-account visitor now lists 0 files ·
--     a real athlete lists their own files and 0 of anyone else's
-- §3  one row: how many files exist (unchanged — nothing is deleted) and what each kind of visitor can list
--
-- ⚠ Photos KEEP LOADING in the app: public buckets serve their public URLs without RLS.
--   Check after: open Legacy → Photos and a squad post with a photo — both still show.
--
-- ══ PREDICTED §3 ══
--   buckets_public 3 · anon_can_list 0 · sample_athlete_sees_others 0 · sample_athlete_sees_own ≥ 1
--   files_total = today's count (unchanged) · files_without_owner ≈ 0 (uploads made by the app carry one)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE POLICIES (verbatim from supabase/migrations/0261_storage_list_owner_only.sql)
-- ═════════════════════════════════════════════════════════════════════════════

drop policy if exists xform_media_read on storage.objects;
create policy xform_media_read on storage.objects for select to authenticated
  using (bucket_id = 'transformation-media' and owner = auth.uid());

drop policy if exists chapter_photos_read on storage.objects;
create policy chapter_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'chapter-photos' and owner = auth.uid());

drop policy if exists squad_media_read on storage.objects;
create policy squad_media_read on storage.objects for select to authenticated
  using (bucket_id = 'squad-media' and owner = auth.uid());


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — THE ASSERTION
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_scoped  int;
  v_public  int;
  v_open    int;
  v_anon    int;
  v_owner   uuid;
  v_own     int;
  v_other   int;
begin
  -- (a) the three SELECT policies exist, are for `authenticated` only, and carry the owner check
  select count(*) into v_scoped
    from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and cmd = 'SELECT'
     and policyname in ('xform_media_read', 'chapter_photos_read', 'squad_media_read')
     and roles = '{authenticated}'::name[]
     and qual like '%owner = auth.uid()%';
  if v_scoped <> 3 then
    raise exception '0261 FAILED: expected 3 owner-scoped SELECT policies, found %', v_scoped;
  end if;

  -- (b) the buckets are still public — otherwise owner-only SELECT would hide everyone else's photos
  select count(*) into v_public
    from storage.buckets
   where id in ('transformation-media', 'chapter-photos', 'squad-media') and public;
  if v_public <> 3 then
    raise exception '0261 STOPPED: only % of the 3 buckets are public. Owner-only SELECT would hide other athletes'' photos. Nothing was changed.', v_public;
  end if;

  -- (c) no OTHER SELECT policy still opens these buckets (permissive policies are OR-ed together)
  select count(*) into v_open
    from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and cmd in ('SELECT', 'ALL')
     and policyname not in ('xform_media_read', 'chapter_photos_read', 'squad_media_read')
     and permissive = 'PERMISSIVE'
     and (qual like '%transformation-media%' or qual like '%chapter-photos%' or qual like '%squad-media%')
     and qual not like '%auth.uid()%';
  if v_open <> 0 then
    raise exception '0261 FAILED: % other SELECT policy(ies) still open these buckets without an owner check', v_open;
  end if;

  -- (d) a visitor with NO account lists nothing
  set local role anon;
  select count(*) into v_anon
    from storage.objects
   where bucket_id in ('transformation-media', 'chapter-photos', 'squad-media');
  reset role;
  if v_anon <> 0 then
    raise exception '0261 FAILED: a no-account visitor can still list % file(s)', v_anon;
  end if;

  -- (e) a real athlete lists their own files and nobody else's
  select o.owner into v_owner
    from storage.objects o
   where o.bucket_id in ('transformation-media', 'chapter-photos', 'squad-media') and o.owner is not null
   group by o.owner
   order by count(*) desc
   limit 1;

  if v_owner is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) filter (where o.owner = v_owner),
           count(*) filter (where o.owner is distinct from v_owner)
      into v_own, v_other
      from storage.objects o
     where o.bucket_id in ('transformation-media', 'chapter-photos', 'squad-media');
    reset role;
    perform set_config('request.jwt.claims', '', true);

    if v_other <> 0 then
      raise exception '0261 FAILED: a signed-in athlete can still list % file(s) belonging to others', v_other;
    end if;
    if v_own = 0 then
      raise exception '0261 FAILED: a signed-in athlete can no longer list their OWN files (account deletion needs this)';
    end if;
  end if;

  raise notice '0261: photo files are owner-listable only; public URLs unchanged.';
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — THE REPORT (read-only, one row)
-- ═════════════════════════════════════════════════════════════════════════════

select
  (select count(*) from storage.buckets
    where id in ('transformation-media', 'chapter-photos', 'squad-media') and public)          as buckets_public,
  (select count(*) from storage.objects
    where bucket_id in ('transformation-media', 'chapter-photos', 'squad-media'))              as files_total,
  (select count(*) from storage.objects
    where bucket_id in ('transformation-media', 'chapter-photos', 'squad-media')
      and owner is null)                                                                         as files_without_owner,
  (select count(*) from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd = 'SELECT'
      and policyname in ('xform_media_read', 'chapter_photos_read', 'squad_media_read')
      and qual like '%owner = auth.uid()%')                                                     as owner_only_policies;
