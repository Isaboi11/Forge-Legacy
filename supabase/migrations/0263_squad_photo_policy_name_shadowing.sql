-- Forge Legacy — 0263: squad photos upload again (0146's policy compared the squad's NAME, not the file path)
--
-- ══ THE DEFECT ══
--
-- PO, 2026-11-12: "it wouldn't let me choose a photo for the squad Til' Valhalla."
--
-- 0146 owner-scoped the `squad-photos` write policies like this:
--
--     exists (select 1 from public.squads s
--              where s.id::text = (storage.foldername(name))[1]
--                and s.owner_id = auth.uid())
--
-- The bare `name` is INSIDE a subquery over `public.squads`, and `squads` has its own `name` column.
-- Postgres resolves an unqualified column against the innermost FROM first, so `name` is `s.name`, the
-- squad's display name ("Til' Valhalla"), not `storage.objects.name` (the path "<squadId>/photo.jpg").
-- `foldername()` of a squad name has no folder, `[1]` is NULL, and the `exists` is false for every squad
-- and every owner. **Every squad-photo upload has been refused since 0146 was applied on 2026-08-12.**
--
-- Proof from production: the `squad-photos` bucket holds exactly one photo, uploaded 2026-08-03. Nothing
-- has landed since. 0146's header said "the legitimate flow still passes", but no upload was run to check it.
--
-- ⚠ This is very likely what 0033 ran into. Its header says the 0030 draft's subquery "evaluates to false
-- at upload time", and it gave up on owner scoping. The subquery was never the problem. The shadowed
-- column was.
--
-- ══ THE FIX ══
--
-- Read the path OUTSIDE the subquery, so `name` can only mean the object being written:
--
--     (storage.foldername(name))[1] in (select s.id::text from public.squads s where s.owner_id = auth.uid())
--
-- The scope is the same as 0146 intended (you own THIS squad, resolved from the first path segment), with
-- every reason in 0146 §2 still holding: not `objects.owner`, because the path is fixed and upserted, so
-- a transferred squad's new owner must be able to replace it.
--
-- `squads_select` (0032) lets an owner read their own row, private or public, and 0149's column grants
-- cover `id` and `owner_id`, so the subquery sees what it needs as `authenticated`.
--
-- Idempotent: drop-if-exists + create. RUN BY HAND. The paste bundle is `supabase/apply/pending-0263.sql`.

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
