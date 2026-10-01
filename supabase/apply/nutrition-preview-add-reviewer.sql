-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- OPS · OPEN NUTRITION FOR THE APPLE REVIEW ACCOUNT (PO, 2026-09-28)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- The store screenshots now show Nutrition. Apple's reviewer signs in as `alex.review`
-- (`isaiahaltamirano11+review@gmail.com`, see Docs/App-Store-Reviewer-Notes.md) and must be able to open
-- everything the screenshots show — so the review account joins the 0206 allowlist. Nothing else changes:
-- Nutrition stays closed to everyone else until 0216.
--
-- Safe to run twice (upsert). Raises, and adds nobody, if the account is not found.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
do $$
declare
  v_id uuid;
begin
  select p.id into v_id
    from auth.users u
    join public.profiles p on p.id = u.id
   where lower(u.email) = 'isaiahaltamirano11+review@gmail.com';
  if v_id is null then
    raise exception 'review account isaiahaltamirano11+review@gmail.com not found';
  end if;

  insert into public.nutrition_preview (user_id, note)
  values (v_id, 'Apple review account alex.review — Nutrition shown in store screenshots (2026-09-28)')
  on conflict (user_id) do nothing;

  raise notice 'alex.review has Nutrition (% accounts on the allowlist)',
    (select count(*) from public.nutrition_preview);
end $$;
