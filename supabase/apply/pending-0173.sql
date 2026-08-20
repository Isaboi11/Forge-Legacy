-- ══════════════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0173: seed the slur and profanity list 0171 left owed
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once. Idempotent — safe to run twice.
--
-- ⚠ DATA ONLY. No table, no policy, no function, no grant, no trigger. It inserts 37 rows into
--   `public.moderation_blocklist`, which `0171` created and left seeded with impersonation patterns only.
--   Nothing about the enforcement mechanism changes: the SECURITY DEFINER trigger on `profiles` was
--   already live and already reading this table.
--
-- ⚠ THIS ONE NEEDS NO DEPLOY. Unlike almost everything else in this project, the client half is already
--   shipped — the trigger raises `P0001` with the message "That name or handle is not available." and the
--   signup and Account Settings screens already surface it. The list takes effect the moment this runs.
--
-- ⚠ IT IS ALSO NOT RETROACTIVE. The trigger fires on INSERT and on UPDATE OF handle/name. Any existing
--   profile that would now be rejected keeps its handle until someone edits it. §3 reports whether any
--   such profile exists, because the answer is very likely zero and a non-zero answer is worth knowing
--   before a reviewer finds it.
--
-- ⚠ ORDER: if `pending-0172.sql` has NOT been run yet, run it FIRST. It is unrelated to this file but it
--   is a deploy blocker and this board has no record of it being applied.
-- ══════════════════════════════════════════════════════════════════════════════════════════════════════


-- ══ §1 — THE STATEMENTS (verbatim from supabase/migrations/0173_moderation_blocklist_language.sql) ════
--
-- The reasoning behind every row — and, more importantly, the eighteen patterns that were considered and
-- DELIBERATELY EXCLUDED because they collide with real names and words (`rapist` is inside `therapist`,
-- `pedo` is inside `pedometer`, `kike` is a Spanish nickname for Enrique) — lives in the migration file's
-- header. Read it before adding a row.

insert into public.moderation_blocklist (pattern, kind, note) values

  -- Racial and ethnic slurs. `both` only where no legitimate name can carry the string.
  ('nigger',       'both',   'racial slur'),
  ('nigga',        'both',   'racial slur'),
  ('n1gger',       'both',   'racial slur — leetspeak; the normaliser strips punctuation but not digits'),
  ('n1gga',        'both',   'racial slur — leetspeak'),
  ('wetback',      'both',   'ethnic slur'),
  ('raghead',      'both',   'ethnic and religious slur'),
  ('towelhead',    'both',   'ethnic and religious slur'),
  ('beaner',       'handle', 'ethnic slur'),
  ('gook',         'handle', 'ethnic slur'),
  ('chink',        'handle', 'ethnic slur — handle only, it is also an ordinary English noun'),
  ('honky',        'handle', 'racial slur — handle only, collides with honkytonk'),
  ('redskin',      'handle', 'racial slur — handle only, collides with a potato and a football team'),

  -- Homophobic and transphobic slurs.
  ('faggot',       'handle', 'homophobic slur'),
  ('tranny',       'handle', 'transphobic slur — handle only, it is also car slang'),
  ('shemale',      'both',   'transphobic slur'),
  ('fudgepacker',  'handle', 'homophobic slur'),

  -- Ableist slurs.
  ('retard',       'handle', 'ableist slur — handle only, collides with flame retardant'),
  ('spastic',      'handle', 'ableist slur'),
  ('mongoloid',    'handle', 'ableist slur'),

  -- Hate and extremist claims.
  ('hitler',       'both',   'hate figure'),
  ('kkk',          'handle', 'hate organisation'),
  ('whitepower',   'handle', 'hate slogan'),
  ('1488',         'handle', 'neo-Nazi numeric code'),

  -- Profanity. Handle only, always — none of this belongs in a rule about a real person's name.
  ('fuck',         'handle', 'profanity'),
  ('shit',         'handle', 'profanity'),
  ('cunt',         'handle', 'profanity — ⚠ knowingly rejects Scunthorpe, see header'),
  ('bitch',        'handle', 'profanity'),
  ('whore',        'handle', 'profanity'),
  ('pussy',        'handle', 'profanity'),
  ('asshole',      'handle', 'profanity — the 7-character form is safe where `ass` is not'),
  ('dickhead',     'handle', 'profanity — the 8-character form is safe where `dick` is not'),

  -- Sexual content and solicitation. A fitness feed is a known target for both.
  ('pedophile',    'handle', 'sexual harm — the full word, because `pedo` collides with pedometer'),
  ('porn',         'handle', 'sexual content'),
  ('nudes',        'handle', 'solicitation'),
  ('onlyfans',     'handle', 'solicitation spam — the common vector on fitness social feeds'),

  -- Threats and self-harm.
  ('killyourself', 'handle', 'harassment — the full phrase, because `kys` is too short to be safe'),

  -- The impersonation gap left by 0171's underscore patterns. See the migration header, note 2.
  ('forgeadmin',   'both',   'impersonating staff — the separator-free form 0171 could not match')

on conflict (pattern) do nothing;


-- ══ §2 — THE ASSERTION ════════════════════════════════════════════════════════════════════════════════
--
-- Three things are asserted, and the second is the one that matters.
--
--   (a) all 37 patterns landed;
--   (b) the list REJECTS eight known-bad handles, including two punctuation-evasion forms;
--   (c) the list LETS THROUGH twenty known-good handles, every one of which is a documented exclusion.
--
-- ⚠ (c) exists because a blocklist that only proves it catches slurs has proved half of nothing. The
--   expensive failure is the legitimate athlete it silently turns away — they see "That name or handle is
--   not available." and leave, and no one ever hears about it. Both directions are tested against the SAME
--   expression `moderation_check_profile()` uses, so the test cannot drift from the enforcement.

do $$
declare
  v_missing    text[];
  v_bad_missed text[];
  v_good_hit   text[];
begin
  -- (a) every seeded pattern is present.
  select coalesce(array_agg(t.p), '{}') into v_missing
    from (values
      ('nigger'),('nigga'),('n1gger'),('n1gga'),('wetback'),('raghead'),('towelhead'),('beaner'),
      ('gook'),('chink'),('honky'),('redskin'),('faggot'),('tranny'),('shemale'),('fudgepacker'),
      ('retard'),('spastic'),('mongoloid'),('hitler'),('kkk'),('whitepower'),('1488'),('fuck'),
      ('shit'),('cunt'),('bitch'),('whore'),('pussy'),('asshole'),('dickhead'),('pedophile'),
      ('porn'),('nudes'),('onlyfans'),('killyourself'),('forgeadmin')
    ) as t(p)
   where not exists (select 1 from public.moderation_blocklist b where b.pattern = t.p);

  if array_length(v_missing, 1) is not null then
    raise exception '0173 self-check: % of the 37 patterns did not land — %',
      array_length(v_missing, 1), v_missing;
  end if;

  -- (b) known-bad MUST be rejected.
  select coalesce(array_agg(t.h), '{}') into v_bad_missed
    from (values
      ('xxniggerxx'), ('N.I.G.G.A.'), ('f.o.r.g.e.admin'), ('forge-admin'),
      ('truefuckery'), ('retardstrong'), ('onlyfans-gains'), ('kkk1488')
    ) as t(h)
   where not exists (
     select 1 from public.moderation_blocklist b
      where b.kind in ('handle', 'both')
        and lower(regexp_replace(t.h, '[^a-z0-9]', '', 'gi')) like '%' || b.pattern || '%'
   );

  -- (c) known-good MUST survive.
  select coalesce(array_agg(t.h), '{}') into v_good_hit
    from (values
      ('sportstherapist'), ('pedometerdaily'), ('spicylifts'), ('hancockstrong'),
      ('vandykefitness'), ('nazirkhan'), ('pakistanilifter'), ('tycoongains'),
      ('slutskyj'), ('dickinson'), ('titanstrength'), ('assassinpr'),
      ('cummingsfit'), ('analyticsnerd'), ('japanlifter'), ('grapeape'),
      ('bassplayer'), ('classiclifts'), ('enriquekike'), ('coonanmma')
    ) as t(h)
   where exists (
     select 1 from public.moderation_blocklist b
      where b.kind in ('handle', 'both')
        and lower(regexp_replace(t.h, '[^a-z0-9]', '', 'gi')) like '%' || b.pattern || '%'
   );

  if array_length(v_bad_missed, 1) is not null then
    raise exception '0173 self-check: the blocklist FAILED to reject %', v_bad_missed;
  end if;

  if array_length(v_good_hit, 1) is not null then
    raise exception '0173 self-check: the blocklist WRONGLY rejects legitimate handles % — a pattern was added without checking the exclusion list in the migration header', v_good_hit;
  end if;

  raise notice '0173 OK: 37 patterns landed, 8 known-bad rejected, 20 known-good survive.';
end;
$$;


-- ══ §3 — THE REPORT (read-only, ONE row) ══════════════════════════════════════════════════════════════
--
-- ⚠ ONE ROW ON PURPOSE. The SQL editor shows only the last statement's result, and a bundle ending in
--   several selects hides all but one of them. Everything worth reading is on this line.
--
-- PREDICTED, written before running it:
--   total 46 · both 13 · handle 33 · name 0 · added_here 37 · existing_profiles_now_failing 0
--
-- The 46 is 9 rows from 0171 plus the 37 here. `both` is 3 from 0171 (forgelegacy, coachholt, coach_holt)
-- plus 10 here. `name` is 0 and should stay 0 — nothing is name-only, by design.
--
-- ⚠ `existing_profiles_now_failing` is the number the prediction is least sure of, and the only one that
--   could cost anything. It counts live profiles whose CURRENT handle or name would now be rejected. The
--   trigger is not retroactive, so a non-zero count is not an outage — it is an athlete who keeps their
--   handle until the day they edit their profile, and then cannot save. Expected 0 on a tester cohort of
--   twenty. If it is not 0, look at who before deciding anything.

select
  (select count(*) from public.moderation_blocklist)                                    as total_patterns,
  (select count(*) from public.moderation_blocklist where kind = 'both')                as kind_both,
  (select count(*) from public.moderation_blocklist where kind = 'handle')              as kind_handle,
  (select count(*) from public.moderation_blocklist where kind = 'name')                as kind_name,
  -- ⚠ Counted as "not one of 0171's nine", NOT by filtering on the note text. The first draft of this
  -- line matched `note not like 'imperson%'` and would have reported 36, because `forgeadmin` — added by
  -- THIS migration — carries an impersonation note too. Exactly the kind of quietly-wrong number §3 exists
  -- to catch, so it is written the boring way.
  (select count(*) from public.moderation_blocklist
    where pattern not in ('forgelegacy', 'forge_admin', 'forgesupport', 'forge_support',
                          'coachholt', 'coach_holt', 'admin', 'moderator', 'official'))  as added_here,
  (select count(*) from public.profiles p
    where exists (
      select 1 from public.moderation_blocklist b
       where (b.kind in ('handle','both')
              and lower(regexp_replace(coalesce(p.handle::text,''), '[^a-z0-9]', '', 'gi')) <> ''
              and lower(regexp_replace(coalesce(p.handle::text,''), '[^a-z0-9]', '', 'gi'))
                  like '%' || b.pattern || '%')
          or (b.kind in ('name','both')
              and lower(regexp_replace(coalesce(p.name,''), '[^a-z0-9]', '', 'gi')) <> ''
              and lower(regexp_replace(coalesce(p.name,''), '[^a-z0-9]', '', 'gi'))
                  like '%' || b.pattern || '%')
    ))                                                                as existing_profiles_now_failing;
