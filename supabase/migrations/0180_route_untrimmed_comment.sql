-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- 0180 · THE ROUTE COLUMN'S DOCUMENTATION CATCHES UP WITH THE RESCINDED TRIM
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- `Route-Sharing-Amendment-001.md` (2026-08-26): the PO vetoed D-RTE-1's 200 m endpoint trim — *"we
-- veto the 200m remove. Take this out completely"* — and approved sharing routes onto posts and the
-- shared Activity Detail (D-RS-2), opt-in per post (D-RS-3).
--
-- ⚠ NO DATA CHANGES HANDS HERE. The trim lived in the client (`src/domain/run/route-privacy.ts`) and
-- was removed there; this migration only corrects the column comments, because 0162's comment makes
-- two claims that are now false — that the column "has never held the athlete's start or end point",
-- and that a route is "never shared with any other athlete (D-RTE-5)". A schema that documents a
-- rescinded guarantee is a trap for the next reader, and these comments are read as authority (0179's
-- header treats them exactly that way).
--
-- ⚠ ROWS WRITTEN BETWEEN 0162 AND THE UNTRIMMED CLIENT ARE TRIMMED FOREVER. The removed 400 m never
-- reached the database, so nothing can restore it, and nothing marks which era a row belongs to.
--
-- The 0162 CHECK constraint (encoded polyline, not raw coordinates) is untouched — the encoding did
-- not change, only what gets encoded.
--
-- Safe to run twice.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

comment on column public.workout_sets.route is
  'Outdoor cardio only — the shape of the bout as a Google-encoded polyline, precision 5 (0162). ⚠ THE WHOLE TRACK since Route-Sharing-Amendment-001 D-RS-1 (2026-08-26) rescinded the 200 m endpoint trim by PO veto: rows written after the untrimmed client include the bout''s true start and end; rows written under 0162''s original rule are trimmed 200 m at each end PERMANENTLY, and nothing marks which era a row is from. Shareable onto posts and the shared Activity Detail per D-RS-2, opt-in per post (D-RS-3) — never onto challenges, leaderboards, or ranked surfaces. NULL when indoors or untracked. Never a source of distance — that is the distance column, and pre-rescission routes are 400 m short of it by construction.';

comment on column public.workout_sets.climb_m is
  'Total elevation gain for the bout, in METRES (0162). NULL, never 0, when the device reported no usable altitude — "we could not tell" is not "it was flat", the distinction hasClimbData draws client-side. Unaffected by Route-Sharing-Amendment-001: it was always computed from the full track.';
