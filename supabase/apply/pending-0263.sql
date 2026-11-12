-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0263: squad photos upload again
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: §1 is drop-if-exists + create, §2 only reads, and §3's upload test is
-- rolled back. It writes NOTHING to storage (no file is left behind).
--
-- Independent of 0262. They touch different things, and either can go first.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- PO, 2026-11-12: "it wouldn't let me choose a photo for the squad Til' Valhalla."
--
-- Since 0146 (applied 2026-08-12), NO squad photo has been able to upload, for any squad or any owner.
-- 0146's policy looked up `(storage.foldername(name))[1]` INSIDE `select … from public.squads s`. `squads`
-- has a `name` column, so `name` meant the squad's display name ("Til' Valhalla"), not the file path
-- ("<squadId>/photo.jpg"). The check was false every time. Production agrees: the bucket's only photo was
-- uploaded 2026-08-03.
--
-- In the app that read as either "Couldn't save changes" (Squad Settings → Edit) or "Squad created, but
-- the photo didn't upload" (Create Squad).
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  re-creates the three squad-photos write policies with the path read OUTSIDE the subquery
-- §2  asserts all three exist and none still reads `s.name`, and RAISES if not
-- §3  ACTUALLY TRIES THE UPLOAD, as a real squad's owner and as someone who is not its owner, inside a
--     rolled-back sub-transaction. It reports one row per check. Read-only in effect.
--
-- ⚠ §3 IS THE POINT. 0146 said "the legitimate flow still passes" and was never run as a user. A policy
--   that is merely present is the green this file exists not to accept.
--
-- ⚠ No client change is needed. The app's upload code was always right, and this is live the moment
--   it is applied (no OTA, no web deploy).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE POLICIES (verbatim from 0263_squad_photo_policy_name_shadowing.sql)
-- ═════════════════════════════════════════════════════════════════════════════

drop policy if exists squad_photos_owner_insert on storage.objects;
create policy squad_photos_owner_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'squad-photos'
    and (storage.foldername(name))[1] in (
      select s.id::text from public.squads s where s.owner_id = auth.uid()
    )
  );

drop policy if exists squad_photos_owner_update on storage.objects;
create policy squad_photos_owner_update on storage.objects for update to authenticated
  using (
    bucket_id = 'squad-photos'
    and (storage.foldername(name))[1] in (
      select s.id::text from public.squads s where s.owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'squad-photos'
    and (storage.foldername(name))[1] in (
      select s.id::text from public.squads s where s.owner_id = auth.uid()
    )
  );

drop policy if exists squad_photos_owner_delete on storage.objects;
create policy squad_photos_owner_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'squad-photos'
    and (storage.foldername(name))[1] in (
      select s.id::text from public.squads s where s.owner_id = auth.uid()
    )
  );


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  p record;
  missing text := '';
  found int := 0;
begin
  for p in
    select policyname, coalesce(qual, '') || ' ' || coalesce(with_check, '') as body
      from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname in ('squad_photos_owner_insert', 'squad_photos_owner_update', 'squad_photos_owner_delete')
  loop
    found := found + 1;
    if p.body like '%foldername(s.name)%' then
      missing := missing || ' ' || p.policyname || ' still reads s.name (the squad name);';
    elsif p.body not like '%foldername(name)%' and p.body not like '%foldername(objects.name)%' then
      missing := missing || ' ' || p.policyname || ' does not read the object path;';
    end if;
  end loop;

  if found <> 3 then
    missing := missing || ' expected 3 squad_photos_owner_* policies, found ' || found || ';';
  end if;

  if missing <> '' then
    raise exception '0263 DID NOT APPLY:%', missing;
  end if;

  raise notice '0263 OK: all three squad-photos write policies read the object path.';
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — TRY IT. One row per check. Every attempted write is rolled back.
-- ═════════════════════════════════════════════════════════════════════════════
--
-- The squad tested is Til' Valhalla if it exists (the PO's report), otherwise the newest squad.
--
-- PREDICTION, and why:
--   owner uploads a photo        → expect 'allowed'  (the bug: this said DENIED for every squad)
--   owner replaces the photo     → expect '1 row'    (the app uploads with upsert, so a 2nd photo is an UPDATE)
--   non-owner uploads a photo    → expect 'DENIED'   (0146's owner scope still holds)
-- Every row's `ok` should be true. A false `ok` on the owner rows means uploads are still blocked, and
-- `actual` carries Postgres's own words for why.

drop table if exists _p0263;
create temp table _p0263 (seq int, check_name text, expected text, actual text, ok boolean);

do $$
declare
  v_squad    uuid;
  v_sname    text;
  v_owner    uuid;
  v_ohandle  text;
  v_stranger uuid;
  v_path     text;
  v_n        int;
begin
  select s.id, s.name, s.owner_id into v_squad, v_sname, v_owner
    from public.squads s
   order by (s.name ilike '%valhalla%') desc, s.created_at desc
   limit 1;

  if v_squad is null then
    insert into _p0263 values (0, 'squad to test', 'a squad', 'there are no squads', false);
    return;
  end if;

  select pr.handle::text into v_ohandle from public.profiles pr where pr.id = v_owner;
  insert into _p0263 values (0, 'squad tested', '-', v_sname || '  (owner @' || coalesce(v_ohandle, '?') || ')', true);

  select pr.id into v_stranger from public.profiles pr where pr.id <> v_owner limit 1;
  v_path := v_squad::text || '/rls-probe-0263.jpg';

  -- 1 · The owner uploads, then replaces. Both run as `authenticated` with the owner's id, exactly as the
  --     app does. Then a deliberate raise rolls the whole sub-transaction back, role and claims included.
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
    insert into storage.objects (bucket_id, name) values ('squad-photos', v_path);
    update storage.objects set metadata = '{"probe":"0263"}'::jsonb where bucket_id = 'squad-photos' and name = v_path;
    get diagnostics v_n = row_count;
    raise exception using errcode = 'P0263', message = v_n::text;
  exception
    when sqlstate 'P0263' then
      insert into _p0263 values (1, 'owner uploads a photo', 'allowed', 'allowed', true);
      insert into _p0263 values (2, 'owner replaces the photo', '1 row', sqlerrm || ' row', sqlerrm = '1');
    when others then
      insert into _p0263 values (1, 'owner uploads a photo', 'allowed', 'DENIED: ' || sqlerrm, false);
  end;

  -- 2 · Someone who does not own this squad tries the same path. Must be refused BY THE POLICY. Any other
  --     error (a grant, a trigger) is reported as not-ok, because it would not prove the policy works.
  if v_stranger is null then
    insert into _p0263 values (3, 'non-owner uploads a photo', 'DENIED', 'no second account to test with', false);
  else
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_stranger, 'role', 'authenticated')::text, true);
      perform set_config('role', 'authenticated', true);
      insert into storage.objects (bucket_id, name) values ('squad-photos', v_path);
      raise exception using errcode = 'P0263', message = 'inserted';
    exception
      when sqlstate 'P0263' then
        insert into _p0263 values (3, 'non-owner uploads a photo', 'DENIED', 'ALLOWED (a stranger could write this squad''s photo)', false);
      when others then
        insert into _p0263 values (3, 'non-owner uploads a photo', 'DENIED', 'DENIED: ' || sqlerrm, sqlerrm ilike '%row-level security%');
    end;
  end if;
end $$;

select check_name, expected, actual, ok from _p0263 order by seq;
