-- Forge Legacy — 0105: what you trained to
--
-- ══ WHAT THIS CLOSES ══
--
-- Workout-Playlist-Amendment-001 (LOCKED, June 2026) has been merged into four base specs — W-9–W-16
-- §8.5, W-17 §8A, W-19 §9A and WSR-001 — and implemented in exactly zero of them. `grep -ri playlist src`
-- returned one line before this migration, and it was a comment on W-19 reading "Playlist — no such data."
-- That comment was correct. This is the data.
--
-- Amendment §3: "Stored as `WorkoutSession.playlistLink: WorkoutPlaylistLink | null`. At most one playlist
-- link per session." So: three nullable columns on `workouts`, in the same shape and by the same reasoning
-- as `partners` (0016) and `reflection` — an optional annotation on the session row, written after the
-- commit, never part of it.
--
-- NOT A TABLE, DELIBERATELY. A child table is how you store a list, and §4 is explicit about why there
-- isn't one: "Supporting multiple links per session would imply a queue or ordering, which would create an
-- expectation of in-app playback sequencing that V1 explicitly does not provide." The cardinality belongs
-- in the schema, not in a rule somebody has to remember.
--
-- Depends on 0001 (workouts + the `workouts_own` FOR ALL policy that makes the post-commit update legal).
-- Idempotent. RUN AFTER 0104.
--
-- ══ NOTHING TO DRY-RUN ══
--
-- This migration adds columns and constraints and writes no row. The CHECK constraints are validated
-- against a table where every new column is NULL on every existing row, so they cannot fail on live data.

begin;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. THE COLUMNS
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- All three nullable, all three defaulting to nothing. A workout with no playlist is the overwhelming
-- majority and must cost nothing to represent — no empty string, no 'NONE' sentinel, no default row.
alter table public.workouts add column if not exists playlist_url     text;
alter table public.workouts add column if not exists playlist_service text;
alter table public.workouts add column if not exists playlist_name    text;

comment on column public.workouts.playlist_url is
  'The share link the athlete pasted, verbatim. Amendment-001 §3. Never displayed — the chip shows
   playlist_name or a generic service label, never a raw URL (§5).';
comment on column public.workouts.playlist_service is
  'SPOTIFY | APPLE_MUSIC, derived from the URL host at attach time and re-checked here. Amendment-001 §3:
   "If the domain doesn''t match either, the field is rejected — no silent guess."';
comment on column public.workouts.playlist_name is
  'Optional athlete-typed label ("Leg Day Bangers"). Amendment-001 §2 forbids fetching any playlist
   metadata, so this is the ONLY name that will ever exist for the link.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. THE HOST RULE, ENFORCED ON THE DATA
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- ⚠ THIS RULE EXISTS TWICE. The other copy is `detectService` / `parsePlaylistLink` in
-- `src/domain/workout/playlist.ts`, and the two must change together. Its test file duplicates these
-- vectors verbatim, so the pair can only drift through a deliberate edit to both.
--
-- ══ WHY THE DATABASE CHECKS A HOSTNAME, WHICH IT OTHERWISE NEVER DOES ══
--
-- Because this is the one column in the app whose value becomes a TAP TARGET FOR SOMEBODY ELSE. The
-- amendment (§2, and WSR-001 §6.3) puts the playlist chip on squad check-in cards, so a squadmate sees a
-- chip labelled "Spotify Playlist" and taps it. If the service tag were merely a client-supplied string
-- constrained to two enum values, any caller with a PostgREST token could post a workout carrying
-- service='SPOTIFY' and url='https://anything-at-all', and the app would render a Spotify-labelled chip
-- that opens it. The label would be a lie the product told on the attacker's behalf.
--
-- 0104 declined to duplicate a rule into SQL where the client could be trusted, and duplicated
-- `program_total_sessions` where it could not — because graduation buys honors and rank. This is the same
-- test with the same answer: the client cannot be the only thing standing between a squadmate and an
-- arbitrary URL.
--
-- ══ WHY THESE REGEXES ARE SHAPED THE WAY THEY ARE ══
--
-- The terminator class `(/|\?|#|$)` is the whole security property, and each alternative is one attack:
--   · without it, 'https://open.spotify.com.evil.com/x'  matches a bare prefix test    → wrong host
--   · without it, 'https://open.spotify.com@evil.com/x'  matches a bare prefix test    → userinfo trick,
--     the real host is evil.com
-- A port ('https://open.spotify.com:443/…') is rejected too, because ':' is not in the class. That is
-- deliberate rather than an oversight: no share sheet on either platform emits one, and the TypeScript
-- twin rejects it identically, so the client never offers to save something the database will refuse.
--
-- https ONLY. Both services emit https from every share affordance they have. Accepting http would mean
-- storing a downgradeable link and handing it to a squadmate.
-- ══ `playlist_service is not null` IS LOAD-BEARING — A CHECK PASSES ON NULL ══
--
-- Without that line this constraint ACCEPTED a url with no service tag, and the first draft of this
-- migration shipped exactly that. A CHECK rejects a row only when its expression is explicitly FALSE;
-- an expression evaluating to NULL/UNKNOWN passes. With `playlist_service` null:
--
--     (playlist_service = 'SPOTIFY' and <regex true>)      →  NULL and TRUE   →  NULL
--     (playlist_service = 'APPLE_MUSIC' and <regex false>) →  NULL and FALSE  →  FALSE
--     NULL or FALSE                                        →  NULL            →  row ACCEPTED
--
-- So a half-written link — a URL the app would render a chip for, with no service to label or validate
-- it — was legal. The self-check in section 3 caught it at apply time, which is the entire reason that
-- section exists; the TypeScript twin never had the bug, because `playlistFromRow` tests `!url ||
-- !service` explicitly and JavaScript has no third truth value to fall through.
--
-- Comparing a nullable column inside a disjunction is the general shape of this trap. If you edit this
-- constraint, re-run section 3 and believe it over the code you just wrote.
alter table public.workouts drop constraint if exists workouts_playlist_pair;
alter table public.workouts add constraint workouts_playlist_pair check (
  (playlist_url is null and playlist_service is null)
  or (
    playlist_url is not null
    and playlist_service is not null
    and (
      (playlist_service = 'SPOTIFY'     and playlist_url ~ '^https://open\.spotify\.com(/|\?|#|$)')
      or (playlist_service = 'APPLE_MUSIC' and playlist_url ~ '^https://music\.apple\.com(/|\?|#|$)')
    )
  )
);

comment on constraint workouts_playlist_pair on public.workouts is
  'A playlist link is all of its parts or none of them, and the service tag must agree with the URL''s
   actual host. SQL twin of detectService() in src/domain/workout/playlist.ts. Enforced here rather than
   client-side because WSR-001 §6.3 renders this chip to SQUADMATES: a service-labelled chip opening an
   arbitrary URL is a lie the product would be telling on an attacker''s behalf. Migration 0105.';

-- A name with no link is an orphan — nothing would ever render it, and it would survive a "remove" that
-- only cleared the URL. Removal clears all three or the constraint stops it.
alter table public.workouts drop constraint if exists workouts_playlist_name_needs_link;
alter table public.workouts add constraint workouts_playlist_name_needs_link check (
  playlist_name is null or playlist_url is not null
);

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. SELF-CHECK — the constraint actually rejects what it claims to
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- A CHECK constraint that is present but wrong is this repo's recorded failure mode wearing a different
-- hat: it applies cleanly, errors nothing, and is discovered months later by the thing it was supposed to
-- prevent. These vectors are duplicated VERBATIM into
-- src/domain/workout/__tests__/playlist.test.mjs. Both lists fail loudly.
--
-- Runs against a temp table carrying the identical constraint, so a failing vector cannot leave a row in
-- `workouts` and the check needs no cleanup.
do $$
declare
  v record;
  v_ok  boolean;
  v_def text;
begin
  /*
   * THE PROBE TESTS THE REAL CONSTRAINT, NOT A RETYPED COPY OF IT.
   *
   * The first draft of this migration hand-copied the CHECK expression into this string, and the copy
   * inherited the NULL bug documented in section 2 — so the probe and the constraint agreed with each
   * other while both were wrong. They only disagreed with the EXPECTED column, which is what caught it,
   * but that was luck rather than design: any bug present in both copies would have passed silently.
   *
   * `pg_get_constraintdef` reads the definition Postgres actually installed above, so the two can no
   * longer differ by construction. The temp columns are named to match the real ones so the definition
   * applies verbatim.
   */
  select pg_get_constraintdef(oid) into v_def
    from pg_constraint
   where conname = 'workouts_playlist_pair'
     and conrelid = 'public.workouts'::regclass;

  if v_def is null then
    raise exception '0105 self-check FAILED: workouts_playlist_pair is not installed on public.workouts';
  end if;

  create temp table _pl_probe (playlist_url text, playlist_service text) on commit drop;
  execute 'alter table _pl_probe add constraint c ' || v_def;

  for v in
    select * from (values
      -- (label, url, service, should_be_accepted)
      ('nothing attached',                     null,                                                     null,          true),
      ('real Spotify share link',              'https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP', 'SPOTIFY',     true),
      ('Spotify link carrying its ?si= param', 'https://open.spotify.com/playlist/abc?si=xyz',            'SPOTIFY',     true),
      ('real Apple Music share link',          'https://music.apple.com/us/playlist/gym/pl.u-abc',        'APPLE_MUSIC', true),
      ('bare host, no path',                   'https://open.spotify.com',                                'SPOTIFY',     true),
      -- the attacks
      ('suffixed host is a DIFFERENT host',    'https://open.spotify.com.evil.com/x',                     'SPOTIFY',     false),
      ('userinfo trick — real host is evil',   'https://open.spotify.com@evil.com/x',                     'SPOTIFY',     false),
      ('service tag lying about the host',     'https://music.apple.com/us/playlist/x',                   'SPOTIFY',     false),
      ('arbitrary URL wearing a service tag',  'https://evil.com/pretty-playlist',                        'SPOTIFY',     false),
      ('http is not https',                    'http://open.spotify.com/playlist/x',                      'SPOTIFY',     false),
      ('scheme-relative',                      '//open.spotify.com/playlist/x',                           'SPOTIFY',     false),
      ('not even a URL',                       'open.spotify.com/playlist/x',                             'SPOTIFY',     false),
      -- half-written links
      ('url with no service',                  'https://open.spotify.com/playlist/x',                     null,          false),
      ('service with no url',                  null,                                                     'SPOTIFY',     false),
      ('unknown service value',                'https://open.spotify.com/playlist/x',                     'TIDAL',       false)
    ) as t(label, url, service, accepted)
  loop
    begin
      insert into _pl_probe values (v.url, v.service);
      v_ok := true;
    exception when check_violation then
      v_ok := false;
    end;
    if v_ok is distinct from v.accepted then
      raise exception '0105 self-check FAILED [%]: expected accepted=%, got %', v.label, v.accepted, v_ok;
    end if;
  end loop;
  raise notice '0105: playlist host rule matches all 15 golden vectors.';
end $$;

commit;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- VERIFY — read-only. Substitute your athlete id.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- STEP 0 — IN THE APP, BEFORE ANYTHING BELOW. Log one workout, any workout, and confirm it appears in
-- Activity History. This migration touches the table every save writes to; only a real save proves it.
--
-- STEP 1 — Are the columns there, and did the notice in section 3 print "matches all 15 golden vectors"?
--
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_name = 'workouts' and column_name like 'playlist%'
--    order by column_name;
--
--   Expected: three rows, all is_nullable = YES.
--
-- STEP 2 — The guarantee is a guarantee, not screen behaviour. Wrap in begin; … rollback;
--
--   update public.workouts set playlist_url = 'https://evil.com/x', playlist_service = 'SPOTIFY'
--    where id = '<any workout of yours>';        -- expect ERROR 23514 workouts_playlist_pair
--
--   update public.workouts set playlist_name = 'Orphan' where id = '<any workout of yours>';
--                                                -- expect ERROR 23514 workouts_playlist_name_needs_link
--
-- STEP 3 — After attaching one in the app (⋯ Options during a workout, or W-17's Reflect step):
--
--   select workout_name, playlist_service, playlist_name, playlist_url
--     from public.workouts
--    where athlete_id = '<your-athlete-id>'::uuid and playlist_url is not null
--    order by saved_at desc;
