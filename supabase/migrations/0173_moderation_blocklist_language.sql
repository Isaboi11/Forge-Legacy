-- Forge Legacy — 0173: seed the slur and profanity list `0171` left owed
--
-- ══ WHAT THIS CLOSES ══
--
-- `0171` §3b built the whole filtering mechanism — `moderation_blocklist`, a SECURITY DEFINER trigger on
-- `profiles.handle` / `profiles.name`, and an operator path to extend the list — and then deliberately
-- seeded it with IMPERSONATION patterns only, writing the reason into the migration so it could not pass
-- as done:
--
--   "A slur and profanity list is NOT seeded and is owed. That is a judgement call about language, with
--    real false-positive cost (a naive substring list rejects legitimate names — the Scunthorpe problem),
--    and it should be authored deliberately rather than guessed at inside a migration."
--
-- This is that pass. It is DATA ONLY: no table, no policy, no function, no grant. Re-runnable.
--
-- ══ ⚠ THE MATCHING RULE, WHICH IS WHAT MAKES THIS HARD ══
--
-- `moderation_check_profile()` normalises the input by stripping every non-alphanumeric character and
-- lowercasing it, then tests `normalised LIKE '%' || pattern || '%'`. Two consequences decide every row
-- below:
--
--   1. **SUBSTRING, NOT WORD.** There is no word boundary available. `ass` would reject `assassin`,
--      `cassidy` and `bass`. Every pattern here has to survive being found inside a longer legitimate
--      string, because it will be.
--
--   2. **⚠ `_` AND `%` IN A PATTERN ARE LIKE WILDCARDS, NOT LITERALS.** This is not obvious, and 0171's own
--      seed is the proof: `forge_admin`, `forge_support` and `coach_holt` can never match their literal
--      forms, because the normaliser has already deleted the underscore from the input before the
--      comparison. They match "forgeXadmin" and friends instead — which is still impersonation, so they
--      are left in place rather than deleted. **But do not add a pattern containing an underscore
--      believing it is literal.** The one real gap this created is closed below: `forgeadmin` is added as
--      a plain pattern, since `admin` is `handle`-only and nothing was checking the `name` column for it.
--
-- ══ THE RULE USED TO DECIDE EVERY ROW ══
--
-- **A pattern is included only if no legitimate name, English word, or plausible handle contains it as a
-- substring.** Applied mechanically, in both directions — which means several of the most obvious slurs
-- are NOT here, and the exclusion list below names each one and why. A blocked signup is silent: the
-- person sees "That name or handle is not available." and leaves. That cost is paid by someone whose only
-- mistake was their surname, so the bar is deliberately set to under-catch rather than over-catch.
--
-- ⚠ **Slurs get `both`; profanity gets `handle`.** A handle is chosen and a legal name is not, so anything
-- that could conceivably appear in a real person's name is restricted to the handle column.
--
-- ══ KNOWINGLY EXCLUDED, AND WHY — DO NOT ADD THESE ══
--
-- Each of these was considered and rejected. They are recorded so the next person does not "fix" the
-- omission and ship the collision:
--
--   · `rapist`   → **`therapist` contains it.** This is a FITNESS app; "sportstherapist" is a handle a real
--                  physical therapist would pick. The worst collision available to us.
--   · `pedo`     → **`pedometer` contains it.** Also a fitness-app problem. `pedophile` is seeded instead.
--   · `rape`     → `grape`, `drape`, `scrape`. Nothing seeded in its place; report + block cover it.
--   · `spic`     → `spicy`, `despicable`. "spicylifts" is a handle someone will genuinely want.
--   · `paki`     → `Pakistan`, `Pakistani`. Blocking it insults exactly the people it claims to protect.
--   · `coon`     → `raccoon`, `cocoon`, `tycoon`, and the surname `Coonan`.
--   · `kike`     → **`Kike` is the standard Spanish nickname for Enrique.** A real first name.
--   · `nazi`     → **`Nazir` contains it.** A common given name and surname.
--   · `jap`      → `Japan`, `Japanese`.
--   · `dyke`     → `Van Dyke`, a real surname.
--   · `slut`     → `Slutsky`, `Slutskaya`, real surnames people use as handles.
--   · `fag`      → `Fagan`, an Irish surname.
--   · `cock`     → `Hancock`, `Peacock`, `Alcock`, `Cockburn`, `cocktail`.
--   · `dick`     → `Dickinson`, `Dickson`, and a real given name.
--   · `cum`      → `Cummings`, `cucumber`, `circumference`.
--   · `tit`      → `Titan`, `title`, `constitution`. This app ships program names with `Titan` in them.
--   · `anal`     → `analysis`, `analytics`, `canal`.
--   · `ass`, `wop`, `kys` → too short to be safe as substrings at all.
--
-- ⚠ **ONE COLLISION IS KNOWINGLY ACCEPTED: `cunt` rejects `Scunthorpe`.** That is the canonical example
--   named in 0171's own comment, and it is taken anyway — the pattern is `handle`-only, and the number of
--   athletes who will put an English town of 80,000 people inside a handle on a US strength app rounds to
--   zero. It is written down here rather than hidden so the support reply exists before the ticket does.
--
-- ══ WHAT THIS DOES NOT DO ══
--
-- It filters **handles and names**, which is what the trigger enforces on, and which is the one piece of
-- UGC a stranger can be shown through friend search and Discover without any relationship existing. It
-- does **not** filter squad post bodies, comments or workout notes — those remain covered by report +
-- block + operator takedown, which is the after-the-fact half of Guideline 1.2. ⚠ Extending enforcement to
-- post bodies is a code change, not more rows; do not read this migration as having done it.
--
-- Adding rows later still needs no migration:
--   insert into public.moderation_blocklist (pattern, kind, note) values ('…', 'handle', '…')
--     on conflict (pattern) do nothing;

-- ── 1. THE SEED ───────────────────────────────────────────────────────────────────────────────────────

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

  -- The impersonation gap left by 0171's underscore patterns. See header note 2.
  ('forgeadmin',   'both',   'impersonating staff — the separator-free form 0171 could not match')

on conflict (pattern) do nothing;

-- ── 2. SELF-CHECK — the list must SEPARATE known-bad from known-good ─────────────────────────────────
--
-- ⚠ This is the part that matters. A blocklist that only proves it rejects slurs has proved half of
-- nothing; the expensive failure is the legitimate handle it also rejects, and that one is silent. Both
-- directions are asserted here against the SAME expression the trigger uses, so the test cannot drift
-- away from the enforcement it claims to describe.

do $$
declare
  v_bad_missed text[];
  v_good_hit   text[];
begin
  -- Known-bad: every one of these MUST be rejected. Two of them are punctuation-evasion forms, which is
  -- the whole reason the normaliser exists.
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

  -- Known-good: every one of these MUST survive. Each is a documented exclusion from the header, so this
  -- array is the exclusion list made executable — add a pattern carelessly and this is what catches it.
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
    raise exception '0173 self-check: the blocklist WRONGLY rejects legitimate handles % — a pattern was added without checking the exclusion list in this file''s header', v_good_hit;
  end if;

  raise notice '0173 OK: % patterns on the list; 8 known-bad rejected, 20 known-good survive',
    (select count(*) from public.moderation_blocklist);
end;
$$;
